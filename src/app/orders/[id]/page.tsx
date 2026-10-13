'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  History,
  Send,
  Upload,
  Truck,
  Diamond,
} from 'lucide-react';
import { Order, PipelineStage } from '@/lib/types';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gallery' | 'comments' | 'activity'>('gallery');
  const [newComment, setNewComment] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('FedEx Priority');
  const [copiedLink, setCopiedLink] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setStages(data.stages || []);
        setTrackingNumber(data.order.trackingNumber || '');
        setTrackingCarrier(data.order.trackingCarrier || 'FedEx Priority');
      } else {
        router.push('/dashboard');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStageClick = async (targetStageId: string) => {
    if (!order) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStageId: targetStageId }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber,
          trackingCarrier,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !newComment.trim()) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment,
          author: 'Dhiren Bhagvanbhai Savaliya',
          role: 'Admin',
        }),
      });
      if (res.ok) {
        setNewComment('');
        loadOrder();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSampleMedia = async (type: 'cad' | 'casting' | 'qc') => {
    if (!order) return;
    const titles = {
      cad: '3D CAD Render (.stl verified)',
      casting: 'Gold Casting Inspection Photo',
      qc: 'Final Microscope & Laser Hallmark Check',
    };
    try {
      await fetch(`/api/orders/${order.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titles[type],
          type,
          url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
        }),
      });
      loadOrder();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyCustomerLink = () => {
    if (!order) return;
    const url = `${window.location.origin}/track/${order.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading || !order) {
    return (
      <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-sm text-neutral-400 animate-pulse">Loading order details...</p>
        </div>
      </div>
    );
  }

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentStageIndex = sortedStages.findIndex((s) => s.id === order.currentStageId);
  const firstItem = order.items[0];

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={order.orderNumber} />

        <main className="p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Breadcrumb back */}
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to dashboard</span>
            </Link>
          </div>

          {/* Title Header with Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200">
            <div>
              <h1 className="font-serif font-semibold text-3xl sm:text-4xl text-neutral-900 tracking-tight">
                {order.orderNumber}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Ordered{' '}
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {stages.find((s) => s.id === order.currentStageId)?.name || 'In Production'}
              </span>

              <span className="text-xs font-semibold text-rose-600">
                {order.priority}
              </span>

              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {order.status}
              </span>

              <div className="text-right pl-2 border-l border-neutral-200">
                <span className="text-xs text-neutral-400 block font-mono">Progress</span>
                <span className="text-sm font-semibold font-mono text-neutral-900">
                  {order.progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Production Timeline Card - Exact matching screenshot */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-neutral-900">
                Production Timeline
              </h2>
              <span className="text-xs text-neutral-400">
                Click any step to update stage
              </span>
            </div>

            <div className="relative overflow-x-auto pb-4">
              <div className="flex items-center justify-between min-w-[700px] relative">
                {/* Connecting track line */}
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 -z-0" />

                {sortedStages.map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleStageClick(stage.id)}
                      disabled={updating}
                      className="flex flex-col items-center group relative z-10 focus:outline-none"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-black text-white shadow-xs'
                            : isCurrent
                            ? 'bg-black text-white ring-4 ring-neutral-200 shadow-md scale-110'
                            : 'bg-white border-2 border-neutral-300 text-neutral-400 group-hover:border-black'
                        }`}
                      >
                        {isDone || isCurrent ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <span className="text-[11px] font-mono">{idx + 1}</span>
                        )}
                      </div>

                      <span
                        className={`text-xs mt-2 font-medium tracking-tight text-center max-w-[85px] leading-tight ${
                          isCurrent
                            ? 'text-black font-semibold'
                            : isDone
                            ? 'text-neutral-800'
                            : 'text-neutral-400 group-hover:text-neutral-600'
                        }`}
                      >
                        {stage.name}
                      </span>

                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        {isDone ? 'Done' : isCurrent ? 'Active' : 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pricing & Financial Breakdown */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 border border-neutral-200">
                  <Diamond className="w-6 h-6 text-neutral-400" />
                </div>
                <div>
                  <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 mb-1">
                    {stages.find((s) => s.id === order.currentStageId)?.name || 'Production'}
                  </span>
                  <p className="font-semibold text-neutral-900">
                    {firstItem?.title || 'Bespoke Jewelry'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {firstItem?.metalType} {firstItem?.metalColor}
                  </p>
                </div>
              </div>

              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {order.status}
              </span>
            </div>

            <div className="pt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-neutral-600">
                <span>Subtotal · {order.items.length} item</span>
                <span className="font-mono text-neutral-900">${order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <span>Shipping</span>
                <span className="font-mono text-neutral-900">${order.shippingFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-neutral-900 pt-2 border-t border-neutral-100">
                <span>Total</span>
                <span className="font-mono font-bold">${order.total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                <span>Base Production Cost</span>
                <span className="font-mono">${order.baseProductionCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Product Details Card - Exact matching screenshot */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Product Details
              </h2>
              <span className="text-xs px-2.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-full font-medium">
                {firstItem?.productType || 'Jewelry'}
              </span>
            </div>

            <div className="divide-y divide-neutral-100 text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Name</span>
                <span className="font-medium text-neutral-900">{firstItem?.title}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Metal Type</span>
                <span className="font-medium text-neutral-900">{firstItem?.metalType || '14K'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Metal Color</span>
                <span className="font-medium text-neutral-900">{firstItem?.metalColor || 'White gold'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Diamond Shape</span>
                <span className="font-medium text-neutral-900">{firstItem?.diamondShape || 'Round'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Diamond Size</span>
                <span className="font-medium text-neutral-900">{firstItem?.diamondSize || '1.20'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Chain Length</span>
                <span className="font-medium text-neutral-900">{firstItem?.chainLength || '—'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Notes</span>
                <span className="font-medium text-neutral-900 text-right max-w-md">
                  {firstItem?.customEngraving || "14K Stamping & engraving Dhiren'"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`https://${order.shopifyOrderId ? 'admin.shopify.com' : '#'}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-neutral-600 hover:text-black font-medium inline-flex items-center gap-1 underline underline-offset-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Shopify store
              </a>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-2">
              Notes
            </h2>
            <p className="text-sm text-neutral-500">
              {order.notesFromCustomer || 'No notes from customer.'}
            </p>
          </div>

          {/* Media / Comments / Activity Tabs Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'gallery'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Gallery ({order.gallery.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'comments'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Comments ({order.comments.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'activity'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Activity ({order.activity.length})
              </button>
            </div>

            {activeTab === 'gallery' && (
              <div>
                {order.gallery.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-neutral-400 mb-3">No images uploaded yet.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAddSampleMedia('cad')}
                        className="px-3 py-1.5 text-xs border border-neutral-300 rounded-md hover:bg-neutral-50 font-medium"
                      >
                        + Upload CAD Render
                      </button>
                      <button
                        onClick={() => handleAddSampleMedia('casting')}
                        className="px-3 py-1.5 text-xs border border-neutral-300 rounded-md hover:bg-neutral-50 font-medium"
                      >
                        + Upload Casting Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {order.gallery.map((img) => (
                      <div key={img.id} className="border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                        <p className="text-xs font-medium truncate">{img.title}</p>
                        <span className="text-[10px] text-neutral-400 uppercase">{img.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {order.comments.map((comm) => (
                    <div key={comm.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-neutral-900">{comm.author} ({comm.role})</span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(comm.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-neutral-700">{comm.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a team comment or workshop update..."
                    className="flex-1 text-xs border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-neutral-800 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-2.5 max-h-60 overflow-y-auto text-xs">
                {order.activity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                    <span className="text-neutral-800">{act.description}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">
              Customer
            </h2>
            <div className="divide-y divide-neutral-100 text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Name</span>
                <span className="font-medium text-neutral-900">{order.customer.name}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Email</span>
                <span className="font-medium text-neutral-900">{order.customer.email}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Phone</span>
                <span className="font-medium text-neutral-900">{order.customer.phone}</span>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
              <h2 className="text-base font-semibold text-neutral-900 mb-2">
                Shipping address
              </h2>
              {order.shippingAddress.address1 ? (
                <div className="text-xs text-neutral-600 space-y-1">
                  <p>{order.shippingAddress.address1}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}</p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No shipping address</p>
              )}
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
              <h2 className="text-base font-semibold text-neutral-900 mb-2">
                Billing address
              </h2>
              {order.billingAddress.address1 ? (
                <div className="text-xs text-neutral-600 space-y-1">
                  <p>{order.billingAddress.address1}</p>
                  <p>{order.billingAddress.city}, {order.billingAddress.province} {order.billingAddress.zip}</p>
                  <p>{order.billingAddress.country}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No billing address</p>
              )}
            </div>
          </div>

          {/* Internal Details */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-2">
              Internal Details
            </h2>
            <div className="divide-y divide-neutral-100 text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Assigned to</span>
                <span className="font-medium text-neutral-900">{order.assignedTo || '—'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Production cost</span>
                <span className="font-mono text-neutral-900">${order.baseProductionCost.toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-neutral-500 text-xs">Profit</span>
                <span className="font-mono font-semibold text-emerald-700">${order.profit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Shipping / Tracking Card with Live Tracking Link generator */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Shipping / Tracking
              </h2>
              <button
                type="button"
                onClick={handleCopyCustomerLink}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 rounded-lg flex items-center gap-1.5 transition text-neutral-700"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Customer Live Tracking Link'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveTracking} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Carrier
                </label>
                <input
                  type="text"
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  placeholder="FedEx, DHL, Blue Dart"
                  className="w-full text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 79482910482"
                  className="w-full text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-black text-white text-xs font-medium py-2 rounded-lg hover:bg-neutral-800 transition"
                >
                  Save Tracking
                </button>
              </div>
            </form>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-600">
                <Truck className="w-4 h-4 text-neutral-400" />
                <span>Customer Tracking Link:</span>
                <code className="text-neutral-800 font-mono text-[11px]">
                  /track/{order.id}
                </code>
              </div>
              <Link
                href={`/track/${order.id}`}
                target="_blank"
                className="text-black font-semibold hover:underline flex items-center gap-1"
              >
                Open Customer View <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
