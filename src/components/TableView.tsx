'use client';

import Link from 'next/link';
import { Order, PipelineStage } from '@/lib/types';
import { ChevronRight, ExternalLink, ArrowRight } from 'lucide-react';

interface TableViewProps {
  orders: Order[];
  stages: PipelineStage[];
  onOrderStageChange?: (orderId: string, nextStageId: string) => void;
}

export default function TableView({ orders, stages, onOrderStageChange }: TableViewProps) {
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

  // Sort orders descending by created date
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
                    <p className="text-xs text-neutral-700 font-medium mt-1">
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
    </div>
  );
}
