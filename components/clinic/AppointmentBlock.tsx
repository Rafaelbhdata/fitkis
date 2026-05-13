'use client'

import type { Appointment, AppointmentStatus } from '@/lib/clinic/queries'

// Fondos opacos equivalentes a los rgba originales mezclados sobre fondo blanco
// (la grilla de agenda usa #fff). Mantiene el color percibido pero opaca lo de atrás.
const STATUS_CFG: Record<AppointmentStatus, { bg: string; border: string; timeColor: string }> = {
  scheduled:    { bg: '#f1ffed', border: 'rgba(74,124,58,0.55)',  timeColor: 'rgba(74,124,58,0.9)'    },
  cancelled:    { bg: '#fbefef', border: 'rgba(200,30,30,0.3)',   timeColor: 'rgba(180,30,30,0.5)'    },
  no_show:      { bg: '#f6e0e0', border: 'rgba(180,0,0,0.75)',    timeColor: 'rgba(180,0,0,0.85)'     },
  rescheduling: { bg: '#fff3e0', border: '#e65100',               timeColor: '#e65100'                },
}

type Props = {
  appt: Appointment
  top: number
  height: number
  col?: number
  totalCols?: number
  onOpen: (appt: Appointment) => void
}

export function AppointmentBlock({ appt, top, height, col = 0, totalCols = 1, onOpen }: Props) {
  const cfg      = STATUS_CFG[appt.status]
  const colW     = 100 / totalCols
  const leftPct  = col * colW
  const widthPct = colW
  const cancelled = appt.status === 'cancelled'

  // Modo compacto: el bloque es muy bajo para apilar hora + nombre en dos líneas
  // (ocurre con citas de 15 min en zoom 1x/2x, donde rowH=80/120 da height=28).
  // En 3x rowH=160 → height=36, suficiente para layout normal.
  const compact = height < 36

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
        padding: compact ? '2px 7px' : '4px 7px',
        background: cfg.bg,
        borderLeft: `3px solid ${cfg.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        zIndex: 1,
        userSelect: 'none',
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: compact ? 'center' : 'stretch',
        justifyContent: compact ? 'flex-start' : 'center',
        gap: compact ? 6 : 1,
      }}
    >
      <span style={{
        fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
        color: cfg.timeColor, letterSpacing: '0.03em',
        textDecoration: cancelled ? 'line-through' : 'none',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {timeStr}
      </span>
      <span style={{
        fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 500,
        color: 'var(--ink)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: cancelled ? 'line-through' : 'none',
        lineHeight: 1.2,
        minWidth: 0,
        flex: compact ? 1 : undefined,
      }}>
        {appt.patient_name}
      </span>
    </div>
  )
}
