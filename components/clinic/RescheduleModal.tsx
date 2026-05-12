'use client'

import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import type { Appointment } from '@/lib/clinic/queries'

type Reason = 'no_show' | 'custom'

type Props = {
  appt: Appointment
  practitionerName: string
  onConfirm: (reason: Reason, customMessage?: string) => Promise<void>
  onClose:   () => void
}

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatApptDate(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} · ${time}`
}

export function RescheduleModal({ appt, practitionerName, onConfirm, onClose }: Props) {
  const [reason, setReason]   = useState<Reason | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving]   = useState(false)

  async function handleConfirm() {
    if (!reason) return
    setSaving(true)
    await onConfirm(reason, reason === 'custom' ? message.trim() : undefined)
    setSaving(false)
  }

  const optionStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 10,
    border: `1.5px solid ${selected ? 'var(--signal)' : 'var(--ink-7)'}`,
    background: selected ? 'var(--signal-soft)' : '#fff',
    cursor: 'pointer',
    transition: 'border-color 0.12s, background 0.12s',
    textAlign: 'left',
  })

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'#fff', border:'1px solid var(--ink-7)', borderRadius:16, padding:'32px 36px', width:'100%', maxWidth:460, boxShadow:'0 8px 40px rgba(10,10,10,0.12)' }}>

        {/* Header */}
        <div style={{ marginBottom:6 }}>
          <div className="fk-eyebrow">Reagendar cita</div>
        </div>
        <h2 className="fk-serif" style={{ fontSize:22, fontWeight:300, fontStyle:'italic', margin:'4px 0 4px' }}>
          {appt.patient_name}
        </h2>
        <div className="fk-mono" style={{ fontSize:11, color:'var(--ink-4)', marginBottom:24 }}>
          {formatApptDate(appt.starts_at)} · {appt.duration_minutes} min
        </div>

        {/* Motivo */}
        <div className="fk-eyebrow" style={{ marginBottom:10 }}>Motivo del reagendamiento</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>

          <button style={optionStyle(reason === 'no_show')} onClick={() => setReason('no_show')}>
            <div style={{ width:18, height:18, borderRadius:999, border:`2px solid ${reason === 'no_show' ? 'var(--signal)' : 'var(--ink-5)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
              {reason === 'no_show' && <div style={{ width:8, height:8, borderRadius:999, background:'var(--signal)' }} />}
            </div>
            <div>
              <div style={{ fontFamily:'var(--f-sans)', fontSize:13, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>No-show</div>
              <div style={{ fontFamily:'var(--f-sans)', fontSize:12, color:'var(--ink-4)', lineHeight:1.4 }}>
                El paciente no se presentó. Se registra en su historial y se le envía el link para reagendar.
              </div>
            </div>
          </button>

          <button style={optionStyle(reason === 'custom')} onClick={() => setReason('custom')}>
            <div style={{ width:18, height:18, borderRadius:999, border:`2px solid ${reason === 'custom' ? 'var(--signal)' : 'var(--ink-5)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
              {reason === 'custom' && <div style={{ width:8, height:8, borderRadius:999, background:'var(--signal)' }} />}
            </div>
            <div>
              <div style={{ fontFamily:'var(--f-sans)', fontSize:13, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>Personalizado</div>
              <div style={{ fontFamily:'var(--f-sans)', fontSize:12, color:'var(--ink-4)', lineHeight:1.4 }}>
                Agrega un mensaje para {appt.patient_name} que llegará en el correo.
              </div>
            </div>
          </button>
        </div>

        {/* Mensaje personalizado */}
        {reason === 'custom' && (
          <div style={{ marginBottom:20 }}>
            <label className="fk-eyebrow" style={{ display:'block', marginBottom:6 }}>Mensaje para el paciente</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Hola ${appt.patient_name.split(' ')[0]}, necesito ajustar tu horario porque…`}
              rows={3}
              autoFocus
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:8, border:'1px solid var(--ink-6)', background:'var(--paper)', fontFamily:'var(--f-sans)', fontSize:13, color:'var(--ink)', resize:'vertical', outline:'none', lineHeight:1.5 }}
            />
          </div>
        )}

        {/* Acciones */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Btn>
          <Btn
            variant="signal"
            disabled={!reason || saving || (reason === 'custom' && !message.trim())}
            onClick={handleConfirm}
          >
            {saving ? 'Enviando…' : 'Confirmar y notificar'}
          </Btn>
        </div>

      </div>
    </div>
  )
}
