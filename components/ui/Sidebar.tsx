'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Dumbbell,
  UtensilsCrossed,
  Target,
  Scale,
  History,
  Settings,
  LogOut,
  Flame,
  BookOpen,
  Sparkles,
  Apple,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import LogoMark from './LogoMark';
import { PulseLine } from './PulseLine';

const mainNav = [
  { href: '/dashboard', label: 'Hoy', icon: Home },
  { href: '/gym', label: 'Gym', icon: Dumbbell },
  { href: '/food', label: 'Plato', icon: UtensilsCrossed },
  { href: '/habits', label: 'Habitos', icon: Target },
  { href: '/weight', label: 'Peso', icon: Scale },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/coach', label: 'Coach', icon: Sparkles },
];

const secondaryNav = [
  { href: '/gym/history', label: 'Historial', icon: History },
  { href: '/equivalentes', label: 'Equivalentes', icon: Apple },
];

interface SidebarProps {
  streak?: number;
}

/**
 * Sidebar v5 — Desktop side navigation
 * Paper background, ink text, PulseLine on active item
 */
export default function Sidebar({ streak = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-sidebar bg-paper-2 border-r border-ink-7 flex flex-col z-40 hidden md:flex">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-ink-7">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <p className="font-serif font-medium text-ink tracking-tight">Fitkis</p>
            <p className="fk-eyebrow">Pro</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-ink bg-white border border-ink-7'
                  : 'text-ink-4 hover:text-ink hover:bg-paper-3'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <PulseLine w={24} h={8} color="var(--signal)" strokeWidth={1.2} active />
                </div>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-ink-7 my-3" />

        {secondaryNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-ink bg-white border border-ink-7'
                  : 'text-ink-4 hover:text-ink hover:bg-paper-3'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Streak Badge */}
      {streak > 0 && (
        <div className="px-4 py-3 border-t border-ink-7">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-signal-soft">
            <Flame className="w-5 h-5 text-signal" />
            <div>
              <p className="text-sm font-mono font-semibold text-signal">{streak} dias</p>
              <p className="text-[10px] text-signal/70 font-mono uppercase tracking-wider">
                Racha
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-ink-7 space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'text-ink bg-white border border-ink-7'
              : 'text-ink-4 hover:text-ink hover:bg-paper-3'
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Config</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-berry hover:bg-berry-soft transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
