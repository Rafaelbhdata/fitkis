'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { useSupabase } from '@/lib/hooks'
import { loadPatientsBasic, type PatientBasic } from '@/lib/clinic/queries'
import {
  MONTHS_CAP, WEEK_LABELS, DURATIONS,
  todayISO, isoDate, firstDayOfMonth, daysInMonth,
  fmtTime, generateSlots,
} from '@/lib/clinic/calendar-utils'

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

// ─── component ───────────────────────────────────────────────────────────────

export function NewAppointmentModal({ practitionerId, onClose, onCreated, createAppointment }: Props) {
  const supabase = useSupabase()

  // Paciente
  const [mode, setMode]       = useState<PatientMode>('linked')
  const [patients, setPatients]       = useState<PatientBasic[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [search, setSearch]           = useState('')
  const [dropOpen, setDropOpen]       = useState(false)
  const [selected, setSelected]       = useState<PatientBasic|null>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [extName, setExtName]   = useState('')
  const [extEmail, setExtEmail] = useState('')

  // Fecha / hora
  const today = todayISO()
  const now = new Date()
  const [calY, setCalY] = useState(now.getFullYear())
  const [calM, setCalM] = useState(now.getMonth())
  const [date, setDate]     = useState<string|null>(null)
  const [duration, setDuration] = useState(60)
  const [slot, setSlot]     = useState<string|null>(null)

  // Form
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string|null>(null)

  useEffect(() => {
    loadPatientsBasic(supabase, practitionerId).then(list => { setPatients(list); setPatientsLoading(false) })
  }, [supabase, practitionerId])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    if (dropOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return patients.filter(p =>
      (p.patient_name??'').toLowerCase().includes(q)||(p.patient_email??'').toLowerCase().includes(q)
    )
  }, [patients, search])

  const cells = useMemo<(number|null)[]>(
    () => [...Array(firstDayOfMonth(calY,calM)).fill(null), ...Array.from({length:daysInMonth(calY,calM)},(_,i)=>i+1)],
    [calY, calM]
  )
  const slots = useMemo(() => date ? generateSlots(date, duration) : [], [date, duration])

  const patientName  = mode==='linked' ? (selected?.patient_name??'') : extName.trim()
  const patientEmail = mode==='linked' ? (selected?.patient_email??undefined) : (extEmail.trim()||undefined)
  const patientId    = mode==='linked' ? (selected?.patient_id??undefined) : undefined
  const canSubmit    = !!patientName && !!date && !!slot && (mode==='linked'?!!selected:!!extName.trim())

  async function handleSubmit() {
    if (!canSubmit||!date||!slot) return
    setSubmitting(true); setError(null)
    const starts_at = new Date(slot).toISOString()
    const result = await createAppointment({
      practitioner_id: practitionerId, patient_name: patientName,
      patient_email: patientEmail, patient_id: patientId,
      starts_at, duration_minutes: duration, notes: notes.trim()||undefined,
    })
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    onCreated()
  }

  const inputSt: React.CSSProperties = {
    background:'var(--paper)',border:'1px solid var(--ink-6)',borderRadius:8,
    padding:'9px 12px',fontSize:13,fontFamily:'var(--f-sans)',color:'var(--ink)',outline:'none',width:'100%',boxSizing:'border-box',
  }
  const lbl: React.CSSProperties = {
    fontFamily:'var(--f-mono)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'var(--ink-4)',display:'block',marginBottom:5,
  }
  const modeBtn = (m: PatientMode, label: string) => (
    <button type="button" onClick={()=>{setMode(m);setSelected(null);setSearch('')}}
      style={{flex:1,padding:'8px 0',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'var(--f-sans)',fontSize:13,fontWeight:500,
        background:mode===m?'var(--signal)':'transparent',color:mode===m?'#fff':'var(--ink-4)',transition:'background 0.12s,color 0.12s'}}>
      {label}
    </button>
  )

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(10,10,10,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',border:'1px solid var(--ink-7)',borderRadius:16,width:'100%',maxWidth:date?920:720,
          boxShadow:'0 8px 40px rgba(10,10,10,0.12)',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',
          transition:'max-width 0.25s ease'}}>

        {/* Header */}
        <div style={{padding:'28px 32px 20px',borderBottom:'1px solid var(--ink-7)'}}>
          <div className="fk-eyebrow" style={{marginBottom:4}}>Agenda</div>
          <h2 className="fk-serif" style={{fontSize:24,fontWeight:300,fontStyle:'italic',margin:0}}>Nueva cita</h2>
        </div>

        <div style={{display:'flex',flex:1,minHeight:0}}>

          {/* ─ Left: paciente + notas ─ */}
          <div style={{width:280,flexShrink:0,padding:'24px 28px',borderRight:'1px solid var(--ink-7)',display:'flex',flexDirection:'column',gap:16,overflowY:'auto'}}>

            {/* Toggle modo */}
            <div style={{display:'flex',background:'var(--paper-2)',borderRadius:10,padding:3,gap:2}}>
              {modeBtn('linked','Vinculado')}
              {modeBtn('external','Externo')}
            </div>

            {/* Paciente vinculado */}
            {mode==='linked' && (
              <div>
                <label style={lbl}>Paciente *</label>
                <div ref={dropRef} style={{position:'relative'}}>
                  <input type="text"
                    value={selected?(selected.patient_name??selected.patient_email??''):search}
                    onChange={e=>{setSearch(e.target.value);setSelected(null);setDropOpen(true)}}
                    onFocus={()=>setDropOpen(true)}
                    placeholder={patientsLoading?'Cargando…':'Buscar paciente…'}
                    disabled={patientsLoading}
                    style={{...inputSt,paddingRight:28}}
                    autoFocus
                  />
                  <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--ink-5)',pointerEvents:'none',fontSize:11}}>▾</span>
                  {dropOpen && !patientsLoading && (
                    <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',border:'1px solid var(--ink-7)',borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.1)',zIndex:10,maxHeight:200,overflowY:'auto'}}>
                      {filtered.length===0
                        ? <div style={{padding:'12px 14px',fontSize:13,color:'var(--ink-5)',fontFamily:'var(--f-sans)'}}>Sin resultados</div>
                        : filtered.map(p=>(
                          <button key={p.patient_id} type="button"
                            onClick={()=>{setSelected(p);setSearch('');setDropOpen(false)}}
                            style={{display:'block',width:'100%',textAlign:'left',padding:'9px 14px',border:'none',
                              background:selected?.patient_id===p.patient_id?'var(--paper-2)':'transparent',cursor:'pointer',borderBottom:'1px solid var(--ink-7)'}}>
                            <div style={{fontFamily:'var(--f-sans)',fontSize:13,fontWeight:500,color:'var(--ink)'}}>{p.patient_name??p.patient_email}</div>
                            {p.patient_name&&p.patient_email&&<div style={{fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-5)',marginTop:1}}>{p.patient_email}</div>}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paciente externo */}
            {mode==='external' && (
              <>
                <div>
                  <label style={lbl}>Nombre *</label>
                  <input style={inputSt} type="text" value={extName} onChange={e=>setExtName(e.target.value)} placeholder="Nombre completo" autoFocus/>
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inputSt} type="email" value={extEmail} onChange={e=>setExtEmail(e.target.value)} placeholder="email@ejemplo.com"/>
                </div>
              </>
            )}

            {/* Duración */}
            <div>
              <label style={lbl}>Duración</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {DURATIONS.map(d=>(
                  <button key={d} type="button" onClick={()=>{setDuration(d);setSlot(null)}}
                    style={{padding:'5px 10px',borderRadius:999,border:`1.5px solid ${duration===d?'var(--signal)':'var(--ink-7)'}`,
                      background:duration===d?'var(--signal-soft)':'transparent',color:duration===d?'var(--signal)':'var(--ink-4)',
                      fontFamily:'var(--f-mono)',fontSize:11,cursor:'pointer',fontWeight:duration===d?600:400}}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{flex:1}}>
              <label style={lbl}>Notas</label>
              <textarea style={{...inputSt,resize:'vertical',minHeight:80}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Motivo de consulta, indicaciones…"/>
            </div>

            {error && <div style={{background:'var(--signal-soft)',color:'#a33a0f',borderRadius:8,padding:'9px 12px',fontSize:12}}>{error}</div>}

            {/* Resumen seleccionado */}
            {date && slot && (
              <div style={{background:'var(--signal-soft)',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontFamily:'var(--f-mono)',fontSize:13,color:'var(--signal)',fontWeight:600}}>{fmtTime(slot)}</div>
                <div style={{fontFamily:'var(--f-sans)',fontSize:12,color:'var(--ink-3)',marginTop:2}}>
                  {new Date(date+'T00:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})} · {duration} min
                </div>
              </div>
            )}
          </div>

          {/* ─ Right: calendario + slots ─ */}
          <div style={{flex:1,padding:'24px 28px',display:'flex',flexDirection:'column',gap:20,minHeight:0,alignSelf:'stretch'}}>

            <div style={{display:'flex',gap:16,flex:1,minHeight:0,overflow:'hidden'}}>

              {/* Calendario */}
              <div style={{flex:'0 0 auto',width:340,alignSelf:'flex-start'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                  <button type="button" onClick={()=>{if(calM===0){setCalY(y=>y-1);setCalM(11)}else setCalM(m=>m-1)}}
                    style={{width:28,height:28,borderRadius:8,border:'1px solid var(--ink-7)',background:'#fff',cursor:'pointer',fontSize:13,color:'var(--ink-3)',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                  <span className="fk-serif" style={{flex:1,fontSize:16,fontWeight:300,textAlign:'center'}}>{MONTHS_CAP[calM]} {calY}</span>
                  <button type="button" onClick={()=>{if(calM===11){setCalY(y=>y+1);setCalM(0)}else setCalM(m=>m+1)}}
                    style={{width:28,height:28,borderRadius:8,border:'1px solid var(--ink-7)',background:'#fff',cursor:'pointer',fontSize:13,color:'var(--ink-3)',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:6}}>
                  {WEEK_LABELS.map(l=><div key={l} className="fk-eyebrow" style={{textAlign:'center',fontSize:8}}>{l}</div>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                  {cells.map((day,i)=>{
                    if(!day) return <div key={`e${i}`}/>
                    const d = isoDate(calY,calM,day)
                    const isPast=d<today, isTday=d===today, isSel=d===date
                    return (
                      <button key={d} type="button" disabled={isPast} onClick={()=>{setDate(d);setSlot(null)}}
                        style={{padding:'7px 2px',borderRadius:999,border:isTday&&!isSel?'1px solid var(--signal)':'1px solid transparent',
                          background:isSel?'var(--signal)':'transparent',
                          color:isSel?'#fff':isPast?'var(--ink-6)':isTday?'var(--signal)':'var(--ink)',
                          fontSize:13,fontFamily:'var(--f-sans)',cursor:isPast?'default':'pointer',
                          fontWeight:isSel||isTday?600:400,transition:'all 0.1s'}}>
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Slots — columna única a la derecha del calendario */}
              {date && (
                <div style={{flex:1,borderLeft:'1px solid var(--ink-7)',paddingLeft:16,display:'flex',flexDirection:'column',minHeight:0}}>
                  <label style={{...lbl,marginBottom:10,display:'block',flexShrink:0}}>
                    {new Date(date+'T00:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}
                  </label>
                  <div style={{display:'flex',flexDirection:'column',gap:6,flex:1,overflowY:'auto',minHeight:0}}>
                    {slots.map(s=>{
                      const isSel=s===slot
                      return (
                        <button key={s} type="button" onClick={()=>setSlot(s)}
                          style={{padding:'9px 12px',borderRadius:8,
                            border:`1.5px solid ${isSel?'var(--signal)':'var(--ink-7)'}`,
                            background:isSel?'var(--signal)':'#fff',
                            color:isSel?'#fff':'var(--ink)',
                            fontFamily:'var(--f-mono)',fontSize:12,cursor:'pointer',fontWeight:isSel?600:400,
                            transition:'all 0.1s',textAlign:'center'}}>
                          {fmtTime(s)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'16px 32px',borderTop:'1px solid var(--ink-7)',display:'flex',justifyContent:'flex-end',gap:10}}>
          <Btn type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Btn>
          <Btn type="button" variant="signal" disabled={!canSubmit||submitting} onClick={handleSubmit}>
            {submitting?'Agendando…':'Agendar cita'}
          </Btn>
        </div>

      </div>
    </div>
  )
}
