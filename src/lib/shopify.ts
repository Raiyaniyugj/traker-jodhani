import crypto from 'crypto';
import { db } from './store';
import { Order, OrderItem } from './types';

/**
 * Verify Shopify Webhook HMAC signature
 */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  secret: string
): boolean {
  if (!secret) {
    // If no secret configured in workshop, allow for testing
    return true;
  }
  if (!hmacHeader) {
    return false;
  }
  try {
    const hash = crypto
      .createHmac('sha256', secret.trim())
      .update(rawBody, 'utf8')
      .digest('base64');
    
    // Constant time buffer comparison
    const hashBuf = Buffer.from(hash, 'base64');
    const headerBuf = Buffer.from(hmacHeader, 'base64');
    if (hashBuf.length !== headerBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuf, headerBuf);
  } catch (err) {
    console.error('Error verifying Shopify HMAC:', err);
    return false;
  }
}

/**
 * Maps Shopify raw Order payload to Trackerz internal Order
 */
export function parseShopifyOrderPayload(payload: any): Order {
  const shopifyOrderId = String(payload.id || '');
  const orderNumber = payload.name || (payload.order_number ? `#${payload.order_number}` : `ORD-${Math.floor(1000 + Math.random() * 9000)}`);
  
  const customer = {
    name: payload.customer
      ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim() || payload.customer.email || 'Valued Customer'
      : (payload.shipping_address?.name || payload.billing_address?.name || 'Valued Customer'),
    email: payload.customer?.email || payload.email || payload.contact_email || 'client@example.com',
    phone: payload.customer?.phone || payload.shipping_address?.phone || payload.billing_address?.phone || '+91 99300 22492',
  };

  const shippingAddress = {
    address1: payload.shipping_address?.address1 || '',
    address2: payload.shipping_address?.address2 || '',
    city: payload.shipping_address?.city || '',
    province: payload.shipping_address?.province || '',
    zip: payload.shipping_address?.zip || '',
    country: payload.shipping_address?.country || 'India',
  };

  const billingAddress = {
    address1: payload.billing_address?.address1 || shippingAddress.address1,
    city: payload.billing_address?.city || shippingAddress.city,
    province: payload.billing_address?.province || shippingAddress.province,
    zip: payload.billing_address?.zip || shippingAddress.zip,
    country: payload.billing_address?.country || shippingAddress.country,
  };

  const lineItems: OrderItem[] = (payload.line_items || []).map((li: any, idx: number) => {
    // Extract custom properties (e.g. Ring Size, Metal Type, Diamond Shape, Carat, Engraving)
    const props: Record<string, string> = {};
    if (Array.isArray(li.properties)) {
      li.properties.forEach((p: any) => {
        if (p && p.name && p.value !== undefined) {
          props[String(p.name).toLowerCase().trim()] = String(p.value).trim();
        }
      });
    }

    const titleLower = (li.title || '').toLowerCase();
    const variantLower = (li.variant_title || '').toLowerCase();

    // Smart metal inference
    let metalType = props['metal'] || props['metal type'] || props['purity'];
    if (!metalType) {
      if (variantLower.includes('18k') || titleLower.includes('18k')) metalType = '18K';
      else if (variantLower.includes('14k') || titleLower.includes('14k')) metalType = '14K';
      else if (variantLower.includes('10k') || titleLower.includes('10k')) metalType = '10K';
      else if (variantLower.includes('platinum') || titleLower.includes('platinum')) metalType = 'Platinum';
      else if (variantLower.includes('silver') || titleLower.includes('silver')) metalType = 'Silver 925';
      else metalType = '14K';
    }

    // Smart color inference
    let metalColor = props['color'] || props['metal color'];
    if (!metalColor) {
      if (variantLower.includes('white') || titleLower.includes('white')) metalColor = 'White gold';
      else if (variantLower.includes('rose') || titleLower.includes('rose')) metalColor = 'Rose gold';
      else if (variantLower.includes('yellow') || titleLower.includes('yellow')) metalColor = 'Yellow gold';
      else metalColor = 'White gold';
    }

    // Smart shape inference
    let diamondShape = props['shape'] || props['diamond shape'];
    if (!diamondShape) {
      if (variantLower.includes('oval') || titleLower.includes('oval')) diamondShape = 'Oval';
      else if (variantLower.includes('emerald') || titleLower.includes('emerald')) diamondShape = 'Emerald';
      else if (variantLower.includes('pear') || titleLower.includes('pear')) diamondShape = 'Pear';
      else if (variantLower.includes('cushion') || titleLower.includes('cushion')) diamondShape = 'Cushion';
      else if (variantLower.includes('radiant') || titleLower.includes('radiant')) diamondShape = 'Radiant';
      else diamondShape = 'Round';
    }

    const diamondSize = props['carat'] || props['carat weight'] || props['diamond size'] || props['size'] || '1.20';
    const chainLength = props['chain length'] || props['chain'] || '—';
    const customEngraving = props['engraving'] || props['custom engraving'] || props['stamping'] || '';

    // Smart product type
    let productType = li.product_type;
    if (!productType) {
      if (titleLower.includes('ring')) productType = 'Ring';
      else if (titleLower.includes('pendant')) productType = 'Pendant';
      else if (titleLower.includes('necklace')) productType = 'Necklace';
      else if (titleLower.includes('bracelet')) productType = 'Bracelet';
      else if (titleLower.includes('earring')) productType = 'Earrings';
      else productType = 'Bespoke Jewelry';
    }

    return {
      id: `li-${idx}-${li.id || Date.now()}`,
      title: li.title || 'Custom Fine Jewelry',
      productType,
      variantTitle: li.variant_title || `${metalType} ${metalColor}`,
      sku: li.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      metalType,
      metalColor,
      diamondShape,
      diamondSize,
      chainLength,
      customEngraving,
      quantity: li.quantity || 1,
      price: parseFloat(li.price || '0'),
      imageUrl: li.image?.src || (li.image_url ? li.image_url : ''),
      shopifyProductId: li.product_id,
    };
  });

  const subtotal = parseFloat(payload.subtotal_price || payload.total_line_items_price || '0');
  const shippingFee = parseFloat(
    payload.total_shipping_price_set?.shop_money?.amount ||
    payload.total_shipping_price ||
    '0'
  );
  const total = parseFloat(payload.total_price || (subtotal + shippingFee).toString()) || subtotal || 1000;
  
  // Jewelry workshop standard: base manufacturing cost ~45-50%
  const baseProductionCost = Math.round(total * 0.45);
  const profit = Math.round(total - baseProductionCost - shippingFee);

  const stages = db.getStages();
  const firstStage = stages[0]?.id || 'stage-1';

  return {
    id: `ord-shopify-${shopifyOrderId || Date.now()}`,
    orderNumber,
    shopifyOrderId,
    shopifyOrderNumber: payload.name || (payload.order_number ? `#${payload.order_number}` : orderNumber),
    source: 'shopify',
    customer,
    shippingAddress,
    billingAddress,
    items: lineItems.length > 0 ? lineItems : [
      {
        id: `item-${Date.now()}`,
        title: 'Bespoke Jewelry Order',
        productType: 'Pendant',
        metalType: '14K',
        metalColor: 'White gold',
        diamondShape: 'Round',
        diamondSize: '1.20',
        chainLength: '—',
        customEngraving: '14K Stamped',
        quantity: 1,
        price: total,
      }
    ],
    subtotal: subtotal || total,
    shippingFee,
    total,
    baseProductionCost,
    profit,
    currentStageId: firstStage,
    priority: total > 2000 ? 'High' : 'Medium',
    status: 'Active',
    progressPercent: Math.round((1 / (stages.length || 9)) * 100),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notesFromCustomer: payload.note || 'No notes from customer.',
    internalNotes: `Auto-imported from Shopify store. Ready for CAD design.`,
    customerTrackingToken: `tr_${Math.random().toString(36).substring(2, 10)}`,
    gallery: [],
    comments: [
      {
        id: `c-${Date.now()}`,
        author: 'Shopify System',
        role: 'Admin',
        text: `Order ${orderNumber} received from Shopify. Customer: ${customer.name}. Paid: $${total}.`,
        createdAt: new Date().toISOString(),
      }
    ],
    activity: [
      {
        id: `act-${Date.now()}`,
        description: `Order ${orderNumber} imported into New Orders via Shopify Webhook`,
        timestamp: new Date().toISOString(),
        actor: 'Shopify Webhook',
      }
    ],
    createdAt: payload.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Call Shopify REST Admin API to test credentials
 */
export async function testShopifyConnection(shopDomain: string, accessToken: string) {
  const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanDomain}/admin/api/2024-01/shop.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Shopify responded with HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    return { success: true, shop: data.shop };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error connecting to Shopify' };
  }
}

