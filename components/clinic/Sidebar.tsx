'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FkWord } from '@/components/ui/Fk'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from './Ic'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadAppointmentsForDay,
  type PractitionerRecord,
  type Appointment,
} from '@/lib/clinic/queries'

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

const STATUS_BORDER: Record<string, string> = {
  scheduled:    'var(--leaf)',
  confirmed:    'var(--leaf)',
  completed:    'var(--leaf)',
  cancelled:    'var(--ink-6)',
  no_show:      'var(--honey)',
  rescheduling: '#e65100',
}

const STATUS_LABEL: Record<string, string | undefined> = {
  completed:    'completada',
  rescheduling: 'reagendando',
  no_show:      'no asistió',
}

const STATUS_LABEL_COLOR: Record<string, string> = {
  completed:    'var(--leaf)',
  rescheduling: '#e65100',
  no_show:      'var(--honey)',
}

function TodayApptCard({ appt }: { appt: Appointment }) {
  const [hover, setHover] = useState(false)
  const router = useRouter()

  const timeStr = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  const borderColor = STATUS_BORDER[appt.status] ?? 'var(--ink-6)'
  const statusLabel = STATUS_LABEL[appt.status]
  const statusColor = STATUS_LABEL_COLOR[appt.status]
  const dimmed      = appt.status === 'cancelled'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => router.push('/clinic/agenda')}
      style={{
        borderRadius: 7,
        borderLeft: `3px solid ${borderColor}`,
        padding: '7px 9px',
        background: hover ? 'var(--paper-2)' : 'var(--paper-3)',
        transition: 'background 0.12s',
        opacity: dimmed ? 0.6 : 1,
        cursor: 'pointer',
      }}
    >
      {/* Fila 1: hora + nombre */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
        <span
          className="fk-mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: borderColor,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {timeStr}
        </span>

        {appt.patient_id ? (
          <Link
            href={`/clinic/pacientes/${appt.patient_id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
              minWidth: 0,
            }}
            onMouseEnter={(e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).style.color = 'var(--signal)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)' }}
          >
            {appt.patient_name}
          </Link>
        ) : (
          <span
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
            }}
          >
            {appt.patient_name}
          </span>
        )}
      </div>

      {/* Fila 2: duración + badge de estado */}
      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="fk-mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
          {appt.duration_minutes} min
        </span>
        {statusLabel && (
          <span
            className="fk-mono"
            style={{
              fontSize: 8,
              color: statusColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function TodayApptsSection({ appts }: { appts: Appointment[] | null }) {
  const count = appts?.length ?? null

  return (
    <>
      {/* Cabecera con contador */}
      <div
        className="fk-eyebrow"
        style={{
          marginTop: 24,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Consultas hoy</span>
        {count !== null && count > 0 && (
          <span
            style={{
              background: 'var(--signal)',
              color: '#fff',
              borderRadius: 999,
              minWidth: 16,
              height: 16,
              fontSize: 9,
              fontFamily: 'var(--f-mono)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              letterSpacing: 0,
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Lista scrollable */}
      <div
        style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          flex: '1 1 0',
          minHeight: 0,
        }}
      >
        {appts === null ? (
          /* Skeleton mientras carga */
          [0.55, 0.40, 0.65].map((w, i) => (
            <div
              key={i}
              style={{
                borderRadius: 7,
                borderLeft: '3px solid var(--ink-7)',
                padding: '7px 9px',
                background: 'var(--paper-3)',
              }}
            >
              <div
                style={{
                  height: 10,
                  background: 'var(--ink-7)',
                  borderRadius: 3,
                  width: `${w * 100}%`,
                  marginBottom: 5,
                }}
              />
              <div
                style={{
                  height: 8,
                  background: 'var(--ink-7)',
                  borderRadius: 3,
                  width: '30%',
                }}
              />
            </div>
          ))
        ) : appts.length === 0 ? (
          /* Estado vacío */
          <div
            style={{
              padding: '18px 4px',
              textAlign: 'center',
            }}
          >
            <div
              className="fk-serif"
              style={{
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 13,
                color: 'var(--ink-4)',
                lineHeight: 1.4,
              }}
            >
              Sin consultas
              <br />
              programadas hoy
            </div>
            <Link
              href="/clinic/agenda"
              className="fk-mono"
              style={{
                display: 'inline-block',
                marginTop: 10,
                fontSize: 9,
                color: 'var(--signal)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Abrir agenda →
            </Link>
          </div>
        ) : (
          <>
            {appts.map(appt => <TodayApptCard key={appt.id} appt={appt} />)}
            <Link
              href="/clinic/agenda"
              className="fk-mono"
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 9,
                color: 'var(--signal)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textAlign: 'center',
              }}
              onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseOut={e  => (e.currentTarget.style.textDecoration = 'none')}
            >
              Ver agenda completa →
            </Link>
          </>
        )}
      </div>
    </>
  )
}

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
        flexShrink: 0,
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
  const pathname = usePathname() ?? '/clinic'
  const supabase = useSupabase()
  const { user } = useUser()

  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [todayAppts, setTodayAppts]     = useState<Appointment[] | null>(null)

  useEffect(() => {
    if (!user) return
    loadPractitionerByUser(supabase, user.id).then((p) => {
      setPractitioner(p)
      if (!p) return
      const today = new Date().toISOString().slice(0, 10)
      loadAppointmentsForDay(supabase, p.id, today).then(setTodayAppts)
    })
  }, [user, supabase])

  return (
    <aside
      className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-[240px] z-30"
      style={{
        borderRight: '1px solid var(--ink-7)',
        padding: '24px 16px 20px',
        background: 'var(--paper)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <FkWord size={22} />
      <div
        className="fk-eyebrow"
        style={{ marginTop: 6, color: 'var(--signal)', letterSpacing: '0.18em', flexShrink: 0 }}
      >
        Clínica
      </div>

      {/* Navegación */}
      <div className="fk-eyebrow" style={{ marginTop: 28, marginBottom: 8, flexShrink: 0 }}>
        Práctica
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
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

      {/* Atención hoy — lista de citas */}
      <TodayApptsSection appts={todayAppts} />

      {/* Footer del practitioner */}
      <PractitionerFooter practitioner={practitioner} />
    </aside>
  )
}
