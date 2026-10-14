import fs from 'fs';
import path from 'path';
import {
  Order,
  PipelineStage,
  User,
  WorkspaceSettings,
  WebhookLog,
  Role,
} from './types';

interface DatabaseData {
  settings: WorkspaceSettings;
  stages: PipelineStage[];
  users: User[];
  orders: Order[];
  webhookLogs: WebhookLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'stage-1', name: 'New Orders', order: 1, roles: ['Admin'] },
  { id: 'stage-2', name: 'CAD Design', order: 2, roles: ['Admin', 'CAD Designer'] },
  { id: 'stage-3', name: 'RPT', order: 3, roles: ['Admin'] },
  { id: 'stage-4', name: 'Casting', order: 4, roles: ['Admin', 'Manufacturer'] },
  { id: 'stage-5', name: 'Factory', order: 5, roles: ['Admin', 'Manufacturer'] },
  { id: 'stage-6', name: 'Quality Check', order: 6, roles: ['Admin', 'CAD Designer', 'Manufacturer'] },
  { id: 'stage-7', name: 'Packaging', order: 7, roles: ['Admin', 'Manufacturer'] },
  { id: 'stage-8', name: 'Shipping', order: 8, roles: ['Admin'] },
  { id: 'stage-9', name: 'Completed', order: 9, roles: ['Admin'] },
];

const DEFAULT_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Dhiren Bhagvanbhai Savaliya',
    email: 'valamdesignindia+0@gmail.com',
    role: 'Admin',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Amit Patel',
    email: 'amit.cad@example.com',
    role: 'CAD Designer',
    createdAt: '2026-09-05T11:00:00.000Z',
  },
  {
    id: 'user-3',
    name: 'Rajesh Sharma',
    email: 'rajesh.casting@example.com',
    role: 'Manufacturer',
    createdAt: '2026-09-10T14:30:00.000Z',
  },
];

const DEFAULT_ORDER: Order = {
  id: '6a4dc73d-2dc6-4e67-ba26-5769e3e55926',
  orderNumber: 'VALAM DESIGN',
  shopifyOrderId: 'gid://shopify/Order/58928371928',
  shopifyOrderNumber: '#1001',
  source: 'shopify',
  customer: {
    name: 'Dhiren Bhagvanbhai Savaliya',
    email: 'valamdesignindia@gmail.com',
    phone: '+919930022492',
  },
  shippingAddress: {
    address1: '402, Royal Diamond Plaza, Mini Bazar',
    city: 'Surat',
    province: 'Gujarat',
    zip: '395006',
    country: 'India',
  },
  billingAddress: {
    address1: '402, Royal Diamond Plaza, Mini Bazar',
    city: 'Surat',
    province: 'Gujarat',
    zip: '395006',
    country: 'India',
  },
  items: [
    {
      id: 'item-1',
      title: 'VALAM DESIGN',
      productType: 'Pendant',
      variantTitle: '14K White Gold / 1.20ct',
      sku: 'VD-PND-001',
      metalType: '14K',
      metalColor: 'White gold',
      diamondShape: 'Round',
      diamondSize: '1.20',
      chainLength: '—',
      customEngraving: "14K Stamping & engraving Dhiren'",
      quantity: 1,
      price: 1075,
      imageUrl: '',
    },
  ],
  subtotal: 1075,
  shippingFee: 60,
  total: 1135,
  baseProductionCost: 500,
  profit: 575,
  currentStageId: 'stage-8', // Shipping
  priority: 'High',
  status: 'Active',
  progressPercent: 88,
  assignedTo: 'Rajesh Sharma',
  dueDate: '2026-10-18',
  notesFromCustomer: 'No notes from customer.',
  internalNotes: 'Rush order for upcoming exhibition delivery. Priority laser engraving confirmed.',
  trackingNumber: '',
  trackingCarrier: 'FedEx Priority',
  trackingUrl: '',
  customerTrackingToken: 'tr_valam_928174',
  gallery: [],
  comments: [
    {
      id: 'c-1',
      author: 'Amit Patel',
      role: 'CAD Designer',
      text: 'CAD file generated and passed 3D inspection. Sent to RPT wax printing.',
      createdAt: '2026-09-24T14:20:00.000Z',
    },
    {
      id: 'c-2',
      author: 'Rajesh Sharma',
      role: 'Manufacturer',
      text: 'Casting in 14K white gold completed smoothly. Stones set and polished.',
      createdAt: '2026-10-02T16:45:00.000Z',
    },
  ],
  activity: [
    {
      id: 'act-1',
      description: 'Order imported from Shopify (#1001)',
      timestamp: '2026-09-22T08:14:00.000Z',
      actor: 'Shopify Webhook',
    },
    {
      id: 'act-2',
      description: 'Stage moved from New Orders to CAD Design',
      timestamp: '2026-09-23T09:30:00.000Z',
      actor: 'Dhiren Bhagvanbhai Savaliya',
    },
    {
      id: 'act-3',
      description: 'Stage moved from Factory to Quality Check',
      timestamp: '2026-10-08T11:00:00.000Z',
      actor: 'Rajesh Sharma',
    },
    {
      id: 'act-4',
      description: 'Stage moved to Shipping',
      timestamp: '2026-10-12T15:20:00.000Z',
      actor: 'Dhiren Bhagvanbhai Savaliya',
    },
  ],
  createdAt: '2026-09-22T08:14:00.000Z',
  updatedAt: '2026-10-12T15:20:00.000Z',
};

