'use client'

import { useEffect } from 'react'
import type { Appointment } from '@/lib/clinic/queries'

type Props = {
  appt:      Appointment
  onConfirm: () => void
  onClose:   () => void
}

const MONTHS_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DAYS_LONG   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}, ${time}`
}

export function CancelAppointmentModal({ appt, onConfirm, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.46)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
            Esta cita será cancelada y <strong style={{ color: 'var(--ink-2)', fontWeight: 600 }}>no podrá recuperarse</strong>. Si necesitas reagendar, usa el flujo de reagendamiento en su lugar.
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '4px 24px 22px', display: 'flex', gap: 10 }}>
          <ModalBtn variant="secondary" onClick={onClose}>Volver</ModalBtn>
          <ModalBtn variant="danger" onClick={onConfirm}>Sí, cancelar</ModalBtn>
        </div>
      </div>
    </div>
  )
}

function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-5)', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, padding: 0 }}
    >
      ×
    </button>
  )
}

function ModalBtn({ onClick, variant, children }: { onClick: () => void; variant: 'secondary' | 'danger'; children: React.ReactNode }) {
  const v: Record<string, React.CSSProperties> = {
    secondary: { border: '1px solid var(--ink-6)',          background: 'var(--paper)',         color: 'var(--ink-2)'          },
    danger:    { border: '1px solid rgba(180,30,30,0.28)',  background: 'rgba(180,30,30,0.06)', color: 'var(--berry)'          },
  }
  return (
    <button onClick={onClick} style={{ flex: 1, ...v[variant], borderRadius: 8, padding: '10px 16px', fontSize: 13, fontFamily: 'var(--f-sans)', fontWeight: 500, cursor: 'pointer' }}>
      {children}
    </button>
  )
}
