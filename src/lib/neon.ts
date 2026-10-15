import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Order, PipelineStage, User, WorkspaceSettings, WebhookLog, Role } from './types';

const NEON_FALLBACK_URL =
  'postgresql://neondb_owner:npg_nf7uvJpE4PWi@ep-rapid-hall-b85ej0f4-pooler.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require';

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getNeonSql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || NEON_FALLBACK_URL;
    sqlClient = neon(connectionString);
  }
  return sqlClient;
}

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function rowToOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.user_id,
    orderNumber: row.order_number,
    shopifyOrderId: row.shopify_order_id,
    shopifyOrderNumber: row.shopify_order_number,
    source: row.source || 'shopify',
    customer: {
      name: row.customer_name || '',
      email: row.customer_email || '',
      phone: row.customer_phone || '',
    },
    shippingAddress: safeJsonParse(row.shipping_address, {
      address1: '',
      city: '',
      province: '',
      zip: '',
      country: '',
    }),
    billingAddress: safeJsonParse(row.billing_address, {
      address1: '',
      city: '',
      province: '',
      zip: '',
      country: '',
    }),
    items: safeJsonParse(row.items, []),
    subtotal: Number(row.subtotal) || 0,
    shippingFee: Number(row.shipping_fee) || 0,
    total: Number(row.total) || 0,
    baseProductionCost: Number(row.base_production_cost) || 0,
    profit: Number(row.profit) || 0,
    currentStageId: row.current_stage_id,
    priority: row.priority || 'Medium',
    status: row.status || 'Active',
    progressPercent: Number(row.progress_percent) || 0,
    assignedTo: row.assigned_to,
    dueDate: row.due_date,
    notesFromCustomer: row.notes_from_customer,
    internalNotes: row.internal_notes,
    trackingNumber: row.tracking_number,
    trackingCarrier: row.tracking_carrier,
    trackingUrl: row.tracking_url,
    customerTrackingToken: row.customer_tracking_token,
    gallery: safeJsonParse(row.gallery, []),
    comments: safeJsonParse(row.comments, []),
    activity: safeJsonParse(row.activity, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const neonStore = {
  // --- USERS & AUTH ---
  async getUserByEmail(email: string): Promise<(User & { password?: string; ownerId?: string }) | null> {
    try {
      const sql = getNeonSql();
      const clean = email.toLowerCase().trim();
      const rows = await sql`SELECT * FROM users WHERE lower(email) = ${clean} LIMIT 1`;
      if (!rows || rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id,
        ownerId: row.owner_id || row.id,
        name: row.name,
        email: row.email,
        role: row.role as Role,
        password: row.password || '',
        createdAt: row.created_at,
      };
    } catch (e) {
      console.error('Neon getUserByEmail error:', e);
      return null;
    }
  },

  async getUserById(id: string): Promise<(User & { password?: string; ownerId?: string }) | null> {
    try {
      const sql = getNeonSql();
      const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      if (!rows || rows.length === 0) return null;
      const row = rows[0];
      return {
        id: row.id,
        ownerId: row.owner_id || row.id,
        name: row.name,
        email: row.email,
        role: row.role as Role,
        password: row.password || '',
        createdAt: row.created_at,
      };
    } catch (e) {
      console.error('Neon getUserById error:', e);
      return null;
    }
  },

  async saveUser(u: User & { password?: string; ownerId?: string }): Promise<void> {
    try {
      const sql = getNeonSql();
      const cleanEmail = u.email.toLowerCase().trim();
      const ownerId = u.ownerId || u.id;
      const createdAt = u.createdAt || new Date().toISOString();
      const password = u.password || '';

      await sql`
        INSERT INTO users (id, owner_id, name, email, role, password, created_at)
        VALUES (${u.id}, ${ownerId}, ${u.name}, ${cleanEmail}, ${u.role}, ${password}, ${createdAt})
        ON CONFLICT (id) DO UPDATE SET
          owner_id = EXCLUDED.owner_id,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          password = EXCLUDED.password
      `;
    } catch (e) {
      console.error('Neon saveUser error:', e);
    }
  },

  async getUsers(ownerId: string): Promise<User[]> {
    try {
      const sql = getNeonSql();
      const rows = await sql`
        SELECT id, owner_id, name, email, role, created_at
        FROM users
        WHERE owner_id = ${ownerId} OR id = ${ownerId}
        ORDER BY created_at ASC
      `;
      if (!rows) return [];
      return rows.map((r: any) => ({
        id: r.id,
        ownerId: r.owner_id || r.id,
        name: r.name,
        email: r.email,
        role: r.role as Role,
        createdAt: r.created_at,
      }));
    } catch (e) {
      console.error('Neon getUsers error:', e);
      return [];
    }
  },

  // --- WORKSPACE SETTINGS ---
  async getSettings(userId: string): Promise<WorkspaceSettings | null> {
    try {
      const sql = getNeonSql();
      const rows = await sql`SELECT * FROM settings WHERE user_id = ${userId} OR id = ${userId} LIMIT 1`;
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          userId: row.user_id || row.id,
          companyName: row.company_name || 'My Jewelry Atelier',
          ownerName: row.owner_name || '',
          email: row.email || '',
          phone: row.phone || '',
          currency: row.currency || '$',
          shopify: {
            shopDomain: row.shopify_shop_domain || '',
            webhookSecret: row.shopify_webhook_secret || '',
            adminAccessToken: row.shopify_admin_access_token || '',
            isConnected: Boolean(row.shopify_is_connected),
            lastSyncAt: row.shopify_last_sync_at || '',
            autoSync: Boolean(row.shopify_auto_sync),
          },
        };
      }

      // Auto-provision fresh individual settings for this user in Neon
      const initialSettings: WorkspaceSettings = {
        userId,
        companyName: 'My Jewelry Atelier',
        ownerName: '',
        email: '',
        phone: '',
        currency: '$',
        shopify: {
          shopDomain: '',
          webhookSecret: '',
          adminAccessToken: '',
          isConnected: false,
          lastSyncAt: '',
          autoSync: true,
        },
      };
      await this.updateSettings(userId, initialSettings);
      return initialSettings;
    } catch (e) {
      console.error('Neon getSettings error:', e);
      return null;
    }
  },

  async getSettingsByShopDomain(
    shopDomain: string
  ): Promise<{ userId: string; settings: WorkspaceSettings } | null> {
    try {
      const sql = getNeonSql();
      const clean = shopDomain.toLowerCase().trim();
      const rows = await sql`SELECT * FROM settings WHERE lower(shopify_shop_domain) = ${clean} LIMIT 1`;
      if (!rows || rows.length === 0) return null;
      const row = rows[0];
      const settings: WorkspaceSettings = {
        userId: row.user_id || row.id,
        companyName: row.company_name || '',
        ownerName: row.owner_name || '',
        email: row.email || '',
        phone: row.phone || '',
        currency: row.currency || '$',
        shopify: {
          shopDomain: row.shopify_shop_domain || '',
          webhookSecret: row.shopify_webhook_secret || '',
          adminAccessToken: row.shopify_admin_access_token || '',
          isConnected: Boolean(row.shopify_is_connected),
          lastSyncAt: row.shopify_last_sync_at || '',
          autoSync: Boolean(row.shopify_auto_sync),
        },
      };
      return { userId: row.user_id || row.id, settings };
    } catch (e) {
      console.error('Neon getSettingsByShopDomain error:', e);
      return null;
    }
  },

  async updateSettings(userId: string, s: WorkspaceSettings): Promise<void> {
    try {
      const sql = getNeonSql();
      const isConnected = s.shopify?.isConnected ? 1 : 0;
      const autoSync = s.shopify?.autoSync !== false ? 1 : 0;
      const now = new Date().toISOString();

      await sql`
        INSERT INTO settings (
          id, user_id, company_name, owner_name, email, phone, currency,
          shopify_shop_domain, shopify_webhook_secret, shopify_admin_access_token,
          shopify_is_connected, shopify_last_sync_at, shopify_auto_sync, updated_at
        ) VALUES (
          ${userId}, ${userId}, ${s.companyName || ''}, ${s.ownerName || ''}, ${s.email || ''},
          ${s.phone || ''}, ${s.currency || '$'}, ${s.shopify?.shopDomain || ''},
          ${s.shopify?.webhookSecret || ''}, ${s.shopify?.adminAccessToken || ''},
          ${isConnected}, ${s.shopify?.lastSyncAt || ''}, ${autoSync}, ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          company_name = EXCLUDED.company_name,
          owner_name = EXCLUDED.owner_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          currency = EXCLUDED.currency,
          shopify_shop_domain = EXCLUDED.shopify_shop_domain,
          shopify_webhook_secret = EXCLUDED.shopify_webhook_secret,
          shopify_admin_access_token = EXCLUDED.shopify_admin_access_token,
          shopify_is_connected = EXCLUDED.shopify_is_connected,
          shopify_last_sync_at = EXCLUDED.shopify_last_sync_at,
          shopify_auto_sync = EXCLUDED.shopify_auto_sync,
          updated_at = EXCLUDED.updated_at
      `;
    } catch (e) {
      console.error('Neon updateSettings error:', e);
    }
  },

  // --- PIPELINE STAGES ---
  async getStages(userId: string): Promise<PipelineStage[]> {
    try {
      const sql = getNeonSql();
      const rows = await sql`SELECT * FROM stages WHERE user_id = ${userId} ORDER BY stage_order ASC`;
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          name: r.name,
          order: Number(r.stage_order),
          roles: safeJsonParse(r.roles, ['Admin']),
        }));
      }

      // Default 9 stages
      const initialStages = [
        { name: 'New Orders', order: 1, roles: ['Admin'] },
        { name: 'CAD Design', order: 2, roles: ['Admin', 'CAD Designer'] },
        { name: 'RPT', order: 3, roles: ['Admin'] },
        { name: 'Casting', order: 4, roles: ['Admin', 'Manufacturer'] },
        { name: 'Factory', order: 5, roles: ['Admin', 'Manufacturer'] },
        { name: 'Quality Check', order: 6, roles: ['Admin', 'CAD Designer', 'Manufacturer'] },
        { name: 'Packaging', order: 7, roles: ['Admin', 'Manufacturer'] },
        { name: 'Shipping', order: 8, roles: ['Admin'] },
        { name: 'Completed', order: 9, roles: ['Admin'] },
      ].map((t, idx) => ({
        id: `stg_${userId}_${idx + 1}`,
        userId,
        name: t.name,
        order: t.order,
        roles: t.roles as Role[],
      }));

      await this.setStages(userId, initialStages);
      return initialStages;
    } catch (e) {
      console.error('Neon getStages error:', e);
      return [];
    }
  },

  async setStages(userId: string, stages: PipelineStage[]): Promise<void> {
    try {
      const sql = getNeonSql();
      await sql`DELETE FROM stages WHERE user_id = ${userId}`;
      for (const st of stages) {
        await sql`
          INSERT INTO stages (id, user_id, name, stage_order, roles)
          VALUES (${st.id}, ${userId}, ${st.name}, ${st.order}, ${JSON.stringify(st.roles || [])})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            stage_order = EXCLUDED.stage_order,
            roles = EXCLUDED.roles
        `;
      }
    } catch (e) {
      console.error('Neon setStages error:', e);
    }
  },

  // --- ORDERS ---
  async getOrders(userId: string): Promise<Order[]> {
    try {
      const sql = getNeonSql();
      const rows = await sql`SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC`;
      if (!rows) return [];
      return rows.map(rowToOrder);
    } catch (e) {
      console.error('Neon getOrders error:', e);
      return [];
    }
  },

  async getOrderById(id: string, userId?: string): Promise<Order | null> {
    try {
      const sql = getNeonSql();
      let rows;
      if (userId) {
        rows = await sql`
          SELECT * FROM orders
          WHERE (id = ${id} OR customer_tracking_token = ${id}) AND user_id = ${userId}
          LIMIT 1
        `;
      } else {
        rows = await sql`
          SELECT * FROM orders
          WHERE id = ${id} OR customer_tracking_token = ${id}
          LIMIT 1
        `;
      }
      return rows && rows.length > 0 ? rowToOrder(rows[0]) : null;
    } catch (e) {
      console.error('Neon getOrderById error:', e);
      return null;
    }
  },

  async saveOrder(o: Order & { userId: string }): Promise<void> {
    try {
      const sql = getNeonSql();
      const now = new Date().toISOString();
      await sql`
        INSERT INTO orders (
          id, user_id, order_number, shopify_order_id, shopify_order_number, source,
          customer_name, customer_email, customer_phone,
          shipping_address, billing_address, items, subtotal, shipping_fee, total,
          base_production_cost, profit, current_stage_id, priority, status, progress_percent,
          assigned_to, due_date, notes_from_customer, internal_notes,
          tracking_number, tracking_carrier, tracking_url, customer_tracking_token,
          gallery, comments, activity, created_at, updated_at
        ) VALUES (
          ${o.id}, ${o.userId}, ${o.orderNumber}, ${o.shopifyOrderId || ''}, ${o.shopifyOrderNumber || ''},
          ${o.source || 'manual'}, ${o.customer?.name || ''}, ${o.customer?.email || ''}, ${o.customer?.phone || ''},
          ${JSON.stringify(o.shippingAddress || {})}, ${JSON.stringify(o.billingAddress || {})},
          ${JSON.stringify(o.items || [])}, ${o.subtotal || 0}, ${o.shippingFee || 0}, ${o.total || 0},
          ${o.baseProductionCost || 0}, ${o.profit || 0}, ${o.currentStageId}, ${o.priority || 'Medium'},
          ${o.status || 'Active'}, ${o.progressPercent || 0}, ${o.assignedTo || ''}, ${o.dueDate || ''},
          ${o.notesFromCustomer || ''}, ${o.internalNotes || ''}, ${o.trackingNumber || ''},
          ${o.trackingCarrier || ''}, ${o.trackingUrl || ''}, ${o.customerTrackingToken || ''},
          ${JSON.stringify(o.gallery || [])}, ${JSON.stringify(o.comments || [])},
          ${JSON.stringify(o.activity || [])}, ${o.createdAt || now}, ${o.updatedAt || now}
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          order_number = EXCLUDED.order_number,
          shopify_order_id = EXCLUDED.shopify_order_id,
          shopify_order_number = EXCLUDED.shopify_order_number,
          source = EXCLUDED.source,
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          customer_phone = EXCLUDED.customer_phone,
          shipping_address = EXCLUDED.shipping_address,
          billing_address = EXCLUDED.billing_address,
          items = EXCLUDED.items,
          subtotal = EXCLUDED.subtotal,
          shipping_fee = EXCLUDED.shipping_fee,
          total = EXCLUDED.total,
          base_production_cost = EXCLUDED.base_production_cost,
          profit = EXCLUDED.profit,
          current_stage_id = EXCLUDED.current_stage_id,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          progress_percent = EXCLUDED.progress_percent,
          assigned_to = EXCLUDED.assigned_to,
          due_date = EXCLUDED.due_date,
          notes_from_customer = EXCLUDED.notes_from_customer,
          internal_notes = EXCLUDED.internal_notes,
          tracking_number = EXCLUDED.tracking_number,
          tracking_carrier = EXCLUDED.tracking_carrier,
          tracking_url = EXCLUDED.tracking_url,
          customer_tracking_token = EXCLUDED.customer_tracking_token,
          gallery = EXCLUDED.gallery,
          comments = EXCLUDED.comments,
          activity = EXCLUDED.activity,
          updated_at = EXCLUDED.updated_at
      `;
    } catch (e) {
      console.error('Neon saveOrder error:', e);
    }
  },

  async deleteOrder(id: string, userId: string): Promise<boolean> {
    try {
      const sql = getNeonSql();
      await sql`DELETE FROM orders WHERE id = ${id} AND user_id = ${userId}`;
      return true;
    } catch (e) {
      console.error('Neon deleteOrder error:', e);
      return false;
    }
  },

  // --- WEBHOOK LOGS ---
  async getWebhookLogs(userId: string): Promise<WebhookLog[]> {
    try {
      const sql = getNeonSql();
      const rows = await sql`
        SELECT * FROM webhook_logs
        WHERE user_id = ${userId}
        ORDER BY received_at DESC
        LIMIT 50
      `;
      if (!rows) return [];
      return rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        shopifyOrderId: r.shopify_order_id,
        status: r.status,
        message: r.message,
        payloadSummary: r.payload_summary,
        receivedAt: r.received_at,
      }));
    } catch (e) {
      console.error('Neon getWebhookLogs error:', e);
      return [];
    }
  },

  async addWebhookLog(log: WebhookLog & { userId?: string }): Promise<void> {
    try {
      const sql = getNeonSql();
      await sql`
        INSERT INTO webhook_logs (
          id, user_id, topic, shopify_order_id, status, message, payload_summary, received_at
        ) VALUES (
          ${log.id}, ${log.userId || ''}, ${log.topic}, ${log.shopifyOrderId || ''},
          ${log.status}, ${log.message}, ${log.payloadSummary || ''}, ${log.receivedAt}
        )
      `;
    } catch (e) {
      console.error('Neon addWebhookLog error:', e);
    }
  },
};
