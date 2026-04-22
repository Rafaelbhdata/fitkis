'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PulseLine } from './PulseLine';

// Reemplaza los íconos con lucide-react o tu librería actual.
// Aquí los importas donde uses el dock:
//   import { Home, Apple, Plus, Dumbbell, Grid3x3 } from 'lucide-react';

type Item = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  primary?: boolean;
};

export function MobileDock({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-[18px] left-4 right-4 h-[60px] bg-ink rounded-full flex items-center justify-around px-2.5 z-30"
      style={{ boxShadow: '0 14px 40px rgba(10,10,10,0.25)' }}
    >
      {items.map((it) => {
        const active = pathname === it.href;
        if (it.primary) {
          return (
            <Link
              key={it.id}
              href={it.href}
              className="w-[46px] h-[46px] bg-signal rounded-full flex items-center justify-center text-white"
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
            className={`flex flex-col items-center gap-[3px] relative ${active ? 'text-paper' : 'text-ink-5'}`}
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

// Uso típico en layout mobile:
//
// import { Home, Apple, Plus, Dumbbell, Grid3x3 } from 'lucide-react';
// const items = [
//   { id:'home', label:'Hoy',  href:'/', icon: Home },
//   { id:'food', label:'Plato', href:'/alimentacion', icon: Apple },
//   { id:'add',  label:'Log',  href:'/registrar', icon: Plus, primary: true },
//   { id:'gym',  label:'Gym',  href:'/gym', icon: Dumbbell },
//   { id:'you',  label:'Tú',   href:'/perfil', icon: Grid3x3 },
// ];
// <MobileDock items={items} />
