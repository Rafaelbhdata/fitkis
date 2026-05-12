'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Appointment, AppointmentStatus } from '@/lib/clinic/queries'

function NameLink({ patientId, name, cancelled }: { patientId: string; name: string; cancelled: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      href={`/clinic/pacientes/${patientId}`}
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 500,
        color: hov ? 'var(--signal)' : 'var(--ink)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: cancelled ? 'line-through' : 'none',
        marginTop: 1, cursor: 'pointer', transition: 'color 0.1s',
      }}
    >
      {name}
    </Link>
  )
}

const STATUS_CFG: Record<AppointmentStatus, { bg: string; border: string; color: string }> = {
  scheduled:    { bg: 'rgba(178,255,153,0.18)', border: 'rgba(74,124,58,0.55)', color: 'var(--ink)' },
  confirmed:    { bg: 'rgba(178,255,153,0.18)', border: 'rgba(74,124,58,0.55)', color: 'var(--ink)' },
  completed:    { bg: 'var(--leaf-soft)',       border: 'var(--leaf)',          color: 'var(--leaf)' },
  cancelled:    { bg: 'rgba(200,30,30,0.07)',    border: 'rgba(200,30,30,0.3)',   color: 'rgba(180,30,30,0.5)' },
  no_show:      { bg: 'var(--honey-soft)',      border: 'var(--honey)',         color: '#8a6411' },
  rescheduling: { bg: '#fff3e0',                border: '#e65100',              color: '#e65100' },
}

type Props = {
  appt: Appointment
  top: number
  height: number
  col?: number
  totalCols?: number
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onReschedule:   (appt: Appointment) => void
}

export function AppointmentBlock({ appt, top, height, col = 0, totalCols = 1, onStatusChange, onReschedule }: Props) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const cfg             = STATUS_CFG[appt.status]
  const active          = appt.status === 'scheduled' || appt.status === 'confirmed'
  const tall            = height >= 48

  const timeStr = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleCardClick(e: React.MouseEvent) {
    if (!active) return
    e.stopPropagation()
    setOpen(o => !o)
  }

  const colW    = 100 / totalCols
  const leftPct = col * colW
  const widthPct = colW

  return (
    <div
      ref={ref}
      onClick={handleCardClick}
      style={{
        position: 'absolute',
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - ${totalCols > 1 ? 4 : 6}px)`,
        top, height,
        borderRadius: 6,
        padding: '4px 7px',
        background: cfg.bg,
        borderLeft: `3px solid ${cfg.border}`,
        overflow: open ? 'visible' : 'hidden',
        cursor: active ? 'pointer' : 'default',
        zIndex: open ? 20 : 1,
        opacity: 1,
        boxShadow: open ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
        transition: 'box-shadow 0.12s, z-index 0s',
        userSelect: 'none',
      }}
    >
      {/* Hora + badge reagendando */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
          color: cfg.color, letterSpacing: '0.03em',
          textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
        }}>
          {timeStr}
        </span>
        {appt.status === 'rescheduling' && (
          <span style={{
            fontFamily: 'var(--f-mono)', fontSize: 8, padding: '1px 4px',
            borderRadius: 3, background: '#e65100', color: '#fff',
            letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
          }}>
            reagendando
          </span>
        )}
        {appt.status === 'no_show' && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'var(--honey)', color: '#fff', letterSpacing: '0.05em', flexShrink: 0 }}>?</span>
        )}
      </div>

      {/* Nombre del paciente */}
      {appt.patient_id ? (
        <NameLink patientId={appt.patient_id} name={appt.patient_name} cancelled={appt.status === 'cancelled'} />
      ) : (
        <div style={{
          fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 500, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
          marginTop: 1,
        }}>
          {appt.patient_name}
        </div>
      )}

      {/* Duración */}
      {tall && (
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', marginTop: 1 }}>
          {appt.duration_minutes} min
        </div>
      )}

      {/* Esperando reagendamiento */}
      {appt.status === 'rescheduling' && tall && (
        <div style={{ marginTop: 4, fontFamily: 'var(--f-mono)', fontSize: 9, color: '#e65100', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Esperando nueva cita…
        </div>
      )}

      {/* Panel de acciones — aparece al hacer click */}
      {open && active && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 3,
            background: '#fff',
            border: '1px solid var(--ink-7)',
            borderRadius: 7,
            padding: '6px 8px',
            display: 'flex',
            gap: 6,
            zIndex: 30,
            boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
            minWidth: 130,
            whiteSpace: 'nowrap',
          }}
        >
          <button
            onClick={() => { setOpen(false); onReschedule(appt) }}
            style={{
              flex: 1,
              border: '1px solid var(--ink-7)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              borderRadius: 5,
              padding: '5px 10px',
              fontSize: 11,
              fontFamily: 'var(--f-sans)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Reagendar
          </button>
          <button
            onClick={() => { setOpen(false); onStatusChange(appt.id, 'cancelled') }}
            style={{
              flex: 1,
              border: '1px solid rgba(180,30,30,0.25)',
              background: 'rgba(180,30,30,0.05)',
              color: 'var(--berry)',
              borderRadius: 5,
              padding: '5px 10px',
              fontSize: 11,
              fontFamily: 'var(--f-sans)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
