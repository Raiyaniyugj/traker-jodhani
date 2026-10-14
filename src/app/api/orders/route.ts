import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';

export async function GET(req: NextRequest) {
  try {
    const d1 = getD1Database();
    let orders = db.getOrders();
    let stages = db.getStages();
    let settings = db.getSettings();

    if (d1) {
      const d1Orders = await d1Store.getOrders(d1);
      if (d1Orders && d1Orders.length > 0) {
        orders = d1Orders;
      }
      const d1Stages = await d1Store.getStages(d1);
      if (d1Stages && d1Stages.length > 0) {
        stages = d1Stages;
      }
      const d1Settings = await d1Store.getSettings(d1);
      if (d1Settings) {
        settings = d1Settings;
      }
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    let stages = db.getStages();
    if (d1) {
      const d1Stages = await d1Store.getStages(d1);
      if (d1Stages && d1Stages.length > 0) stages = d1Stages;
    }

    const stageId = initialStageId || stages[0]?.id || 'stage-1';
    const subtotal = parseFloat(price) || 1000;
    const shipping = parseFloat(shippingFee) || 0;
    const total = subtotal + shipping;
    const cost = parseFloat(baseProductionCost) || Math.round(subtotal * 0.45);
    const profit = Math.round(total - cost - shipping);

    const newOrder = db.createOrder({
      orderNumber: body.orderNumber || `#${Math.floor(1000 + Math.random() * 9000)}`,
      source: 'manual',
      customer: {
        name: customerName || 'Valued Client',
        email: customerEmail || 'client@example.com',
        phone: customerPhone || '+91 98765 43210',
      },
      shippingAddress: {
        address1: body.address1 || '',
        city: body.city || '',
        province: body.province || '',
        zip: body.zip || '',
        country: body.country || 'India',
      },
      billingAddress: {
        address1: body.address1 || '',
        city: body.city || '',
        province: body.province || '',
        zip: body.zip || '',
        country: body.country || 'India',
      },
      items: [
        {
          id: `item-${Date.now()}`,
          title: productTitle || 'Custom Jewelry Piece',
          productType: productType || 'Pendant',
          variantTitle: `${metalType || '14K'} ${metalColor || 'White gold'} / ${diamondSize || '1.00'}ct`,
          metalType: metalType || '14K',
          metalColor: metalColor || 'White gold',
          diamondShape: diamondShape || 'Round',
          diamondSize: diamondSize || '1.00',
          chainLength: chainLength || '—',
          customEngraving: customEngraving || '',
          quantity: 1,
          price: subtotal,
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
      assignedTo: body.assignedTo || '',
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notesFromCustomer: body.notesFromCustomer || 'No notes from customer.',
      internalNotes: internalNotes || '',
      trackingNumber: '',
      trackingCarrier: 'FedEx Priority',
      trackingUrl: '',
    });

    if (d1) {
      await d1Store.saveOrder(d1, newOrder);
    }

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
