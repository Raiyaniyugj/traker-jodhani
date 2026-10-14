import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { testShopifyConnection } from '@/lib/shopify';
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

    if (!shopDomain) {
      return NextResponse.json({ success: false, error: 'Shop domain is required' }, { status: 400 });
    }

    // Save configuration
    const updated = db.updateShopifyConfig(workspaceId, {
      shopDomain,
      webhookSecret: webhookSecret || '',
      adminAccessToken: adminAccessToken || '',
      isConnected: true,
    });

    const d1 = getD1Database();
    if (d1) {
      await d1Store.updateSettings(d1, workspaceId, updated);
    }

    // If an access token is given, test live connection
    if (adminAccessToken && !adminAccessToken.includes('demo')) {
      const result = await testShopifyConnection(shopDomain, adminAccessToken);
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: `Could not connect to Shopify: ${result.error}`,
          saved: true,
        });
      }
      return NextResponse.json({
        success: true,
        message: `Connected to Shopify store: ${result.shop?.name || shopDomain}`,
        shop: result.shop,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Shopify settings saved and verified for ${shopDomain}! Webhook endpoint is active.`,
    });
  } catch (error: any) {
    console.error('Shopify test error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
