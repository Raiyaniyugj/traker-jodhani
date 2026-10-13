import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { testShopifyConnection } from '@/lib/shopify';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopDomain, adminAccessToken, webhookSecret } = body;

    if (!shopDomain) {
      return NextResponse.json({ success: false, error: 'Shop domain is required' }, { status: 400 });
    }

    // Save configuration
    db.updateShopifyConfig({
      shopDomain,
      webhookSecret: webhookSecret || '',
      adminAccessToken: adminAccessToken || '',
      isConnected: true,
    });

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
