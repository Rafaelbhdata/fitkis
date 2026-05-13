'use client'

import type { Appointment } from '@/lib/clinic/queries'
import { DAYS_LONG, MONTHS_LONG } from '@/lib/clinic/calendar-utils'
import { ModalShell, ModalClose, ModalBtn } from '@/components/clinic/ui/Modal'

type Props = {
  appt:      Appointment
  onConfirm: () => void
  onClose:   () => void
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const TZ = 'America/Mexico_City'
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
  // Día y mes en CDMX (evita drift cuando server o navegador están en otra TZ).
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, weekday: 'short', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const dayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }
  const dow = dayMap[get('weekday')] ?? 0
  const day = Number(get('day'))
  const month = Number(get('month')) - 1
  return `${DAYS_LONG[dow]} ${day} de ${MONTHS_LONG[month]}, ${time}`
}

export function CancelAppointmentModal({ appt, onConfirm, onClose }: Props) {
  return (
    <ModalShell onClose={onClose} maxWidth={400} zIndex={300}>
      <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--ink-7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 20, fontWeight: 300, color: 'var(--ink)' }}>
            ¿Cancelar esta cita?
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', marginTop: 6, letterSpacing: '0.03em' }}>
            {appt.patient_name} · {formatDateTime(appt.starts_at)}
          </div>
        </div>
        <ModalClose onClick={onClose} />
      </div>
      <div style={{ padding: '20px 24px' }}>
        <p style={{ fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
          Esta cita será cancelada y <strong style={{ color: 'var(--ink-2)', fontWeight: 600 }}>no podrá recuperarse</strong>. Si necesitas reagendar, usa el flujo de reagendamiento en su lugar.
        </p>
      </div>
      <div style={{ padding: '4px 24px 22px', display: 'flex', gap: 10 }}>
        <ModalBtn variant="secondary" onClick={onClose}>Volver</ModalBtn>
        <ModalBtn variant="danger-soft" onClick={onConfirm}>Sí, cancelar</ModalBtn>
      </div>
    </ModalShell>
  )
}