const DEFAULT_SETTINGS: WorkspaceSettings = {
  companyName: 'VALAM DESIGN',
  ownerName: 'Dhiren Bhagvanbhai Savaliya',
  email: 'valamdesignindia+0@gmail.com',
  phone: '+919930022492',
  currency: '$',
  shopify: {
    shopDomain: 'valamdesign.myshopify.com',
    webhookSecret: 'shpss_9f81a7b03e2c4d5e89a1b2c3d4e5f6',
    adminAccessToken: 'shpat_demo_secret_token',
    isConnected: true,
    lastSyncAt: '2026-10-12T15:00:00.000Z',
    autoSync: true,
  },
};

const DEFAULT_WEBHOOK_LOGS: WebhookLog[] = [
  {
    id: 'wh-1',
    topic: 'orders/create',
    shopifyOrderId: '58928371928',
    status: 'success',
    message: 'Order #1001 imported into New Orders successfully',
    receivedAt: '2026-09-22T08:14:00.000Z',
    payloadSummary: 'VALAM DESIGN - 14K Pendant ($1,135)',
  },
];

function initDatabase(): DatabaseData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseData = {
      settings: DEFAULT_SETTINGS,
      stages: DEFAULT_STAGES,
      users: DEFAULT_USERS,
      orders: [DEFAULT_ORDER],
      webhookLogs: DEFAULT_WEBHOOK_LOGS,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse database.json, re-initializing', error);
    const initialData: DatabaseData = {
      settings: DEFAULT_SETTINGS,
      stages: DEFAULT_STAGES,
      users: DEFAULT_USERS,
      orders: [DEFAULT_ORDER],
      webhookLogs: DEFAULT_WEBHOOK_LOGS,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

function saveDatabase(data: DatabaseData) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Memory cache
let dbCache: DatabaseData | null = null;

function getDB(): DatabaseData {
  if (!dbCache) {
    dbCache = initDatabase();
  }
  return dbCache;
}

export const db = {
  // Settings
  getSettings(): WorkspaceSettings {
    return getDB().settings;
  },
  updateSettings(partial: Partial<WorkspaceSettings>): WorkspaceSettings {
    const current = getDB();
    current.settings = { ...current.settings, ...partial };
    saveDatabase(current);
    return current.settings;
  },
  updateShopifyConfig(shopify: Partial<WorkspaceSettings['shopify']>): WorkspaceSettings {
    const current = getDB();
    current.settings.shopify = { ...current.settings.shopify, ...shopify };
    saveDatabase(current);
    return current.settings;
  },

  // Stages
  getStages(): PipelineStage[] {
    return getDB().stages.sort((a, b) => a.order - b.order);
  },
  saveStages(stages: PipelineStage[]): PipelineStage[] {
    const current = getDB();
    current.stages = stages.map((s, idx) => ({ ...s, order: idx + 1 }));
    saveDatabase(current);
    return current.stages;
  },
  addStage(name: string, roles: Role[]): PipelineStage {
    const current = getDB();
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name,
      order: current.stages.length + 1,
      roles,
    };
    current.stages.push(newStage);
    saveDatabase(current);
    return newStage;
  },
  deleteStage(id: string): boolean {
    const current = getDB();
    const index = current.stages.findIndex((s) => s.id === id);
    if (index === -1) return false;

    current.stages.splice(index, 1);
    // Re-index consecutive orders
    current.stages.forEach((s, idx) => {
      s.order = idx + 1;
    });

    // Re-assign any existing orders on this stage to the first stage
    if (current.stages.length > 0) {
      const fallbackStageId = current.stages[0].id;
      current.orders.forEach((o) => {
        if (o.currentStageId === id) {
          o.currentStageId = fallbackStageId;
        }
      });
    }

    saveDatabase(current);
    return true;
  },

  // Users
  getUsers(): User[] {
    return getDB().users;
  },
  addUser(name: string, email: string, role: Role): User {
    const current = getDB();
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };
    current.users.push(newUser);
    saveDatabase(current);
    return newUser;
  },

  // Orders
  getOrders(): Order[] {
    return getDB().orders;
  },
  getOrderById(id: string): Order | undefined {
    return getDB().orders.find((o) => o.id === id || o.customerTrackingToken === id);
  },
  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'customerTrackingToken' | 'gallery' | 'comments' | 'activity' | 'progressPercent'>): Order {
    const current = getDB();
    const stages = current.stages.sort((a, b) => a.order - b.order);
    const stageIndex = stages.findIndex((s) => s.id === orderData.currentStageId);
    const progressPercent = stageIndex >= 0 ? Math.round(((stageIndex + 1) / stages.length) * 100) : 10;

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      customerTrackingToken: `tr_${Math.random().toString(36).substring(2, 10)}`,
      progressPercent,
      gallery: [],
      comments: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          description: `Order created (${orderData.source === 'shopify' ? 'via Shopify Webhook' : 'Manual Entry'})`,
          timestamp: new Date().toISOString(),
          actor: orderData.source === 'shopify' ? 'Shopify' : 'Admin',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    current.orders.unshift(newOrder);
    saveDatabase(current);
    return newOrder;
  },
  updateOrder(id: string, updates: Partial<Order>, actorName: string = 'Admin'): Order | null {
    const current = getDB();
    const index = current.orders.findIndex((o) => o.id === id);
    if (index === -1) return null;

    const existing = current.orders[index];
    const stages = current.stages.sort((a, b) => a.order - b.order);

    let progressPercent = existing.progressPercent;
    if (updates.currentStageId && updates.currentStageId !== existing.currentStageId) {
      const stageIdx = stages.findIndex((s) => s.id === updates.currentStageId);
      progressPercent = stageIdx >= 0 ? Math.round(((stageIdx + 1) / stages.length) * 100) : existing.progressPercent;

      const targetStage = stages.find((s) => s.id === updates.currentStageId);
      existing.activity.unshift({
        id: `act-${Date.now()}`,
        description: `Stage moved to ${targetStage?.name || updates.currentStageId}`,
        timestamp: new Date().toISOString(),
        actor: actorName,
      });

      // If moved to completed/delivered stage, update status
      if (targetStage?.name.toLowerCase().includes('completed') || targetStage?.name.toLowerCase().includes('delivered')) {
        updates.status = 'Delivered';
      }
    }

    if (updates.trackingNumber && updates.trackingNumber !== existing.trackingNumber) {
      existing.activity.unshift({
        id: `act-${Date.now()}`,
        description: `Tracking number added: ${updates.trackingNumber} (${updates.trackingCarrier || 'Carrier'})`,
        timestamp: new Date().toISOString(),
        actor: actorName,
      });
    }

    const updated: Order = {
      ...existing,
      ...updates,
      progressPercent,
      updatedAt: new Date().toISOString(),
    };

    current.orders[index] = updated;
    saveDatabase(current);
    return updated;
  },
  addComment(orderId: string, author: string, role: Role, text: string): Order | null {
    const current = getDB();
    const order = current.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.comments.push({
      id: `comm-${Date.now()}`,
      author,
      role,
      text,
      createdAt: new Date().toISOString(),
    });
    order.updatedAt = new Date().toISOString();
    saveDatabase(current);
    return order;
  },
  addMedia(orderId: string, title: string, url: string, type: 'cad' | 'casting' | 'qc' | 'general'): Order | null {
    const current = getDB();
    const order = current.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.gallery.push({
      id: `med-${Date.now()}`,
      title,
      url,
      type,
      uploadedAt: new Date().toISOString(),
    });
    order.activity.unshift({
      id: `act-${Date.now()}`,
      description: `Uploaded media: ${title} (${type})`,
      timestamp: new Date().toISOString(),
      actor: 'Team Member',
    });
    order.updatedAt = new Date().toISOString();
    saveDatabase(current);
    return order;
  },
  deleteOrder(id: string): boolean {
    const current = getDB();
    const initialLen = current.orders.length;
    current.orders = current.orders.filter((o) => o.id !== id);
    if (current.orders.length !== initialLen) {
      saveDatabase(current);
      return true;
    }
    return false;
  },

  // Webhooks
  getWebhookLogs(): WebhookLog[] {
    return getDB().webhookLogs;
  },
  addWebhookLog(log: Omit<WebhookLog, 'id' | 'receivedAt'>): WebhookLog {
    const current = getDB();
    const newLog: WebhookLog = {
      ...log,
      id: `wh-${Date.now()}`,
      receivedAt: new Date().toISOString(),
    };
    current.webhookLogs.unshift(newLog);
    if (current.webhookLogs.length > 50) {
      current.webhookLogs.pop();
    }
    saveDatabase(current);
    return newLog;
  },
};
