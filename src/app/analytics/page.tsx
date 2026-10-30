'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Order, PipelineStage, WorkspaceSettings } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Download,
  Search,
  PieChart,
  BarChart3,
  LineChart,
  Award,
  AlertCircle,
  Combine,
  Plus,
  ArrowRight,
  Layers,
  Flame,
  Package,
} from 'lucide-react';

type DatePreset = 'all' | 'today' | '7days' | '30days' | 'this_month' | '3months';

export default function AnalyticsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Date filtering state
  const [preset, setPreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDateRangeText, setActiveDateRangeText] = useState('All Time');

  // Chart view toggle: 'revenue' | 'orders'
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [hoveredDay, setHoveredDay] = useState<any | null>(null);

  // Frequently Bought Together / Product Affinity state
  const [selectedAffinityProduct, setSelectedAffinityProduct] = useState<string>('');
  const [affinitySearch, setAffinitySearch] = useState('');
  const [affinityTab, setAffinityTab] = useState<'lookup' | 'top_pairs'>('lookup');

  // Table search
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
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
      }
    } catch (e) {
      console.error('Error loading analytics orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.currency || '$';

  // Apply preset dates
  const handleSelectPreset = (p: DatePreset) => {
    setPreset(p);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (p === 'all') {
      setStartDate('');
      setEndDate('');
      setActiveDateRangeText('All Time');
      return;
    }

    if (p === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setActiveDateRangeText(`Today (${todayStr})`);
      return;
    }

    if (p === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pastStr = past.toISOString().split('T')[0];
      setStartDate(pastStr);
      setEndDate(todayStr);
      setActiveDateRangeText(`Last 7 Days (${pastStr} to ${todayStr})`);
      return;
    }

    if (p === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastStr = past.toISOString().split('T')[0];
      setStartDate(pastStr);
      setEndDate(todayStr);
      setActiveDateRangeText(`Last 30 Days (${pastStr} to ${todayStr})`);
      return;
    }

    if (p === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
      setActiveDateRangeText(`This Month (${firstDay} to ${todayStr})`);
      return;
    }

    if (p === '3months') {
      const past = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
      setStartDate(past);
      setEndDate(todayStr);
      setActiveDateRangeText(`Last 3 Months (${past} to ${todayStr})`);
      return;
    }
  };

  const handleCustomDateApply = () => {
    if (!startDate && !endDate) {
      handleSelectPreset('all');
      return;
    }
    setPreset('all'); // custom mode
    setActiveDateRangeText(
      `${startDate ? startDate : 'Earliest'} to ${endDate ? endDate : 'Latest'}`
    );
  };

  const handleResetDates = () => {
    handleSelectPreset('all');
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!startDate && !endDate) return orders;

    const startMs = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
    const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

    return orders.filter((o) => {
      const orderMs = new Date(o.createdAt).getTime();
      return orderMs >= startMs && orderMs <= endMs;
    });
  }, [orders, startDate, endDate]);

  // Aggregate daily statistics for high/low graphs
  const dailyStats = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; ordersCount: number; orderIds: string[] }> = {};

    filteredOrders.forEach((o) => {
      const dateKey = (o.createdAt || '').slice(0, 10);
      if (!dateKey) return;
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          revenue: 0,
          ordersCount: 0,
          orderIds: [],
        };
      }
      map[dateKey].revenue += o.total || 0;
      map[dateKey].ordersCount += 1;
      map[dateKey].orderIds.push(o.orderNumber);
    });

    // Sort chronologically ascending
    const days = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

    if (days.length === 0) {
      return {
        days: [],
        highestDay: null,
        lowestDay: null,
        avgDailyRevenue: 0,
        avgDailyOrders: 0,
        maxRevenue: 0,
        maxOrders: 0,
      };
    }

    const revenues = days.map((d) => d.revenue);
    const orderCounts = days.map((d) => d.ordersCount);

    const maxRev = Math.max(...revenues, 1);
    const minRev = Math.min(...revenues);
    const maxOrd = Math.max(...orderCounts, 1);

    const highestDay = days.find((d) => d.revenue === maxRev) || null;
    const lowestDay = days.find((d) => d.revenue === minRev) || null;

    const totalRev = revenues.reduce((a, b) => a + b, 0);
    const totalOrds = orderCounts.reduce((a, b) => a + b, 0);

    const avgDailyRevenue = totalRev / (days.length || 1);
    const avgDailyOrders = totalOrds / (days.length || 1);

    return {
      days,
      highestDay,
      lowestDay,
      avgDailyRevenue,
      avgDailyOrders,
      maxRevenue: maxRev,
      maxOrders: maxOrd,
    };
  }, [filteredOrders]);

  // Overall KPIs
  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [filteredOrders]
  );
  const totalProfit = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (o.profit || 0), 0),
    [filteredOrders]
  );
  const totalOrdersCount = filteredOrders.length;
  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Product category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const cat = item.productType || 'Custom Jewelry';
        if (!counts[cat]) {
          counts[cat] = { count: 0, revenue: 0 };
        }
        counts[cat].count += item.quantity || 1;
        counts[cat].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    const list = Object.entries(counts).map(([name, val]) => ({
      name,
      count: val.count,
      revenue: val.revenue,
    }));

    list.sort((a, b) => b.revenue - a.revenue);
    return list;
  }, [filteredOrders]);

  // Pipeline stages distribution
  const stageBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    stages.forEach((s) => (map[s.id] = 0));

    filteredOrders.forEach((o) => {
      if (map[o.currentStageId] !== undefined) {
        map[o.currentStageId] += 1;
      }
    });

    return stages.map((s) => ({
      id: s.id,
      name: s.name,
      count: map[s.id] || 0,
      percent: totalOrdersCount > 0 ? ((map[s.id] || 0) / totalOrdersCount) * 100 : 0,
    }));
  }, [filteredOrders, stages, totalOrdersCount]);

  // Frequently Bought Together / Product Affinity data ("Which product sells most with...")
  const productAffinityData = useMemo(() => {
    interface ProductMeta {
      title: string;
      imageUrl?: string;
      productType?: string;
      price?: number;
      totalOrders: number;
    }

    interface CompanionEntry {
      title: string;
      count: number;
      orders: string[];
      productMeta?: ProductMeta;
      coRate: number;
    }

    interface PairEntry {
      id: string;
      titleA: string;
      titleB: string;
      productA?: ProductMeta;
      productB?: ProductMeta;
      count: number;
      orders: string[];
      combinedRevenue: number;
    }

    // 1. Build catalog and count order occurrences
    const catalog: Record<string, ProductMeta> = {};
    const orderProductSets: { orderNumber: string; productTitles: string[]; total: number }[] = [];

    filteredOrders.forEach((o) => {
      const distinctTitles = new Set<string>();
      (o.items || []).forEach((item) => {
        const title = (item.title || '').trim();
        if (!title) return;
        distinctTitles.add(title);

        if (!catalog[title]) {
          catalog[title] = {
            title,
            imageUrl: item.imageUrl,
            productType: item.productType || 'Fine Jewelry',
            price: item.price || 0,
            totalOrders: 0,
          };
        } else {
          if (!catalog[title].imageUrl && item.imageUrl) {
            catalog[title].imageUrl = item.imageUrl;
          }
          if (item.price && !catalog[title].price) {
            catalog[title].price = item.price;
          }
        }
      });

      distinctTitles.forEach((t) => {
        if (catalog[t]) {
          catalog[t].totalOrders += 1;
        }
      });

      orderProductSets.push({
        orderNumber: o.orderNumber,
        productTitles: Array.from(distinctTitles),
        total: o.total || 0,
      });
    });

    // 2. Co-purchase mapping: product -> companion -> count & order numbers
    const coPurchases: Record<string, Record<string, { count: number; orders: string[] }>> = {};
    const pairMap: Record<string, { titleA: string; titleB: string; count: number; orders: string[] }> = {};

    let multiItemOrdersCount = 0;

    orderProductSets.forEach((order) => {
      const titles = order.productTitles;
      if (titles.length >= 2) {
        multiItemOrdersCount += 1;

        // Populate companion map
        for (let i = 0; i < titles.length; i++) {
          const tA = titles[i];
          if (!coPurchases[tA]) coPurchases[tA] = {};

          for (let j = 0; j < titles.length; j++) {
            if (i === j) continue;
            const tB = titles[j];
            if (!coPurchases[tA][tB]) {
              coPurchases[tA][tB] = { count: 0, orders: [] };
            }
            coPurchases[tA][tB].count += 1;
            coPurchases[tA][tB].orders.push(order.orderNumber);
          }
        }

        // Populate unique pairs map (sorted alphabetically)
        for (let i = 0; i < titles.length; i++) {
          for (let j = i + 1; j < titles.length; j++) {
            const [tA, tB] = [titles[i], titles[j]].sort();
            const pairKey = `${tA}:::${tB}`;
            if (!pairMap[pairKey]) {
              pairMap[pairKey] = { titleA: tA, titleB: tB, count: 0, orders: [] };
            }
            pairMap[pairKey].count += 1;
            pairMap[pairKey].orders.push(order.orderNumber);
          }
        }
      }
    });

    // 3. Convert pairs to sorted array
    const pairs: PairEntry[] = Object.entries(pairMap).map(([id, p]) => {
      const metaA = catalog[p.titleA];
      const metaB = catalog[p.titleB];
      const revA = metaA?.price || 0;
      const revB = metaB?.price || 0;
      return {
        id,
        titleA: p.titleA,
        titleB: p.titleB,
        productA: metaA,
        productB: metaB,
        count: p.count,
        orders: p.orders,
        combinedRevenue: (revA + revB) * p.count,
      };
    });

    pairs.sort((a, b) => b.count - a.count || b.combinedRevenue - a.combinedRevenue);

    // 4. Build per-product companion lists
    const productAffinityLookup: Record<
      string,
      {
        product: ProductMeta;
        topCompanion: CompanionEntry | null;
        companions: CompanionEntry[];
        totalCoOrders: number;
      }
    > = {};

    Object.keys(catalog).forEach((title) => {
      const companionsObj = coPurchases[title] || {};
      const companionsList: CompanionEntry[] = Object.entries(companionsObj).map(([cTitle, data]) => ({
        title: cTitle,
        count: data.count,
        orders: data.orders,
        productMeta: catalog[cTitle],
        coRate: catalog[title].totalOrders > 0 ? (data.count / catalog[title].totalOrders) * 100 : 0,
      }));

      companionsList.sort((a, b) => b.count - a.count);

      const totalCoOrders = companionsList.reduce((sum, c) => sum + c.count, 0);

      productAffinityLookup[title] = {
        product: catalog[title],
        topCompanion: companionsList[0] || null,
        companions: companionsList,
        totalCoOrders,
      };
    });

    // Product list sorted: products with companions come first, then alphabetical
    const allProductsList = Object.values(catalog).sort((a, b) => {
      const aCo = productAffinityLookup[a.title]?.companions.length || 0;
      const bCo = productAffinityLookup[b.title]?.companions.length || 0;
      if (bCo !== aCo) return bCo - aCo;
      return a.title.localeCompare(b.title);
    });

    // Determine recommended default product
    const topPairProduct = pairs.length > 0 ? pairs[0].titleA : allProductsList[0]?.title || '';

    return {
      catalog,
      pairs,
      productAffinityLookup,
      allProductsList,
      topPairProduct,
      multiItemOrdersCount,
      totalOrdersCount: filteredOrders.length,
      multiItemRate:
        filteredOrders.length > 0 ? (multiItemOrdersCount / filteredOrders.length) * 100 : 0,
    };
  }, [filteredOrders]);

  const filteredAffinityProductsList = useMemo(() => {
    const list = productAffinityData.allProductsList;
    if (!affinitySearch.trim()) return list;
    const q = affinitySearch.toLowerCase().trim();
    return list.filter((p) => p.title.toLowerCase().includes(q));
  }, [productAffinityData.allProductsList, affinitySearch]);

  const activeAffinityProductTitle =
    selectedAffinityProduct || productAffinityData.topPairProduct || (productAffinityData.allProductsList[0]?.title ?? '');
  const activeAffinity = productAffinityData.productAffinityLookup[activeAffinityProductTitle];

  // Orders matching table search
  const searchedOrders = useMemo(() => {
    if (!tableSearch.trim()) return filteredOrders;
    const q = tableSearch.toLowerCase().trim();
    return filteredOrders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        (o.customer.email || '').toLowerCase().includes(q) ||
        (o.items || []).some((i) => i.title.toLowerCase().includes(q))
    );
  }, [filteredOrders, tableSearch]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Email',
      'Total Amount',
      'Profit',
      'Status',
      'Items Count',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.createdAt}"`,
      `"${o.customer.name}"`,
      `"${o.customer.email || ''}"`,
      o.total || 0,
      o.profit || 0,
      `"${o.status}"`,
      (o.items || []).length,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trackerz_sales_analytics_${startDate || 'all'}_${endDate || 'latest'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-[#fafafa] text-neutral-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Sales & Production Analytics"
          subtitle="Real-time sales velocity, revenue trends, and high/low selling insights"
          rightAction={
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-2xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={filteredOrders.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-neutral-800 shadow-2xs transition disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          }
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* DATE RANGE FILTER BAR */}
          <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-neutral-500 mr-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-neutral-400" />
                  Date Range:
                </span>

                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: 'this_month', label: 'This Month' },
                  { id: '3months', label: 'Last 3 Months' },
                ].map((p) => {
                  const isSelected = preset === p.id && (!startDate || p.id !== 'all');
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p.id as DatePreset)}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                        isSelected
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200 hover:text-black'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-mono text-neutral-800 focus:outline-none"
                    placeholder="Start Date"
                  />
                  <span className="text-neutral-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-mono text-neutral-800 focus:outline-none"
                    placeholder="End Date"
                  />
                </div>

                <button
                  onClick={handleCustomDateApply}
                  className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-black transition shadow-2xs"
                >
                  Apply Dates
                </button>

                {(startDate || endDate) && (
                  <button
                    onClick={handleResetDates}
                    className="px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Range active description */}
            <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Filtering active: <strong className="text-neutral-900">{activeDateRangeText}</strong>
                </span>
                <span className="text-neutral-300">|</span>
                <span>
                  Found <strong className="text-neutral-900">{filteredOrders.length}</strong> matching orders
                </span>
              </div>

              {dailyStats.days.length > 0 && (
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                    <TrendingUp className="w-3 h-3" />
                    High Day: {dailyStats.highestDay?.date} ({currencySymbol}
                    {dailyStats.highestDay?.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                    <TrendingDown className="w-3 h-3" />
                    Low Day: {dailyStats.lowestDay?.date} ({currencySymbol}
                    {dailyStats.lowestDay?.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* TOP EXECUTIVE METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-500">Total Sales Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-neutral-900 tracking-tight">
                {currencySymbol}
                {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Across {totalOrdersCount} orders in selected period
              </p>
            </div>

            {/* Total Orders & Volume */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-500">Orders Processed</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-neutral-900 tracking-tight">
                {totalOrdersCount}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                AOV: {currencySymbol}
                {averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per order
              </p>
            </div>

            {/* Highest Selling Day (Peak) */}
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-2xs relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-800 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Peak Selling Day (High)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                  HIGH
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-900 tracking-tight">
                {dailyStats.highestDay
                  ? `${currencySymbol}${dailyStats.highestDay.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${currencySymbol}0.00`}
              </div>
              <p className="text-[11px] text-emerald-700/80 mt-1">
                {dailyStats.highestDay
                  ? `On ${dailyStats.highestDay.date} (${dailyStats.highestDay.ordersCount} orders)`
                  : 'No orders in range'}
              </p>
            </div>

            {/* Lowest Selling Day */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-neutral-400" />
                  Lowest Selling Day (Low)
                </span>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 font-semibold px-2 py-0.5 rounded-full border border-neutral-200">
                  LOW
                </span>
              </div>
              <div className="text-2xl font-bold text-neutral-900 tracking-tight">
                {dailyStats.lowestDay
                  ? `${currencySymbol}${dailyStats.lowestDay.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${currencySymbol}0.00`}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {dailyStats.lowestDay
                  ? `On ${dailyStats.lowestDay.date} (${dailyStats.lowestDay.ordersCount} orders)`
                  : 'No orders in range'}
              </p>
            </div>
          </div>

          {/* MAIN GRAPH: SELLING HIGH OR LOW TIMELINE */}
          <div className="bg-white border border-neutral-200/90 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
              <div>
                <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                  {chartType === 'line' ? (
                    <LineChart className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <BarChart3 className="w-4 h-4 text-neutral-700" />
                  )}
                  <span>
                    Selling Performance {chartType === 'line' ? 'Line Graph' : 'Bar Chart'} (High vs Low Velocity)
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Daily visual trend showing peak high selling days and slower volume days against daily average ({currencySymbol}
                  {dailyStats.avgDailyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/day)
                </p>
              </div>

              {/* Chart Controls: Graph Type & Metric Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Graph Type Switcher */}
                <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200/60">
                  <button
                    onClick={() => setChartType('line')}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium transition ${
                      chartType === 'line'
                        ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    <span>Line Graph</span>
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium transition ${
                      chartType === 'bar'
                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Bar Chart</span>
                  </button>
                </div>

                {/* Metric Toggle */}
                <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200/60">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                      chartMetric === 'revenue' ? 'bg-white text-black shadow-2xs font-semibold' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Sales Revenue ({currencySymbol})
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                      chartMetric === 'orders' ? 'bg-white text-black shadow-2xs font-semibold' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Orders Volume (Count)
                  </button>
                </div>
              </div>
            </div>

            {/* CHART DISPLAY */}
            {dailyStats.days.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 text-sm">
                No orders found for the selected date range. Try expanding your search or selecting &quot;All Time&quot;.
              </div>
            ) : (
              <div className="relative pt-4">
                {/* Visual Legend */}
                <div className="flex flex-wrap items-center justify-end gap-4 text-[11px] mb-2 text-neutral-500">
                  {chartType === 'line' ? (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-4 h-1 rounded-full bg-emerald-500 inline-block" />
                        <span>Performance Line</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                        <span>High Velocity Day</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                        <span>Normal / Low Day</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span>High Selling Day (Above Average)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                        <span>Low / Average Selling Day</span>
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-b-2 border-dashed border-amber-500 inline-block" />
                    <span>Daily Average Line</span>
                  </span>
                </div>

                {/* Interactive SVG Chart */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[650px] h-72 relative">
                    <svg
                      viewBox="0 0 1000 260"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        {/* Line chart area gradient */}
                        <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                          <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Line chart stroke gradient */}
                        <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#047857" />
                        </linearGradient>

                        {/* Bar gradients */}
                        <linearGradient id="barGradientHigh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="barGradientLow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#71717a" />
                          <stop offset="100%" stopColor="#a1a1aa" />
                        </linearGradient>

                        {/* Soft drop shadow */}
                        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#059669" floodOpacity="0.28" />
                        </filter>
                      </defs>

                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const y = 20 + (1 - pct) * 200;
                        const labelVal =
                          chartMetric === 'revenue'
                            ? `${currencySymbol}${Math.round(dailyStats.maxRevenue * pct)}`
                            : Math.round(dailyStats.maxOrders * pct);
                        return (
                          <g key={idx}>
                            <line
                              x1="40"
                              y1={y}
                              x2="980"
                              y2={y}
                              stroke="#e5e5e5"
                              strokeDasharray="3 3"
                              strokeWidth="1"
                            />
                            <text
                              x="35"
                              y={y + 4}
                              textAnchor="end"
                              fontSize="10"
                              fill="#a3a3a3"
                              fontFamily="monospace"
                            >
                              {labelVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Average Reference Line */}
                      {(() => {
                        const avgVal =
                          chartMetric === 'revenue' ? dailyStats.avgDailyRevenue : dailyStats.avgDailyOrders;
                        const maxVal =
                          chartMetric === 'revenue' ? dailyStats.maxRevenue : dailyStats.maxOrders;
                        const avgPct = maxVal > 0 ? avgVal / maxVal : 0;
                        const avgY = 20 + (1 - avgPct) * 200;
                        return (
                          <g>
                            <line
                              x1="40"
                              y1={avgY}
                              x2="980"
                              y2={avgY}
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                            <text
                              x="975"
                              y={avgY - 6}
                              textAnchor="end"
                              fontSize="10"
                              fill="#d97706"
                              fontWeight="600"
                            >
                              Avg: {chartMetric === 'revenue' ? `${currencySymbol}${Math.round(avgVal)}` : avgVal.toFixed(1)}
                            </text>
                          </g>
                        );
                      })()}

                      {/* Dynamic Rendering: Line Graph OR Bar Chart */}
                      {(() => {
                        const totalDays = dailyStats.days.length;
                        const maxVal = chartMetric === 'revenue' ? dailyStats.maxRevenue : dailyStats.maxOrders;
                        const avgVal = chartMetric === 'revenue' ? dailyStats.avgDailyRevenue : dailyStats.avgDailyOrders;

                        if (chartType === 'line') {
                          // Coordinates for each date point along the line
                          const pts = dailyStats.days.map((d, idx) => {
                            const spacing = totalDays > 1 ? (980 - 60) / (totalDays - 1) : 0;
                            const x = totalDays > 1 ? 60 + idx * spacing : 520;
                            const val = chartMetric === 'revenue' ? d.revenue : d.ordersCount;
                            const heightPct = maxVal > 0 ? val / maxVal : 0;
                            const y = 220 - heightPct * 200;
                            const isHigh = val >= avgVal;
                            const isHighest = d === dailyStats.highestDay;
                            const isLowest = d === dailyStats.lowestDay && totalDays > 1;
                            const isHovered = hoveredDay?.date === d.date;

                            return { d, idx, x, y, val, isHigh, isHighest, isLowest, isHovered };
                          });

                          // Generate smooth cubic bezier curve
                          let linePath = '';
                          if (pts.length === 1) {
                            linePath = `M ${pts[0].x - 30} ${pts[0].y} L ${pts[0].x + 30} ${pts[0].y}`;
                          } else if (pts.length === 2) {
                            linePath = `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
                          } else if (pts.length > 2) {
                            linePath = `M ${pts[0].x} ${pts[0].y}`;
                            for (let i = 0; i < pts.length - 1; i++) {
                              const p0 = pts[i === 0 ? 0 : i - 1];
                              const p1 = pts[i];
                              const p2 = pts[i + 1];
                              const p3 = pts[i + 2] || p2;
                              const cp1x = p1.x + (p2.x - p0.x) / 6;
                              const cp1y = p1.y + (p2.y - p0.y) / 6;
                              const cp2x = p2.x - (p3.x - p1.x) / 6;
                              const cp2y = p2.y - (p3.y - p1.y) / 6;
                              linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                            }
                          }

                          const areaPath = pts.length > 1
                            ? `${linePath} L ${pts[pts.length - 1].x} 220 L ${pts[0].x} 220 Z`
                            : '';

                          const colWidth = pts.length > 1 ? (980 - 60) / (pts.length - 1) : 60;
                          const hoveredPt = pts.find((p) => p.isHovered);

                          return (
                            <g>
                              {/* Filled Gradient Area */}
                              {areaPath && (
                                <path d={areaPath} fill="url(#lineAreaGradient)" />
                              )}

                              {/* Glowing Smooth Line */}
                              <path
                                d={linePath}
                                fill="none"
                                stroke="url(#lineStrokeGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter="url(#lineGlow)"
                              />

                              {/* Vertical Guide Line on Hover */}
                              {hoveredPt && (
                                <g>
                                  <line
                                    x1={hoveredPt.x}
                                    y1="20"
                                    x2={hoveredPt.x}
                                    y2="220"
                                    stroke="#10b981"
                                    strokeWidth="1.5"
                                    strokeDasharray="3 3"
                                    opacity="0.85"
                                  />
                                  <circle
                                    cx={hoveredPt.x}
                                    cy={hoveredPt.y}
                                    r="10"
                                    fill="#10b981"
                                    opacity="0.2"
                                  />
                                  {/* Floating value tag right above hovered point */}
                                  <g>
                                    <rect
                                      x={hoveredPt.x - 36}
                                      y={Math.max(hoveredPt.y - 32, 8)}
                                      width="72"
                                      height="19"
                                      rx="6"
                                      fill="#171717"
                                      stroke="#38a169"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={hoveredPt.x}
                                      y={Math.max(hoveredPt.y - 18, 22)}
                                      textAnchor="middle"
                                      fontSize="10"
                                      fontWeight="700"
                                      fill="#ffffff"
                                      fontFamily="monospace"
                                    >
                                      {chartMetric === 'revenue'
                                        ? `${currencySymbol}${Math.round(hoveredPt.val).toLocaleString()}`
                                        : `${hoveredPt.val} orders`}
                                    </text>
                                  </g>
                                </g>
                              )}

                              {/* Points & Interactive Zones */}
                              {pts.map((p) => (
                                <g
                                  key={p.d.date}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredDay(p.d)}
                                  onMouseLeave={() => setHoveredDay(null)}
                                >
                                  {/* Transparent column hit area */}
                                  <rect
                                    x={p.x - colWidth / 2}
                                    y="20"
                                    width={colWidth}
                                    height="210"
                                    fill="transparent"
                                  />

                                  {/* Point Marker */}
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={p.isHovered ? 6.5 : p.isHighest ? 5 : 4}
                                    fill={p.isHighest ? '#059669' : p.isHigh ? '#10b981' : '#71717a'}
                                    stroke="#ffffff"
                                    strokeWidth={p.isHovered ? 3 : 2}
                                    className="transition-all duration-150"
                                  />

                                  {/* Peak High Tag */}
                                  {p.isHighest && (
                                    <g>
                                      <rect
                                        x={p.x - 22}
                                        y={p.y - 25}
                                        width="44"
                                        height="16"
                                        rx="8"
                                        fill="#065f46"
                                      />
                                      <text
                                        x={p.x}
                                        y={p.y - 14}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="#ffffff"
                                      >
                                        PEAK
                                      </text>
                                    </g>
                                  )}

                                  {/* Lowest Tag */}
                                  {p.isLowest && (
                                    <g>
                                      <rect
                                        x={p.x - 20}
                                        y={Math.min(p.y + 10, 206)}
                                        width="40"
                                        height="14"
                                        rx="7"
                                        fill="#71717a"
                                      />
                                      <text
                                        x={p.x}
                                        y={Math.min(p.y + 20, 216)}
                                        textAnchor="middle"
                                        fontSize="8.5"
                                        fontWeight="600"
                                        fill="#ffffff"
                                      >
                                        LOW
                                      </text>
                                    </g>
                                  )}

                                  {/* Date Label on X axis */}
                                  <text
                                    x={p.x}
                                    y="245"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill={p.isHovered ? '#000000' : '#737373'}
                                    fontWeight={p.isHovered ? '700' : '500'}
                                  >
                                    {p.d.date.slice(5)}
                                  </text>
                                </g>
                              ))}
                            </g>
                          );
                        }

                        // Bar Chart Rendering
                        const spacing = (980 - 60) / Math.max(totalDays, 1);
                        return (
                          <g>
                            {dailyStats.days.map((d, idx) => {
                              const x = 60 + idx * spacing;
                              const val = chartMetric === 'revenue' ? d.revenue : d.ordersCount;
                              const heightPct = maxVal > 0 ? val / maxVal : 0;
                              const barHeight = Math.max(heightPct * 200, 4);
                              const y = 220 - barHeight;

                              const isHigh = val >= avgVal;
                              const isHighest = d === dailyStats.highestDay;
                              const isLowest = d === dailyStats.lowestDay && totalDays > 1;
                              const isHovered = hoveredDay?.date === d.date;

                              return (
                                <g
                                  key={d.date}
                                  className="cursor-pointer transition-transform"
                                  onMouseEnter={() => setHoveredDay(d)}
                                  onMouseLeave={() => setHoveredDay(null)}
                                >
                                  {/* Bar */}
                                  <rect
                                    x={x - 12}
                                    y={y}
                                    width="24"
                                    height={barHeight}
                                    rx="4"
                                    fill={isHighest ? 'url(#barGradientHigh)' : isHigh ? '#10b981' : 'url(#barGradientLow)'}
                                    opacity={isHovered ? 1 : 0.85}
                                    className="transition-all hover:opacity-100"
                                  />

                                  {/* Peak High Tag */}
                                  {isHighest && (
                                    <g>
                                      <rect
                                        x={x - 22}
                                        y={y - 22}
                                        width="44"
                                        height="16"
                                        rx="8"
                                        fill="#065f46"
                                      />
                                      <text
                                        x={x}
                                        y={y - 11}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fontWeight="700"
                                        fill="#ffffff"
                                      >
                                        PEAK
                                      </text>
                                    </g>
                                  )}

                                  {/* Lowest Tag */}
                                  {isLowest && (
                                    <g>
                                      <rect
                                        x={x - 20}
                                        y={y - 20}
                                        width="40"
                                        height="14"
                                        rx="7"
                                        fill="#71717a"
                                      />
                                      <text
                                        x={x}
                                        y={y - 10}
                                        textAnchor="middle"
                                        fontSize="8.5"
                                        fontWeight="600"
                                        fill="#ffffff"
                                      >
                                        LOW
                                      </text>
                                    </g>
                                  )}

                                  {/* Date Label on X axis */}
                                  <text
                                    x={x}
                                    y="245"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill={isHovered ? '#000000' : '#737373'}
                                    fontWeight={isHovered ? '700' : '500'}
                                  >
                                    {d.date.slice(5)}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Hover Floating Tooltip */}
                    {hoveredDay && (
                      <div className="absolute top-2 right-4 bg-neutral-900 text-white rounded-lg p-3 shadow-xl text-xs space-y-1 pointer-events-none z-10 border border-neutral-700 min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between border-b border-neutral-700 pb-1">
                          <span className="font-semibold text-neutral-200">{hoveredDay.date}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              hoveredDay.revenue >= dailyStats.avgDailyRevenue
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {hoveredDay.revenue >= dailyStats.avgDailyRevenue ? 'HIGH SELLING' : 'LOW SELLING'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-neutral-400">Total Sales:</span>
                          <span className="font-bold text-white font-mono">
                            {currencySymbol}
                            {hoveredDay.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Order Count:</span>
                          <span className="font-medium text-white">{hoveredDay.ordersCount} orders</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-400 pt-0.5">
                          <span>Vs Daily Avg:</span>
                          <span
                            className={
                              hoveredDay.revenue >= dailyStats.avgDailyRevenue ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'
                            }
                          >
                            {hoveredDay.revenue >= dailyStats.avgDailyRevenue ? '+' : ''}
                            {(
                              ((hoveredDay.revenue - dailyStats.avgDailyRevenue) / (dailyStats.avgDailyRevenue || 1)) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TWO COLUMNS: CATEGORY VELOCITY & PIPELINE STAGE DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Product Categories */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h4 className="font-semibold text-neutral-900 text-sm">Selling by Product Category</h4>
                  <p className="text-xs text-neutral-500">Fine jewelry items ranked by sales volume in selected dates</p>
                </div>
                <PieChart className="w-4 h-4 text-neutral-400" />
              </div>

              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No item categories found in this date range.</p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.slice(0, 6).map((cat) => {
                    const pct = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-neutral-800">{cat.name}</span>
                          <span className="text-neutral-900 font-mono font-semibold">
                            {currencySymbol}
                            {cat.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            <span className="text-[11px] text-neutral-400 font-normal ml-1">
                              ({cat.count} sold · {pct.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-neutral-900 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Production Pipeline Distribution */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h4 className="font-semibold text-neutral-900 text-sm">Orders by Workshop Pipeline Stage</h4>
                  <p className="text-xs text-neutral-500">Where current orders in this date range currently sit</p>
                </div>
                <BarChart3 className="w-4 h-4 text-neutral-400" />
              </div>

              {stageBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No stages configured.</p>
              ) : (
                <div className="space-y-3">
                  {stageBreakdown.map((stg) => (
                    <div key={stg.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-neutral-800">{stg.name}</span>
                        <span className="text-neutral-900 font-mono font-semibold">
                          {stg.count} orders
                          <span className="text-[11px] text-neutral-400 font-normal ml-1">
                            ({stg.percent.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(stg.percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FREQUENTLY BOUGHT TOGETHER / WHICH PRODUCT SELLS MOST WITH... */}
          <div className="bg-white border border-neutral-200/90 rounded-xl p-6 shadow-2xs space-y-6">
            {/* Section Header with Mode Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex">
                    <Combine className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-neutral-900 text-base">
                    Frequently Bought Together (Cross-Selling Affinity)
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                    Product Co-Sales
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Discover which products sell most together, customer basket combinations, and optimal bundle pairings
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAffinityTab('lookup')}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    affinityTab === 'lookup'
                      ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Which Product Sells Most With...</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAffinityTab('top_pairs')}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    affinityTab === 'top_pairs'
                      ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span>Top Product Pairs ({productAffinityData.pairs.length})</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/60">
              <div>
                <span className="text-[11px] text-neutral-500 block">Multi-Item Orders</span>
                <span className="text-base font-bold text-neutral-900 font-mono">
                  {productAffinityData.multiItemOrdersCount}
                  <span className="text-xs font-normal text-neutral-400 ml-1">
                    ({productAffinityData.multiItemRate.toFixed(1)}% of orders)
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Top Co-Selling Product</span>
                <span
                  className="text-xs font-semibold text-neutral-900 truncate block mt-0.5"
                  title={productAffinityData.topPairProduct || 'None'}
                >
                  {productAffinityData.topPairProduct || '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Total Unique Combinations</span>
                <span className="text-base font-bold text-neutral-900 font-mono">
                  {productAffinityData.pairs.length}
                  <span className="text-xs font-normal text-neutral-400 ml-1">pairs</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Top Bundle Value</span>
                <span className="text-base font-bold text-emerald-800 font-mono">
                  {currencySymbol}
                  {(productAffinityData.pairs[0]?.combinedRevenue || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* TAB 1: PRODUCT LOOKUP (WHICH PRODUCT SELLS MOST WITH...) */}
            {affinityTab === 'lookup' && (
              <div className="space-y-5">
                {/* Product Search & Dropdown Selection */}
                <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/70 space-y-3">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Select or search any product to see what it sells most with:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Search box for filtering */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={affinitySearch}
                        onChange={(e) => setAffinitySearch(e.target.value)}
                        placeholder="Filter products list by name..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>

                    {/* Dropdown Select */}
                    <div>
                      <select
                        value={activeAffinityProductTitle}
                        onChange={(e) => setSelectedAffinityProduct(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-neutral-800 font-medium truncate"
                      >
                        {filteredAffinityProductsList.length === 0 ? (
                          <option value="">No matching products</option>
                        ) : (
                          filteredAffinityProductsList.map((p) => {
                            const companionCount =
                              productAffinityData.productAffinityLookup[p.title]?.companions.length || 0;
                            return (
                              <option key={p.title} value={p.title}>
                                {companionCount > 0
                                  ? `★ [Co-sold with ${companionCount} items] `
                                  : '[Sold alone] '}
                                {p.title} ({p.totalOrders} {p.totalOrders === 1 ? 'order' : 'orders'})
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* VISUAL ANSWER CARD */}
                {activeAffinity ? (
                  <div className="space-y-4">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[11px] text-neutral-300 uppercase tracking-wider font-semibold">
                          Affinity Analysis
                        </span>
                        <h4 className="text-sm md:text-base font-semibold mt-0.5 text-white">
                          Which product sells most with{' '}
                          <span className="text-emerald-400 underline decoration-emerald-500/50 underline-offset-2">
                            &quot;{activeAffinity.product.title}&quot;
                          </span>
                          ?
                        </h4>
                      </div>

                      {activeAffinity.topCompanion ? (
                        <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 self-start md:self-auto">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs text-white font-medium">
                            Top Companion:{' '}
                            <strong className="text-emerald-300 font-bold">
                              {activeAffinity.topCompanion.title}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700 self-start md:self-auto">
                          <AlertCircle className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-xs text-neutral-300">Always purchased alone</span>
                        </div>
                      )}
                    </div>

                    {/* Side-by-side Visual Product Pairing */}
                    {activeAffinity.topCompanion ? (
                      <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-5">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between">
                          {/* PRIMARY PRODUCT CARD */}
                          <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-3.5">
                            <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center">
                              {activeAffinity.product.imageUrl ? (
                                <img
                                  src={activeAffinity.product.imageUrl}
                                  alt={activeAffinity.product.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="w-6 h-6 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 inline-block mb-1">
                                {activeAffinity.product.productType || 'Jewelry'}
                              </span>
                              <h5
                                className="text-xs font-semibold text-neutral-900 truncate"
                                title={activeAffinity.product.title}
                              >
                                {activeAffinity.product.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="font-mono font-bold text-neutral-900">
                                  {currencySymbol}
                                  {(activeAffinity.product.price || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <span className="text-neutral-400 text-[11px]">
                                  · in {activeAffinity.product.totalOrders}{' '}
                                  {activeAffinity.product.totalOrders === 1 ? 'order' : 'orders'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* CONNECTOR / BADGE */}
                          <div className="flex md:flex-col items-center justify-center gap-1.5 py-1 px-3 self-center">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Plus className="w-4 h-4" />
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                Sells Most With
                              </span>
                              <span className="text-[11px] font-semibold text-neutral-600">
                                {activeAffinity.topCompanion.count}x together
                              </span>
                            </div>
                          </div>

                          {/* TOP COMPANION PRODUCT CARD */}
                          <div className="flex-1 bg-white border border-emerald-200 rounded-xl p-4 shadow-2xs flex items-center gap-3.5 relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                              #1 Best Match
                            </div>
                            <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center">
                              {activeAffinity.topCompanion.productMeta?.imageUrl ? (
                                <img
                                  src={activeAffinity.topCompanion.productMeta.imageUrl}
                                  alt={activeAffinity.topCompanion.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="w-6 h-6 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pr-6">
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-block mb-1">
                                {activeAffinity.topCompanion.productMeta?.productType || 'Companion'}
                              </span>
                              <h5
                                className="text-xs font-semibold text-neutral-900 truncate"
                                title={activeAffinity.topCompanion.title}
                              >
                                {activeAffinity.topCompanion.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="font-mono font-bold text-neutral-900">
                                  {currencySymbol}
                                  {(activeAffinity.topCompanion.productMeta?.price || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <span className="text-emerald-700 font-semibold text-[11px]">
                                  · {activeAffinity.topCompanion.coRate.toFixed(0)}% co-purchase rate
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bundle Strategy Note */}
                        <div className="mt-4 pt-3 border-t border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-600">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>
                              <strong>Cross-Sell Strategy:</strong> Customers purchasing <em>{activeAffinity.product.title}</em> bought <em>{activeAffinity.topCompanion.title}</em> in <strong>{activeAffinity.topCompanion.coRate.toFixed(0)}%</strong> of their orders.
                            </span>
                          </span>
                          <span className="text-neutral-500 font-mono text-[11px]">
                            Found in orders: {activeAffinity.topCompanion.orders.join(', ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Standalone Product Empty State */
                      <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-6 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="max-w-md mx-auto">
                          <h5 className="text-sm font-semibold text-neutral-800">
                            No companion products recorded yet
                          </h5>
                          <p className="text-xs text-neutral-500 mt-1">
                            &quot;{activeAffinity.product.title}&quot; was purchased individually in all{' '}
                            <strong>{activeAffinity.product.totalOrders}</strong> recorded orders in this period.
                          </p>
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Opportunity: Set up a cross-sell popup or bundle discount for this item on your storefront!</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TABLE OF ALL COMPANIONS BOUGHT WITH THIS PRODUCT */}
                    {activeAffinity.companions.length > 0 && (
                      <div className="border border-neutral-200/90 rounded-xl overflow-hidden bg-white shadow-2xs mt-4">
                        <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-neutral-500" />
                            All Items Sold With &quot;{activeAffinity.product.title}&quot; ({activeAffinity.companions.length})
                          </h5>
                          <span className="text-[11px] text-neutral-500">
                            Ranked by frequency
                          </span>
                        </div>
                        <div className="divide-y divide-neutral-100">
                          {activeAffinity.companions.map((comp, idx) => (
                            <div
                              key={comp.title}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/80 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="w-10 h-10 rounded-md bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center">
                                  {comp.productMeta?.imageUrl ? (
                                    <img
                                      src={comp.productMeta.imageUrl}
                                      alt={comp.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ShoppingBag className="w-4 h-4 text-neutral-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-neutral-900 truncate" title={comp.title}>
                                    {comp.title}
                                  </div>
                                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                    <span>{comp.productMeta?.productType || 'Fine Jewelry'}</span>
                                    <span>·</span>
                                    <span className="font-mono text-neutral-700">
                                      {currencySymbol}
                                      {(comp.productMeta?.price || 0).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 self-end sm:self-auto">
                                <div className="text-right">
                                  <div className="text-xs font-bold text-neutral-900 font-mono">
                                    {comp.count} {comp.count === 1 ? 'time' : 'times'}
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-medium">
                                    {comp.coRate.toFixed(0)}% of orders
                                  </div>
                                </div>
                                <div className="w-24 bg-neutral-100 h-2 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full"
                                    style={{ width: `${Math.min(Math.max(comp.coRate, 8), 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    Please select a product from the dropdown above.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ALL TOP PRODUCT PAIRS */}
            {affinityTab === 'top_pairs' && (
              <div className="space-y-4">
                {productAffinityData.pairs.length === 0 ? (
                  <div className="py-12 text-center space-y-3 bg-neutral-50/50 rounded-xl border border-neutral-200">
                    <Combine className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="text-xs text-neutral-500">
                      No multi-item product pairs detected in {activeDateRangeText}.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('all')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-neutral-800 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Switch to All Time</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productAffinityData.pairs.map((pair, idx) => (
                      <div
                        key={pair.id}
                        className="bg-neutral-50/60 border border-neutral-200/80 rounded-xl p-4 shadow-2xs space-y-3 hover:border-neutral-300 transition"
                      >
                        {/* Header: Rank + Times Sold */}
                        <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white">
                            PAIR #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                            Bought together {pair.count} {pair.count === 1 ? 'time' : 'times'}
                          </span>
                        </div>

                        {/* Two Products Side-by-side */}
                        <div className="space-y-2">
                          {/* Product A */}
                          <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-neutral-200/60">
                            <div className="w-10 h-10 rounded bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center">
                              {pair.productA?.imageUrl ? (
                                <img
                                  src={pair.productA.imageUrl}
                                  alt={pair.titleA}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h6 className="text-xs font-medium text-neutral-900 truncate" title={pair.titleA}>
                                {pair.titleA}
                              </h6>
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {currencySymbol}
                                {(pair.productA?.price || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Plus separator */}
                          <div className="flex justify-center -my-1">
                            <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center z-10 border border-white">
                              +
                            </span>
                          </div>

                          {/* Product B */}
                          <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-neutral-200/60">
                            <div className="w-10 h-10 rounded bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center">
                              {pair.productB?.imageUrl ? (
                                <img
                                  src={pair.productB.imageUrl}
                                  alt={pair.titleB}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h6 className="text-xs font-medium text-neutral-900 truncate" title={pair.titleB}>
                                {pair.titleB}
                              </h6>
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {currencySymbol}
                                {(pair.productB?.price || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer details: Orders & Combined Value */}
                        <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-500">
                          <span>
                            Orders: <strong className="text-neutral-800 font-mono">{pair.orders.join(', ')}</strong>
                          </span>
                          <span className="font-mono font-semibold text-neutral-900">
                            Est. Pair Value: {currencySymbol}
                            {pair.combinedRevenue.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ORDERS TABLE IN THIS DATE RANGE */}
          <div className="bg-white border border-neutral-200/90 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-neutral-900 text-sm">
                  Orders in Filtered Range ({searchedOrders.length})
                </h4>
                <p className="text-xs text-neutral-500">
                  Detailed ledger of all transactions matching {activeDateRangeText}
                </p>
              </div>

              {/* Search in table */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search order #, customer..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                />
              </div>
            </div>

            {searchedOrders.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                No orders match your search or date criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Order #</th>
                      <th className="py-2.5 px-4">Date & Time</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Items / Details</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {searchedOrders.slice(0, 30).map((ord) => {
                      const itemSummary =
                        ord.items && ord.items.length > 0
                          ? `${ord.items[0].title} ${ord.items.length > 1 ? `(+${ord.items.length - 1} more)` : ''}`
                          : 'Custom Fine Jewelry';

                      return (
                        <tr key={ord.id} className="hover:bg-neutral-50/80 transition">
                          <td className="py-3 px-4 font-semibold text-neutral-900 font-mono">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            <span className="text-neutral-400">
                              {new Date(ord.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-neutral-900">{ord.customer.name}</div>
                            {ord.customer.email && (
                              <div className="text-[11px] text-neutral-400">{ord.customer.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-neutral-600">
                            {itemSummary}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                ord.status === 'Delivered'
                                  ? 'bg-neutral-100 text-neutral-700'
                                  : ord.status === 'Cancelled'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-neutral-900 font-mono">
                            {currencySymbol}
                            {(ord.total || 0).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/orders/${ord.id}`}
                              className="text-neutral-500 hover:text-black inline-flex items-center p-1 rounded hover:bg-neutral-200/60 transition"
                              title="View order details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {searchedOrders.length > 30 && (
              <div className="p-3 bg-neutral-50 text-center text-xs text-neutral-500 border-t border-neutral-100">
                Showing first 30 of {searchedOrders.length} orders. Use CSV export to view full dataset.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
