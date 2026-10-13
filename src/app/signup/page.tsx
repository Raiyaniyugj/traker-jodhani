'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: 'Harper & Stones',
    fullName: 'Jane Owner',
    phone: '9876543210',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to create workspace');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-10">
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
            Trackerz
          </Link>
          <p className="text-sm text-neutral-500 mt-1">Start your 24-hour free trial</p>
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
              Company Name
            </label>
            <input
              required
              name="companyName"
              placeholder="Harper & Stones"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Your Name
            </label>
            <input
              required
              name="fullName"
              placeholder="Jane Owner"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Phone Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 text-sm text-neutral-600">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
                name="phone"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-r-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Indian mobile numbers only</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              name="email"
              placeholder="you@yourbusiness.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-md py-2.5 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? 'Creating your workspace…' : 'Create Workspace'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-black font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
