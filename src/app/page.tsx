'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Diamond,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Layers,
  Users,
  Sliders,
  ExternalLink,
  Package,
  Truck,
  Check,
  BarChart3,
  Clock,
  ChevronRight,
  Eye,
} from 'lucide-react';

const PIPELINE_STAGES = [
  { step: '01', name: 'New Orders', desc: 'Auto-ingested from Shopify webhook with gemstone & purity specs.' },
  { step: '02', name: 'CAD Design', desc: '3D modeling, matrix generation, and prong layout inspection.' },
  { step: '03', name: 'RPT (Wax)', desc: 'Ultra-fine 3D wax printing for casting mold preparation.' },
  { step: '04', name: 'Casting', desc: '14K/18K gold and platinum furnace casting in argon chamber.' },
  { step: '05', name: 'Factory', desc: 'Hand setting of center diamonds, pavé micro-beading, and polishing.' },
  { step: '06', name: 'Quality Check', desc: 'Microscope gem verification, laser hallmarking, and gold seal.' },
  { step: '07', name: 'Packaging', desc: 'Plush velvet casing, appraisal card, and authenticity certificate.' },
  { step: '08', name: 'Shipping', desc: 'Armored courier pickup with FedEx/DHL tracking generation.' },
  { step: '09', name: 'Completed', desc: 'Client delivery with seamless order archive and audit log.' },
];

