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
import bundledDatabaseData from '../../data/database.json';

interface DatabaseData {
  settings: Record<string, WorkspaceSettings>;
  stages: PipelineStage[];
  users: (User & { password?: string })[];
  orders: Order[];
  webhookLogs: WebhookLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const TMP_DB_FILE = path.join('/tmp', 'trackerz_database.json');

export const TEMPLATE_STAGES = [
  { name: 'New Orders', order: 1, roles: ['Admin'] as Role[] },
  { name: 'CAD Design', order: 2, roles: ['Admin', 'CAD Designer'] as Role[] },
  { name: 'RPT', order: 3, roles: ['Admin'] as Role[] },
  { name: 'Casting', order: 4, roles: ['Admin', 'Manufacturer'] as Role[] },
  { name: 'Factory', order: 5, roles: ['Admin', 'Manufacturer'] as Role[] },
  { name: 'Quality Check', order: 6, roles: ['Admin', 'CAD Designer', 'Manufacturer'] as Role[] },
  { name: 'Packaging', order: 7, roles: ['Admin', 'Manufacturer'] as Role[] },
  { name: 'Shipping', order: 8, roles: ['Admin'] as Role[] },
  { name: 'Completed', order: 9, roles: ['Admin'] as Role[] },
];

function initDatabase(): DatabaseData {
  // Check /tmp file first if running in serverless (e.g. Vercel)
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        settings: parsed.settings || {},
        stages: Array.isArray(parsed.stages) ? parsed.stages : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        webhookLogs: Array.isArray(parsed.webhookLogs) ? parsed.webhookLogs : [],
      };
    }
  } catch {}

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        settings: parsed.settings || {},
        stages: Array.isArray(parsed.stages) ? parsed.stages : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        webhookLogs: Array.isArray(parsed.webhookLogs) ? parsed.webhookLogs : [],
      };
    }
  } catch (error) {
    console.warn('Filesystem read not available or failed, using bundled data:', error);
  }

  const initialData: DatabaseData = {
    settings: (bundledDatabaseData as any).settings || {},
    stages: (bundledDatabaseData as any).stages || [],
    users: (bundledDatabaseData as any).users || [],
    orders: (bundledDatabaseData as any).orders || [],
    webhookLogs: (bundledDatabaseData as any).webhookLogs || [],
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in serverless environments
  }

  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  } catch {}

  return initialData;
}

