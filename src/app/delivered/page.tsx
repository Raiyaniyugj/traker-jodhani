'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Order, PipelineStage } from '@/lib/types';
import { ExternalLink, Search } from 'lucide-react';

export default function DeliveredPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStages(data.stages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deliveredOrders = orders.filter((o) => {
    const isDelivered =
      o.status === 'Delivered' ||
      stages.find((s) => s.id === o.currentStageId)?.name.toLowerCase().includes('completed') ||
      stages.find((s) => s.id === o.currentStageId)?.name.toLowerCase().includes('delivered');

    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(search.toLowerCase());

    return isDelivered && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Delivered Orders"
          rightAction={
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search delivered orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-black w-60"
              />
            </div>
          }
        />

        <main className="p-8 max-w-6xl w-full mx-auto space-y-6">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {deliveredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-sm text-neutral-400">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    deliveredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-4 px-6">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-neutral-900 hover:text-black hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="text-xs text-neutral-400">{order.items[0]?.title}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-neutral-900 font-medium">{order.customer.name}</p>
                          <p className="text-xs text-neutral-400">{order.customer.email}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-neutral-600">{order.priority}</td>
                        <td className="py-4 px-6 text-xs text-neutral-500">
                          {order.dueDate
                            ? new Date(order.dueDate).toLocaleDateString()
                            : 'Completed'}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-medium text-neutral-900">
                          ${order.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
