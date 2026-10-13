'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export default function Header({ title, subtitle, rightAction }: HeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('Dhiren Bhagvanbhai Savaliya');
  const [userRole, setUserRole] = useState('Admin');
  const [initials, setInitials] = useState('DB');

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.name) {
            setUserName(data.user.name);
            setUserRole(data.user.role || 'Admin');
            const parts = data.user.name.split(' ');
            const init = (parts[0]?.[0] || 'D') + (parts[1]?.[0] || parts[0]?.[1] || 'B');
            setInitials(init.toUpperCase());
          }
        }
      } catch (e) {
        // use fallback
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
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
            <p className="text-sm font-medium text-neutral-900 leading-tight">
              {userName}
            </p>
            <p className="text-[11px] text-neutral-500 leading-tight">
              {userRole}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-medium text-xs tracking-wider shadow-sm">
            {initials}
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
