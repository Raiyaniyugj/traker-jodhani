'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Order, PipelineStage } from '@/lib/types';
import {
  Check,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';

interface OrderSwimlaneViewProps {
  orders: Order[];
  stages: PipelineStage[];
  onOrderStageChange: (orderId: string, nextStageId: string) => void;
  shopifyConnected?: boolean;
}

export default function OrderSwimlaneView({
  orders,
  stages,
  onOrderStageChange,
  shopifyConnected = true,
}: OrderSwimlaneViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200">
            High Priority
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-sky-50 text-sky-700 border border-sky-200">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
            {priority}
          </span>
        );
    }
  };

  const getNextStage = (currentStageId: string): PipelineStage | null => {
    const idx = sortedStages.findIndex((s) => s.id === currentStageId);
    if (idx >= 0 && idx < sortedStages.length - 1) {
      return sortedStages[idx + 1];
    }
    return null;
  };

  const handleStageClick = async (orderId: string, targetStageId: string) => {
    try {
      setUpdatingOrderId(orderId);
      await onOrderStageChange(orderId, targetStageId);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.items[0]?.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage =
      selectedStageFilter === 'all' || order.currentStageId === selectedStageFilter;

    return matchesSearch && matchesStage;
  });

  // Helper to extract numeric order number (e.g. "#1070" -> 1070)
  const getOrderNumberVal = (ord: Order) => {
    const raw = ord.orderNumber || '';
    const match = raw.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Sort orders descending by latest order number (#1070 first), then created_at
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const numA = getOrderNumberVal(a);
    const numB = getOrderNumberVal(b);
    if (numA !== numB) {
      return numB - numA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, customer, or jewelry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
          />
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedStageFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition shrink-0 ${
              selectedStageFilter === 'all'
                ? 'bg-black text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
            }`}
          >
            All Orders ({orders.length})
          </button>
          {sortedStages.map((stage) => {
            const count = orders.filter((o) => o.currentStageId === stage.id).length;
            if (count === 0 && selectedStageFilter !== stage.id) return null;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStageFilter(stage.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition shrink-0 ${
                  selectedStageFilter === stage.id
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
                }`}
              >
                {stage.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List: Each Order is Dedicated to its OWN Line */}
      {sortedOrders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 text-sm">
          No orders match your filter criteria.
        </div>
      ) : (
        <div className="space-y-3.5">
          {sortedOrders.map((order) => {
            const currentStageIndex = sortedStages.findIndex(
              (s) => s.id === order.currentStageId
            );
            const activeStage = sortedStages[currentStageIndex];
            const nextStage = getNextStage(order.currentStageId);
            const primaryItem = order.items[0];
            const isUpdating = updatingOrderId === order.id;

            // Compute progress percentage
            const progress =
              currentStageIndex >= 0
                ? Math.round(((currentStageIndex + 1) / sortedStages.length) * 100)
                : 0;

            return (
              <div
                key={order.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs hover:border-neutral-300 transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
                  {/* Left Column: Order Card Metadata */}
                  <div className="lg:w-80 shrink-0 space-y-2 border-b lg:border-b-0 lg:border-r border-neutral-100 pb-4 lg:pb-0 lg:pr-6">
                    <div className="flex items-start gap-3">
                      {primaryItem?.imageUrl || order.gallery?.[0]?.url ? (
                        <img
                          src={primaryItem?.imageUrl || order.gallery?.[0]?.url}
                          alt={primaryItem?.title || 'Jewelry Piece'}
                          className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shrink-0 shadow-2xs mt-0.5"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-serif font-bold text-lg text-neutral-900 hover:text-black hover:underline"
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
                          {getPriorityBadge(order.priority)}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-neutral-900 leading-tight">
                            {primaryItem?.title || 'Custom Fine Jewelry'}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Client: <span className="font-medium text-neutral-700">{order.customer.name}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Jewelry Specifications tags */}
                    {primaryItem && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {primaryItem.metalType && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200 font-medium">
                            {primaryItem.metalType} {primaryItem.metalColor || ''}
                          </span>
                        )}
                        {primaryItem.diamondSize && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200 font-medium">
                            {primaryItem.diamondSize}ct {primaryItem.diamondShape || 'Diamond'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price & Links */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono font-bold text-sm text-neutral-900">
                        ${order.total.toLocaleString()}
                      </span>

                      <div className="flex items-center gap-2 text-xs">
                        <Link
                          href={`/orders/${order.id}`}
                          className="px-2.5 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 font-medium transition"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/track/${order.id}`}
                          target="_blank"
                          title="Live Customer Tracking Link"
                          className="p-1 text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-50 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Full Manufacturing Process Pipeline Track on that SAME LINE */}
                  <div className="flex-1 min-w-0 overflow-x-auto py-2">
                    <div className="flex items-center justify-between text-xs mb-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-800">
                          Current Stage:
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white shadow-xs">
                          {activeStage?.name || 'In Production'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-400 font-mono">
                          {progress}% Completed
                        </span>
                        {nextStage && (
                          <button
                            onClick={() => handleStageClick(order.id, nextStage.id)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-black hover:bg-neutral-800 text-white text-xs font-medium rounded-lg shadow-2xs transition disabled:opacity-50"
                          >
                            <span>Next: {nextStage.name}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Horizontal Timeline Track for this Order */}
                    <div className="relative pt-3 pb-2 px-3 min-w-[760px]">
                      {/* Connecting Line Track */}
                      <div className="absolute top-[26px] left-8 right-8 h-1 bg-neutral-200 rounded-full -z-0">
                        <div
                          className="h-1 bg-black rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              currentStageIndex >= 0
                                ? (currentStageIndex / (sortedStages.length - 1)) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      {/* 9 Stage Nodes along the same line */}
                      <div className="flex items-center justify-between relative z-10">
                        {sortedStages.map((stage, idx) => {
                          const isDone = idx < currentStageIndex;
                          const isCurrent = idx === currentStageIndex;
                          const isFuture = idx > currentStageIndex;

                          return (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() => handleStageClick(order.id, stage.id)}
                              disabled={isUpdating}
                              title={`Move order to ${stage.name}`}
                              className="flex flex-col items-center group cursor-pointer focus:outline-none transition-transform hover:scale-105"
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'bg-black text-white shadow-xs'
                                    : isCurrent
                                    ? 'bg-black text-white ring-4 ring-neutral-200 shadow-md scale-110'
                                    : 'bg-white border-2 border-neutral-300 text-neutral-400 group-hover:border-black group-hover:text-black'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                ) : isCurrent ? (
                                  <span className="w-2 h-2 rounded-full bg-white" />
                                ) : (
                                  <span className="text-[10px] font-mono font-medium">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>

                              <span
                                className={`text-[11px] mt-2 font-medium tracking-tight text-center max-w-[75px] leading-tight transition-colors ${
                                  isCurrent
                                    ? 'text-black font-bold'
                                    : isDone
                                    ? 'text-neutral-800'
                                    : 'text-neutral-400 group-hover:text-black'
                                }`}
                              >
                                {stage.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
