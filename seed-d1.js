const fs = require('fs');
const path = require('path');

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'database.json'), 'utf-8'));

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

const sqlLines = [];

// Seed settings
if (db.settings) {
  const s = db.settings;
  const shop = s.shopify || {};
  sqlLines.push(`INSERT OR REPLACE INTO settings (id, company_name, owner_name, email, phone, currency, shopify_shop_domain, shopify_webhook_secret, shopify_admin_access_token, shopify_is_connected, shopify_last_sync_at, shopify_auto_sync, updated_at) VALUES ('default', ${escapeSql(s.companyName)}, ${escapeSql(s.ownerName)}, ${escapeSql(s.email)}, ${escapeSql(s.phone)}, ${escapeSql(s.currency || '$')}, ${escapeSql(shop.shopDomain)}, ${escapeSql(shop.webhookSecret)}, ${escapeSql(shop.adminAccessToken)}, ${shop.isConnected ? 1 : 0}, ${escapeSql(shop.lastSyncAt)}, ${shop.autoSync !== false ? 1 : 0}, datetime('now'));`);
}

// Seed stages
if (Array.isArray(db.stages)) {
  for (const st of db.stages) {
    sqlLines.push(`INSERT OR REPLACE INTO stages (id, name, stage_order, roles) VALUES (${escapeSql(st.id)}, ${escapeSql(st.name)}, ${st.order}, ${escapeSql(JSON.stringify(st.roles || []))});`);
  }
}

// Seed users
if (Array.isArray(db.users)) {
  for (const u of db.users) {
    sqlLines.push(`INSERT OR REPLACE INTO users (id, name, email, role, password, created_at) VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.role)}, ${escapeSql(u.password || '')}, ${escapeSql(u.createdAt || new Date().toISOString())});`);
  }
}

// Seed orders
if (Array.isArray(db.orders)) {
  for (const o of db.orders) {
    sqlLines.push(`INSERT OR REPLACE INTO orders (
      id, order_number, shopify_order_id, shopify_order_number, source, customer_name, customer_email, customer_phone,
      shipping_address, billing_address, items, subtotal, shipping_fee, total, base_production_cost, profit,
      current_stage_id, priority, status, progress_percent, assigned_to, due_date, notes_from_customer, internal_notes,
      tracking_number, tracking_carrier, tracking_url, customer_tracking_token, gallery, comments, activity,
      created_at, updated_at
    ) VALUES (
      ${escapeSql(o.id)}, ${escapeSql(o.orderNumber)}, ${escapeSql(o.shopifyOrderId)}, ${escapeSql(o.shopifyOrderNumber)},
      ${escapeSql(o.source || 'shopify')}, ${escapeSql(o.customer?.name)}, ${escapeSql(o.customer?.email)}, ${escapeSql(o.customer?.phone)},
      ${escapeSql(JSON.stringify(o.shippingAddress || {}))}, ${escapeSql(JSON.stringify(o.billingAddress || {}))},
      ${escapeSql(JSON.stringify(o.items || []))}, ${o.subtotal || 0}, ${o.shippingFee || 0}, ${o.total || 0},
      ${o.baseProductionCost || 0}, ${o.profit || 0}, ${escapeSql(o.currentStageId)}, ${escapeSql(o.priority || 'Medium')},
      ${escapeSql(o.status || 'Active')}, ${o.progressPercent || 0}, ${escapeSql(o.assignedTo)}, ${escapeSql(o.dueDate)},
      ${escapeSql(o.notesFromCustomer)}, ${escapeSql(o.internalNotes)}, ${escapeSql(o.trackingNumber)}, ${escapeSql(o.trackingCarrier)},
      ${escapeSql(o.trackingUrl)}, ${escapeSql(o.customerTrackingToken)}, ${escapeSql(JSON.stringify(o.gallery || []))},
      ${escapeSql(JSON.stringify(o.comments || []))}, ${escapeSql(JSON.stringify(o.activity || []))},
      ${escapeSql(o.createdAt || new Date().toISOString())}, ${escapeSql(o.updatedAt || new Date().toISOString())}
    );`);
  }
}

// Seed webhook logs
if (Array.isArray(db.webhookLogs)) {
  for (const w of db.webhookLogs) {
    sqlLines.push(`INSERT OR REPLACE INTO webhook_logs (id, topic, shopify_order_id, status, message, payload_summary, received_at) VALUES (${escapeSql(w.id)}, ${escapeSql(w.topic)}, ${escapeSql(w.shopifyOrderId)}, ${escapeSql(w.status)}, ${escapeSql(w.message)}, ${escapeSql(w.payloadSummary)}, ${escapeSql(w.receivedAt || new Date().toISOString())});`);
  }
}

fs.writeFileSync(path.join(__dirname, 'seed.sql'), sqlLines.join('\n'), 'utf-8');
console.log(`Generated seed.sql with ${sqlLines.length} insert statements.`);
