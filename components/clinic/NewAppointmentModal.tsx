'use client'

import { useState, type CSSProperties } from 'react'
import { Btn } from '@/components/ui/Btn'

type Props = {
  practitionerId: string
  onClose: () => void
  onCreated: () => void
  createAppointment: (payload: {
    practitioner_id: string
    patient_name: string
    patient_email?: string
    starts_at: string
    duration_minutes: number
    notes?: string
  }) => Promise<{ error: string | null }>
}

function nextRoundHour(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.toTimeString().slice(0, 5)
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function NewAppointmentModal({
  practitionerId,
  onClose,
  onCreated,
  createAppointment,
}: Props) {
  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState(nextRoundHour())
  const [duration, setDuration] = useState(50)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientName.trim() || !date || !time) return
    setSubmitting(true)
    setError(null)

    const starts_at = new Date(`${date}T${time}:00`).toISOString()

    const result = await createAppointment({
      practitioner_id: practitionerId,
      patient_name: patientName.trim(),
      patient_email: patientEmail.trim() || undefined,
      starts_at,
      duration_minutes: duration,
      notes: notes.trim() || undefined,
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    onCreated()
  }

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10,10,10,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 20,
  }

  const modalStyle: CSSProperties = {
    background: '#fff',
    border: '1px solid var(--ink-7)',
    borderRadius: 16,
    padding: '32px 36px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 8px 40px rgba(10,10,10,0.12)',
  }

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 18,
  }

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--ink-4)',
  }

  const inputStyle: CSSProperties = {
    background: 'var(--paper)',
    border: '1px solid var(--ink-6)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    fontFamily: 'var(--f-sans)',
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ marginBottom: 24 }}>
          <div className="fk-eyebrow" style={{ marginBottom: 6 }}>Agenda</div>
          <h2
            className="fk-serif"
            style={{ fontSize: 26, fontWeight: 300, fontStyle: 'italic', margin: 0 }}
          >
            Nueva cita
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre del paciente *</label>
            <input
              style={inputStyle}
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Nombre completo"
              required
              autoFocus
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>

          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Fecha *</label>
              <input
                style={inputStyle}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Hora *</label>
              <input
                style={inputStyle}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Duración</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 min</option>
              <option value={50}>50 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>

          <div style={{ ...fieldStyle, marginBottom: 24 }}>
            <label style={labelStyle}>Notas</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de consulta, indicaciones…"
            />
          </div>

          {error && (
            <div
              style={{
                background: 'var(--signal-soft)',
                color: '#a33a0f',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Btn>
            <Btn type="submit" variant="primary" disabled={submitting || !patientName.trim()}>
              {submitting ? 'Agendando…' : 'Agendar cita'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}