function saveDatabase(data: DatabaseData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // In-memory cache continues to serve the state even if filesystem is read-only
  }

  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
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
  // --- USERS & AUTH ---
  getUserByEmail(email: string): (User & { password?: string }) | undefined {
    const current = getDB();
    const clean = email.toLowerCase().trim();
    return current.users.find((u) => u.email.toLowerCase().trim() === clean);
  },

  getUserById(id: string): (User & { password?: string }) | undefined {
    return getDB().users.find((u) => u.id === id);
  },

  addUser(
    name: string,
    email: string,
    role: Role,
    password?: string,
    ownerId?: string,
    customId?: string
  ): User {
    const current = getDB();
    const cleanEmail = email.toLowerCase().trim();
    const existingIndex = current.users.findIndex((u) => u.email.toLowerCase().trim() === cleanEmail);

    const id = customId || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User & { password?: string } = {
      id,
      ownerId: ownerId || id,
      name: name.trim(),
      email: cleanEmail,
      role,
      password: password || '',
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      current.users[existingIndex] = newUser;
    } else {
      current.users.push(newUser);
    }

    saveDatabase(current);
    return {
      id: newUser.id,
      ownerId: newUser.ownerId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  },

  getUsers(ownerId: string): User[] {
    const current = getDB();
    return current.users
      .filter((u) => u.ownerId === ownerId || u.id === ownerId)
      .map(({ password, ...rest }) => rest);
  },

  // Initialize a new user workspace with default settings & stages
  initUserWorkspace(
    userId: string,
    fullName: string,
    email: string,
    companyName: string = '',
    phone: string = ''
  ): { settings: WorkspaceSettings; stages: PipelineStage[] } {
    const current = getDB();

    const newSettings: WorkspaceSettings = {
      userId,
      companyName: companyName.trim() || `${fullName}'s Atelier`,
      ownerName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      currency: '$',
      shopify: {
        shopDomain: '',
        webhookSecret: '',
        clientId: '',
        clientSecret: '',
        adminAccessToken: '',
        tokenExpiresAt: '',
        isConnected: false,
        lastSyncAt: '',
        autoSync: true,
      },
    };
    current.settings[userId] = newSettings;

    // Filter out any leftover stages for this user
    current.stages = current.stages.filter((s) => s.userId !== userId);

    // Create fresh template stages for this user
    const newStages: PipelineStage[] = TEMPLATE_STAGES.map((t, idx) => ({
      id: `stage-${userId}-${idx + 1}`,
      userId,
      name: t.name,
      order: t.order,
      roles: t.roles,
    }));
    current.stages.push(...newStages);

    saveDatabase(current);
    return { settings: newSettings, stages: newStages };
  },

  // --- SETTINGS ---
  getSettings(userId: string): WorkspaceSettings {
    const current = getDB();
    if (current.settings[userId]) {
      return current.settings[userId];
    }
    // Return a default workspace template if none found yet
    return {
      userId,
      companyName: 'My Jewelry Atelier',
      ownerName: '',
      email: '',
      phone: '',
      currency: '$',
      shopify: {
        shopDomain: '',
        webhookSecret: '',
        clientId: '',
        clientSecret: '',
        adminAccessToken: '',
        tokenExpiresAt: '',
        isConnected: false,
        lastSyncAt: '',
        autoSync: true,
      },
    };
  },

  getSettingsByShopDomain(shopDomain: string): { userId: string; settings: WorkspaceSettings } | null {
    const current = getDB();
    const clean = shopDomain.toLowerCase().trim();
    for (const [uid, s] of Object.entries(current.settings)) {
      if (s.shopify?.shopDomain && s.shopify.shopDomain.toLowerCase().trim() === clean) {
        return { userId: uid, settings: s };
      }
    }
    return null;
  },

  updateSettings(userId: string, partial: Partial<WorkspaceSettings>): WorkspaceSettings {
    const current = getDB();
    const existing = this.getSettings(userId);
    const updated: WorkspaceSettings = {
      ...existing,
      ...partial,
      userId,
      shopify: {
        ...existing.shopify,
        ...(partial.shopify || {}),
      },
    };
    current.settings[userId] = updated;
    saveDatabase(current);
    return updated;
  },

  updateShopifyConfig(userId: string, shopify: Partial<WorkspaceSettings['shopify']>): WorkspaceSettings {
    const current = getDB();
    const existing = this.getSettings(userId);
    existing.shopify = { ...existing.shopify, ...shopify };
    current.settings[userId] = existing;
    saveDatabase(current);
    return existing;
  },

  // --- STAGES ---
  getStages(userId: string): PipelineStage[] {
    const current = getDB();
    const userStages = current.stages.filter((s) => s.userId === userId);
    if (userStages.length > 0) {
      return userStages.sort((a, b) => a.order - b.order);
    }
    // Initialize if none exist
    const initialStages: PipelineStage[] = TEMPLATE_STAGES.map((t, idx) => ({
      id: `stage-${userId}-${idx + 1}`,
      userId,
      name: t.name,
      order: t.order,
      roles: t.roles,
    }));
    current.stages.push(...initialStages);
    saveDatabase(current);
    return initialStages;
  },

  saveStages(userId: string, stages: PipelineStage[]): PipelineStage[] {
    const current = getDB();
    current.stages = current.stages.filter((s) => s.userId !== userId);
    const updated = stages.map((s, idx) => ({ ...s, userId, order: idx + 1 }));
    current.stages.push(...updated);
    saveDatabase(current);
    return updated;
  },

  addStage(userId: string, name: string, roles: Role[]): PipelineStage {
    const current = getDB();
    const userStages = current.stages.filter((s) => s.userId === userId);
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      userId,
      name,
      order: userStages.length + 1,
      roles,
    };
    current.stages.push(newStage);
    saveDatabase(current);
    return newStage;
  },

  deleteStage(userId: string, id: string): boolean {
    const current = getDB();
    const index = current.stages.findIndex((s) => s.id === id && s.userId === userId);
    if (index === -1) return false;

    current.stages.splice(index, 1);
    const remaining = current.stages.filter((s) => s.userId === userId);
    remaining.forEach((s, idx) => {
      s.order = idx + 1;
    });

    if (remaining.length > 0) {
      const fallbackStageId = remaining[0].id;
      current.orders.forEach((o) => {
        if (o.userId === userId && o.currentStageId === id) {
          o.currentStageId = fallbackStageId;
        }
      });
    }

    saveDatabase(current);
    return true;
  },

  // --- ORDERS ---
  getOrders(userId: string): Order[] {
    const current = getDB();
    return current.orders.filter((o) => o.userId === userId);
  },

  getOrderById(id: string, userId?: string): Order | undefined {
    const current = getDB();
    if (userId) {
      return current.orders.find((o) => (o.id === id || o.customerTrackingToken === id) && o.userId === userId);
    }
    // Public customer tracking view
    return current.orders.find((o) => o.id === id || o.customerTrackingToken === id);
  },

  createOrder(
    userId: string,
    orderData: Omit<
      Order,
      'id' | 'createdAt' | 'updatedAt' | 'customerTrackingToken' | 'gallery' | 'comments' | 'activity' | 'progressPercent'
    >
  ): Order {
    const current = getDB();
    const stages = this.getStages(userId);
    const stageIndex = stages.findIndex((s) => s.id === orderData.currentStageId);
    const progressPercent = stageIndex >= 0 ? Math.round(((stageIndex + 1) / stages.length) * 100) : 10;

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
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

  updateOrder(
    userId: string,
    id: string,
    updates: Partial<Order>,
    actorName: string = 'Admin'
  ): Order | null {
    const current = getDB();
    const index = current.orders.findIndex((o) => o.id === id && o.userId === userId);
    if (index === -1) return null;

    const existing = current.orders[index];
    const stages = this.getStages(userId);

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

      if (
        targetStage?.name.toLowerCase().includes('completed') ||
        targetStage?.name.toLowerCase().includes('delivered')
      ) {
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

  addComment(id: string, author: string, role: Role, text: string): Order | null {
    const current = getDB();
    const order = current.orders.find((o) => o.id === id);
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

  addMedia(
    id: string,
    title: string,
    url: string,
    type: 'cad' | 'casting' | 'qc' | 'general'
  ): Order | null {
    const current = getDB();
    const order = current.orders.find((o) => o.id === id);
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

  deleteOrder(userId: string, id: string): boolean {
    const current = getDB();
    const initialLen = current.orders.length;
    current.orders = current.orders.filter((o) => !(o.id === id && o.userId === userId));
    if (current.orders.length !== initialLen) {
      saveDatabase(current);
      return true;
    }
    return false;
  },

  // --- WEBHOOK LOGS ---
  getWebhookLogs(userId: string): WebhookLog[] {
    const current = getDB();
    return current.webhookLogs.filter((w) => w.userId === userId);
  },

  addWebhookLog(userId: string, log: Omit<WebhookLog, 'id' | 'receivedAt'>): WebhookLog {
    const current = getDB();
    const newLog: WebhookLog = {
      ...log,
      id: `wh-${Date.now()}`,
      userId,
      receivedAt: new Date().toISOString(),
    };
    current.webhookLogs.unshift(newLog);
    if (current.webhookLogs.length > 100) {
      current.webhookLogs.pop();
    }
    saveDatabase(current);
    return newLog;
  },
};
