'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PulseLine } from './ui/PulseLine';
import { Home, Apple, Plus, Dumbbell, Grid3X3, LucideIcon } from 'lucide-react';

type Item = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
};

const defaultItems: Item[] = [
  { id: 'home', label: 'Hoy', href: '/dashboard', icon: Home },
  { id: 'food', label: 'Plato', href: '/food', icon: Apple },
  { id: 'add', label: 'Log', href: '/food', icon: Plus, primary: true },
  { id: 'gym', label: 'Gym', href: '/gym', icon: Dumbbell },
  { id: 'you', label: 'Tu', href: '/habits', icon: Grid3X3 },
];

type Props = {
  items?: Item[];
};

/**
 * MobileDock v5 — Barra de navegacion flotante negra
 * Pill flotante con FAB mandarina central
 */
export function MobileDock({ items = defaultItems }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-[18px] left-4 right-4 h-[60px] bg-ink rounded-full flex items-center justify-around px-2.5 z-30 md:hidden"
      style={{ boxShadow: '0 14px 40px rgba(10,10,10,0.25)' }}
    >
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + '/');

        if (it.primary) {
          return (
            <Link
              key={it.id}
              href={it.href}
              className="w-[46px] h-[46px] bg-signal rounded-full flex items-center justify-center text-white shrink-0"
              style={{ boxShadow: '0 4px 12px rgba(255,90,31,0.4)' }}
            >
              <it.icon size={20} />
            </Link>
          );
        }

        return (
          <Link
            key={it.id}
            href={it.href}
            className={`flex flex-col items-center gap-[3px] relative transition-colors ${
              active ? 'text-paper' : 'text-ink-5'
            }`}
          >
            <it.icon size={18} />
            <span
              className="font-mono font-medium uppercase"
              style={{ fontSize: 9, letterSpacing: '0.08em' }}
            >
              {it.label}
            </span>
            {active && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <PulseLine w={20} h={6} color="#ff5a1f" strokeWidth={1.3} active />
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
