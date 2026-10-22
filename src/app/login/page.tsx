'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'trackerz_remembered_email';
const REMEMBER_ME_KEY = 'trackerz_remember_me_preference';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      const savedPref = localStorage.getItem(REMEMBER_ME_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedPref !== null) {
        setRememberMe(savedPref === 'true');
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Persist or clear remembered email
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.setItem(REMEMBER_ME_KEY, 'false');
      }
    } catch {
      // LocalStorage unavailable
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) {
          try {
            localStorage.setItem('trackerz_token', data.token);
            if (data.user) {
              localStorage.setItem('trackerz_user', JSON.stringify(data.user));
            }
          } catch {}
        }
        router.push('/dashboard');
      } else {
        setError(data.error || 'Sign in failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif font-semibold tracking-wide text-2xl justify-center text-neutral-900"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 9L8 3H16L20 9L12 21L4 9Z" fill="black" />
              <path d="M4 9H20" stroke="white" strokeWidth="1" />
              <path d="M8 3L12 9L16 3" stroke="white" strokeWidth="1" />
              <path d="M4 9L12 21L20 9" stroke="white" strokeWidth="1" />
            </svg>
            Check List
          </Link>
          <p className="text-sm text-neutral-500 mt-1">Sign in to your production workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 shadow-2xs"
        >
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-300 pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition p-1 focus:outline-none rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-600 hover:text-neutral-900 transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-md py-2.5 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-2xs"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-4">
          New workshop?{' '}
          <Link href="/signup" className="text-black font-medium hover:underline">
            Create an atelier workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
