import { Order, PipelineStage, User, WorkspaceSettings, WebhookLog } from './types';

// Safely obtain Cloudflare D1 binding if running inside Cloudflare Workers
export function getD1Database(): any | null {
  try {
    // Dynamic require or import of @opennextjs/cloudflare
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

// D1 Operations
export const d1Store = {
  async getSettings(db: any): Promise<WorkspaceSettings | null> {
    try {
      const row = await db.prepare('SELECT * FROM settings WHERE id = ?').bind('default').first();
      if (!row) return null;
      return {
        companyName: row.company_name,
        ownerName: row.owner_name,
        email: row.email,
        phone: row.phone,
        currency: row.currency || '$',
        shopify: {
          shopDomain: row.shopify_shop_domain,
          webhookSecret: row.shopify_webhook_secret,
          adminAccessToken: row.shopify_admin_access_token,
          isConnected: Boolean(row.shopify_is_connected),
          lastSyncAt: row.shopify_last_sync_at,
          autoSync: Boolean(row.shopify_auto_sync),
        },
      };
    } catch (e) {
      console.error('D1 getSettings error:', e);
      return null;
    }
  },

  async updateSettings(db: any, s: WorkspaceSettings): Promise<void> {
    try {
      await db
        .prepare(
          `INSERT OR REPLACE INTO settings (
            id, company_name, owner_name, email, phone, currency,
            shopify_shop_domain, shopify_webhook_secret, shopify_admin_access_token,
            shopify_is_connected, shopify_last_sync_at, shopify_auto_sync, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          'default',
          s.companyName,
          s.ownerName,
          s.email,
          s.phone,
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

  async getStages(db: any): Promise<PipelineStage[]> {
    try {
      const { results } = await db.prepare('SELECT * FROM stages ORDER BY stage_order ASC').all();
      if (!results || results.length === 0) return [];
      return results.map((r: any) => ({
        id: r.id,
        name: r.name,
        order: Number(r.stage_order),
        roles: safeJsonParse(r.roles, ['Admin']),
      }));
    } catch (e) {
      console.error('D1 getStages error:', e);
      return [];
    }
  },

  async setStages(db: any, stages: PipelineStage[]): Promise<void> {
    try {
      await db.prepare('DELETE FROM stages').run();
      for (const st of stages) {
        await db
          .prepare('INSERT INTO stages (id, name, stage_order, roles) VALUES (?, ?, ?, ?)')
          .bind(st.id, st.name, st.order, JSON.stringify(st.roles || []))
          .run();
      }
    } catch (e) {
      console.error('D1 setStages error:', e);
    }
  },

  async getOrders(db: any): Promise<Order[]> {
    try {
      const { results } = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
      if (!results) return [];
      return results.map(rowToOrder);
    } catch (e) {
      console.error('D1 getOrders error:', e);
      return [];
    }
  },

  async getOrderById(db: any, id: string): Promise<Order | null> {
    try {
      const row = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
      return row ? rowToOrder(row) : null;
    } catch (e) {
      console.error('D1 getOrderById error:', e);
      return null;
    }
  },

  async saveOrder(db: any, o: Order): Promise<void> {
    try {
      await db
        .prepare(
          `INSERT OR REPLACE INTO orders (
            id, order_number, shopify_order_id, shopify_order_number, source,
            customer_name, customer_email, customer_phone,
            shipping_address, billing_address, items, subtotal, shipping_fee, total,
            base_production_cost, profit, current_stage_id, priority, status, progress_percent,
            assigned_to, due_date, notes_from_customer, internal_notes,
            tracking_number, tracking_carrier, tracking_url, customer_tracking_token,
            gallery, comments, activity, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          o.id,
          o.orderNumber,
          o.shopifyOrderId || '',
          o.shopifyOrderNumber || '',
          o.source || 'shopify',
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

  async getUsers(db: any): Promise<User[]> {
    try {
      const { results } = await db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
      if (!results) return [];
      return results.map((r: any) => ({
        id: r.id,
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

  async saveUser(db: any, u: User & { password?: string }): Promise<void> {
    try {
      await db
        .prepare('INSERT OR REPLACE INTO users (id, name, email, role, password, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(u.id, u.name, u.email, u.role, u.password || '', u.createdAt || new Date().toISOString())
        .run();
    } catch (e) {
      console.error('D1 saveUser error:', e);
    }
  },

  async getWebhookLogs(db: any): Promise<WebhookLog[]> {
    try {
      const { results } = await db.prepare('SELECT * FROM webhook_logs ORDER BY received_at DESC LIMIT 50').all();
      if (!results) return [];
      return results.map((r: any) => ({
        id: r.id,
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

  async addWebhookLog(db: any, log: WebhookLog): Promise<void> {
    try {
      await db
        .prepare(
          'INSERT INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(log.id, log.topic, log.shopifyOrderId || '', log.status, log.message, log.payloadSummary, log.receivedAt)
        .run();
    } catch (e) {
      console.error('D1 addWebhookLog error:', e);
    }
  },
};
