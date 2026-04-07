'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Flame } from 'lucide-react'
import SideMenu from './SideMenu'

interface HeaderProps {
  streak?: number
}

// Get page title from pathname
function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname.startsWith('/gym')) return 'Gym'
  if (pathname.startsWith('/food')) return 'Alimentación'
  if (pathname.startsWith('/habits')) return 'Hábitos'
  if (pathname.startsWith('/weight')) return 'Peso'
  return 'Fitkis'
}

export default function Header({ streak = 0 }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <>
      <header className="mobile-header">
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-display font-bold text-background text-sm">K</span>
            </Link>
            <span className="font-display font-semibold">{pageTitle}</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-500">{streak}</span>
              </div>
            )}

            {/* Menu button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
