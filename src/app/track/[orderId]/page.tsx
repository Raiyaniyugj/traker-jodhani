'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  Clock,
  Diamond,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Order, PipelineStage } from '@/lib/types';

export default function CustomerTrackingPage() {
  const params = useParams();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setStages(data.stages || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) loadData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-500 font-serif">Locating your jewelry order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <Diamond className="w-8 h-8 mx-auto text-neutral-400 mb-3" />
          <h1 className="font-serif font-semibold text-2xl text-neutral-900">Order Not Found</h1>
          <p className="text-xs text-neutral-500 mt-2">
            Please check the tracking link provided by your jeweler or contact customer care.
          </p>
        </div>
      </div>
    );
  }

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentStageIndex = sortedStages.findIndex((s) => s.id === order.currentStageId);
  const firstItem = order.items[0];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif font-semibold text-xl tracking-wide">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 9L8 3H16L20 9L12 21L4 9Z" fill="black" />
              <path d="M4 9H20" stroke="white" strokeWidth="1" />
              <path d="M8 3L12 9L16 3" stroke="white" strokeWidth="1" />
              <path d="M4 9L12 21L20 9" stroke="white" strokeWidth="1" />
            </svg>
            Trackerz
          </div>
          <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full font-medium">
            Customer Live Tracker
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
            Custom Manufacturing Order
          </span>
          <h1 className="font-serif font-semibold text-3xl sm:text-5xl text-neutral-900">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-neutral-500 max-w-lg mx-auto">
            Your fine jewelry is being handcrafted with precision. Follow real-time progress through our master workshop.
          </p>
        </div>

        {/* Live Progress Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-6 border-b border-neutral-100 mb-6">
            <div>
              <p className="text-xs text-neutral-400 font-mono">CURRENT STATUS</p>
              <h2 className="text-xl font-serif font-semibold text-neutral-900 mt-0.5">
                {sortedStages[currentStageIndex]?.name || 'In Production'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-neutral-900">
                {order.progressPercent}%
              </span>
              <p className="text-[11px] text-neutral-400">Complete</p>
            </div>
          </div>

          {/* Interactive Steps */}
          <div className="relative overflow-x-auto pb-4">
            <div className="flex items-center justify-between min-w-[700px] relative">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 -z-0" />

              {sortedStages.map((st, idx) => {
                const isDone = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={st.id} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isDone
                          ? 'bg-black text-white shadow-xs'
                          : isCurrent
                          ? 'bg-black text-white ring-4 ring-neutral-200 scale-110 shadow-md'
                          : 'bg-white border-2 border-neutral-300 text-neutral-400'
                      }`}
                    >
                      {isDone || isCurrent ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <span className="text-[11px] font-mono">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2.5 font-medium text-center max-w-[85px] leading-tight ${
                        isCurrent
                          ? 'text-black font-semibold'
                          : isDone
                          ? 'text-neutral-800'
                          : 'text-neutral-400'
                      }`}
                    >
                      {st.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      {isDone ? 'Completed' : isCurrent ? 'Active Now' : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Piece Details Card */}
        {firstItem && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="font-serif font-semibold text-2xl text-neutral-900">
              Jewelry Specifications
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-neutral-400 block mb-1">PIECE</span>
                <span className="font-semibold text-neutral-900 text-sm">{firstItem.title}</span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-neutral-400 block mb-1">METAL</span>
                <span className="font-semibold text-neutral-900 text-sm">
                  {firstItem.metalType} {firstItem.metalColor}
                </span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-neutral-400 block mb-1">DIAMONDS</span>
                <span className="font-semibold text-neutral-900 text-sm">
                  {firstItem.diamondSize}ct {firstItem.diamondShape}
                </span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-neutral-400 block mb-1">CUSTOM INSCRIPTION</span>
                <span className="font-semibold text-neutral-900 text-sm truncate">
                  {firstItem.customEngraving || 'Hallmarked'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Shipping details if available */}
        {order.trackingNumber && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-emerald-700" />
              <div>
                <p className="font-semibold text-emerald-900">
                  Dispatched via {order.trackingCarrier || 'Express Courier'}
                </p>
                <p className="text-emerald-700 font-mono mt-0.5">
                  Waybill #{order.trackingNumber}
                </p>
              </div>
            </div>
            <span className="text-emerald-800 font-medium">In Transit</span>
          </div>
        )}

        {/* Quality Guarantee footer */}
        <div className="text-center py-6 border-t border-neutral-200 text-xs text-neutral-400 space-y-1">
          <p>© {new Date().getFullYear()} Trackerz Production System · Certified Craftsmanship</p>
          <p>For questions regarding your order, contact your jeweler directly.</p>
        </div>
      </main>
    </div>
  );
}
