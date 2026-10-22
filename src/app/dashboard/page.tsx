'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KanbanBoard from '@/components/KanbanBoard';
import TableView from '@/components/TableView';
import OrderSwimlaneView from '@/components/OrderSwimlaneView';
import AddOrderModal from '@/components/AddOrderModal';
import ShopifyStatusBanner from '@/components/ShopifyStatusBanner';
import {
  Kanban,
  Table as TableIcon,
  Rows,
  Plus,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Order, PipelineStage, WorkspaceSettings, ShopifyConnectionStatus } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<'swimlane' | 'kanban' | 'table'>('swimlane');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyConnectionStatus | null>(null);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalProfit: 0 });
  const [hideValues, setHideValues] = useState(false);
  const [hideCards, setHideCards] = useState(false);

  const toggleHideValues = () => {
    setHideValues((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('trackerz_hide_revenue_figures', String(next));
      } catch {}
      return next;
    });
  };

  const toggleHideCards = (hide: boolean) => {
    setHideCards(hide);
    try {
      localStorage.setItem('trackerz_hide_stat_cards', String(hide));
    } catch {}
  };
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('trackerz_view_mode') as 'kanban' | 'table' | null;
      if (saved) setView(saved);
    } catch {}
    loadOrders();
    loadShopifyStatus();

    // Live auto-polling every 10 seconds so new Shopify orders appear live without manual clicking
    const interval = setInterval(() => {
      loadOrders(true);
      loadShopifyStatus();
    }, 10000);

    const handleFocus = () => {
      loadOrders(true);
      loadShopifyStatus();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadShopifyStatus = async () => {
    try {
      const res = await fetch('/api/shopify/status');
      if (res.ok) {
        const data = await res.json();
        setShopifyStatus(data);
      }
    } catch (e) {
      console.warn('Could not load shopify status:', e);
    }
  };

  const loadOrders = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/orders');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
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
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/shopify/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: data.message || 'Shopify orders synced successfully!',
        });
        await loadOrders(true);
        await loadShopifyStatus();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.error || data.problemReason || 'Failed to sync with Shopify.',
        });
        await loadShopifyStatus();
      }
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        message: e.message || 'Network error attempting to sync with Shopify.',
      });
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
              {shopifyStatus && (
                <div
                  className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    shopifyStatus.isConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                  title={
                    shopifyStatus.isConnected
                      ? `Connected to ${shopifyStatus.shopDomain}`
                      : `Problem: ${shopifyStatus.problemReason || 'Not connected'}`
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      shopifyStatus.isConnected
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span>
                    {shopifyStatus.isConnected
                      ? 'Shopify Live'
                      : 'Shopify Problem'}
                  </span>
                </div>
              )}

              <button
                onClick={handleQuickSync}
                disabled={syncing}
                title="Sync recent Shopify orders"
                className="px-3 py-1.5 text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 rounded-lg flex items-center gap-1.5 text-neutral-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {syncing ? 'Syncing...' : 'Sync Shopify'}
                </span>
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

        <main className="p-8 flex-1 overflow-x-hidden space-y-6">
          {/* Quick Sync Alert Toast if user triggered sync */}
          {syncFeedback && (
            <div
              className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-2xs transition-all ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{syncFeedback.message}</span>
              </div>
              <button
                onClick={() => setSyncFeedback(null)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Shopify Connection & Problem Diagnostic Banner */}
          <ShopifyStatusBanner
            status={shopifyStatus}
            loading={loading && !shopifyStatus}
            syncing={syncing}
            onSync={handleQuickSync}
            onRefreshStatus={loadShopifyStatus}
          />

          {/* Stat Cards with Hide / Privacy Options */}
          {!hideCards ? (
            <div className="flex flex-wrap items-center gap-4">
              {/* Total Revenue Card */}
              <div className="group bg-white border border-neutral-200 rounded-xl px-5 py-4 min-w-[220px] shadow-2xs relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                    TOTAL REVENUE
                  </p>
                  <button
                    onClick={toggleHideValues}
                    title={hideValues ? 'Show revenue figures' : 'Hide revenue figures'}
                    className="text-neutral-400 hover:text-neutral-800 transition p-0.5 rounded cursor-pointer"
                  >
                    {hideValues ? <EyeOff className="w-3.5 h-3.5 text-neutral-600" /> : <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />}
                  </button>
                </div>
                <p className="font-sans font-bold text-2xl text-neutral-900 mt-1 tracking-tight whitespace-nowrap">
                  {hideValues ? (
                    <span className="text-neutral-400 font-mono tracking-widest text-xl select-none">
                      $••••••••
                    </span>
                  ) : (
                    `${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </p>
              </div>

              {/* Total Profit Card */}
              <div className="group bg-white border border-neutral-200 rounded-xl px-5 py-4 min-w-[220px] shadow-2xs relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                    TOTAL PROFIT
                  </p>
                  <button
                    onClick={toggleHideValues}
                    title={hideValues ? 'Show profit figures' : 'Hide profit figures'}
                    className="text-neutral-400 hover:text-neutral-800 transition p-0.5 rounded cursor-pointer"
                  >
                    {hideValues ? <EyeOff className="w-3.5 h-3.5 text-neutral-600" /> : <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />}
                  </button>
                </div>
                <p className="font-sans font-bold text-2xl text-neutral-900 mt-1 tracking-tight whitespace-nowrap">
                  {hideValues ? (
                    <span className="text-neutral-400 font-mono tracking-widest text-xl select-none">
                      $••••••••
                    </span>
                  ) : (
                    `${metrics.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </p>
              </div>

              {/* Action Buttons: Hide Values / Hide Cards */}
              <div className="flex items-center gap-2 self-center">
                <button
                  onClick={toggleHideValues}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:text-black hover:bg-neutral-50 shadow-2xs transition cursor-pointer"
                  title={hideValues ? 'Show revenue & profit numbers' : 'Hide sensitive revenue & profit numbers'}
                >
                  {hideValues ? <Eye className="w-3.5 h-3.5 text-neutral-600" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-500" />}
                  <span>{hideValues ? 'Show Figures' : 'Hide Figures'}</span>
                </button>

                <button
                  onClick={() => toggleHideCards(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  title="Hide stat cards"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hide Cards</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center pt-1">
              <button
                onClick={() => toggleHideCards(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-neutral-300 bg-white text-xs font-medium text-neutral-600 hover:text-black hover:border-neutral-400 shadow-2xs transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-neutral-500" />
                <span>Show Stats (Revenue & Profit)</span>
              </button>
            </div>
          )}

          {/* View Toggles matching original screenshot */}
          <div className="flex items-center justify-between pt-2">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 shadow-2xs">
              <button
                onClick={() => {
                  setView('swimlane');
                  try {
                    localStorage.setItem('trackerz_view_mode', 'swimlane');
                  } catch {}
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'swimlane'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                <Rows className="w-3.5 h-3.5" />
                <span>Line-Wise Pipeline</span>
              </button>
              <button
                onClick={() => {
                  setView('kanban');
                  try {
                    localStorage.setItem('trackerz_view_mode', 'kanban');
                  } catch {}
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'kanban'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban Board</span>
              </button>
              <button
                onClick={() => {
                  setView('table');
                  try {
                    localStorage.setItem('trackerz_view_mode', 'table');
                  } catch {}
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === 'table'
                    ? 'bg-neutral-900 text-white shadow-2xs'
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

          {/* Main Board / Swimlane / Table */}
          {loading ? (
            <div className="py-20 text-center text-sm text-neutral-400 animate-pulse">
              Loading workshop orders...
            </div>
          ) : view === 'swimlane' ? (
            <OrderSwimlaneView
              orders={orders}
              stages={stages}
              onOrderStageChange={handleStageChange}
              shopifyConnected={Boolean(shopifyStatus?.isConnected)}
            />
          ) : view === 'kanban' ? (
            <KanbanBoard
              stages={stages}
              orders={orders}
              onOrderStageChange={handleStageChange}
              shopifyConnected={Boolean(shopifyStatus?.isConnected)}
            />
          ) : (
            <TableView
              orders={orders}
              stages={stages}
              onOrderStageChange={handleStageChange}
            />
          )}
        </main>
      </div>

      <AddOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stages={stages}
        onOrderAdded={() => {
          loadOrders();
          loadShopifyStatus();
        }}
      />
    </div>
  );
}
