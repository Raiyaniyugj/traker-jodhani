import { Order, PipelineStage, User, WorkspaceSettings, WebhookLog } from './types';

// Safely obtain Cloudflare D1 binding if running inside Cloudflare Workers
export function getD1Database(): any | null {
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    if (ctx?.env?.DB) {
      return ctx.env.DB;
    }
  } catch {
    // Outside Cloudflare context or build time
  }
  return null;
}

// Convert D1 database row to Order object
function rowToOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.user_id,
    orderNumber: row.order_number,
    shopifyOrderId: row.shopify_order_id,
    shopifyOrderNumber: row.shopify_order_number,
    source: row.source,
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
    priority: row.priority,
    status: row.status,
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

function safeJsonParse(val: any, fallback: any) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// D1 Operations with User & Workspace Isolation
export const d1Store = {
  // --- USERS & AUTH ---
  async getUserByEmail(db: any, email: string): Promise<(User & { password?: string; ownerId?: string }) | null> {
    try {
      const row = await db
        .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
        .bind(email.trim())
        .first();
      if (!row) return null;
      return {
        id: row.id,
        ownerId: row.owner_id || row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        password: row.password || '',
        createdAt: row.created_at,
      };
    } catch (e) {
      console.error('D1 getUserByEmail error:', e);
      return null;
    }
  },

  async getUserById(db: any, id: string): Promise<(User & { password?: string; ownerId?: string }) | null> {
    try {
      const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
      if (!row) return null;
      return {
        id: row.id,
        ownerId: row.owner_id || row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        password: row.password || '',
        createdAt: row.created_at,
      };
    } catch (e) {
      console.error('D1 getUserById error:', e);
      return null;
    }
  },

  async saveUser(db: any, u: User & { password?: string; ownerId?: string }): Promise<void> {
    try {
      await db
        .prepare(
          'INSERT OR REPLACE INTO users (id, owner_id, name, email, role, password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          u.id,
          u.ownerId || u.id,
          u.name,
          u.email.toLowerCase().trim(),
          u.role,
          u.password || '',
          u.createdAt || new Date().toISOString()
        )
        .run();
    } catch (e) {
      console.error('D1 saveUser error:', e);
    }
  },

  async getUsers(db: any, ownerId: string): Promise<User[]> {
    try {
      const { results } = await db
        .prepare('SELECT id, owner_id, name, email, role, created_at FROM users WHERE owner_id = ? OR id = ? ORDER BY created_at ASC')
        .bind(ownerId, ownerId)
        .all();
      if (!results) return [];
      return results.map((r: any) => ({
        id: r.id,
        ownerId: r.owner_id || r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        createdAt: r.created_at,
      }));
    } catch (e) {
      console.error('D1 getUsers error:', e);
      return [];
    }
  },

  // --- WORKSPACE SETTINGS ---
  async getSettings(db: any, userId: string): Promise<WorkspaceSettings | null> {
    try {
      const row = await db
        .prepare('SELECT * FROM settings WHERE user_id = ? OR id = ?')
        .bind(userId, userId)
        .first();
      if (!row) return null;
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
    } catch (e) {
      console.error('D1 getSettings error:', e);
      return null;
    }
  },

  async getSettingsByShopDomain(
    db: any,
    shopDomain: string
  ): Promise<{ userId: string; settings: WorkspaceSettings } | null> {
    try {
      const clean = shopDomain.toLowerCase().trim();
      const row = await db
        .prepare('SELECT * FROM settings WHERE lower(shopify_shop_domain) = ?')
        .bind(clean)
        .first();
      if (!row) return null;
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
      console.error('D1 getSettingsByShopDomain error:', e);
      return null;
    }
  },

  async updateSettings(db: any, userId: string, s: WorkspaceSettings): Promise<void> {
    try {
      await db
        .prepare(
          `INSERT OR REPLACE INTO settings (
            id, user_id, company_name, owner_name, email, phone, currency,
            shopify_shop_domain, shopify_webhook_secret, shopify_admin_access_token,
            shopify_is_connected, shopify_last_sync_at, shopify_auto_sync, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          userId,
          userId,
          s.companyName || '',
          s.ownerName || '',
          s.email || '',
          s.phone || '',
          s.currency || '$',
          s.shopify?.shopDomain || '',
          s.shopify?.webhookSecret || '',
          s.shopify?.adminAccessToken || '',
          s.shopify?.isConnected ? 1 : 0,
          s.shopify?.lastSyncAt || '',
          s.shopify?.autoSync !== false ? 1 : 0
        )
        .run();
    } catch (e) {
      console.error('D1 updateSettings error:', e);
    }
  },

  // --- PIPELINE STAGES ---
  async getStages(db: any, userId: string): Promise<PipelineStage[]> {
    try {
      const { results } = await db
        .prepare('SELECT * FROM stages WHERE user_id = ? ORDER BY stage_order ASC')
        .bind(userId)
        .all();
      if (!results || results.length === 0) return [];
      return results.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        order: Number(r.stage_order),
        roles: safeJsonParse(r.roles, ['Admin']),
      }));
    } catch (e) {
      console.error('D1 getStages error:', e);
      return [];
    }
  },

  async setStages(db: any, userId: string, stages: PipelineStage[]): Promise<void> {
    try {
      await db.prepare('DELETE FROM stages WHERE user_id = ?').bind(userId).run();
      for (const st of stages) {
        await db
          .prepare('INSERT INTO stages (id, user_id, name, stage_order, roles) VALUES (?, ?, ?, ?, ?)')
          .bind(st.id, userId, st.name, st.order, JSON.stringify(st.roles || []))
          .run();
      }
    } catch (e) {
      console.error('D1 setStages error:', e);
    }
  },

  // --- ORDERS ---
  async getOrders(db: any, userId: string): Promise<Order[]> {
    try {
      const { results } = await db
        .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
        .bind(userId)
        .all();
      if (!results) return [];
      return results.map(rowToOrder);
    } catch (e) {
      console.error('D1 getOrders error:', e);
      return [];
    }
  },

  async getOrderById(db: any, id: string, userId?: string): Promise<Order | null> {
    try {
      let row;
      if (userId) {
        row = await db
          .prepare('SELECT * FROM orders WHERE (id = ? OR customer_tracking_token = ?) AND user_id = ?')
          .bind(id, id, userId)
          .first();
      } else {
        // Public customer tracking view
        row = await db
          .prepare('SELECT * FROM orders WHERE id = ? OR customer_tracking_token = ?')
          .bind(id, id)
          .first();
      }
      return row ? rowToOrder(row) : null;
    } catch (e) {
      console.error('D1 getOrderById error:', e);
      return null;
    }
  },

  async saveOrder(db: any, o: Order & { userId: string }): Promise<void> {
    try {
      await db
        .prepare(
          `INSERT OR REPLACE INTO orders (
            id, user_id, order_number, shopify_order_id, shopify_order_number, source,
            customer_name, customer_email, customer_phone,
            shipping_address, billing_address, items, subtotal, shipping_fee, total,
            base_production_cost, profit, current_stage_id, priority, status, progress_percent,
            assigned_to, due_date, notes_from_customer, internal_notes,
            tracking_number, tracking_carrier, tracking_url, customer_tracking_token,
            gallery, comments, activity, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          o.id,
          o.userId,
          o.orderNumber,
          o.shopifyOrderId || '',
          o.shopifyOrderNumber || '',
          o.source || 'manual',
          o.customer?.name || '',
          o.customer?.email || '',
          o.customer?.phone || '',
          JSON.stringify(o.shippingAddress || {}),
          JSON.stringify(o.billingAddress || {}),
          JSON.stringify(o.items || []),
          o.subtotal || 0,
          o.shippingFee || 0,
          o.total || 0,
          o.baseProductionCost || 0,
          o.profit || 0,
          o.currentStageId,
          o.priority || 'Medium',
          o.status || 'Active',
          o.progressPercent || 0,
          o.assignedTo || '',
          o.dueDate || '',
          o.notesFromCustomer || '',
          o.internalNotes || '',
          o.trackingNumber || '',
          o.trackingCarrier || '',
          o.trackingUrl || '',
          o.customerTrackingToken || '',
          JSON.stringify(o.gallery || []),
          JSON.stringify(o.comments || []),
          JSON.stringify(o.activity || []),
          o.createdAt || new Date().toISOString(),
          o.updatedAt || new Date().toISOString()
        )
        .run();
    } catch (e) {
      console.error('D1 saveOrder error:', e);
    }
  },

  async deleteOrder(db: any, id: string, userId: string): Promise<boolean> {
    try {
      const res = await db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?').bind(id, userId).run();
      return res.meta?.changes > 0;
    } catch (e) {
      console.error('D1 deleteOrder error:', e);
      return false;
    }
  },

  // --- WEBHOOK LOGS ---
  async getWebhookLogs(db: any, userId: string): Promise<WebhookLog[]> {
    try {
      const { results } = await db
        .prepare('SELECT * FROM webhook_logs WHERE user_id = ? ORDER BY received_at DESC LIMIT 50')
        .bind(userId)
        .all();
      if (!results) return [];
      return results.map((r: any) => ({
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
      console.error('D1 getWebhookLogs error:', e);
      return [];
    }
  },

  async addWebhookLog(db: any, log: WebhookLog & { userId?: string }): Promise<void> {
    try {
      await db
        .prepare(
          'INSERT INTO webhook_logs (id, user_id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          log.id,
          log.userId || '',
          log.topic,
          log.shopifyOrderId || '',
          log.status,
          log.message,
          log.payloadSummary || '',
          log.receivedAt
        )
        .run();
    } catch (e) {
      console.error('D1 addWebhookLog error:', e);
    }
  },
};
