import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    let orders = db.getOrders(workspaceId);
    let stages = db.getStages(workspaceId);
    let settings = db.getSettings(workspaceId);

    if (d1) {
      const d1Orders = await d1Store.getOrders(d1, workspaceId);
      orders = d1Orders;

      const d1Stages = await d1Store.getStages(d1, workspaceId);
      if (d1Stages && d1Stages.length > 0) {
        stages = d1Stages;
      }
      const d1Settings = await d1Store.getSettings(d1, workspaceId);
      if (d1Settings) {
        settings = d1Settings;
      }
    }

    // Sort orders latest first by numeric order number (#1070 first), then createdAt
    const getOrderNumberVal = (ord: any) => {
      const raw = ord.orderNumber || '';
      const match = String(raw).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    orders.sort((a, b) => {
      const numA = getOrderNumberVal(a);
      const numB = getOrderNumberVal(b);
      if (numA !== numB) {
        return numB - numA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const activeOrders = orders.filter((o) => o.status === 'Active').length;
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;

    return NextResponse.json({
      orders,
      stages,
      settings,
      metrics: {
        totalRevenue,
        totalProfit,
        activeOrders,
        deliveredOrders,
      },
    });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      productTitle,
      productType,
      metalType,
      metalColor,
      diamondShape,
      diamondSize,
      chainLength,
      customEngraving,
      price,
      baseProductionCost,
      shippingFee,
      priority,
      dueDate,
      internalNotes,
      initialStageId,
    } = body;

    const d1 = getD1Database();
    let stages = db.getStages(workspaceId);
    if (d1) {
      const d1Stages = await d1Store.getStages(d1, workspaceId);
      if (d1Stages && d1Stages.length > 0) stages = d1Stages;
    }

    const stageId = initialStageId || stages[0]?.id || `stg_${workspaceId}_1`;
    const subtotal = parseFloat(price) || 0;
    const shipping = parseFloat(shippingFee) || 0;
    const total = subtotal + shipping;
    const cost = parseFloat(baseProductionCost) || Math.round(subtotal * 0.45);
    const profit = Math.round(total - cost - shipping);

    const newOrder = db.createOrder(workspaceId, {
      orderNumber: body.orderNumber || `#${Math.floor(1000 + Math.random() * 9000)}`,
      source: 'manual',
      customer: {
        name: customerName || 'Client',
        email: customerEmail || '',
        phone: customerPhone || '',
      },
      shippingAddress: {
        address1: body.address1 || '',
        city: body.city || '',
        province: body.province || '',
        zip: body.zip || '',
        country: body.country || '',
      },
      billingAddress: {
        address1: body.address1 || '',
        city: body.city || '',
        province: body.province || '',
        zip: body.zip || '',
        country: body.country || '',
      },
      items: [
        {
          id: `item-${Date.now()}`,
          title: productTitle || 'Custom Fine Jewelry Piece',
          productType: productType || 'Ring',
          metalType: metalType || '18K',
          metalColor: metalColor || 'Yellow Gold',
          diamondShape: diamondShape || 'Round',
          diamondSize: diamondSize || '1.00ct',
          chainLength: chainLength || '—',
          customEngraving: customEngraving || '',
          quantity: 1,
          price: subtotal,
          imageUrl: '',
        },
      ],
      subtotal,
      shippingFee: shipping,
      total,
      baseProductionCost: cost,
      profit,
      currentStageId: stageId,
      priority: priority || 'Medium',
      status: 'Active',
      assignedTo: body.assignedTo || session.name || 'Unassigned',
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notesFromCustomer: body.notesFromCustomer || '',
      internalNotes: internalNotes || '',
      trackingCarrier: 'FedEx Priority',
    });

    if (d1) {
      await d1Store.saveOrder(d1, { ...newOrder, userId: workspaceId });
    }

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error('Orders POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    if (d1) {
      await d1.prepare('DELETE FROM orders WHERE user_id = ?').bind(workspaceId).run();
      await d1.prepare('DELETE FROM webhook_logs WHERE user_id = ?').bind(workspaceId).run();
    }

    const existing = db.getOrders(workspaceId);
    for (const o of existing) {
      db.deleteOrder(workspaceId, o.id);
    }

    return NextResponse.json({
      success: true,
      message: 'All orders and logs cleared. Workspace is now empty.',
    });
  } catch (error: any) {
    console.error('Orders DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
