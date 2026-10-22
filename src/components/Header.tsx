'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

function getInitials(name: string): string {
  if (!name) return 'AT';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export default function Header({ title, subtitle, rightAction }: HeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [initials, setInitials] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Immediately hydrate from cache to prevent any flicker during navigation
    try {
      const cached = localStorage.getItem('trackerz_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u?.name) {
          setUserName(u.name);
          setUserRole(u.role || 'Admin');
          setInitials(getInitials(u.name));
          setIsReady(true);
        }
      }
    } catch {}

    // 2. Fetch fresh user info from server in the background
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.name) {
            setUserName(data.user.name);
            setUserRole(data.user.role || 'Admin');
            setInitials(getInitials(data.user.name));
            setIsReady(true);
            try {
              localStorage.setItem('trackerz_user', JSON.stringify(data.user));
            } catch {}
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (e) {
        router.push('/login');
      }
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('trackerz_token');
        localStorage.removeItem('trackerz_user');
      } catch {}
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      router.push('/login');
    }
  };

  return (
    <header className="border-b border-neutral-200 bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="font-serif font-semibold text-2xl sm:text-3xl text-neutral-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {rightAction && <div>{rightAction}</div>}

        <div className="flex items-center gap-3 pl-2 border-l border-neutral-200">
          <div className="text-right">
            {isReady && userName ? (
              <>
                <p className="text-sm font-medium text-neutral-900 leading-tight">
                  {userName}
                </p>
                <p className="text-[11px] text-neutral-500 leading-tight">
                  {userRole || 'Team'}
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <div className="h-3.5 w-20 bg-neutral-200 rounded animate-pulse" />
                <div className="h-2.5 w-12 bg-neutral-100 rounded animate-pulse ml-auto" />
              </div>
            )}
          </div>

          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-medium text-xs tracking-wider shadow-sm">
            {isReady && initials ? initials : '...'}
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-black border border-neutral-200 rounded-lg hover:bg-neutral-50 transition shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
