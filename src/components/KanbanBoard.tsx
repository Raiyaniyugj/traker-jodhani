'use client';

import Link from 'next/link';
import { Order, PipelineStage } from '@/lib/types';
import { ArrowRight, ChevronRight, Clock, Diamond, ShieldCheck } from 'lucide-react';

interface KanbanBoardProps {
  stages: PipelineStage[];
  orders: Order[];
  onOrderStageChange: (orderId: string, nextStageId: string) => void;
  shopifyConnected?: boolean;
}

export default function KanbanBoard({
  stages,
  orders,
  onOrderStageChange,
  shopifyConnected,
}: KanbanBoardProps) {
  const getOrderNumberVal = (ord: Order) => {
    const raw = ord.orderNumber || '';
    const match = raw.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const getStageOrders = (stageId: string) => {
    return orders
      .filter((o) => o.currentStageId === stageId && o.status !== 'Delivered')
      .sort((a, b) => {
        const numA = getOrderNumberVal(a);
        const numB = getOrderNumberVal(b);
        if (numA !== numB) {
          return numB - numA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  };

  const getNextStage = (currentStageId: string): PipelineStage | null => {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === currentStageId);
    if (index >= 0 && index < sorted.length - 1) {
      return sorted[index + 1];
    }
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Low':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      default:
        return 'text-neutral-600 bg-neutral-100 border-neutral-200';
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1400px]">
        {stages.map((stage) => {
          const stageOrders = getStageOrders(stage.id);
          const nextStage = getNextStage(stage.id);
          const isFirstStage = stage.order === 1 || stage.name.toLowerCase().includes('new');

          return (
            <div
              key={stage.id}
              className="flex-1 min-w-[260px] max-w-[320px] flex flex-col"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between pb-3 px-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-800">
                    {stage.name}
                  </span>
                  {isFirstStage && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${
                        shopifyConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}
                      title={
                        shopifyConnected
                          ? 'Shopify orders stream directly into this stage'
                          : 'Shopify is not connected'
                      }
                    >
                      {shopifyConnected ? 'Shopify Live' : 'Shopify Off'}
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {stageOrders.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="bg-neutral-100/60 rounded-xl p-2.5 min-h-[460px] flex flex-col gap-2.5 border border-neutral-200/60">
                {stageOrders.length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-4 text-center text-xs text-neutral-400 font-medium">
                    <p>No orders</p>
                    {isFirstStage && (
                      <p className="text-[11px] text-neutral-400 mt-1 max-w-[180px]">
                        {shopifyConnected
                          ? 'Connected to Shopify · Live orders will appear here automatically'
                          : 'Shopify not connected. Connect in Settings to auto-import orders.'}
                      </p>
                    )}
                  </div>
                ) : (
                  stageOrders.map((order) => {
                    const firstItem = order.items[0];
                    const isShopify = order.source === 'shopify' || Boolean(order.shopifyOrderId);

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-lg p-3.5 border border-neutral-200 shadow-2xs hover:shadow-md transition group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-serif font-semibold text-base text-neutral-900 hover:text-black hover:underline line-clamp-1"
                            >
                              {order.orderNumber}
                            </Link>
                            {isShopify && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                                title="Order imported from Shopify"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Shopify
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${getPriorityColor(
                              order.priority
                            )}`}
                          >
                            {order.priority}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-500 mt-0.5">
                          {order.customer.name}
                        </p>

                        {firstItem && (
                          <div className="mt-2.5 text-xs text-neutral-700 bg-neutral-50 p-2 rounded border border-neutral-100 flex items-center gap-2.5">
                            {firstItem.imageUrl || order.gallery?.[0]?.url ? (
                              <img
                                src={firstItem.imageUrl || order.gallery?.[0]?.url}
                                alt={firstItem.title}
                                className="w-10 h-10 rounded-md object-cover border border-neutral-200 shrink-0 shadow-2xs"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{firstItem.title}</p>
                              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                {firstItem.metalType} {firstItem.metalColor} · {firstItem.diamondSize}ct
                              </p>
                            </div>
                          </div>
                        )}


                        <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-neutral-100">
                          <span className="font-semibold text-neutral-900 font-mono">
                            ${order.total.toLocaleString()}
                          </span>

                          {order.dueDate && (
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        {/* Quick Advance / Action */}
                        <div className="mt-3 pt-2 flex items-center justify-between gap-2">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-[11px] text-neutral-500 hover:text-black font-medium flex items-center gap-0.5"
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </Link>

                          {nextStage && (
                            <button
                              onClick={() => onOrderStageChange(order.id, nextStage.id)}
                              className="text-[11px] px-2 py-1 bg-neutral-900 hover:bg-black text-white rounded transition flex items-center gap-1 font-medium shadow-xs"
                              title={`Advance to ${nextStage.name}`}
                            >
                              <span>Next</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
