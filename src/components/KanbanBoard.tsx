'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, PipelineStage } from '@/lib/types';
import { ArrowRight, ChevronRight, Clock, Diamond, ShieldCheck, ZoomIn, X, ExternalLink, RotateCcw } from 'lucide-react';

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
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
                    const isReturned =
                      order.status === 'Returned' ||
                      order.financialStatus === 'refunded' ||
                      order.returnStatus === 'Returned';
                    const refundAmount =
                      order.refundedAmount !== undefined && order.refundedAmount > 0
                        ? order.refundedAmount
                        : order.total;

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
                            {isReturned && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
                                title="Order returned / refunded"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                Returned
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
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: firstItem.imageUrl || order.gallery?.[0]?.url,
                                    title: `${order.orderNumber} · ${firstItem.title || 'Custom Fine Jewelry'}`,
                                    subtitle: `Client: ${order.customer.name} · Paid: $${order.total.toLocaleString()}`,
                                  })
                                }
                                className="relative group/img w-10 h-10 rounded-md overflow-hidden border border-neutral-200 shrink-0 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                                title="Click to zoom image"
                              >
                                <img
                                  src={firstItem.imageUrl || order.gallery?.[0]?.url}
                                  alt={firstItem.title}
                                  className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-3.5 h-3.5 drop-shadow" />
                                </div>
                              </button>
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
                          {isReturned ? (
                            <div className="flex items-baseline gap-1.5 font-mono">
                              <span className="font-bold text-xs text-rose-600">
                                Refunded ${refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-neutral-400 line-through">
                                ${order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-neutral-900 font-mono">
                              ${order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}

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

      {/* Zoom Image Lightbox Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
        >
          {/* Header Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between pb-3 text-white"
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-base sm:text-lg font-serif font-semibold truncate text-white">
                {previewImage.title}
              </h3>
              {previewImage.subtitle && (
                <p className="text-xs text-neutral-300 mt-0.5">{previewImage.subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition"
                title="Open original high-res image in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Original
              </a>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition focus:outline-none cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Centered High-Res Image Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[80vh] flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-2"
          >
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-[76vh] object-contain rounded-xl select-none"
            />
          </div>

          <p className="text-neutral-400 text-xs mt-3 flex items-center gap-1">
            Click anywhere outside or press <kbd className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      )}
    </div>
  );
}
