'use client'

import { useEffect, useRef, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { useSupabase } from '@/lib/hooks'
import { loadPatientsBasic, type PatientBasic } from '@/lib/clinic/queries'

type PatientMode = 'linked' | 'external'

type Props = {
  practitionerId: string
  onClose:   () => void
  onCreated: () => void
  createAppointment: (payload: {
    practitioner_id:  string
    patient_name:     string
    patient_email?:   string
    patient_id?:      string
    starts_at:        string
    duration_minutes: number
    notes?:           string
  }) => Promise<{ error: string | null }>
}

function todayISO(): string { return new Date().toISOString().split('T')[0] }
function nextRoundHour(): string {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
  return d.toTimeString().slice(0, 5)
}

const inputStyle: React.CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--ink-6)', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, fontFamily: 'var(--f-sans)', color: 'var(--ink)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)', fontSize: 10, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: 'var(--ink-4)', display: 'block', marginBottom: 6,
}

export function NewAppointmentModal({ practitionerId, onClose, onCreated, createAppointment }: Props) {
  const supabase = useSupabase()

  // Modo de paciente
  const [mode, setMode]     = useState<PatientMode>('linked')
  const [patients, setPatients]         = useState<PatientBasic[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [search, setSearch]             = useState('')
  const [dropOpen, setDropOpen]         = useState(false)
  const [selected, setSelected]         = useState<PatientBasic | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Campos externos
  const [extName, setExtName]   = useState('')
  const [extEmail, setExtEmail] = useState('')

  // Campos comunes
  const [date, setDate]         = useState(todayISO())
  const [time, setTime]         = useState(nextRoundHour())
  const [duration, setDuration] = useState(50)
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Cargar pacientes vinculados
  useEffect(() => {
    loadPatientsBasic(supabase, practitionerId).then(list => {
      setPatients(list)
      setPatientsLoading(false)
    })
  }, [supabase, practitionerId])

  // Click fuera del dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    if (dropOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    return (p.patient_name ?? '').toLowerCase().includes(q) || (p.patient_email ?? '').toLowerCase().includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name  = mode === 'linked' ? (selected?.patient_name ?? '') : extName.trim()
    const email = mode === 'linked' ? (selected?.patient_email ?? undefined) : (extEmail.trim() || undefined)
    const pid   = mode === 'linked' ? (selected?.patient_id ?? undefined) : undefined

    if (!name || !date || !time) return
    if (mode === 'linked' && !selected) return

    setSubmitting(true); setError(null)
    const starts_at = new Date(`${date}T${time}:00`).toISOString()
    const result = await createAppointment({
      practitioner_id: practitionerId,
      patient_name: name, patient_email: email, patient_id: pid,
      starts_at, duration_minutes: duration, notes: notes.trim() || undefined,
    })
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    onCreated()
  }

  const modeBtn = (m: PatientMode, label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setSelected(null); setSearch('') }}
      style={{
        flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
        fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 500,
        background: mode === m ? 'var(--ink)' : 'transparent',
        color: mode === m ? 'var(--paper)' : 'var(--ink-4)',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'#fff', border:'1px solid var(--ink-7)', borderRadius:16, padding:'32px 36px', width:'100%', maxWidth:480, boxShadow:'0 8px 40px rgba(10,10,10,0.12)', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ marginBottom:24 }}>
          <div className="fk-eyebrow" style={{ marginBottom:6 }}>Agenda</div>
          <h2 className="fk-serif" style={{ fontSize:26, fontWeight:300, fontStyle:'italic', margin:0 }}>Nueva cita</h2>
        </div>

        {/* Toggle modo */}
        <div style={{ display:'flex', background:'var(--paper-2)', borderRadius:10, padding:3, marginBottom:22, gap:2 }}>
          {modeBtn('linked',   'Paciente vinculado')}
          {modeBtn('external', 'Paciente externo')}
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Modo: paciente vinculado ── */}
          {mode === 'linked' && (
            <div style={{ marginBottom:18 }}>
              <label style={labelStyle}>Paciente *</label>
              <div ref={dropRef} style={{ position:'relative' }}>
                <input
                  type="text"
                  value={selected ? (selected.patient_name ?? selected.patient_email ?? '') : search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); setDropOpen(true) }}
                  onFocus={() => setDropOpen(true)}
                  placeholder={patientsLoading ? 'Cargando pacientes…' : 'Buscar paciente…'}
                  disabled={patientsLoading}
                  style={{ ...inputStyle, paddingRight: 32 }}
                  autoFocus
                />
                <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-5)', pointerEvents:'none', fontSize:12 }}>▾</span>

                {dropOpen && !patientsLoading && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff',
                    border:'1px solid var(--ink-7)', borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,0.1)',
                    zIndex:10, maxHeight:220, overflowY:'auto',
                  }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding:'12px 14px', fontSize:13, color:'var(--ink-5)', fontFamily:'var(--f-sans)' }}>Sin resultados</div>
                    ) : filtered.map(p => (
                      <button
                        key={p.patient_id}
                        type="button"
                        onClick={() => { setSelected(p); setSearch(''); setDropOpen(false) }}
                        style={{
                          display:'block', width:'100%', textAlign:'left', padding:'10px 14px',
                          border:'none', background: selected?.patient_id === p.patient_id ? 'var(--paper-2)' : 'transparent',
                          cursor:'pointer', borderBottom:'1px solid var(--ink-7)',
                        }}
                      >
                        <div style={{ fontFamily:'var(--f-sans)', fontSize:13, fontWeight:500, color:'var(--ink)' }}>
                          {p.patient_name ?? p.patient_email}
                        </div>
                        {p.patient_name && p.patient_email && (
                          <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-5)', marginTop:2 }}>
                            {p.patient_email}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Modo: paciente externo ── */}
          {mode === 'external' && (
            <>
              <div style={{ marginBottom:18 }}>
                <label style={labelStyle}>Nombre del paciente *</label>
                <input style={inputStyle} type="text" value={extName} onChange={e => setExtName(e.target.value)}
                  placeholder="Nombre completo" required autoFocus />
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)}
                  placeholder="email@ejemplo.com" />
              </div>
            </>
          )}

          {/* Fecha y hora */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Hora *</label>
              <input style={inputStyle} type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={labelStyle}>Duración</label>
            <select style={{ ...inputStyle, cursor:'pointer' }} value={duration} onChange={e => setDuration(Number(e.target.value))}>
              <option value={30}>30 min</option>
              <option value={50}>50 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, resize:'vertical', minHeight:72 }}
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Motivo de consulta, indicaciones…" />
          </div>

          {error && (
            <div style={{ background:'var(--signal-soft)', color:'#a33a0f', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Btn>
            <Btn
              type="submit" variant="primary"
              disabled={submitting || (mode === 'linked' ? !selected : !extName.trim())}
            >
              {submitting ? 'Agendando…' : 'Agendar cita'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}
