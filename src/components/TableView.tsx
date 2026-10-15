'use client';

import Link from 'next/link';
import { Order, PipelineStage } from '@/lib/types';
import { ChevronRight, ExternalLink } from 'lucide-react';

interface TableViewProps {
  orders: Order[];
  stages: PipelineStage[];
}

export default function TableView({ orders, stages }: TableViewProps) {
  const getStageName = (stageId: string) => {
    return stages.find((s) => s.id === stageId)?.name || 'Processing';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <span className="text-xs text-rose-600 font-medium">High</span>;
      case 'Medium':
        return <span className="text-xs text-amber-600 font-medium">Medium</span>;
      case 'Low':
        return <span className="text-xs text-blue-600 font-medium">Low</span>;
      default:
        return <span className="text-xs text-neutral-500 font-medium">{priority}</span>;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 text-sm">
        No orders found.
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs uppercase tracking-wider font-medium">
            <tr>
              <th className="py-3.5 px-6">Order</th>
              <th className="py-3.5 px-6">Customer</th>
              <th className="py-3.5 px-6">Stage</th>
              <th className="py-3.5 px-6">Priority</th>
              <th className="py-3.5 px-6">Due</th>
              <th className="py-3.5 px-6 text-right">Total</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((order) => {
              const stageName = getStageName(order.currentStageId);

              return (
                <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-neutral-900 hover:text-black hover:underline"
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
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {order.items[0]?.title || 'Custom Piece'}
                    </p>
                  </td>

                  <td className="py-4 px-6">
                    <p className="text-neutral-900 font-medium">{order.customer.name}</p>
                    <p className="text-xs text-neutral-400">{order.customer.email}</p>
                  </td>

                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                      {stageName}
                    </span>
                  </td>

                  <td className="py-4 px-6">{getPriorityBadge(order.priority)}</td>

                  <td className="py-4 px-6 text-xs text-neutral-600">
                    {order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>

                  <td className="py-4 px-6 text-right font-mono font-medium text-neutral-900">
                    ${order.total.toLocaleString()}
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-2.5 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 text-neutral-700 transition"
                      >
                        View
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
