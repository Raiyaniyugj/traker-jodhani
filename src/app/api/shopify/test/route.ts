import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { testShopifyConnection, normalizeShopifyDomain, exchangeClientCredentialsForToken } from '@/lib/shopify';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const body = await req.json();
    const { shopDomain, adminAccessToken, webhookSecret, clientId, clientSecret } = body;

    // Disconnect request
    if (shopDomain === '') {
      db.updateShopifyConfig(workspaceId, {
        shopDomain: '',
        webhookSecret: '',
        clientId: '',
        clientSecret: '',
        adminAccessToken: '',
        tokenExpiresAt: '',
        isConnected: false,
        lastError: '',
        lastSuccessMessage: '',
      });

      const d1 = getD1Database();
      if (d1) {
        await d1Store.disconnectShopify(d1, workspaceId);
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

    const d1 = getD1Database();
    let existingSettings: any = null;
    if (d1) {
      existingSettings = await d1Store.getSettings(d1, workspaceId);
      if (existingSettings) {
        db.updateSettings(workspaceId, existingSettings);
      }
    }
    if (!existingSettings) {
      existingSettings = db.getSettings(workspaceId);
    }

    const effectiveToken = adminAccessToken !== undefined
      ? (adminAccessToken || '').trim()
      : (existingSettings?.shopify?.adminAccessToken || '');
    const effectiveSecret = webhookSecret !== undefined
      ? (webhookSecret || '').trim()
      : (existingSettings?.shopify?.webhookSecret || '');

    const effectiveClientId = (clientId !== undefined ? clientId : (existingSettings?.shopify?.clientId || '')).trim() || (process.env.SHOPIFY_CLIENT_ID || '');
    let effectiveClientSecret = (clientSecret !== undefined ? clientSecret : (existingSettings?.shopify?.clientSecret || '')).trim();
    if (!effectiveClientSecret && effectiveSecret.startsWith('shpss_')) {
      effectiveClientSecret = effectiveSecret;
    }
    if (!effectiveClientSecret) {
      effectiveClientSecret = process.env.SHOPIFY_CLIENT_SECRET || '';
    }

    let verifiedShopName = cleanDomain;
    let finalToken = effectiveToken;
    let tokenExpiresAt = existingSettings?.shopify?.tokenExpiresAt || '';

    // If client credentials are available, attempt exchange to get or refresh token
    if (effectiveClientId && effectiveClientSecret) {
      const exchange = await exchangeClientCredentialsForToken(cleanDomain, effectiveClientId, effectiveClientSecret);
      if (exchange.success && exchange.accessToken) {
        finalToken = exchange.accessToken;
        tokenExpiresAt = exchange.tokenExpiresAt || '';
      }
    }

    // Now test connection to Shopify
    let result = await testShopifyConnection(cleanDomain, finalToken, {
      clientId: effectiveClientId,
      clientSecret: effectiveClientSecret,
      onTokenRefreshed: (newToken, expiresAt) => {
        finalToken = newToken;
        tokenExpiresAt = expiresAt;
      },
    });

    if (!result.success) {
      const errorMsg = result.error || 'Could not verify credentials with Shopify';
      const updated = db.updateShopifyConfig(workspaceId, {
        shopDomain: cleanDomain,
        adminAccessToken: finalToken,
        clientId: effectiveClientId,
        clientSecret: effectiveClientSecret,
        tokenExpiresAt,
        webhookSecret: effectiveSecret,
        isConnected: false,
        lastError: errorMsg,
      });
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
    if ((result as any).activeToken) {
      finalToken = (result as any).activeToken;
    }

    // Save successful configuration
    const successMsg = `Shopify store ${cleanDomain} connected successfully! Live webhook and auto-refresh are active.`;
    const updated = db.updateShopifyConfig(workspaceId, {
      shopDomain: cleanDomain,
      webhookSecret: effectiveSecret,
      clientId: effectiveClientId,
      clientSecret: effectiveClientSecret,
      adminAccessToken: finalToken,
      tokenExpiresAt,
      isConnected: true,
      lastError: '',
      lastSuccessMessage: successMsg,
      lastSyncAt: new Date().toISOString(),
    });

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
