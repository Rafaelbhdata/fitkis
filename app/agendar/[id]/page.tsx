'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PulseLine } from '@/components/ui/PulseLine'
import { AddToCalendar } from '@/components/clinic/AddToCalendar'
import { FkWord } from '@/components/ui/Fk'

type PractitionerPublic = { id: string; display_name: string; specialty: string | null; clinic_name: string | null }
type OccupiedSlot = { starts_at: string; duration_minutes: number }
type Step = 'loading' | 'calendar' | 'slots' | 'form' | 'confirmed'

const MONTHS_CAP = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const DAYS_LONG = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const WEEK_LABELS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']
const DURATIONS = [15, 30, 45, 60]

function todayISO() { return new Date().toISOString().split('T')[0] }
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function firstDayOfMonth(y: number, m: number) { const r = new Date(y,m,1).getDay(); return r===0?6:r-1 }
function daysInMonth(y: number, m: number)     { return new Date(y,m+1,0).getDate() }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false})
}
function fmtDateShort(iso: string) {
  const d = new Date(iso+'T00:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}
function generateSlots(dateISO: string, durationMin: number): string[] {
  const slots: string[] = []
  for (let m = 9*60; m + durationMin <= 19*60; m += durationMin) {
    const h = Math.floor(m/60), mm = m%60
    slots.push(`${dateISO}T${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`)
  }
  return slots
}
function isOccupied(slotISO: string, occupied: OccupiedSlot[], durMin: number) {
  const s = new Date(slotISO).getTime(), e = s + durMin*60_000
  return occupied.some(o => { const os = new Date(o.starts_at).getTime(); return s < os + o.duration_minutes*60_000 && e > os })
}

export default function BookingPage({ params }: { params: { id: string } }) {
  const practitionerId = params.id
  const rescheduleId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('reschedule') ?? undefined
    : undefined

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const [step, setStep]         = useState<Step>('loading')
  const [prac, setPrac]         = useState<PractitionerPublic|null>(null)
  const [duration, setDuration] = useState(60)
  const today = todayISO()
  const now = new Date()
  const [calY, setCalY] = useState(now.getFullYear())
  const [calM, setCalM] = useState(now.getMonth())
  const [date, setDate]         = useState<string|null>(null)
  const [occupied, setOccupied] = useState<OccupiedSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slot, setSlot]         = useState<string|null>(null)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr]   = useState<string|null>(null)
  const [booked, setBooked]     = useState<{starts_at:string;duration_minutes:number;practitioner_name:string}|null>(null)

  useEffect(() => {
    supabase.from('practitioners').select('id,display_name,specialty,clinic_name')
      .eq('id',practitionerId).eq('active',true).maybeSingle()
      .then(({data}) => { setPrac(data as PractitionerPublic|null); setStep('calendar') })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitionerId])

  async function handleSelectDate(d: string) {
    setDate(d); setSlotsLoading(true); setSlot(null)
    try {
      const r = await fetch(`/api/available-slots/${practitionerId}/${d}`)
      const data = await r.json()
      setOccupied(Array.isArray(data) ? data : [])
    } catch { setOccupied([]) }
    setSlotsLoading(false)
    setStep('slots')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slot||!name.trim()||!email.trim()) return
    setSubmitting(true); setFormErr(null)
    const res = await fetch('/api/book-appointment',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({practitioner_id:practitionerId,patient_name:name.trim(),patient_email:email.trim(),
        starts_at:new Date(slot).toISOString(),duration_minutes:duration,notes:notes.trim()||undefined,reschedule_id:rescheduleId})})
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setFormErr(json.error??'Error al confirmar.'); return }
    setBooked({starts_at:new Date(slot).toISOString(),duration_minutes:duration,practitioner_name:prac?.display_name??''})
    setStep('confirmed')
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const page:  React.CSSProperties = {minHeight:'100vh',background:'#fff',fontFamily:'var(--f-sans)'}
  const wrap:  React.CSSProperties = {maxWidth:440,margin:'0 auto',padding:'0 20px 48px'}
  const input: React.CSSProperties = {width:'100%',boxSizing:'border-box',padding:'14px 16px',borderRadius:12,
    border:'1px solid var(--ink-6)',background:'var(--paper)',fontFamily:'var(--f-sans)',fontSize:15,color:'var(--ink)',outline:'none'}

  // ── TopBar ───────────────────────────────────────────────────────────────────
  const TopBar = () => (
    <div style={{padding:'16px 20px',borderBottom:'1px solid var(--ink-7)',position:'sticky',top:0,background:'#fff',zIndex:10}}>
      <FkWord size={20} />
    </div>
  )

  // ── Practitioner header ───────────────────────────────────────────────────────
  const PracHeader = () => (
    <div style={{paddingTop:28,paddingBottom:20,borderBottom:'1px solid var(--ink-7)',marginBottom:24}}>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:48,height:48,borderRadius:999,background:'var(--signal-soft)',display:'flex',alignItems:'center',
          justifyContent:'center',fontFamily:'var(--f-serif)',fontStyle:'italic',fontSize:20,color:'var(--signal)',flexShrink:0}}>
          {prac?.display_name?.[0]??'?'}
        </div>
        <div>
          <div className="fk-serif" style={{fontSize:18,fontWeight:300,fontStyle:'italic',lineHeight:1.2}}>{prac?.display_name}</div>
          {prac?.specialty&&<div style={{fontSize:12,color:'var(--ink-4)',marginTop:2}}>{prac.specialty}</div>}
        </div>
      </div>
    </div>
  )

  // ── Duration pills ────────────────────────────────────────────────────────────
  const DurationPills = () => (
    <div style={{marginBottom:24}}>
      <div className="fk-eyebrow" style={{marginBottom:10}}>Duración de la consulta</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {DURATIONS.map(d=>(
          <button key={d} type="button" onClick={()=>{setDuration(d);setSlot(null)}}
            style={{padding:'10px 18px',borderRadius:999,fontFamily:'var(--f-mono)',fontSize:13,fontWeight:500,cursor:'pointer',
              border:`2px solid ${duration===d?'var(--signal)':'var(--ink-7)'}`,
              background:duration===d?'var(--signal)':'#fff',
              color:duration===d?'#fff':'var(--ink-3)',transition:'all 0.1s'}}>
            {d} min
          </button>
        ))}
      </div>
    </div>
  )

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (step==='loading') return (
    <div style={{...page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
    </div>
  )

  // ── Confirmed ────────────────────────────────────────────────────────────────
  if (step==='confirmed'&&booked) return (
    <div style={page}>
      <TopBar />
      <div style={wrap}>
        <div style={{textAlign:'center',paddingTop:48,paddingBottom:32}}>
          <div style={{width:64,height:64,borderRadius:999,background:'var(--leaf-soft)',display:'flex',alignItems:'center',
            justifyContent:'center',margin:'0 auto 20px',fontSize:28}}>✓</div>
          <h1 className="fk-serif" style={{fontSize:34,fontWeight:300,fontStyle:'italic',margin:'0 0 8px'}}>¡Cita confirmada!</h1>
          <p style={{color:'var(--ink-4)',fontSize:15,margin:0}}>Nos vemos pronto.</p>
        </div>
        <div style={{background:'var(--paper)',borderRadius:16,padding:'24px',marginBottom:24}}>
          {[
            {label:'Nutrióloga', val:booked.practitioner_name},
            {label:'Fecha',      val:fmtDateShort(booked.starts_at.split('T')[0])},
            {label:'Hora',       val:<span style={{fontFamily:'var(--f-mono)',fontSize:20,color:'var(--signal)',fontWeight:600}}>{fmtTime(booked.starts_at)}</span>},
            {label:'Duración',   val:`${booked.duration_minutes} min`},
          ].map(({label,val})=>(
            <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--ink-7)'}}>
              <span style={{fontSize:13,color:'var(--ink-4)'}}>{label}</span>
              <span style={{fontSize:15,fontWeight:500}}>{val}</span>
            </div>
          ))}
        </div>
        <AddToCalendar title={`Consulta con ${booked.practitioner_name}`} startISO={booked.starts_at}
          durationMinutes={booked.duration_minutes} description={`Consulta nutricional con ${booked.practitioner_name}`} />
        {email&&<p style={{textAlign:'center',fontSize:12,color:'var(--ink-5)',marginTop:16}}>Confirmación enviada a {email}</p>}
      </div>
    </div>
  )

  // ── Calendar ─────────────────────────────────────────────────────────────────
  if (step==='calendar'||step==='slots') {
    const cells: (number|null)[] = [...Array(firstDayOfMonth(calY,calM)).fill(null), ...Array.from({length:daysInMonth(calY,calM)},(_,i)=>i+1)]
    const slots = date&&step==='slots' ? generateSlots(date,duration) : []

    return (
      <div style={page}>
        <TopBar />
        {rescheduleId&&(
          <div style={{background:'#fff3e0',padding:'12px 20px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #e65100'}}>
            <span>📅</span>
            <span style={{fontSize:13,color:'#e65100',fontWeight:500}}>Tu nutrióloga quiere reagendar tu consulta. Elige un nuevo horario.</span>
          </div>
        )}
        <div style={wrap}>
          <PracHeader />
          <DurationPills />

          {/* Calendar */}
          <div style={{marginBottom:step==='slots'?24:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <button type="button" onClick={()=>{if(calM===0){setCalY(y=>y-1);setCalM(11)}else setCalM(m=>m-1)}}
                style={{width:40,height:40,borderRadius:10,border:'1px solid var(--ink-7)',background:'#fff',cursor:'pointer',fontSize:18,color:'var(--ink-3)',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
              <span className="fk-serif" style={{flex:1,textAlign:'center',fontSize:20,fontWeight:300}}>{MONTHS_CAP[calM]} {calY}</span>
              <button type="button" onClick={()=>{if(calM===11){setCalY(y=>y+1);setCalM(0)}else setCalM(m=>m+1)}}
                style={{width:40,height:40,borderRadius:10,border:'1px solid var(--ink-7)',background:'#fff',cursor:'pointer',fontSize:18,color:'var(--ink-3)',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:8}}>
              {WEEK_LABELS.map(l=><div key={l} className="fk-eyebrow" style={{textAlign:'center',fontSize:10}}>{l}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
              {cells.map((day,i)=>{
                if(!day) return <div key={`e${i}`}/>
                const d = isoDate(calY,calM,day)
                const isPast=d<today, isTday=d===today, isSel=d===date
                return (
                  <button key={d} type="button" disabled={isPast} onClick={()=>handleSelectDate(d)}
                    style={{aspectRatio:'1',borderRadius:999,border:isTday&&!isSel?'2px solid var(--signal)':'2px solid transparent',
                      background:isSel?'var(--signal)':'transparent',
                      color:isSel?'#fff':isPast?'var(--ink-6)':isTday?'var(--signal)':'var(--ink)',
                      fontSize:16,fontFamily:'var(--f-sans)',cursor:isPast?'default':'pointer',
                      fontWeight:isSel||isTday?700:400,transition:'all 0.1s',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slots */}
          {step==='slots'&&date&&(
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <button type="button" onClick={()=>{setStep('calendar');setSlot(null)}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'var(--signal)',fontFamily:'var(--f-sans)',padding:0,display:'flex',alignItems:'center',gap:4}}>
                  ‹ Cambiar fecha
                </button>
                <span style={{fontSize:14,color:'var(--ink-3)',fontWeight:500}}>{fmtDateShort(date)}</span>
              </div>
              {slotsLoading ? (
                <div style={{display:'flex',justifyContent:'center',padding:32}}>
                  <PulseLine w={80} h={20} color="var(--signal)" strokeWidth={2} active />
                </div>
              ) : slots.length===0 ? (
                <p style={{textAlign:'center',color:'var(--ink-4)',fontSize:14,padding:'24px 0'}}>Sin horarios disponibles para este día.</p>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {slots.map(s=>{
                    const occ = isOccupied(s,occupied,duration)
                    const isSel = s===slot
                    return (
                      <button key={s} type="button" disabled={occ}
                        onClick={()=>{setSlot(s);setStep('form')}}
                        style={{padding:'16px 20px',borderRadius:14,textAlign:'left',
                          border:`2px solid ${isSel?'var(--signal)':occ?'var(--ink-7)':'var(--ink-6)'}`,
                          background:isSel?'var(--signal)':occ?'var(--paper)':'#fff',
                          cursor:occ?'not-allowed':'pointer',transition:'all 0.1s',
                          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontFamily:'var(--f-mono)',fontSize:14,fontWeight:400,
                          color:isSel?'#fff':occ?'var(--ink-6)':'var(--ink)',
                          textDecoration:occ?'line-through':'none'}}>
                          {fmtTime(s)}
                        </span>
                        {!occ&&<span style={{fontFamily:'var(--f-mono)',fontSize:12,
                          color:isSel?'rgba(255,255,255,0.7)':'var(--ink-5)'}}>
                          {duration} min
                        </span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  if ((step==='form')&&date&&slot) return (
    <div style={page}>
      <TopBar />
      <div style={wrap}>
        <div style={{paddingTop:24,marginBottom:24}}>
          <button type="button" onClick={()=>setStep('slots')}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'var(--signal)',fontFamily:'var(--f-sans)',padding:0,display:'flex',alignItems:'center',gap:4,marginBottom:20}}>
            ‹ Cambiar horario
          </button>
          {/* Resumen */}
          <div style={{background:'var(--signal-soft)',borderRadius:16,padding:'18px 20px',marginBottom:28}}>
            <div className="fk-eyebrow" style={{marginBottom:8,color:'var(--signal)'}}>Tu cita</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="fk-serif" style={{fontSize:16,fontWeight:300,fontStyle:'italic',color:'var(--ink-2)'}}>
                  {prac?.display_name}
                </div>
                <div style={{fontSize:13,color:'var(--ink-3)',marginTop:2}}>{fmtDateShort(date)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--f-mono)',fontSize:24,fontWeight:700,color:'var(--signal)'}}>{fmtTime(slot)}</div>
                <div style={{fontFamily:'var(--f-mono)',fontSize:12,color:'var(--ink-4)',marginTop:1}}>{duration} min</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
            {[
              {label:'Nombre completo *',type:'text', val:name, set:setName, ph:'Tu nombre'},
              {label:'Email *',           type:'email',val:email,set:setEmail,ph:'tu@email.com'},
            ].map(({label,type,val,set,ph})=>(
              <div key={label}>
                <label style={{fontFamily:'var(--f-mono)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'var(--ink-4)',display:'block',marginBottom:6}}>{label}</label>
                <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} required style={input} />
              </div>
            ))}
            <div>
              <label style={{fontFamily:'var(--f-mono)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'var(--ink-4)',display:'block',marginBottom:6}}>Motivo de consulta</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Cuéntanos brevemente el motivo de tu visita…" rows={3}
                style={{...input,resize:'vertical'}} />
            </div>

            {formErr&&<div style={{background:'var(--signal-soft)',color:'#a33a0f',borderRadius:10,padding:'12px 16px',fontSize:13}}>{formErr}</div>}

            <button type="submit" disabled={submitting||!name.trim()||!email.trim()}
              style={{padding:'18px',borderRadius:999,background:'var(--signal)',color:'#fff',border:'none',
                fontSize:16,fontFamily:'var(--f-sans)',fontWeight:700,cursor:submitting?'default':'pointer',
                opacity:submitting||!name.trim()||!email.trim()?0.5:1,transition:'opacity 0.1s',marginTop:8}}>
              {submitting?'Confirmando…':'Confirmar cita →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return null
}
