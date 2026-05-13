'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import type { Appointment, AppointmentStatus } from '@/lib/clinic/queries'
import { CancelAppointmentModal } from '@/components/clinic/CancelAppointmentModal'
import { fmtLongDate } from '@/lib/clinic/calendar-utils'
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_COLOR, type RescheduleReason } from '@/lib/clinic/appointment-meta'
import { ModalShell, ModalClose, ModalBtn } from '@/components/clinic/ui/Modal'

function formatDateTime(iso: string, duration: number) {
  const d   = new Date(iso)
  const end = new Date(d.getTime() + duration * 60_000)
  const timeFrom = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  const timeTo   = end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  return { date: fmtLongDate(d), range: `${timeFrom} – ${timeTo}` }
}

type Props = {
  appt: Appointment
  onClose:             () => void
  onStatusChange:      (id: string, status: AppointmentStatus) => void
  onNotesChange:       (id: string, notes: string) => void
  onRescheduleConfirm: (reason: RescheduleReason, customMessage?: string) => Promise<void>
}

export function AppointmentDetailModal({ appt, onClose, onStatusChange, onNotesChange, onRescheduleConfirm }: Props) {
  const [cancelOpen,        setCancelOpen]        = useState(false)
  const [rescheduleOpen,    setRescheduleOpen]    = useState(false)
  const [rescheduleReason,  setRescheduleReason]  = useState<RescheduleReason | null>(null)
  const [rescheduleMessage, setRescheduleMessage] = useState('')
  const [rescheduleSaving,  setRescheduleSaving]  = useState(false)
  const [notes,     setNotes]     = useState(appt.notes ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = appt.status === 'scheduled' || appt.status === 'confirmed'
  const { date, range } = formatDateTime(appt.starts_at, appt.duration_minutes)

  // ESC: cierra primero la sección de reagendamiento (si abierta), después el modal
  const handleShellClose = useCallback(() => {
    if (rescheduleOpen) {
      setRescheduleOpen(false); setRescheduleReason(null); setRescheduleMessage('')
    } else {
      onClose()
    }
  }, [rescheduleOpen, onClose])

  function handleNotesChange(value: string) {
    setNotes(value)
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onNotesChange(appt.id, value)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1800)
    }, 700)
  }

  async function handleRescheduleConfirm() {
    if (!rescheduleReason) return
    setRescheduleSaving(true)
    await onRescheduleConfirm(rescheduleReason, rescheduleReason === 'custom' ? rescheduleMessage.trim() : undefined)
    setRescheduleSaving(false)
    onClose()
  }

  const canConfirmReschedule = !!rescheduleReason && !rescheduleSaving &&
    (rescheduleReason !== 'custom' || rescheduleMessage.trim() !== '')

  return (
    <>
      <ModalShell onClose={handleShellClose} maxWidth={440} zIndex={200}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--ink-7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: APPOINTMENT_STATUS_COLOR[appt.status], letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
              {APPOINTMENT_STATUS_LABEL[appt.status]}
            </div>
            {appt.patient_id ? (
              <Link href={`/clinic/pacientes/${appt.patient_id}`} style={{ fontFamily: 'var(--f-serif)', fontSize: 20, fontWeight: 300, color: 'var(--ink)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appt.patient_name}
              </Link>
            ) : (
              <div style={{ fontFamily: 'var(--f-serif)', fontSize: 20, fontWeight: 300, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appt.patient_name}
              </div>
            )}
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', marginTop: 6, letterSpacing: '0.03em' }}>
              {date} · {range} · {appt.duration_minutes} min
            </div>
          </div>
          <ModalClose onClick={onClose} />
        </div>

        <div style={{ padding: '20px 24px', borderBottom: rescheduleOpen ? '1px solid var(--ink-7)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Notas</div>
            {saveState !== 'idle' && (
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: saveState === 'saved' ? 'var(--leaf)' : 'var(--ink-5)', letterSpacing: '0.05em' }}>
                {saveState === 'saving' ? 'Guardando…' : 'Guardado'}
              </div>
            )}
          </div>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Agrega notas sobre esta cita…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', border: '1px solid var(--ink-7)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, resize: 'vertical', outline: 'none' }}
          />
        </div>

        {rescheduleOpen && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Motivo del reagendamiento
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <OptionCard
                selected={rescheduleReason === 'no_show'}
                onClick={() => setRescheduleReason('no_show')}
                title="No-show"
                description="El paciente no se presentó. Se registra en su historial y se le envía el link para reagendar."
              />
              <OptionCard
                selected={rescheduleReason === 'custom'}
                onClick={() => setRescheduleReason('custom')}
                title="Personalizado"
                description={`Agrega un mensaje para ${appt.patient_name} que llegará en el correo.`}
              />
            </div>
            {rescheduleReason === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Mensaje para el paciente
                </div>
                <textarea
                  value={rescheduleMessage}
                  onChange={e => setRescheduleMessage(e.target.value)}
                  placeholder={`Hola ${appt.patient_name.split(' ')[0]}, necesito ajustar tu horario porque…`}
                  rows={3}
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', border: '1px solid var(--ink-6)', borderRadius: 8, padding: '10px 12px', fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                />
              </div>
            )}
          </div>
        )}

        {active && (
          <div style={{ padding: '4px 24px 22px', display: 'flex', gap: 10 }}>
            {rescheduleOpen ? (
              <>
                <ModalBtn variant="secondary" onClick={() => { setRescheduleOpen(false); setRescheduleReason(null); setRescheduleMessage('') }} disabled={rescheduleSaving}>
                  Cancelar
                </ModalBtn>
                <ModalBtn variant="signal" onClick={handleRescheduleConfirm} disabled={!canConfirmReschedule}>
                  {rescheduleSaving ? 'Enviando…' : 'Confirmar y notificar'}
                </ModalBtn>
              </>
            ) : (
              <>
                <ModalBtn variant="warning" onClick={() => setRescheduleOpen(true)}>Reagendar</ModalBtn>
                <ModalBtn variant="danger-solid" onClick={() => setCancelOpen(true)}>Cancelar cita</ModalBtn>
              </>
            )}
          </div>
        )}
      </ModalShell>

      {cancelOpen && (
        <CancelAppointmentModal
          appt={appt}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => { onStatusChange(appt.id, 'cancelled'); setCancelOpen(false); onClose() }}
        />
      )}
    </>
  )
}

function OptionCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 10, textAlign: 'left', width: '100%', border: `1.5px solid ${selected ? 'var(--signal)' : 'var(--ink-7)'}`, background: selected ? 'var(--signal-soft)' : '#fff', cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s' }}
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
