'use client'

import { useState } from 'react'
import { Menu, Flame, Bell } from 'lucide-react'
import SideMenu from './SideMenu'

interface HeaderProps {
  streak?: number
}

export default function Header({ streak = 0 }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const today = new Date()
  const greeting = getGreeting()
  const formattedDate = today.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-glow">
              <span className="font-display font-bold text-background text-lg">F</span>
            </div>
            <div className="hidden xs:block">
              <p className="text-xs text-muted-foreground">{greeting}</p>
              <p className="text-sm font-medium capitalize">{formattedDate}</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-500">{streak}</span>
              </div>
            )}

            {/* Menu button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-hover transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
