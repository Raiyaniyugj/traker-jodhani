-- Trackerz Production Tracker - Cloudflare D1 Database Schema

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  company_name TEXT,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  currency TEXT DEFAULT '$',
  shopify_shop_domain TEXT,
  shopify_webhook_secret TEXT,
  shopify_admin_access_token TEXT,
  shopify_is_connected INTEGER DEFAULT 0,
  shopify_last_sync_at TEXT,
  shopify_auto_sync INTEGER DEFAULT 1,
  updated_at TEXT
);

-- 2. Pipeline Stages Table
CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  roles TEXT NOT NULL
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  password TEXT,
  created_at TEXT NOT NULL
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  shopify_order_id TEXT,
  shopify_order_number TEXT,
  source TEXT DEFAULT 'manual',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  billing_address TEXT,
  items TEXT NOT NULL,
  subtotal REAL NOT NULL,
  shipping_fee REAL DEFAULT 0,
  total REAL NOT NULL,
  base_production_cost REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  current_stage_id TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Active',
  progress_percent INTEGER DEFAULT 0,
  assigned_to TEXT,
  due_date TEXT,
  notes_from_customer TEXT,
  internal_notes TEXT,
  tracking_number TEXT,
  tracking_carrier TEXT,
  tracking_url TEXT,
  customer_tracking_token TEXT,
  gallery TEXT,
  comments TEXT,
  activity TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Webhook Logs Table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  shopify_order_id TEXT,
  status TEXT NOT NULL,
  message TEXT,
  payload_summary TEXT,
  received_at TEXT NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(customer_tracking_token);
CREATE INDEX IF NOT EXISTS idx_stages_order ON stages(stage_order);
