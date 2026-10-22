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
  Award,
  AlertCircle,
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
  const [hoveredDay, setHoveredDay] = useState<any | null>(null);

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
                  : '—'}
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
                  : '—'}
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
                  <BarChart3 className="w-4 h-4 text-neutral-700" />
                  <span>Selling Performance Graph (High vs Low Velocity)</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Daily visual trend showing peak high selling days and slower volume days against daily average ({currencySymbol}
                  {dailyStats.avgDailyRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/day)
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center bg-neutral-100 p-1 rounded-lg">
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

            {/* CHART DISPLAY */}
            {dailyStats.days.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 text-sm">
                No orders found for the selected date range. Try expanding your search or selecting &quot;All Time&quot;.
              </div>
            ) : (
              <div className="relative pt-4">
                {/* Visual Legend */}
                <div className="flex flex-wrap items-center justify-end gap-4 text-[11px] mb-2 text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>High Selling Day (Above Average)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                    <span>Low / Average Selling Day</span>
                  </span>
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
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="barGradientHigh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="barGradientLow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#71717a" />
                          <stop offset="100%" stopColor="#a1a1aa" />
                        </linearGradient>
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

                      {/* Average Line */}
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

                      {/* Bars & Points */}
                      {dailyStats.days.map((d, idx) => {
                        const totalDays = dailyStats.days.length;
                        const spacing = (980 - 60) / Math.max(totalDays, 1);
                        const x = 60 + idx * spacing;
                        const val = chartMetric === 'revenue' ? d.revenue : d.ordersCount;
                        const maxVal = chartMetric === 'revenue' ? dailyStats.maxRevenue : dailyStats.maxOrders;
                        const avgVal = chartMetric === 'revenue' ? dailyStats.avgDailyRevenue : dailyStats.avgDailyOrders;
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
                                <circle cx={x} cy={y - 8} r="4" fill="#059669" />
                                <text
                                  x={x}
                                  y={y - 14}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="700"
                                  fill="#065f46"
                                >
                                  HIGH 🔥
                                </text>
                              </g>
                            )}

                            {/* Lowest Tag */}
                            {isLowest && (
                              <text
                                x={x}
                                y={y - 8}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="600"
                                fill="#71717a"
                              >
                                LOW ❄️
                              </text>
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
