'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  X,
  Home,
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
  Dumbbell
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import LogoMark from './LogoMark'
import { PulseLine } from './PulseLine'

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

const mainNav = [
  { href: '/dashboard', label: 'Hoy', icon: Home, emoji: '🏠' },
  { href: '/gym', label: 'Gym', icon: Dumbbell, emoji: '🏋️' },
  { href: '/food', label: 'Plato', icon: UtensilsCrossed, emoji: '🍽️' },
  { href: '/habits', label: 'Hábitos', icon: Target, emoji: '✅' },
  { href: '/weight', label: 'Peso', icon: Scale, emoji: '⚖️' },
  { href: '/journal', label: 'Journal', icon: BookOpen, emoji: '📓' },
  { href: '/coach', label: 'Coach AI', icon: Sparkles, emoji: '🤖' },
]

const secondaryNav = [
  { href: '/gym/history', label: 'Historial Gym', icon: History },
  { href: '/equivalentes', label: 'Equivalentes', icon: Apple },
  { href: '/settings', label: 'Configuración', icon: Settings },
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
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[280px] bg-paper z-50 shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-ink-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="font-serif font-semibold text-sm tracking-tight">Fitkis</p>
              <p className="fk-mono text-[10px] text-ink-4 uppercase tracking-wider">Pro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-paper-2 border border-ink-7 flex items-center justify-center hover:bg-paper-3 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {mainNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-ink text-paper'
                      : 'text-ink-3 hover:text-ink hover:bg-paper-2'
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <PulseLine w={24} h={8} color="var(--signal)" strokeWidth={1.5} />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="h-px bg-ink-7 my-4" />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            <p className="px-3 py-2 fk-mono text-[10px] text-ink-4 uppercase tracking-wider">Más</p>
            {secondaryNav.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'text-signal bg-signal-soft'
                      : 'text-ink-4 hover:text-ink hover:bg-paper-2'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Streak Badge */}
        <div className="px-4 py-3 border-t border-ink-7">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-signal-soft border border-signal/20">
            <Flame className="w-5 h-5 text-signal" />
            <div>
              <p className="text-sm font-semibold text-signal">5 días</p>
              <p className="text-[10px] text-signal/70">Racha actual</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-ink-7">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-berry hover:bg-berry-soft transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}
