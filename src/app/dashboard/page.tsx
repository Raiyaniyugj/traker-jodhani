'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KanbanBoard from '@/components/KanbanBoard';
import TableView from '@/components/TableView';
import AddOrderModal from '@/components/AddOrderModal';
import {
  Kanban,
  Table as TableIcon,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Order, PipelineStage, WorkspaceSettings } from '@/lib/types';

export default function DashboardPage() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [metrics, setMetrics] = useState({ totalRevenue: 1075, totalProfit: 575 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadOrders();

    // Live auto-polling every 10 seconds so new Shopify orders appear live without manual clicking
    const interval = setInterval(() => {
      loadOrders(true);
    }, 10000);

    const handleFocus = () => loadOrders(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadOrders = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStages(data.stages || []);
        setSettings(data.settings || null);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleStageChange = async (orderId: string, nextStageId: string) => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, currentStageId: nextStageId } : o))
      );

      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStageId: nextStageId }),
      });

      loadOrders();
    } catch (err) {
      console.error(err);
      loadOrders();
    }
  };

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/shopify/sync', { method: 'POST' });
      await loadOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Master Production Dashboard"
          rightAction={
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickSync}
                disabled={syncing}
                title="Sync recent Shopify orders"
                className="px-3 py-1.5 text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 rounded-lg flex items-center gap-1.5 text-neutral-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync Shopify</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium bg-black hover:bg-neutral-800 text-white rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Order</span>
              </button>
            </div>
          }
        />

        <main className="p-8 flex-1 overflow-x-hidden">
          {/* Stat Cards - Exact matching screenshot dashboard_clean */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="bg-white border border-neutral-200 rounded-xl p-5 w-44 shadow-2xs">
              <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                TOTAL REVENUE
              </p>
              <p className="font-sans font-bold text-2xl sm:text-3xl text-neutral-900 mt-1">
                ${metrics.totalRevenue.toLocaleString()}
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 w-44 shadow-2xs">
              <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                TOTAL PROFIT
              </p>
              <p className="font-sans font-bold text-2xl sm:text-3xl text-neutral-900 mt-1">
                ${metrics.totalProfit.toLocaleString()}
              </p>
            </div>
          </div>

          {/* View Toggles matching original screenshot */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 shadow-2xs">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'kanban'
                    ? 'bg-neutral-100 text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban View</span>
              </button>
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'table'
                    ? 'bg-neutral-100 text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            <p className="text-xs text-neutral-400 hidden sm:block">
              {orders.filter((o) => o.status !== 'Delivered').length} active orders in workshop
            </p>
          </div>

          {/* Main Board / Table */}
          {loading ? (
            <div className="py-20 text-center text-sm text-neutral-400 animate-pulse">
              Loading workshop orders...
            </div>
          ) : view === 'kanban' ? (
            <KanbanBoard
              stages={stages}
              orders={orders}
              onOrderStageChange={handleStageChange}
            />
          ) : (
            <TableView orders={orders} stages={stages} />
          )}
        </main>
      </div>

      <AddOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stages={stages}
        onOrderAdded={loadOrders}
      />
    </div>
  );
}
