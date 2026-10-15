'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Store,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ShopifyConnectionStatus } from '@/lib/types';

interface ShopifyStatusBannerProps {
  status: ShopifyConnectionStatus | null;
  loading?: boolean;
  syncing?: boolean;
  onSync: () => Promise<void>;
  onRefreshStatus?: () => void;
}

export default function ShopifyStatusBanner({
  status,
  loading = false,
  syncing = false,
  onSync,
  onRefreshStatus,
}: ShopifyStatusBannerProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTestNow = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/shopify/status?test=true');
      const data = await res.json();
      if (data.isConnected) {
        setTestResult({
          success: true,
          message: `Connected successfully to ${data.shopDomain || 'Shopify'}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.problemReason || 'Connection could not be verified.',
        });
      }
      if (onRefreshStatus) onRefreshStatus();
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Error running connection test.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="w-full bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100" />
          <div className="space-y-1.5">
            <div className="h-3 w-40 bg-neutral-200 rounded" />
            <div className="h-2.5 w-60 bg-neutral-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isConnected = Boolean(status?.isConnected);
  const shopDomain = status?.shopDomain || '';
  const shopifyOrdersCount = status?.shopifyOrdersCount ?? 0;
  const problemReason = status?.problemReason;

  if (isConnected) {
    return (
      <div className="w-full bg-white border border-emerald-200/90 rounded-xl p-4 shadow-2xs hover:border-emerald-300 transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 sm:mt-0">
              <Store className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
                <span className="text-sm font-semibold text-neutral-900 truncate">
                  {shopDomain}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-neutral-500">
                <span className="text-emerald-700 font-medium">
                  ✓ {shopifyOrdersCount} {shopifyOrdersCount === 1 ? 'Shopify order' : 'Shopify orders'} showing in workshop
                </span>
                {status?.lastSyncAt && (
                  <span className="text-neutral-400">
                    · Last synced {new Date(status.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className="text-neutral-400">
                  · Webhook active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={onSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
              title="Sync latest orders from your Shopify store"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{syncing ? 'Syncing Orders...' : 'Sync Orders'}</span>
            </button>

            <Link
              href="/settings"
              className="px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-black transition flex items-center gap-1"
            >
              <span>Settings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Connection Problem / Not Connected State
  return (
    <div className="w-full bg-gradient-to-r from-amber-50/70 via-rose-50/40 to-white border border-amber-300/80 rounded-xl p-4 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Problem: Not Connected
              </span>
              {shopDomain && (
                <span className="text-xs font-mono font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                  {shopDomain}
                </span>
              )}
            </div>

            <div className="mt-1.5 text-xs text-neutral-800 leading-relaxed">
              <p className="font-semibold text-rose-900 flex items-center gap-1.5">
                <span>Reason:</span>
                <span className="font-normal text-neutral-900">
                  {problemReason || 'Shopify store is not connected. Orders cannot be displayed.'}
                </span>
              </p>
              {status?.recommendation && (
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  👉 {status.recommendation}
                </p>
              )}
            </div>

            {testResult && (
              <div
                className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                  testResult.success
                    ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100/70 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            onClick={handleTestNow}
            disabled={testing}
            className="px-3 py-1.5 text-xs font-medium border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
            title="Run a live diagnostic test against Shopify"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <Link
            href="/settings"
            className="px-3.5 py-1.5 text-xs font-medium bg-black hover:bg-neutral-800 text-white rounded-lg flex items-center gap-1.5 transition shadow-xs"
          >
            <span>Resolve in Settings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
