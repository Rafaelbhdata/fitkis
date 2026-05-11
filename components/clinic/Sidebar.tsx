'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FkWord } from '@/components/ui/Fk'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from './Ic'
import { useSupabase, useUser } from '@/lib/hooks'
import { loadPractitionerByUser, type PractitionerRecord } from '@/lib/clinic/queries'

type Item = {
  key: string
  href: string
  label: string
  icon: (props: { width?: string | number; height?: string | number }) => JSX.Element
}

const ITEMS: Item[] = [
  { key: 'pacientes', href: '/clinic',           label: 'Pacientes',  icon: Ic.grid     },
  { key: 'agenda',    href: '/clinic/agenda',    label: 'Agenda',     icon: Ic.book     },
  { key: 'reportes',  href: '/clinic/reportes',  label: 'Reportes',   icon: Ic.share    },
  { key: 'biblio',    href: '/clinic/biblioteca',label: 'Biblioteca', icon: Ic.apple    },
  { key: 'ajustes',   href: '/clinic/ajustes',   label: 'Ajustes',    icon: Ic.settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/clinic') return pathname === '/clinic' || pathname.startsWith('/clinic/pacientes')
  return pathname.startsWith(href)
}

function PractitionerFooter({ practitioner }: { practitioner: PractitionerRecord | null }) {
  const supabase = useSupabase()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initial = practitioner?.display_name?.charAt(0).toUpperCase() ?? '…'
  const name    = practitioner?.display_name ?? '—'
  const cedula  = practitioner?.license_number ?? '—'

  return (
    <div
      style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--ink-7)',
        paddingTop: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: 'var(--ink)',
          color: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          CED {cedula}
        </div>
      </div>
      <button
        onClick={handleLogout}
        title="Cerrar sesión"
        style={{
          padding: '4px 6px',
          borderRadius: 6,
          border: '1px solid var(--ink-7)',
          background: 'transparent',
          color: 'var(--ink-4)',
          cursor: 'pointer',
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        <Ic.chevR width={12} height={12} />
      </button>
    </div>
  )
}

export function ClinicSidebar() {
  const pathname     = usePathname() ?? '/clinic'
  const supabase     = useSupabase()
  const { user }     = useUser()
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)

  useEffect(() => {
    if (!user) return
    loadPractitionerByUser(supabase, user.id).then(setPractitioner)
  }, [user, supabase])

  return (
    <aside
      className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-[240px] z-30"
      style={{
        borderRight: '1px solid var(--ink-7)',
        padding: '24px 16px 20px',
        background: '#fff',
      }}
    >
      <FkWord size={22} />
      <div
        className="fk-eyebrow"
        style={{ marginTop: 6, color: 'var(--signal)', letterSpacing: '0.18em' }}
      >
        Clínica
      </div>

      <div className="fk-eyebrow" style={{ marginTop: 28, marginBottom: 8 }}>
        Práctica
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ITEMS.map((it) => {
          const active = isActive(pathname, it.href)
          const IconC  = it.icon
          return (
            <Link
              key={it.key}
              href={it.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                background: active ? 'var(--paper-2)' : 'transparent',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                textDecoration: 'none',
              }}
            >
              <IconC width="15" height="15" />
              <span>{it.label}</span>
              {active && (
                <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
                  <PulseLine w={20} h={6} color="var(--signal)" strokeWidth={1.2} active />
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="fk-eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>
        Atención hoy
      </div>
      <div style={{ background: 'var(--honey-soft)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            className="fk-serif"
            style={{ fontSize: 30, fontStyle: 'italic', fontWeight: 300, lineHeight: 1, color: '#8a6411' }}
          >
            —
          </span>
          <span
            className="fk-mono"
            style={{ fontSize: 10, color: '#8a6411', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            consultas hoy
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#8a6411', opacity: 0.8, marginTop: 6, fontFamily: 'var(--f-sans)' }}>
          Agenda disponible en Fase 3
        </div>
      </div>

      <PractitionerFooter practitioner={practitioner} />
    </aside>
  )
}
