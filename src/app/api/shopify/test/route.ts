import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { testShopifyConnection, normalizeShopifyDomain } from '@/lib/shopify';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const body = await req.json();
    const { shopDomain, adminAccessToken, webhookSecret } = body;

    // Disconnect request
    if (shopDomain === '') {
      const updated = db.updateShopifyConfig(workspaceId, {
        shopDomain: '',
        webhookSecret: '',
        adminAccessToken: '',
        isConnected: false,
        lastError: '',
        lastSuccessMessage: '',
      });

      const d1 = getD1Database();
      if (d1) {
        await d1Store.updateSettings(d1, workspaceId, updated);
      }

      return NextResponse.json({
        success: true,
        message: 'Shopify store disconnected successfully.',
        isConnected: false,
      });
    }

    const cleanDomain = normalizeShopifyDomain(shopDomain);
    if (!cleanDomain) {
      const errorMsg = 'Please enter your unique store name (e.g., yourstore.myshopify.com or yourstore). "admin.shopify.com" is Shopify\'s admin portal, not your store domain.';
      db.updateShopifyConfig(workspaceId, {
        isConnected: false,
        lastError: errorMsg,
      });
      return NextResponse.json({
        success: false,
        error: errorMsg,
        problemReason: errorMsg,
      }, { status: 400 });
    }

    // If an access token is provided, test live connection first
    let verifiedShopName = cleanDomain;
    if (adminAccessToken && !adminAccessToken.includes('demo')) {
      const result = await testShopifyConnection(cleanDomain, adminAccessToken);
      if (!result.success) {
        const errorMsg = result.error || 'Could not verify credentials with Shopify';
        // Persist failure reason so dashboard & settings reflect the problem
        const updated = db.updateShopifyConfig(workspaceId, {
          shopDomain: cleanDomain,
          adminAccessToken: adminAccessToken.trim(),
          webhookSecret: (webhookSecret || '').trim(),
          isConnected: false,
          lastError: errorMsg,
        });
        const d1 = getD1Database();
        if (d1) {
          await d1Store.updateSettings(d1, workspaceId, updated);
        }

        return NextResponse.json({
          success: false,
          error: errorMsg,
          problemReason: errorMsg,
          isConnected: false,
        }, { status: 400 });
      }
      if (result.shop?.name) {
        verifiedShopName = result.shop.name;
      }
    }

    // Save successful configuration
    const successMsg = `Shopify store ${cleanDomain} connected successfully! Live webhook endpoint is ready.`;
    const updated = db.updateShopifyConfig(workspaceId, {
      shopDomain: cleanDomain,
      webhookSecret: (webhookSecret || '').trim(),
      adminAccessToken: (adminAccessToken || '').trim(),
      isConnected: true,
      lastError: '',
      lastSuccessMessage: successMsg,
      lastSyncAt: new Date().toISOString(),
    });

    const d1 = getD1Database();
    if (d1) {
      await d1Store.updateSettings(d1, workspaceId, updated);
    }

    return NextResponse.json({
      success: true,
      message: successMsg,
      shopDomain: cleanDomain,
      shopName: verifiedShopName,
      isConnected: true,
    });
  } catch (error: any) {
    console.error('Shopify test error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
