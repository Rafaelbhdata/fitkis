'use client'

import { useEffect, useState } from 'react'
import type { Appointment } from '@/lib/clinic/queries'
import { DAYS_LONG, MONTHS_LONG } from '@/lib/clinic/calendar-utils'

type Reason = 'no_show' | 'custom'

type Props = {
  appt: Appointment
  practitionerName: string
  onConfirm: (reason: Reason, customMessage?: string) => Promise<void>
  onClose:   () => void
}

function formatDateTime(iso: string, duration: number) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} · ${time} · ${duration} min`
}

export function RescheduleModal({ appt, onConfirm, onClose }: Props) {
  const [reason, setReason]   = useState<Reason | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleConfirm() {
    if (!reason) return
    setSaving(true)
    await onConfirm(reason, reason === 'custom' ? message.trim() : undefined)
    setSaving(false)
  }

  const canConfirm = !!reason && !saving && (reason !== 'custom' || message.trim() !== '')

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--ink-7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
              Reagendar cita
            </div>
            <div style={{ fontFamily: 'var(--f-serif)', fontSize: 20, fontWeight: 300, color: 'var(--ink)' }}>
              {appt.patient_name}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', marginTop: 6, letterSpacing: '0.03em' }}>
              {formatDateTime(appt.starts_at, appt.duration_minutes)}
            </div>
          </div>
          <ModalClose onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Motivo del reagendamiento
          </div>

          <OptionCard
            selected={reason === 'no_show'}
            onClick={() => setReason('no_show')}
            title="No-show"
            description="El paciente no se presentó. Se registra en su historial y se le envía el link para reagendar."
          />
          <OptionCard
            selected={reason === 'custom'}
            onClick={() => setReason('custom')}
            title="Personalizado"
            description={`Agrega un mensaje para ${appt.patient_name} que llegará en el correo.`}
          />

          {reason === 'custom' && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Mensaje para el paciente
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Hola ${appt.patient_name.split(' ')[0]}, necesito ajustar tu horario porque…`}
                rows={3}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ink-6)', background: 'var(--paper)', fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '4px 24px 22px', display: 'flex', gap: 10 }}>
          <ModalBtn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</ModalBtn>
          <ModalBtn variant="primary" onClick={handleConfirm} disabled={!canConfirm}>
            {saving ? 'Enviando…' : 'Confirmar y notificar'}
          </ModalBtn>
        </div>
      </div>
    </div>
  )
}

function OptionCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', borderRadius: 10, textAlign: 'left', width: '100%',
        border: `1.5px solid ${selected ? 'var(--signal)' : 'var(--ink-7)'}`,
        background: selected ? 'var(--signal-soft)' : '#fff',
        cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${selected ? 'var(--signal)' : 'var(--ink-5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'border-color 0.12s' }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--signal)' }} />}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.45 }}>{description}</div>
      </div>
    </button>
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

function ModalBtn({ onClick, variant, disabled, children }: { onClick: () => void; variant: 'secondary' | 'primary' | 'danger'; disabled?: boolean; children: React.ReactNode }) {
  const v: Record<string, React.CSSProperties> = {
    secondary: { border: '1px solid var(--ink-6)',          background: 'var(--paper)',         color: 'var(--ink-2)'          },
    primary:   { border: '1px solid var(--signal)',         background: 'var(--signal-soft)',   color: 'var(--signal)'         },
    danger:    { border: '1px solid rgba(180,30,30,0.28)', background: 'rgba(180,30,30,0.06)', color: 'var(--berry)'          },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ flex: 1, ...v[variant], borderRadius: 8, padding: '10px 16px', fontSize: 13, fontFamily: 'var(--f-sans)', fontWeight: 500, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'opacity 0.1s' }}>
      {children}
    </button>
  )
}
