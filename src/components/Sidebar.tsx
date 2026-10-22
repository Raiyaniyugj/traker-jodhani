'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Sliders,
  Users,
  Sun,
  BarChart3,
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
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
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
            Check List
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

      {/* Production Workspace Info */}
      <div className="pt-4 border-t border-neutral-100 px-3 space-y-1 text-[11px] text-neutral-400">
        <p className="font-medium text-neutral-600">Check List Jewelry Atelier</p>
        <p>Production Ready · Cloudflare D1</p>
      </div>
    </aside>
  );
}
