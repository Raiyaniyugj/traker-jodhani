'use client';

import { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { PipelineStage } from '@/lib/types';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  onOrderAdded: () => void;
}

export default function AddOrderModal({
  isOpen,
  onClose,
  stages,
  onOrderAdded,
}: AddOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    productTitle: '',
    productType: 'Ring',
    metalType: '14K',
    metalColor: 'White gold',
    diamondShape: 'Round',
    diamondSize: '1.00',
    chainLength: '—',
    customEngraving: '',
    price: '1200',
    baseProductionCost: '550',
    shippingFee: '50',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    initialStageId: stages[0]?.id || 'stage-1',
    internalNotes: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSimulateShopify = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shopify/simulate', { method: 'POST' });
      if (res.ok) {
        onOrderAdded();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onOrderAdded();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h2 className="font-serif font-semibold text-2xl text-neutral-900">
              Create Production Order
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Enter custom jewelry job details or sync live from Shopify
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateShopify}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg flex items-center gap-1.5 transition"
              title="Instantly generate an order as if it came from Shopify"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Simulate Shopify Order
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Order & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Order Identifier / Title *
              </label>
              <input
                type="text"
                name="orderNumber"
                required
                value={formData.orderNumber}
                onChange={handleChange}
                placeholder="e.g. #1002"
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                name="customerName"
                required
                value={formData.customerName}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Client Email
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="client@example.com"
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Client Phone
              </label>
              <input
                type="text"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Product Specs */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Jewelry Specifications
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productTitle"
                  required
                  value={formData.productTitle}
                  onChange={handleChange}
                  placeholder="e.g. Custom Solitaire Oval Ring"
                  className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Category
                </label>
                <select
                  name="productType"
                  value={formData.productType}
                  onChange={handleChange}
                  className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="Ring">Ring</option>
                  <option value="Pendant">Pendant</option>
                  <option value="Necklace">Necklace</option>
                  <option value="Earrings">Earrings</option>
                  <option value="Bracelet">Bracelet</option>
                  <option value="Bespoke">Bespoke</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Metal Purity
                </label>
                <select
                  name="metalType"
                  value={formData.metalType}
                  onChange={handleChange}
                  className="w-full text-sm border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
                >
                  <option value="10K">10K</option>
                  <option value="14K">14K</option>
                  <option value="18K">18K</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Silver 925">Silver 925</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Metal Color
                </label>
                <select
                  name="metalColor"
                  value={formData.metalColor}
                  onChange={handleChange}
                  className="w-full text-sm border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
                >
                  <option value="White gold">White gold</option>
                  <option value="Yellow gold">Yellow gold</option>
                  <option value="Rose gold">Rose gold</option>
                  <option value="Two-Tone">Two-Tone</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Diamond Shape
                </label>
                <select
                  name="diamondShape"
                  value={formData.diamondShape}
                  onChange={handleChange}
                  className="w-full text-sm border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
                >
                  <option value="Round">Round</option>
                  <option value="Oval">Oval</option>
                  <option value="Emerald">Emerald</option>
                  <option value="Pear">Pear</option>
                  <option value="Radiant">Radiant</option>
                  <option value="Cushion">Cushion</option>
                  <option value="Marquise">Marquise</option>
                  <option value="Princess">Princess</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Carat Size
                </label>
                <input
                  type="text"
                  name="diamondSize"
                  value={formData.diamondSize}
                  onChange={handleChange}
                  placeholder="1.20"
                  className="w-full text-sm border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Custom Stamping & Engraving
              </label>
              <input
                type="text"
                name="customEngraving"
                value={formData.customEngraving}
                onChange={handleChange}
                placeholder="e.g. 14K Stamped or Custom Text"
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing & Scheduling */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Sale Price ($)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Prod. Cost ($)
              </label>
              <input
                type="number"
                name="baseProductionCost"
                value={formData.baseProductionCost}
                onChange={handleChange}
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full text-sm border border-neutral-300 rounded-lg px-2 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Initial Stage
            </label>
            <select
              name="initialStageId"
              value={formData.initialStageId}
              onChange={handleChange}
              className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white"
            >
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Internal Workshop Notes
            </label>
            <textarea
              name="internalNotes"
              rows={2}
              value={formData.internalNotes}
              onChange={handleChange}
              placeholder="Important casting or stone setting instructions..."
              className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
