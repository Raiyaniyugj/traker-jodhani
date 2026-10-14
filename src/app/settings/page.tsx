'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Store,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';
import { WebhookLog, WorkspaceSettings } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedEvent, setCopiedEvent] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [shopDomain, setShopDomain] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [adminAccessToken, setAdminAccessToken] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('$');

  // Public domain override (useful when testing with ngrok or custom domain)
  const [customHost, setCustomHost] = useState('');
  const [showHostInput, setShowHostInput] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setWebhookUrl(`${origin}/api/webhooks/shopify/orders-create`);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setWebhookLogs(data.webhookLogs || []);

        if (data.settings) {
          const loadedDomain = data.settings.shopify?.shopDomain || '';
          // Ensure email address is never loaded as shop domain
          setShopDomain(loadedDomain.includes('@') ? '' : loadedDomain);
          setWebhookSecret(data.settings.shopify?.webhookSecret || '');
          setAdminAccessToken(data.settings.shopify?.adminAccessToken || '');
          setCompanyName(data.settings.companyName || '');
          setOwnerName(data.settings.ownerName || '');
          setPhone(data.settings.phone || '');
          setEmail(data.settings.email || '');
          setCurrency(data.settings.currency || '$');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const computeWebhookUrl = () => {
    if (customHost && customHost.trim()) {
      const clean = customHost.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `https://${clean}/api/webhooks/shopify/orders-create`;
    }
    return webhookUrl || 'http://localhost:3000/api/webhooks/shopify/orders-create';
  };

  const handleCopyWebhook = () => {
    const url = computeWebhookUrl();
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleConnectStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Reject if browser autofilled user's email
    if (shopDomain.includes('@')) {
      setMessage({
        text: 'Please enter your Shopify store name (e.g. yourstore.myshopify.com), not your login email address.',
        type: 'error',
      });
      setSaving(false);
      return;
    }

    // Clean domain (auto-add .myshopify.com if just store name was typed)
    let cleanDomain = shopDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (cleanDomain && !cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }

    try {
      const res = await fetch('/api/shopify/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: cleanDomain,
          webhookSecret: webhookSecret.trim(),
          adminAccessToken: adminAccessToken.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          text: data.message || `Store ${cleanDomain} connected successfully!`,
          type: 'success',
        });
        loadData();
      } else {
        setMessage({ text: data.error || 'Failed to connect store', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error connecting to store', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectStore = async () => {
    if (!confirm('Are you sure you want to disconnect this Shopify store?')) return;
    setSaving(true);
    try {
      await fetch('/api/shopify/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: '',
          webhookSecret: '',
          adminAccessToken: '',
        }),
      });
      setShopDomain('');
      setWebhookSecret('');
      setAdminAccessToken('');
      loadData();
      setMessage({ text: 'Shopify store disconnected.', type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncOrders = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/shopify/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        loadData();
      } else {
        setMessage({ text: data.error || 'Sync failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestWebhookPing = async () => {
    setSimulating(true);
    setMessage(null);
    try {
      const targetUrl = computeWebhookUrl();
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-topic': 'orders/create',
          'x-shopify-shop-domain': shopDomain || 'jodhaniexport.myshopify.com',
        },
        body: JSON.stringify({
          test: true,
          message: 'Endpoint health check test ping',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          text: 'Webhook endpoint is 100% active and listening! Live connection confirmed without creating dummy orders.',
          type: 'success',
        });
        loadData();
      } else {
        setMessage({ text: data.error || 'Failed to ping webhook', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error pinging webhook endpoint', type: 'error' });
    } finally {
      setSimulating(false);
    }
  };

  const handleClearOrders = async () => {
    if (!confirm('Are you sure you want to clear all orders and webhook logs? This will reset your dashboard to a completely fresh 0-order state.')) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/orders', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'All orders and logs cleared. Your dashboard is now completely fresh with 0 orders.', type: 'success' });
        loadData();
      } else {
        setMessage({ text: data.error || 'Failed to clear orders', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          ownerName,
          phone,
          email,
          currency,
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Workspace profile saved successfully!', type: 'success' });
        loadData();
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Settings" />

        <main className="p-8 max-w-4xl w-full mx-auto space-y-8">
          {message && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-2xs ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-xs font-semibold hover:underline ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Shopify Integration Card - Exact reproduction from trackers-lake */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Shopify Integration
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Connect one Shopify store so new orders placed there show up automatically in your New Orders column.
                </p>
              </div>

              {settings?.shopify?.isConnected ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {settings.shopify.shopDomain ? `Connected: ${settings.shopify.shopDomain}` : 'Webhook Active & Listening'}
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectStore}
                    className="text-xs text-neutral-400 hover:text-rose-600 transition underline underline-offset-2"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                  Not Connected
                </span>
              )}
            </div>

            {/* Prominent Live Webhook URL Card */}
            <div className="mt-5 p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-neutral-500" />
                  Webhook URL (Paste into Shopify Admin)
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Event: Order creation · JSON
                </span>
              </div>

              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-white px-3.5 py-2.5 border border-neutral-200 rounded-lg flex-1 truncate text-neutral-900 select-all font-medium">
                  {computeWebhookUrl()}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-4 py-2.5 text-xs font-medium bg-black hover:bg-neutral-800 text-white rounded-lg flex items-center gap-1.5 transition shadow-xs shrink-0"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-neutral-400">
                  {customHost
                    ? `Using custom tunnel host: ${customHost}`
                    : 'Shopify sends order payloads directly to this endpoint.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowHostInput(!showHostInput)}
                  className="text-[11px] text-neutral-500 hover:text-black underline underline-offset-2"
                >
                  {showHostInput ? 'Hide public host option' : 'Custom host / ngrok / domain?'}
                </button>
              </div>

              {showHostInput && (
                <div className="pt-2 border-t border-neutral-200/60 mt-2 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="e.g. https://my-workshop.ngrok-free.app or trackers.yourdomain.com"
                    className="flex-1 text-xs border border-neutral-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              )}
            </div>

            {/* Connection Form */}
            <form
              onSubmit={handleConnectStore}
              autoComplete="off"
              className="mt-5 space-y-4"
            >
              {/* Trap decoy inputs to deflect aggressive browser autofill (Chrome/Edge/Password Managers) */}
              <div
                style={{
                  position: 'absolute',
                  opacity: 0,
                  height: 0,
                  width: 0,
                  pointerEvents: 'none',
                  overflow: 'hidden',
                }}
                aria-hidden="true"
              >
                <input type="text" name="decoy_username_field" tabIndex={-1} autoComplete="off" />
                <input type="password" name="decoy_password_field" tabIndex={-1} autoComplete="off" />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                  Shop Domain <span className="text-neutral-400 font-normal">(e.g. valamdesign or valamdesign.myshopify.com)</span>
                </label>
                <input
                  type="text"
                  name="shopify_store_domain_input"
                  id="shopify_store_domain_input"
                  required
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  autoComplete="one-time-code"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  className="w-full rounded-md border border-neutral-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Enter your store name (not an email address). E.g. valamdesign.myshopify.com
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                  Webhook Signing Secret{' '}
                  <span className="text-emerald-600 font-semibold">
                    (100% Optional — Leave BLANK if you can&apos;t find it)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    name="shopify_webhook_secret_input"
                    id="shopify_webhook_secret_input"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Optional — leave blank"
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full rounded-md border border-neutral-300 px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                    tabIndex={-1}
                    title={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  You do NOT need this to receive Shopify orders. You can leave it empty.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                  Shopify Admin API Access Token{' '}
                  <span className="text-neutral-400 font-normal">
                    (Optional — needed only to import past historical orders via &quot;Sync Orders Now&quot;)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    name="shopify_admin_access_token_input"
                    id="shopify_admin_access_token_input"
                    value={adminAccessToken}
                    onChange={(e) => setAdminAccessToken(e.target.value)}
                    placeholder="shpat_..."
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full rounded-md border border-neutral-300 px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                    tabIndex={-1}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Generate in Shopify Admin → Apps and sales channels → Develop apps → Create an app (select &quot;read_orders&quot; scope).
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-black text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
                  >
                    {saving ? 'Connecting...' : 'Connect Store'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestWebhookPing}
                    disabled={simulating}
                    className="border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-md px-4 py-2.5 text-sm font-medium transition flex items-center gap-2 shadow-2xs"
                    title="Test that the webhook endpoint is reachable without creating fake orders"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{simulating ? 'Testing...' : 'Test Webhook Connectivity'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncOrders}
                    disabled={syncing}
                    className="border border-neutral-300 text-neutral-800 rounded-md px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 transition flex items-center gap-2"
                    title="Import existing historical orders using your Admin API Access Token"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Syncing...' : 'Sync Orders Now'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClearOrders}
                  disabled={saving}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-2 rounded-md transition"
                  title="Wipe all orders and logs to start completely fresh"
                >
                  Clear All Orders (Fresh Slate)
                </button>
              </div>
            </form>
          </div>

          {/* Setup Instructions Card - Exact reproduction from user screenshot */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <h2 className="text-lg font-semibold text-neutral-900 mb-3">
              Setup Instructions
            </h2>
            <ol className="space-y-3.5 text-sm text-neutral-600 list-decimal list-inside leading-relaxed">
              <li>
                In Shopify Admin, go to <span className="font-semibold text-neutral-800">Settings → Notifications</span>, scroll to the <span className="font-semibold text-neutral-800">Webhooks</span> section, and click <span className="font-semibold text-neutral-800">Create webhook</span>.
              </li>
              <li>
                Set <span className="font-semibold text-neutral-800">Event</span> to{' '}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('Order creation');
                    setCopiedEvent(true);
                    setTimeout(() => setCopiedEvent(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded text-xs font-mono text-neutral-800 transition cursor-pointer"
                  title="Click to copy"
                >
                  <span>Order creation</span>
                  {copiedEvent ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-400" />}
                </button>
                , format to{' '}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('JSON');
                    setCopiedFormat(true);
                    setTimeout(() => setCopiedFormat(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded text-xs font-mono text-neutral-800 transition cursor-pointer"
                  title="Click to copy"
                >
                  <span>JSON</span>
                  {copiedFormat ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-400" />}
                </button>
                .
              </li>
              <li>
                Paste the <span className="font-semibold text-neutral-800">Webhook URL</span> above into the URL field and save.
              </li>
              <li>
                Shopify shows a <span className="font-semibold text-neutral-800">signing secret</span> for that webhook (or reuse your app&apos;s API secret key if you created it via a custom app under <span className="font-semibold text-neutral-800">Settings → Apps and sales channels → Develop apps</span>). Paste it into &quot;Webhook Signing Secret&quot; here.
              </li>
              <li>
                Enter your store&apos;s <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs font-mono text-neutral-800">.myshopify.com</code> domain and save. New Shopify orders will now appear in your New Orders column automatically.
              </li>
            </ol>
          </div>

          {/* Webhook Activity Log */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Shopify Webhook Activity Log
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Real-time audit trail of incoming webhook payloads and sync runs
                </p>
              </div>
              <button
                onClick={loadData}
                className="text-xs text-neutral-600 hover:text-black flex items-center gap-1 px-2 py-1 hover:bg-neutral-100 rounded transition"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {webhookLogs.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">
                No webhook events received yet. Click &quot;Send Test Order&quot; above to test.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100 overflow-x-auto text-xs">
                {webhookLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          log.status === 'success'
                            ? 'bg-emerald-500'
                            : log.status === 'ignored'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-mono font-medium text-neutral-800">
                        {log.topic}
                      </span>
                      <span className="text-neutral-500 truncate max-w-sm">
                        {log.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px] shrink-0">
                      <span>{log.payloadSummary || ''}</span>
                      <span>{new Date(log.receivedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workspace & Business Profile */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">
              Workspace Profile
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Company branding and workshop defaults
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    Workshop Owner
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    Phone (+91)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    <option value="$">$ (USD)</option>
                    <option value="₹">₹ (INR)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-neutral-900 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-black transition"
                >
                  Save Workspace Profile
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
