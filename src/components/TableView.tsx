'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, PipelineStage } from '@/lib/types';
import { ChevronRight, ExternalLink, ArrowRight, Diamond, ZoomIn, X } from 'lucide-react';

interface TableViewProps {
  orders: Order[];
  stages: PipelineStage[];
  onOrderStageChange?: (orderId: string, nextStageId: string) => void;
}

export default function TableView({ orders, stages, onOrderStageChange }: TableViewProps) {
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
  const getStageName = (stageId: string) => {
    return stages.find((s) => s.id === stageId)?.name || 'Processing';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">High</span>;
      case 'Medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Medium</span>;
      case 'Low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">{priority}</span>;
    }
  };

  const getNextStage = (currentStageId: string): PipelineStage | null => {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === currentStageId);
    if (index >= 0 && index < sorted.length - 1) {
      return sorted[index + 1];
    }
    return null;
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 text-sm">
        No orders found.
      </div>
    );
  }

  // Helper to extract numeric order number (e.g. "#1070" -> 1070)
  const getOrderNumberVal = (ord: Order) => {
    const raw = ord.orderNumber || '';
    const match = raw.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Sort orders descending by latest order number (#1070 first), then created date
  const sortedOrders = [...orders].sort((a, b) => {
    const numA = getOrderNumberVal(a);
    const numB = getOrderNumberVal(b);
    if (numA !== numB) {
      return numB - numA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 text-xs uppercase tracking-wider font-medium">
            <tr>
              <th className="py-3.5 px-6">Order & Jewelry Piece</th>
              <th className="py-3.5 px-6">Customer</th>
              <th className="py-3.5 px-6">Production Stage</th>
              <th className="py-3.5 px-6">Priority</th>
              <th className="py-3.5 px-6">Due Date</th>
              <th className="py-3.5 px-6 text-right">Total Price</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sortedOrders.map((order) => {
              const stageName = getStageName(order.currentStageId);
              const nextStage = getNextStage(order.currentStageId);
              const primaryItem = order.items[0];

              return (
                <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                  {/* Order & Piece */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {primaryItem?.imageUrl || order.gallery?.[0]?.url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: primaryItem?.imageUrl || order.gallery?.[0]?.url,
                              title: `${order.orderNumber} · ${primaryItem?.title || 'Custom Fine Jewelry'}`,
                              subtitle: `Client: ${order.customer.name} · Paid: $${order.total.toLocaleString()}`,
                            })
                          }
                          className="relative group/img w-11 h-11 rounded-lg overflow-hidden border border-neutral-200 shrink-0 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                          title="Click to zoom image"
                        >
                          <img
                            src={primaryItem?.imageUrl || order.gallery?.[0]?.url}
                            alt={primaryItem?.title || 'Jewelry'}
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="w-3.5 h-3.5 drop-shadow" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-400">
                          <Diamond className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-serif font-semibold text-neutral-900 hover:text-black hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          {(order.source === 'shopify' || Boolean(order.shopifyOrderId)) && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Shopify
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-700 font-medium mt-0.5 max-w-[220px] truncate">
                          {primaryItem?.title || 'Fine Jewelry'}
                        </p>
                        {primaryItem && (primaryItem.metalType || primaryItem.diamondSize) && (
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {[
                              primaryItem.metalType,
                              primaryItem.metalColor,
                              primaryItem.diamondSize ? `${primaryItem.diamondSize}ct` : '',
                              primaryItem.diamondShape,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>


                  {/* Customer */}
                  <td className="py-4 px-6">
                    <p className="text-neutral-900 font-medium">{order.customer.name}</p>
                    <p className="text-xs text-neutral-400">{order.customer.email}</p>
                  </td>

                  {/* Stage */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {stageName}
                      </span>
                      {onOrderStageChange && nextStage && (
                        <button
                          onClick={() => onOrderStageChange(order.id, nextStage.id)}
                          title={`Advance to ${nextStage.name}`}
                          className="p-1 text-neutral-400 hover:text-black rounded hover:bg-neutral-100 transition"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-4 px-6">{getPriorityBadge(order.priority)}</td>

                  {/* Due Date */}
                  <td className="py-4 px-6 text-xs text-neutral-600">
                    {order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>

                  {/* Total */}
                  <td className="py-4 px-6 text-right font-mono font-medium text-neutral-900">
                    ${order.total.toLocaleString()}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-2.5 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 text-neutral-700 transition font-medium"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/track/${order.id}`}
                        target="_blank"
                        className="p-1 text-neutral-400 hover:text-black rounded hover:bg-neutral-100 transition"
                        title="Live Tracking Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
