'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, FileText, Settings, Menu, X, Home, LogOut } from 'lucide-react'
import { useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'

const NAV_ITEMS = [
  { href: '/clinic', label: 'Pacientes', icon: Users },
  { href: '/clinic/reports', label: 'Reportes', icon: FileText },
  { href: '/clinic/settings', label: 'Configuración', icon: Settings },
]

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const supabase = useSupabase()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-ink-7 bg-white">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-ink-7">
            <Link href="/clinic" className="flex items-center gap-3">
              <PulseLine w={28} h={14} color="var(--signal)" strokeWidth={2} />
              <span className="font-serif text-xl">FitKis</span>
              <span className="px-2 py-0.5 rounded bg-sky-soft text-sky text-[10px] fk-mono font-medium">
                CLINIC
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/clinic' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-signal text-white'
                      : 'text-ink-3 hover:bg-paper-2 hover:text-ink'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-ink-7 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-3 hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <Home className="w-5 h-5" />
              Mi cuenta
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-3 hover:bg-berry-soft hover:text-berry transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-ink-7 flex items-center justify-between px-4 z-50">
        <Link href="/clinic" className="flex items-center gap-2">
          <PulseLine w={24} h={12} color="var(--signal)" strokeWidth={2} />
          <span className="font-serif text-lg">FitKis</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-soft text-sky text-[9px] fk-mono font-medium">
            CLINIC
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-paper-2"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-ink/40 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="md:hidden fixed top-14 right-0 bottom-0 w-64 bg-white z-50 border-l border-ink-7 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/clinic' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-signal text-white'
                      : 'text-ink-3 hover:bg-paper-2 hover:text-ink'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-4 border-t border-ink-7 mt-4 space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-ink-3 hover:bg-paper-2 hover:text-ink transition-colors"
              >
                <Home className="w-5 h-5" />
                Mi cuenta
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-ink-3 hover:bg-berry-soft hover:text-berry transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Main Content */}
      <main className="md:pl-64">
        <div className="pt-14 md:pt-0 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
