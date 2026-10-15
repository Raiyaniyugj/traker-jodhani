export type Role = 'Admin' | 'CAD Designer' | 'Manufacturer' | 'QC Manager';

export type OrderPriority = 'Low' | 'Medium' | 'High';
export type OrderStatus = 'Active' | 'On Hold' | 'Delivered' | 'Cancelled';

export interface PipelineStage {
  id: string;
  userId?: string;
  name: string;
  order: number;
  roles: Role[];
}

export interface User {
  id: string;
  ownerId?: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  title: string;
  productType?: string;
  variantTitle?: string;
  sku?: string;
  metalType?: string;
  metalColor?: string;
  diamondShape?: string;
  diamondSize?: string;
  chainLength?: string;
  customEngraving?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  shopifyProductId?: string | number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
}

export interface Address {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
}

export interface OrderComment {
  id: string;
  author: string;
  role: Role;
  text: string;
  createdAt: string;
}

export interface OrderMedia {
  id: string;
  title: string;
  url: string;
  type: 'cad' | 'casting' | 'qc' | 'general';
  uploadedAt: string;
}

export interface OrderActivity {
  id: string;
  description: string;
  timestamp: string;
  actor: string;
}

export interface Order {
  id: string;
  userId?: string;
  orderNumber: string; // e.g. "#1001"
  shopifyOrderId?: string;
  shopifyOrderNumber?: string;
  source: 'manual' | 'shopify';
  customer: Customer;
  shippingAddress: Address;
  billingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  baseProductionCost: number;
  profit: number;
  currentStageId: string;
  priority: OrderPriority;
  status: OrderStatus;
  progressPercent: number;
  assignedTo?: string;
  dueDate?: string;
  notesFromCustomer?: string;
  internalNotes?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  customerTrackingToken: string; // token for public viewing
  gallery: OrderMedia[];
  comments: OrderComment[];
  activity: OrderActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyConfig {
  shopDomain: string; // e.g. your-store.myshopify.com
  webhookSecret: string; // shpss_...
  adminAccessToken?: string; // shpat_...
  isConnected: boolean;
  lastSyncAt?: string;
  autoSync: boolean;
  lastError?: string;
  lastSuccessMessage?: string;
}

export interface ShopifyDiagnosticItem {
  ok: boolean;
  label: string;
  detail: string;
}

export interface ShopifyConnectionStatus {
  isConnected: boolean;
  status: 'connected' | 'error' | 'not_configured' | 'action_required';
  statusTitle: string;
  shopDomain: string;
  shopifyOrdersCount: number;
  problemReason: string | null;
  recommendation: string | null;
  lastSyncAt?: string;
  lastError?: string;
  diagnostics: {
    domain: ShopifyDiagnosticItem;
    token: ShopifyDiagnosticItem;
    webhook: ShopifyDiagnosticItem;
    orders: ShopifyDiagnosticItem & { count: number };
  };
}

export interface WebhookLog {
  id: string;
  userId?: string;
  topic: string;
  shopifyOrderId?: string;
  status: 'success' | 'failed' | 'ignored';
  message: string;
  receivedAt: string;
  payloadSummary?: string;
}

export interface WorkspaceSettings {
  userId?: string;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  currency: string; // $, ₹, etc.
  shopify: ShopifyConfig;
}
