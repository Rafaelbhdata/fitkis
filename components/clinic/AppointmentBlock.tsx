'use client'

import { useState } from 'react'
import type { Appointment, AppointmentStatus } from '@/lib/clinic/queries'

const STATUS_CFG: Record<AppointmentStatus, { bg: string; border: string; color: string }> = {
  scheduled:    { bg: 'var(--paper-2)',    border: 'var(--ink-4)', color: 'var(--ink-3)'  },
  confirmed:    { bg: 'var(--sky-soft)',   border: 'var(--sky)',   color: 'var(--sky)'    },
  completed:    { bg: 'var(--leaf-soft)',  border: 'var(--leaf)',  color: 'var(--leaf)'   },
  cancelled:    { bg: 'var(--paper-3)',    border: 'transparent',  color: 'var(--ink-5)'  },
  no_show:      { bg: 'var(--honey-soft)', border: 'var(--honey)', color: '#8a6411'       },
  rescheduling: { bg: '#fff3e0',           border: '#e65100',      color: '#e65100'       },
}

type Props = {
  appt: Appointment
  top: number
  height: number
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onReschedule:   (appt: Appointment) => void
}

export function AppointmentBlock({ appt, top, height, onStatusChange, onReschedule }: Props) {
  const [hover, setHover] = useState(false)
  const cfg  = STATUS_CFG[appt.status]
  const active = appt.status === 'scheduled' || appt.status === 'confirmed'
  const tall   = height >= 48

  const timeStr = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position:   'absolute',
        left: 3, right: 3, top, height,
        borderRadius: 6,
        padding: '4px 7px',
        background:  cfg.bg,
        borderLeft:  `3px solid ${cfg.border}`,
        overflow:    'hidden',
        cursor:      'default',
        zIndex:      1,
        opacity:     appt.status === 'cancelled' ? 0.5 : 1,
        boxShadow:   hover && (active || appt.status === 'rescheduling') ? '0 2px 8px rgba(0,0,0,0.09)' : 'none',
        transition:  'box-shadow 0.12s',
      }}
    >
      {/* Time row */}
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
        {appt.status === 'completed' && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'var(--leaf)', color: '#fff', letterSpacing: '0.05em', flexShrink: 0 }}>✓</span>
        )}
        {appt.status === 'no_show' && (
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'var(--honey)', color: '#fff', letterSpacing: '0.05em', flexShrink: 0 }}>?</span>
        )}
      </div>

      {/* Patient name */}
      <div style={{
        fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 500, color: 'var(--ink)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
        marginTop: 1,
      }}>
        {appt.patient_name}
      </div>

      {/* Duration */}
      {tall && (
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', marginTop: 1 }}>
          {appt.duration_minutes} min
        </div>
      )}

      {/* Hover actions — citas activas */}
      {hover && active && tall && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(appt.id, 'completed') }}
            style={{ border: 'none', background: 'var(--leaf)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontFamily: 'var(--f-mono)', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            Completar
          </button>
          <button
            onClick={e => { e.stopPropagation(); onReschedule(appt) }}
            style={{ border: '1px solid #e65100', background: 'transparent', color: '#e65100', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontFamily: 'var(--f-mono)', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            Reagendar
          </button>
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(appt.id, 'cancelled') }}
            style={{ border: 'none', background: 'transparent', color: 'var(--berry)', borderRadius: 4, padding: '2px 4px', fontSize: 9, fontFamily: 'var(--f-mono)', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Esperando reagendamiento */}
      {hover && appt.status === 'rescheduling' && tall && (
        <div style={{ marginTop: 4, fontFamily: 'var(--f-mono)', fontSize: 9, color: '#e65100', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Esperando nueva cita…
        </div>
      )}
    </div>
  )
}
