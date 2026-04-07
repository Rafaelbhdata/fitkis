'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Dumbbell,
  UtensilsCrossed,
  Target,
  Scale,
  History,
  Settings,
  LogOut,
  Flame
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/gym', label: 'Gym', icon: Dumbbell },
  { href: '/food', label: 'Alimentación', icon: UtensilsCrossed },
  { href: '/habits', label: 'Hábitos', icon: Target },
  { href: '/weight', label: 'Peso', icon: Scale },
]

const secondaryNav = [
  { href: '/gym/history', label: 'Historial Gym', icon: History },
]

interface SidebarProps {
  streak?: number
}

export default function Sidebar({ streak = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <span className="font-display font-bold text-background text-lg">K</span>
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Fitkis</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pro</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-nav-item',
                isActive && 'sidebar-nav-item-active'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive && 'text-accent')} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <div className="h-px bg-border my-3" />

        {secondaryNav.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-nav-item',
                isActive && 'sidebar-nav-item-active'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Streak Badge */}
      {streak > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-orange-500">{streak} días</p>
              <p className="text-[10px] text-orange-500/70">Racha actual</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={() => {/* TODO: Settings */}}
          className="sidebar-nav-item w-full"
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-danger hover:text-danger hover:bg-danger/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
