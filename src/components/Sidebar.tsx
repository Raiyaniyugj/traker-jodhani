'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Sliders,
  Users,
  Sun,
  ExternalLink,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Master Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Delivered', href: '/delivered', icon: Package },
    { name: 'Pipeline Management', href: '/pipeline', icon: Sliders },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Sun },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-neutral-200 min-h-screen flex flex-col justify-between p-4">
      <div>
        {/* Brand */}
        <div className="px-3 py-4 mb-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2.5 font-serif font-semibold tracking-wide text-2xl text-neutral-900">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 9L8 3H16L20 9L12 21L4 9Z" fill="black" />
              <path d="M4 9H20" stroke="white" strokeWidth="1" />
              <path d="M8 3L12 9L16 3" stroke="white" strokeWidth="1" />
              <path d="M4 9L12 21L20 9" stroke="white" strokeWidth="1" />
            </svg>
            Trackerz
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Customer Tracking Demonstration / Footer info */}
      <div className="pt-4 border-t border-neutral-100 px-2 space-y-2">
        <Link
          href="/track/6a4dc73d-2dc6-4e67-ba26-5769e3e55926"
          target="_blank"
          className="flex items-center justify-between text-xs text-neutral-500 hover:text-black px-2 py-1.5 rounded transition hover:bg-neutral-50"
        >
          <span className="flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            Live Customer Link
          </span>
          <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">Demo</span>
        </Link>
        <p className="text-[11px] text-neutral-400 px-2">
          Trackerz v1.0 · Shopify Sync Active
        </p>
      </div>
    </aside>
  );
}
