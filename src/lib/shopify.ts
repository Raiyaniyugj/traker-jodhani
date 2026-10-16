import crypto from 'crypto';
import { db } from './store';
import { Order, OrderItem, OrderMedia } from './types';

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
export function parseShopifyOrderPayload(payload: any, userId?: string): Order {
  const shopifyOrderId = String(payload.id || '');
  const orderNumber = payload.name || (payload.order_number ? `#${payload.order_number}` : `ORD-${Math.floor(1000 + Math.random() * 9000)}`);
  
  const customer = {
    name: payload.customer
      ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim() || payload.customer.email || 'Customer'
      : (payload.shipping_address?.name || payload.billing_address?.name || 'Customer'),
    email: payload.customer?.email || payload.email || payload.contact_email || '',
    phone: payload.customer?.phone || payload.shipping_address?.phone || payload.billing_address?.phone || '',
  };

  const shippingAddress = {
    address1: payload.shipping_address?.address1 || '',
    address2: payload.shipping_address?.address2 || '',
    city: payload.shipping_address?.city || '',
    province: payload.shipping_address?.province || '',
    zip: payload.shipping_address?.zip || '',
    country: payload.shipping_address?.country || '',
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
      imageUrl: li.image_url || li.image?.src || li.image?.url || (Array.isArray(li.product_images) ? li.product_images[0] : ''),
      shopifyProductId: li.product_id,
    };
  });

  // Gallery is strictly reserved for workshop artisan production uploads (CAD renders, casting photos, QC)
  const galleryItems: OrderMedia[] = [];


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

  const firstStage = userId ? `stg_${userId}_1` : 'stage-1';

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
    progressPercent: 11,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notesFromCustomer: payload.note || 'No notes from customer.',
    internalNotes: `Auto-imported from Shopify store. Ready for CAD design.`,
    customerTrackingToken: `tr_${Math.random().toString(36).substring(2, 10)}`,
    gallery: galleryItems,
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
 * Normalize whatever the user inputs for Shopify domain:
 * - mystore -> mystore.myshopify.com
 * - https://mystore.myshopify.com/ -> mystore.myshopify.com
 * - https://admin.shopify.com/store/mystore -> mystore.myshopify.com
 * - admin.shopify.com -> empty (invalid)
 */
export function normalizeShopifyDomain(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().toLowerCase();
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  // If user pasted admin.shopify.com/store/<store-name>
  const adminMatch = cleaned.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/i);
  if (adminMatch && adminMatch[1]) {
    return `${adminMatch[1]}.myshopify.com`;
  }

  // If literally just admin.shopify.com without store name
  if (cleaned === 'admin.shopify.com') {
    return '';
  }

  // If user pasted <store-name>.myshopify.com/...
  const myshopifyMatch = cleaned.match(/^([a-z0-9-]+)\.myshopify\.com/i);
  if (myshopifyMatch && myshopifyMatch[1]) {
    return `${myshopifyMatch[1]}.myshopify.com`;
  }

  // If user entered just the store slug without dots (e.g., 'mystore' or 'custom-atelier')
  if (!cleaned.includes('.')) {
    return `${cleaned}.myshopify.com`;
  }

  return cleaned;
}

/**
 * Call Shopify REST Admin API to test credentials
 */
export async function testShopifyConnection(shopDomain: string, accessToken: string) {
  const cleanDomain = normalizeShopifyDomain(shopDomain);
  if (!cleanDomain) {
    return {
      success: false,
      error: 'Invalid shop domain. Please provide your store name or .myshopify.com address (e.g. yourstore.myshopify.com).',
    };
  }

  const trimmedToken = (accessToken || '').trim();
  if (!trimmedToken) {
    return {
      success: false,
      error: 'Admin API Access Token is empty. A valid token starting with "shpat_" is required to test and sync orders.',
    };
  }

  const url = `https://${cleanDomain}/admin/api/2024-01/shop.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': trimmedToken,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let clearReason = '';
      if (res.status === 401) {
        clearReason = 'Shopify rejected credentials (HTTP 401 Unauthorized): Invalid or expired Admin API Access Token. Ensure the token starts with "shpat_" and was generated with "read_orders" scope.';
      } else if (res.status === 403) {
        clearReason = 'Access forbidden (HTTP 403 Forbidden): Your custom app lacks permission. In Shopify Admin → Apps → Develop apps, grant the "read_orders" scope.';
      } else if (res.status === 404) {
        clearReason = `Shopify store "${cleanDomain}" not found (HTTP 404 Not Found): Verify that the .myshopify.com store domain is spelled correctly.`;
      } else if (res.status === 429) {
        clearReason = 'Shopify API rate limit exceeded (HTTP 429): Please wait a minute and try again.';
      } else {
        clearReason = `Shopify API returned error HTTP ${res.status}: ${errText.slice(0, 150)}`;
      }
      return { success: false, error: clearReason, statusCode: res.status };
    }

    const data = await res.json();
    return { success: true, shop: data.shop, domain: cleanDomain };
  } catch (error: any) {
    return {
      success: false,
      error: `Network error reaching https://${cleanDomain}: ${error.message || 'Unable to contact Shopify servers.'}`,
    };
  }
}