/**
 * Call Shopify REST Admin API to fetch live open orders
 */
export async function fetchShopifyOrders(shopDomain: string, accessToken: string) {
  const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${cleanDomain}/admin/api/2024-01/orders.json?status=open&limit=25`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch orders (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.orders || [];
  } catch (error: any) {
    throw error;
  }
}

/**
 * Helper to generate a realistic simulated Shopify order for testing
 */
export function generateMockShopifyOrder() {
  const randomNum = Math.floor(1002 + Math.random() * 8998);
  const sampleProducts = [
    {
      title: 'Solitaire Oval Diamond Engagement Ring',
      productType: 'Ring',
      variant: '18K Yellow Gold / 2.05ct F-VS1',
      metal: '18K',
      color: 'Yellow gold',
      shape: 'Oval',
      carat: '2.05',
      price: 2450,
      engraving: 'Forever & Always',
    },
    {
      title: 'Bespoke Emerald Cut Tennis Bracelet',
      productType: 'Bracelet',
      variant: '14K White Gold / 5.50ctw DEF-VVS',
      metal: '14K',
      color: 'White gold',
      shape: 'Emerald',
      carat: '5.50',
      price: 3800,
      engraving: 'J & M 2026',
    },
    {
      title: 'Pavé Halo Diamond Pendant',
      productType: 'Pendant',
      variant: '14K Rose Gold / 1.50ct',
      metal: '14K',
      color: 'Rose gold',
      shape: 'Round',
      carat: '1.50',
      price: 1350,
      engraving: 'Valam Bespoke',
    },
    {
      title: 'VALAM DESIGN Custom Monogram Pendant',
      productType: 'Pendant',
      variant: '14K White Gold / 1.20ct',
      metal: '14K',
      color: 'White gold',
      shape: 'Round',
      carat: '1.20',
      price: 1075,
      engraving: "14K Stamping & engraving Dhiren'",
    },
  ];

  const chosen = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
  const customerNames = [
    { first: 'Dhiren', last: 'Savaliya', email: 'valamdesignindia+0@gmail.com', phone: '+91 99300 22492' },
    { first: 'Aarav', last: 'Mehta', email: 'aarav.mehta@example.com', phone: '+91 98251 22334' },
    { first: 'Sophia', last: 'Laurent', email: 'sophia.laurent@luxurygems.fr', phone: '+33 6 12 34 56 78' },
    { first: 'Marcus', last: 'Vance', email: 'mvance@manhattanfinejewels.com', phone: '+1 212 555 0192' },
  ];
  const cust = customerNames[Math.floor(Math.random() * customerNames.length)];

  return {
    id: `${Date.now()}`,
    name: `#${randomNum}`,
    order_number: randomNum,
    created_at: new Date().toISOString(),
    customer: {
      first_name: cust.first,
      last_name: cust.last,
      email: cust.email,
      phone: cust.phone,
    },
    shipping_address: {
      name: `${cust.first} ${cust.last}`,
      address1: '402, Royal Diamond Plaza, Mini Bazar',
      city: 'Surat',
      province: 'Gujarat',
      zip: '395006',
      country: 'India',
      phone: cust.phone,
    },
    billing_address: {
      name: `${cust.first} ${cust.last}`,
      address1: '402, Royal Diamond Plaza, Mini Bazar',
      city: 'Surat',
      province: 'Gujarat',
      zip: '395006',
      country: 'India',
    },
    subtotal_price: chosen.price.toString(),
    total_shipping_price: '60.00',
    total_price: (chosen.price + 60).toString(),
    note: chosen.engraving ? `Custom Inscription: ${chosen.engraving}` : 'Handle with care. Luxury box packaging.',
    line_items: [
      {
        id: Date.now(),
        title: chosen.title,
        product_type: chosen.productType,
        variant_title: chosen.variant,
        sku: `JOD-${chosen.productType.toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`,
        price: chosen.price.toString(),
        quantity: 1,
        properties: [
          { name: 'Metal Type', value: chosen.metal },
          { name: 'Metal Color', value: chosen.color },
          { name: 'Diamond Shape', value: chosen.shape },
          { name: 'Carat Weight', value: chosen.carat },
          { name: 'Engraving', value: chosen.engraving },
        ],
      },
    ],
  };
}
