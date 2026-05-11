'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Flame } from 'lucide-react';
import SideMenu from './SideMenu';
import LogoMark from './LogoMark';
import { useGymStreak } from '@/lib/hooks';

// Get page title from pathname
function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Hoy';
  if (pathname.startsWith('/gym')) return 'Gym';
  if (pathname.startsWith('/food')) return 'Plato';
  if (pathname.startsWith('/habits')) return 'Habitos';
  if (pathname.startsWith('/weight')) return 'Peso';
  if (pathname.startsWith('/journal')) return 'Journal';
  if (pathname.startsWith('/coach')) return 'Coach';
  if (pathname.startsWith('/settings')) return 'Config';
  return 'Fitkis';
}

/**
 * Header v5 — Barra superior mobile
 * Paper background + ink text, logo serif
 */
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const streak = useGymStreak();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-paper/90 backdrop-blur-xl border-b border-ink-7 md:hidden">
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <LogoMark size={32} />
            </Link>
            <span className="font-serif font-medium text-ink tracking-tight">{pageTitle}</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-signal-soft">
                <Flame className="w-3.5 h-3.5 text-signal" />
                <span className="text-xs font-mono font-semibold text-signal">{streak}</span>
              </div>
            )}

            {/* Menu button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 rounded-lg bg-paper-2 border border-ink-7 flex items-center justify-center text-ink-3 hover:text-ink hover:bg-paper-3 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
