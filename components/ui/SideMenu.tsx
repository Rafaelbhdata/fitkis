'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  User,
  History,
  Settings,
  LogOut,
  Dumbbell,
  Apple,
  Scale,
  Target,
  ChevronRight,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

const menuSections = [
  {
    title: 'Módulos',
    items: [
      { icon: Dumbbell, label: 'Gym Tracker', href: '/gym', color: 'text-blue-400' },
      { icon: Apple, label: 'Alimentación', href: '/food', color: 'text-green-400' },
      { icon: Scale, label: 'Peso Corporal', href: '/weight', color: 'text-purple-400' },
      { icon: Target, label: 'Hábitos', href: '/habits', color: 'text-orange-400' },
    ]
  },
  {
    title: 'Historial',
    items: [
      { icon: History, label: 'Sesiones de Gym', href: '/gym/history', color: 'text-muted-foreground' },
      { icon: TrendingUp, label: 'Progreso General', href: '/dashboard', color: 'text-muted-foreground' },
    ]
  },
]

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const router = useRouter()

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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-surface z-50 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
              <User className="w-6 h-6 text-background" />
            </div>
            <div>
              <p className="font-display font-semibold">Mi Cuenta</p>
              <p className="text-xs text-muted-foreground">FitLife Pro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-hover transition-colors group"
                  >
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="flex-1 font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={() => {/* TODO: Settings */}}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-hover transition-colors text-left"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 font-medium">Configuración</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-danger/10 transition-colors text-danger text-left"
          >
            <LogOut className="w-5 h-5" />
            <span className="flex-1 font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}
