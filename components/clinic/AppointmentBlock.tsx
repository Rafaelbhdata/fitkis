'use client'

import type { Appointment, AppointmentStatus } from '@/lib/clinic/queries'
import { isCompletedAppointment } from '@/lib/clinic/queries'

type StyleCfg = { bg: string; border: string; timeColor: string }

const STATUS_CFG: Record<AppointmentStatus, StyleCfg> = {
  scheduled:    { bg: 'rgba(178,255,153,0.18)', border: 'rgba(74,124,58,0.55)',  timeColor: 'rgba(74,124,58,0.9)'    },
  cancelled:    { bg: 'rgba(200,30,30,0.07)',   border: 'rgba(200,30,30,0.3)',   timeColor: 'rgba(180,30,30,0.5)'    },
  no_show:      { bg: 'rgba(180,0,0,0.12)',      border: 'rgba(180,0,0,0.75)',    timeColor: 'rgba(180,0,0,0.85)'     },
  rescheduling: { bg: '#fff3e0',                border: '#e65100',               timeColor: '#e65100'                },
}

// Estilo para citas ya completadas (scheduled + pasadas): gris tenue.
const COMPLETED_CFG: StyleCfg = { bg: 'rgba(40,40,40,0.12)', border: 'rgba(40,40,40,0.6)', timeColor: 'rgba(40,40,40,0.75)' }

type Props = {
  appt: Appointment
  top: number
  height: number
  col?: number
  totalCols?: number
  onOpen: (appt: Appointment) => void
}

export function AppointmentBlock({ appt, top, height, col = 0, totalCols = 1, onOpen }: Props) {
  const cfg      = isCompletedAppointment(appt) ? COMPLETED_CFG : STATUS_CFG[appt.status]
  const colW     = 100 / totalCols
  const leftPct  = col * colW
  const widthPct = colW
  const cancelled = appt.status === 'cancelled'

  const timeStr = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
  })

  return (
    <div
      onClick={() => onOpen(appt)}
      style={{
        position: 'absolute',
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - ${totalCols > 1 ? 4 : 6}px)`,
        top, height,
        borderRadius: 6,
        padding: '4px 7px',
        background: cfg.bg,
        borderLeft: `3px solid ${cfg.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        zIndex: 1,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <span style={{
        fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
        color: cfg.timeColor, letterSpacing: '0.03em',
        textDecoration: cancelled ? 'line-through' : 'none',
        lineHeight: 1,
      }}>
        {timeStr}
      </span>
      <span style={{
        fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 500,
        color: 'var(--ink)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: cancelled ? 'line-through' : 'none',
        lineHeight: 1.2,
      }}>
        {appt.patient_name}
      </span>
    </div>
  )
}