export default function HomePage() {
  const [activeStageIndex, setActiveStageIndex] = useState(5); // QC by default

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-neutral-900 text-neutral-300 px-4 py-2 text-xs text-center border-b border-neutral-800 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium text-[10px]">
          <Sparkles className="w-3 h-3 text-amber-400" /> Cloudflare Edge Deployment
        </span>
        <span>Real-time Shopify order synchronization and live customer tracking is active.</span>
      </div>

      {/* Main Navbar */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-serif font-semibold tracking-wide text-2xl text-neutral-900"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 9L8 3H16L20 9L12 21L4 9Z" fill="black" />
              <path d="M4 9H20" stroke="white" strokeWidth="1" />
              <path d="M8 3L12 9L16 3" stroke="white" strokeWidth="1" />
              <path d="M4 9L12 21L20 9" stroke="white" strokeWidth="1" />
            </svg>
            Trackerz
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600 font-medium">
            <a href="#pipeline" className="hover:text-black transition">Pipeline</a>
            <a href="#features" className="hover:text-black transition">Features</a>
            <a href="#tracking-demo" className="hover:text-black transition">Customer Tracker</a>
            <Link href="/settings" className="hover:text-black transition">Shopify Sync</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-neutral-600 hover:text-black transition font-medium px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-black text-white rounded-lg px-4 py-2 font-medium hover:bg-neutral-800 transition shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Master Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-300 bg-white text-xs text-neutral-700 shadow-2xs mb-6">
            <Diamond className="w-3.5 h-3.5 text-neutral-900" />
            <span className="font-medium">Tailored for Fine Jewelry Ateliers & Manufacturers</span>
          </div>

          <h1 className="font-serif font-semibold text-4xl sm:text-6xl max-w-3xl mx-auto leading-[1.15] text-neutral-900 tracking-tight">
            Jewelry production tracking, from raw casting to doorstep delivery.
          </h1>

          <p className="text-neutral-600 text-base sm:text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
            Eliminate chaotic spreadsheets and endless customer WhatsApp chats. Trackerz gives your workshop
            an end-to-end 9-stage pipeline synced directly with your Shopify store, complete with shareable live tracking links your buyers can watch in real time.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/dashboard"
              className="bg-black text-white rounded-lg px-7 py-3.5 text-sm font-medium hover:bg-neutral-800 transition shadow-sm inline-flex items-center gap-2 group"
            >
              <span>Open Master Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/track/6a4dc73d-2dc6-4e67-ba26-5769e3e55926"
              className="border border-neutral-300 bg-white hover:bg-neutral-50 rounded-lg px-6 py-3.5 text-sm font-medium text-neutral-800 transition shadow-2xs inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-neutral-500" />
              <span>Preview Customer Live Tracker</span>
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Shopify Webhook Ready
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Role-Based Atelier Access
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Real-Time Margin Analytics
            </span>
          </div>
        </section>

        {/* Live Interactive Atelier Pipeline Demo Preview */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Header of the mock card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                    #1001
                  </span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Shopify Order
                  </span>
                </div>
                <h3 className="font-serif font-semibold text-xl text-neutral-900 mt-1.5">
                  VALAM DESIGN — 14K White Gold Diamond Pendant
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Client: Dhiren Bhagvanbhai Savaliya · Due: Oct 18, 2026 · Rush Order
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-neutral-400 tracking-wider uppercase">RETAIL PRICE</p>
                  <p className="font-serif font-bold text-lg text-neutral-900">$1,135</p>
                </div>
                <div className="h-8 w-px bg-neutral-200" />
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-emerald-600 tracking-wider uppercase">NET PROFIT</p>
                  <p className="font-serif font-bold text-lg text-emerald-700">+$575</p>
                </div>
              </div>
            </div>

            {/* Interactive Timeline Stepper */}
            <div className="pt-6">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 mb-3">
                <span>Interactive Pipeline Progress (Click any stage to simulate):</span>
                <span className="text-neutral-900 font-semibold">
                  Stage {activeStageIndex + 1} of 9: {PIPELINE_STAGES[activeStageIndex].name}
                </span>
              </div>

              {/* Steps pills */}
              <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
                {PIPELINE_STAGES.map((s, idx) => {
                  const isDone = idx < activeStageIndex;
                  const isCurrent = idx === activeStageIndex;

                  return (
                    <button
                      key={s.step}
                      onClick={() => setActiveStageIndex(idx)}
                      className={`text-left p-2 rounded-lg border text-xs transition relative ${
                        isCurrent
                          ? 'border-black bg-black text-white shadow-xs'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] opacity-75">{s.step}</span>
                        {isDone && <Check className="w-3 h-3 text-emerald-600" />}
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                      </div>
                      <p className="font-medium text-[11px] truncate">{s.name}</p>
                    </button>
                  );
                })}
              </div>

              {/* Active Stage Details Callout */}
              <div className="mt-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-neutral-900">Current Manufacturing Milestone: </span>
                  <span className="text-neutral-600">{PIPELINE_STAGES[activeStageIndex].desc}</span>
                </div>
                <Link
                  href="/dashboard"
                  className="font-medium text-black hover:underline whitespace-nowrap inline-flex items-center gap-1 self-start sm:self-auto"
                >
                  Manage in Dashboard <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Numbers Impact Banner */}
        <section className="border-y border-neutral-200 bg-white py-12">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="font-serif font-bold text-3xl sm:text-4xl text-neutral-900">$14.8M+</p>
              <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-medium">Fine Jewelry Tracked</p>
            </div>
            <div>
              <p className="font-serif font-bold text-3xl sm:text-4xl text-neutral-900">9 Stages</p>
              <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-medium">CAD to Delivery Precision</p>
            </div>
            <div>
              <p className="font-serif font-bold text-3xl sm:text-4xl text-neutral-900">&lt; 2s</p>
              <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-medium">Shopify Webhook Ingestion</p>
            </div>
            <div>
              <p className="font-serif font-bold text-3xl sm:text-4xl text-neutral-900">100%</p>
              <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-medium">Customer Transparency</p>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif font-semibold text-3xl sm:text-4xl text-neutral-900">
              Built exclusively for bespoke ateliers
            </h2>
            <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
              Standard ERP systems are built for bulk factories. Trackerz is precision-engineered for custom jewelry workflows where every ring, pendant, and gemstone has its own identity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-7 shadow-2xs hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-neutral-900 mb-2">
                Dual Kanban & Table Views
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Drag-and-drop or click to advance orders through 9 pipeline stages. Switch to Table View for quick batch scanning, sorting, and deadline filtering.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-7 shadow-2xs hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-neutral-900 mb-2">
                Live Shopify Webhook Sync
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                HMAC-verified order ingestion. When a customer checks out on your Shopify store, their piece enters the New Orders stage with full customer and item specifications.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-7 shadow-2xs hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-neutral-900 mb-2">
                Public Customer Tracking
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Provide your clients a luxury tracking portal link with zero login friction. They watch their jewelry move through casting, setting, and laser hallmarking.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-7 shadow-2xs hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-neutral-900 mb-2">
                Role-Based Atelier Access
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Assign team members as CAD Designers, Manufacturers, or Admins. Each team member sees only the pipeline steps relevant to their craftsmanship.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-7 shadow-2xs hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-neutral-900 mb-2">
                Live Profit & Cost Analytics
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Input base casting, stone, and labor costs. Trackerz dynamically calculates gross margin and net profit across your entire workshop in real time.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-7 shadow-2xs hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-neutral-900">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-neutral-900 mb-2">
                Full Audit Trail & Gallery
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Upload 3D CAD renders, wax print photos, and microscope QC inspection shots. Every stage movement is timestamped with actor verification.
              </p>
            </div>
          </div>
        </section>

        {/* 9 Stages Deep Dive */}
        <section id="pipeline" className="border-t border-neutral-200 bg-white py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                Manufacturing Pipeline
              </span>
              <h2 className="font-serif font-semibold text-3xl sm:text-4xl text-neutral-900 mt-2">
                9 Milestones from Concept to Dispatch
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Fine-tuned to reflect standard high-end jewelry manufacturing operations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PIPELINE_STAGES.map((stage) => (
                <div
                  key={stage.step}
                  className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 transition"
                >
                  <span className="font-mono text-xs font-semibold text-neutral-400">
                    STAGE {stage.step}
                  </span>
                  <h4 className="font-serif font-semibold text-lg text-neutral-900 mt-1">
                    {stage.name}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-neutral-600 transition"
              >
                Customize your workshop stages & permissions <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Customer Tracking Demo Preview */}
        <section id="tracking-demo" className="max-w-5xl mx-auto px-6 py-20">
          <div className="bg-neutral-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl overflow-hidden relative">
            <div className="relative z-10 max-w-xl">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Live Customer Tracking Experience
              </span>
              <h3 className="font-serif font-semibold text-3xl sm:text-4xl leading-tight">
                Give your luxury clients the transparency they crave.
              </h3>
              <p className="text-neutral-300 text-sm mt-4 leading-relaxed">
                When a customer orders a custom engagement ring or pendant, they receive an automated live link. They can see what day casting begins, when diamonds are being hand-set, and get direct courier tracking when shipped.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/track/6a4dc73d-2dc6-4e67-ba26-5769e3e55926"
                  target="_blank"
                  className="bg-white text-black hover:bg-neutral-100 rounded-lg px-6 py-3 text-sm font-medium transition inline-flex items-center gap-2"
                >
                  <span>Open Live Customer Demo</span>
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                </Link>
                <Link
                  href="/dashboard"
                  className="text-neutral-300 hover:text-white text-sm font-medium px-4 py-3 transition"
                >
                  View Workshop Dashboard →
                </Link>
              </div>
            </div>

            {/* Decorative background glow */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-serif font-semibold tracking-wide text-xl text-neutral-900">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M4 9L8 3H16L20 9L12 21L4 9Z" fill="black" />
              <path d="M4 9H20" stroke="white" strokeWidth="1" />
              <path d="M8 3L12 9L16 3" stroke="white" strokeWidth="1" />
              <path d="M4 9L12 21L20 9" stroke="white" strokeWidth="1" />
            </svg>
            Trackerz
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-500">
            <Link href="/dashboard" className="hover:text-black transition">Dashboard</Link>
            <Link href="/delivered" className="hover:text-black transition">Delivered</Link>
            <Link href="/pipeline" className="hover:text-black transition">Pipeline</Link>
            <Link href="/team" className="hover:text-black transition">Team</Link>
            <Link href="/settings" className="hover:text-black transition">Shopify Settings</Link>
            <Link href="/track/6a4dc73d-2dc6-4e67-ba26-5769e3e55926" className="hover:text-black transition">Live Customer Demo</Link>
          </div>

          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} Trackerz · Deployed on Cloudflare Workers
          </p>
        </div>
      </footer>
    </div>
  );
}
