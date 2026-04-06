'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  X,
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

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

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

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-surface z-50 shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-display font-bold text-background">F</span>
            </div>
            <div>
              <p className="font-display font-semibold text-sm">FitLife</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {mainNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground bg-surface-elevated'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
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
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground bg-surface-elevated'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Streak Badge */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-orange-500">5 días</p>
              <p className="text-[10px] text-orange-500/70">Racha actual</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => {/* TODO: Settings */}}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}