/**
 * Call Shopify REST Admin API to fetch live open orders
 */
export async function fetchShopifyOrders(shopDomain: string, accessToken: string) {
  const cleanDomain = normalizeShopifyDomain(shopDomain);
  if (!cleanDomain) {
    throw new Error('Invalid shop domain. Please provide your store name or .myshopify.com address.');
  }

  // 1. Try GraphQL first to get orders with line item images and product gallery images
  try {
    let allNodes: any[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    let pageCount = 0;

    while (hasNextPage && pageCount < 5) {
      pageCount++;
      const afterClause: string = endCursor ? `, after: "${endCursor}"` : '';
      const gqlQuery = `{
        orders(first: 250, sortKey: CREATED_AT, reverse: true${afterClause}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            legacyResourceId
            name
            createdAt
            note
            totalPriceSet { shopMoney { amount currencyCode } }
            subtotalPriceSet { shopMoney { amount } }
            totalShippingPriceSet { shopMoney { amount } }
            customer { firstName lastName email phone }
            shippingAddress { address1 address2 city province zip country }
            billingAddress { address1 address2 city province zip country }
            lineItems(first: 20) {
              nodes {
                id
                title
                quantity
                originalUnitPriceSet { shopMoney { amount } }
                variantTitle
                sku
                customAttributes { key value }
                image { url }
                product {
                  id
                  productType
                  featuredImage { url }
                  images(first: 8) { nodes { url } }
                }
              }
            }
          }
        }
      }`;

      const gqlRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: gqlQuery }),
      });

      if (!gqlRes.ok) break;

      const gqlData = await gqlRes.json();
      const pageData = gqlData?.data?.orders;
      const nodes = pageData?.nodes;
      if (Array.isArray(nodes)) {
        allNodes = allNodes.concat(nodes);
      }
      hasNextPage = Boolean(pageData?.pageInfo?.hasNextPage);
      endCursor = pageData?.pageInfo?.endCursor || null;
      if (!endCursor) break;
    }

    if (allNodes.length > 0) {
      return allNodes.map((node: any) => {
        const rawId = node.legacyResourceId || String(node.id || '').replace('gid://shopify/Order/', '');
        const lineItems = (node.lineItems?.nodes || []).map((li: any) => {
          const prodImages = (li.product?.images?.nodes || []).map((img: any) => img.url).filter(Boolean);
          const featuredImg = li.image?.url || li.product?.featuredImage?.url || prodImages[0] || '';
          const props = (li.customAttributes || []).map((attr: any) => ({
            name: attr.key,
            value: attr.value,
          }));

          return {
            id: String(li.id || '').replace('gid://shopify/LineItem/', ''),
            title: li.title,
            quantity: li.quantity || 1,
            price: li.originalUnitPriceSet?.shopMoney?.amount || '0',
            variant_title: li.variantTitle || '',
            sku: li.sku || '',
            product_type: li.product?.productType || '',
            image_url: featuredImg,
            image: { src: featuredImg },
            product_images: prodImages,
            properties: props,
          };
        });

        return {
          id: rawId,
          name: node.name,
          order_number: node.name?.replace('#', '') || rawId,
          created_at: node.createdAt,
          note: node.note || '',
          total_price: node.totalPriceSet?.shopMoney?.amount || '0',
          subtotal_price: node.subtotalPriceSet?.shopMoney?.amount || '0',
          total_shipping_price: node.totalShippingPriceSet?.shopMoney?.amount || '0',
          customer: node.customer
            ? {
                first_name: node.customer.firstName || '',
                last_name: node.customer.lastName || '',
                email: node.customer.email || '',
                phone: node.customer.phone || '',
              }
            : null,
          shipping_address: node.shippingAddress || null,
          billing_address: node.billingAddress || null,
          line_items: lineItems,
        };
      });
    }
  } catch (gqlErr) {
    console.warn('GraphQL fetch orders error, falling back to REST:', gqlErr);
  }

  // 2. Fallback to REST API
  const url = `https://${cleanDomain}/admin/api/2024-01/orders.json?status=any&limit=250`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken.trim(),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    let hint = '';
    if (res.status === 401) {
      hint = ' [Invalid Admin API Token or missing read_orders scope]';
    } else if (res.status === 404) {
      hint = ' [Store domain not found]';
    }
    throw new Error(`Shopify API error (${res.status})${hint}: ${errText}`);
  }

  const data = await res.json();
  return data.orders || [];
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
      engraving: 'Custom Monogram',
    },
    {
      title: 'Solitaire Diamond Pendant',
      productType: 'Pendant',
      variant: '14K White Gold / 1.20ct',
      metal: '14K',
      color: 'White gold',
      shape: 'Round',
      carat: '1.20',
      price: 1075,
      engraving: '14K Stamped',
    },
  ];

  const chosen = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
  const customerNames = [
    { first: 'Emma', last: 'Watson', email: 'emma.watson@example.com', phone: '+1 212 555 0143' },
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
      address1: '100 Diamond District Blvd',
      city: 'New York',
      province: 'NY',
      zip: '10036',
      country: 'United States',
      phone: cust.phone,
    },
    billing_address: {
      name: `${cust.first} ${cust.last}`,
      address1: '100 Diamond District Blvd',
      city: 'New York',
      province: 'NY',
      zip: '10036',
      country: 'United States',
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

/**
 * Automatically enriches an Order with high-res product photos from Shopify GraphQL.
 * Handles both existing products and custom/deleted copytest products by keyword matching in the store catalog.
 */
export async function enrichOrderWithShopifyImages(
  order: Order,
  shopDomain: string,
  accessToken: string
): Promise<Order> {
  const cleanDomain = normalizeShopifyDomain(shopDomain);
  if (!cleanDomain || !accessToken) return order;

  // If order already has item imageUrl, return as is
  if (order.items?.[0]?.imageUrl) {
    return order;
  }


  try {
    let imagesFound: string[] = [];

    // 1. Try querying the Shopify Order directly via GraphQL if shopifyOrderId exists
    if (order.shopifyOrderId) {
      const gqlQuery = `{
        order(id: "gid://shopify/Order/${order.shopifyOrderId}") {
          lineItems(first: 10) {
            nodes {
              id
              title
              image { url }
              product {
                featuredImage { url }
                images(first: 8) { nodes { url } }
              }
            }
          }
        }
      }`;

      const res = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: gqlQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        const lineNodes = data?.data?.order?.lineItems?.nodes || [];
        for (const li of lineNodes) {
          if (li.image?.url && !imagesFound.includes(li.image.url)) {
            imagesFound.push(li.image.url);
          }
          if (li.product?.featuredImage?.url && !imagesFound.includes(li.product.featuredImage.url)) {
            imagesFound.push(li.product.featuredImage.url);
          }
          if (Array.isArray(li.product?.images?.nodes)) {
            li.product.images.nodes.forEach((img: any) => {
              if (img?.url && !imagesFound.includes(img.url)) {
                imagesFound.push(img.url);
              }
            });
          }
        }
      }
    }

    // 2. Fallback: If no images found from the direct order (e.g. custom product, deleted product, copytest),
    // search the Shopify catalog by keywords extracted from line items
    if (imagesFound.length === 0) {
      const searchTerms: string[] = [];
      (order.items || []).forEach((item) => {
        // Strip "(copy)", "(copytest)", numbers, punctuation
        const cleanTitle = item.title
          .replace(/\(copy[^)]*\)/gi, '')
          .replace(/[^a-zA-Z0-9\s]/g, ' ')
          .trim();
        const words = cleanTitle.split(/\s+/).filter((w) => w.length > 3);
        if (words.length > 0) searchTerms.push(words.slice(0, 3).join(' '));
      });

      const primaryQuery = searchTerms[0] || order.items?.[0]?.productType || 'Jewelry';
      const searchGql = `{
        products(first: 3, query: "${primaryQuery.replace(/"/g, '')}") {
          nodes {
            featuredImage { url }
            images(first: 6) { nodes { url } }
          }
        }
      }`;

      const searchRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchGql }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const prodNodes = searchData?.data?.products?.nodes || [];
        for (const prod of prodNodes) {
          if (prod.featuredImage?.url && !imagesFound.includes(prod.featuredImage.url)) {
            imagesFound.push(prod.featuredImage.url);
          }
          if (Array.isArray(prod.images?.nodes)) {
            prod.images.nodes.forEach((img: any) => {
              if (img?.url && !imagesFound.includes(img.url)) {
                imagesFound.push(img.url);
              }
            });
          }
          if (imagesFound.length >= 6) break;
        }
      }
    }

    // 3. Fallback 2: If still no images found, get any high-res product photos from the store catalog
    if (imagesFound.length === 0) {
      const anyGql = `{
        products(first: 1) {
          nodes {
            featuredImage { url }
            images(first: 6) { nodes { url } }
          }
        }
      }`;
      const anyRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: anyGql }),
      });
      if (anyRes.ok) {
        const anyData = await anyRes.json();
        const firstProd = anyData?.data?.products?.nodes?.[0];
        if (firstProd) {
          if (firstProd.featuredImage?.url) imagesFound.push(firstProd.featuredImage.url);
          (firstProd.images?.nodes || []).forEach((img: any) => {
            if (img?.url && !imagesFound.includes(img.url)) imagesFound.push(img.url);
          });
        }
      }
    }

    // Only set single primary product photo on items[0].imageUrl. Do NOT populate order.gallery
    if (imagesFound.length > 0) {
      const updatedItems = (order.items || []).map((item, idx) => ({
        ...item,
        imageUrl: item.imageUrl || (idx === 0 ? imagesFound[0] : item.imageUrl),
      }));

      return {
        ...order,
        items: updatedItems,
      };
    }

  } catch (err) {
    console.warn('Error enriching order with Shopify images:', err);
  }

  return order;
}

