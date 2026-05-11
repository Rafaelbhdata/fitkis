'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FkWord } from '@/components/ui/Fk'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from './Ic'
import { MOCK_PRACTITIONER } from '@/lib/clinic/mock-data'

type Item = {
  key: string
  href: string
  label: string
  icon: (props: { width?: string | number; height?: string | number }) => JSX.Element
  count?: number
}

const ITEMS: Item[] = [
  { key: 'pacientes', href: '/clinic', label: 'Pacientes', icon: Ic.grid, count: 7 },
  { key: 'agenda', href: '/clinic/agenda', label: 'Agenda', icon: Ic.book },
  { key: 'reportes', href: '/clinic/reportes', label: 'Reportes', icon: Ic.share },
  { key: 'biblio', href: '/clinic/biblioteca', label: 'Biblioteca', icon: Ic.apple },
  { key: 'ajustes', href: '/clinic/ajustes', label: 'Ajustes', icon: Ic.settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/clinic') return pathname === '/clinic' || pathname.startsWith('/clinic/pacientes')
  return pathname.startsWith(href)
}

export function ClinicSidebar() {
  const pathname = usePathname() ?? '/clinic'

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
          const IconC = it.icon
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
              {it.count != null && (
                <span
                  className="fk-mono"
                  style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4)' }}
                >
                  {it.count}
                </span>
              )}
              {active && it.count == null && (
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
      <div
        style={{
          background: 'var(--honey-soft)',
          borderRadius: 12,
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            className="fk-serif"
            style={{
              fontSize: 30,
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1,
              color: '#8a6411',
            }}
          >
            2
          </span>
          <span
            className="fk-mono"
            style={{
              fontSize: 10,
              color: '#8a6411',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            requieren atención
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#8a6411',
            opacity: 0.8,
            marginTop: 6,
            fontFamily: 'var(--f-sans)',
          }}
        >
          Sofía G., Camila O. sin registros 9–11 días
        </div>
      </div>

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
          }}
        >
          {MOCK_PRACTITIONER.initial}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{MOCK_PRACTITIONER.name}</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--ink-4)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            NUTRIÓLOGA · CED {MOCK_PRACTITIONER.cedula}
          </div>
        </div>
      </div>
    </aside>
  )
}
