'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, UtensilsCrossed, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/gym', label: 'Gym', icon: Dumbbell },
  { href: '/food', label: 'Comida', icon: UtensilsCrossed },
  { href: '/habits', label: 'Hábitos', icon: Target },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      {/* Gradient fade effect */}
      <div className="absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Nav container */}
      <div className="bg-surface/80 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative flex flex-col items-center justify-center w-full h-full',
                  'transition-all duration-200 ease-out-expo',
                  isActive ? 'text-accent' : 'text-muted'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-0.5 bg-accent rounded-full" />
                )}

                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
                  isActive && 'bg-accent/10'
                )}>
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform duration-200',
                      isActive && 'scale-110'
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>

                <span className={cn(
                  'text-[10px] mt-0.5 font-medium transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
