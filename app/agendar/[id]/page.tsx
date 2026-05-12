'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PulseLine } from '@/components/ui/PulseLine'
import { AddToCalendar } from '@/components/clinic/AddToCalendar'
import { FkWord } from '@/components/ui/Fk'

type PractitionerPublic = { id: string; display_name: string; specialty: string | null; clinic_name: string | null }
type OccupiedSlot = { starts_at: string; duration_minutes: number }

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MONTHS_CAP = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
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
function fmtDateLong(iso: string) {
  const d = new Date(iso+'T00:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
}

function generateSlots(dateISO: string, durationMin: number): string[] {
  const slots: string[] = []
  const END_MIN = 19 * 60  // 19:00
  for (let m = 9*60; m + durationMin <= END_MIN; m += durationMin) {
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
  const rescheduleId   = typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('reschedule')??undefined : undefined

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const [prac, setPrac]             = useState<PractitionerPublic|null>(null)
  const [loading, setLoading]       = useState(true)
  const [duration, setDuration]     = useState(60)
  const [calY, setCalY]             = useState(()=>new Date().getFullYear())
  const [calM, setCalM]             = useState(()=>new Date().getMonth())
  const [date, setDate]             = useState<string|null>(null)
  const [occupied, setOccupied]     = useState<OccupiedSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slot, setSlot]             = useState<string|null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr]       = useState<string|null>(null)
  const [confirmed, setConfirmed]   = useState<{starts_at:string;duration_minutes:number;practitioner_name:string}|null>(null)

  useEffect(() => {
    supabase.from('practitioners').select('id,display_name,specialty,clinic_name').eq('id',practitionerId).eq('active',true).maybeSingle()
      .then(({data}) => { setPrac(data as PractitionerPublic|null); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitionerId])

  async function selectDate(d: string) {
    setDate(d); setSlot(null); setShowForm(false); setSlotsLoading(true)
    try { const r = await fetch(`/api/available-slots/${practitionerId}/${d}`); setOccupied(Array.isArray(await r.json()) ? await r.json() : []) }
    catch { setOccupied([]) }
    // fetch twice issue workaround
    const r = await fetch(`/api/available-slots/${practitionerId}/${d}`)
    const data = await r.json(); setOccupied(Array.isArray(data)?data:[])
    setSlotsLoading(false)
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
    setConfirmed({starts_at:new Date(slot).toISOString(),duration_minutes:duration,practitioner_name:prac?.display_name??''})
  }

  const today = todayISO()

  // ── Loading ──
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff'}}>
      <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
    </div>
  )

  // ── Confirmed ──
  if (confirmed) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'var(--f-sans)'}}>
      <div style={{maxWidth:480,margin:'0 auto',padding:'48px 24px'}}>
        <FkWord size={22} />
        <div style={{marginTop:40,textAlign:'center'}}>
          <div style={{width:56,height:56,borderRadius:999,background:'var(--leaf-soft)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>✓</div>
          <h1 className="fk-serif" style={{fontSize:32,fontWeight:300,fontStyle:'italic',margin:'0 0 8px'}}>¡Cita confirmada!</h1>
          <p style={{color:'var(--ink-4)',fontSize:14,margin:'0 0 32px'}}>Nos vemos pronto.</p>
        </div>
        <div style={{background:'var(--paper)',borderRadius:16,padding:'24px 28px',marginBottom:24}}>
          <div className="fk-eyebrow" style={{marginBottom:16}}>Resumen</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {label:'Nutrióloga', val: <span className="fk-serif" style={{fontSize:16,fontWeight:300}}>{confirmed.practitioner_name}</span>},
              {label:'Fecha', val: fmtDateLong(confirmed.starts_at.split('T')[0])},
              {label:'Hora',  val: <span className="fk-mono" style={{fontSize:18,color:'var(--signal)'}}>{fmtTime(confirmed.starts_at)}</span>},
              {label:'Duración', val: `${confirmed.duration_minutes} min`},
            ].map(({label,val}) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--ink-7)',paddingBottom:10}}>
                <span style={{fontSize:12,color:'var(--ink-4)'}}>{label}</span>
                <span style={{fontSize:14,fontWeight:500}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <AddToCalendar title={`Consulta con ${confirmed.practitioner_name}`} startISO={confirmed.starts_at}
          durationMinutes={confirmed.duration_minutes} description={`Consulta nutricional con ${confirmed.practitioner_name}`} />
        {email && <p style={{textAlign:'center',fontSize:12,color:'var(--ink-5)',marginTop:16}}>Confirmación enviada a {email}</p>}
      </div>
    </div>
  )

  // Días del calendario
  const cells: (number|null)[] = [...Array(firstDayOfMonth(calY,calM)).fill(null), ...Array.from({length:daysInMonth(calY,calM)},(_,i)=>i+1)]
  const slots = date ? generateSlots(date, duration) : []

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'var(--f-sans)'}}>
      {/* Top bar */}
      <div style={{borderBottom:'1px solid var(--ink-7)',padding:'16px 32px'}}>
        <FkWord size={20} />
      </div>

      {/* Reagendar banner */}
      {rescheduleId && (
        <div style={{background:'#fff3e0',borderBottom:'1px solid #e65100',padding:'10px 32px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:14}}>📅</span>
          <span style={{fontSize:13,color:'#e65100',fontWeight:500}}>Tu nutrióloga solicita reagendar tu consulta — elige un nuevo horario.</span>
        </div>
      )}

      {/* Layout principal */}
      <div style={{display:'flex',minHeight:'calc(100vh - 57px)',flexWrap:'wrap'}}>

        {/* ─ Panel izquierdo ─────────────────────────────────── */}
        <div style={{width:260,flexShrink:0,borderRight:'1px solid var(--ink-7)',padding:'36px 28px',background:'var(--paper)'}}>
          {/* Avatar inicial */}
          <div style={{width:52,height:52,borderRadius:999,background:'var(--signal-soft)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,fontFamily:'var(--f-serif)',fontStyle:'italic',fontSize:22,color:'var(--signal)'}}>
            {prac?.display_name?.[0]??'?'}
          </div>
          <div className="fk-eyebrow" style={{marginBottom:4}}>Nutrióloga</div>
          <div className="fk-serif" style={{fontSize:22,fontWeight:300,fontStyle:'italic',lineHeight:1.2,marginBottom:4}}>{prac?.display_name}</div>
          {prac?.specialty && <div style={{fontSize:12,color:'var(--ink-4)',marginBottom:2}}>{prac.specialty}</div>}
          {prac?.clinic_name && <div style={{fontSize:11,color:'var(--ink-5)'}}>{prac.clinic_name}</div>}

          <div style={{borderTop:'1px solid var(--ink-7)',marginTop:24,paddingTop:24}}>
            <div className="fk-eyebrow" style={{marginBottom:12}}>Duración</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => { setDuration(d); setSlot(null); setShowForm(false) }}
                  style={{display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',padding:'6px 0',textAlign:'left'}}>
                  <div style={{width:16,height:16,borderRadius:999,border:`2px solid ${duration===d?'var(--signal)':'var(--ink-5)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {duration===d && <div style={{width:7,height:7,borderRadius:999,background:'var(--signal)'}} />}
                  </div>
                  <span style={{fontFamily:'var(--f-sans)',fontSize:13,color:duration===d?'var(--ink)':'var(--ink-4)',fontWeight:duration===d?500:400}}>{d} min</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─ Calendario ──────────────────────────────────────── */}
        <div style={{flex:1,minWidth:300,padding:'36px 32px',borderRight: date?'1px solid var(--ink-7)':'none'}}>
          <div className="fk-eyebrow" style={{marginBottom:20}}>Selecciona una fecha</div>

          {/* Nav de mes */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <button onClick={()=>{if(calM===0){setCalY(y=>y-1);setCalM(11)}else setCalM(m=>m-1)}}
              style={{width:32,height:32,borderRadius:8,border:'1px solid var(--ink-7)',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'var(--ink-3)'}}>‹</button>
            <span className="fk-serif" style={{fontSize:18,fontWeight:300,flex:1}}>{MONTHS_CAP[calM]} {calY}</span>
            <button onClick={()=>{if(calM===11){setCalY(y=>y+1);setCalM(0)}else setCalM(m=>m+1)}}
              style={{width:32,height:32,borderRadius:8,border:'1px solid var(--ink-7)',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'var(--ink-3)'}}>›</button>
          </div>

          {/* Encabezados */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:8}}>
            {WEEK_LABELS.map(l=><div key={l} className="fk-eyebrow" style={{textAlign:'center',fontSize:9}}>{l}</div>)}
          </div>

          {/* Días */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {cells.map((day,i)=>{
              if(!day) return <div key={`e${i}`}/>
              const d = isoDate(calY,calM,day)
              const isPast = d<today, isTday = d===today, isSel = d===date
              return (
                <button key={d} disabled={isPast} onClick={()=>selectDate(d)} style={{
                  padding:'9px 4px', borderRadius:999, border: isTday&&!isSel?'1px solid var(--signal)':'1px solid transparent',
                  background: isSel?'var(--signal)':'transparent',
                  color: isSel?'#fff':isPast?'var(--ink-6)':isTday?'var(--signal)':'var(--ink)',
                  fontSize:14, fontFamily:'var(--f-sans)', cursor:isPast?'default':'pointer',
                  fontWeight: isSel||isTday ? 600 : 400, transition:'all 0.1s',
                }}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* ─ Panel derecho: slots o form ─────────────────────── */}
        {date && (
          <div style={{width:280,flexShrink:0,padding:'36px 24px',overflowY:'auto',maxHeight:'calc(100vh - 57px)',position:'sticky',top:57}}>

            {!showForm ? (
              /* ── Slots ── */
              <>
                <div className="fk-eyebrow" style={{marginBottom:6}}>Horarios disponibles</div>
                <div className="fk-serif" style={{fontSize:16,fontWeight:300,fontStyle:'italic',marginBottom:20}}>{fmtDateLong(date)}</div>
                {slotsLoading ? (
                  <div style={{display:'flex',justifyContent:'center',paddingTop:32}}>
                    <PulseLine w={80} h={20} color="var(--signal)" strokeWidth={2} active />
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {slots.length===0 && <p style={{fontSize:13,color:'var(--ink-4)'}}>Sin horarios disponibles para este día.</p>}
                    {slots.map(s=>{
                      const occ = isOccupied(s,occupied,duration)
                      const isSel = s===slot
                      return (
                        <button key={s} disabled={occ} onClick={()=>{setSlot(s);setShowForm(true)}} style={{
                          padding:'12px 16px', borderRadius:10, border:`1.5px solid ${isSel?'var(--signal)':occ?'var(--ink-7)':'var(--ink-6)'}`,
                          background: isSel?'var(--signal)':occ?'var(--paper)':'#fff',
                          color: isSel?'#fff':occ?'var(--ink-6)':'var(--ink)',
                          fontFamily:'var(--f-mono)', fontSize:14, fontWeight:500, cursor:occ?'not-allowed':'pointer',
                          textDecoration:occ?'line-through':'none', transition:'all 0.1s',
                          textAlign:'left',
                        }}>
                          {fmtTime(s)}
                          {!occ && <span style={{float:'right',fontSize:11,opacity:0.5}}>{duration} min</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* ── Form ── */
              <>
                <button onClick={()=>{setShowForm(false);setSlot(null)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--signal)',fontFamily:'var(--f-sans)',padding:'0 0 16px',display:'flex',alignItems:'center',gap:4}}>
                  ‹ Cambiar horario
                </button>

                {/* Resumen seleccionado */}
                <div style={{background:'var(--signal-soft)',borderRadius:10,padding:'12px 14px',marginBottom:20}}>
                  <div style={{fontFamily:'var(--f-mono)',fontSize:12,color:'var(--signal)',fontWeight:600}}>{fmtTime(slot!)}</div>
                  <div style={{fontFamily:'var(--f-sans)',fontSize:12,color:'var(--ink-3)',marginTop:2}}>{fmtDateLong(date)} · {duration} min</div>
                </div>

                <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[
                    {label:'Nombre *', type:'text',  val:name,  set:setName,  ph:'Tu nombre completo'},
                    {label:'Email *',  type:'email', val:email, set:setEmail, ph:'tu@email.com'},
                  ].map(({label,type,val,set,ph})=>(
                    <div key={label}>
                      <label style={{fontFamily:'var(--f-mono)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'var(--ink-4)',display:'block',marginBottom:5}}>{label}</label>
                      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} required
                        style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',borderRadius:8,border:'1px solid var(--ink-6)',background:'var(--paper)',fontFamily:'var(--f-sans)',fontSize:13,color:'var(--ink)',outline:'none'}}/>
                    </div>
                  ))}
                  <div>
                    <label style={{fontFamily:'var(--f-mono)',fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'var(--ink-4)',display:'block',marginBottom:5}}>Motivo</label>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Cuéntanos brevemente…" rows={3}
                      style={{width:'100%',boxSizing:'border-box',padding:'9px 12px',borderRadius:8,border:'1px solid var(--ink-6)',background:'var(--paper)',fontFamily:'var(--f-sans)',fontSize:13,color:'var(--ink)',outline:'none',resize:'vertical'}}/>
                  </div>

                  {formErr && <div style={{background:'var(--signal-soft)',color:'#a33a0f',borderRadius:8,padding:'10px 12px',fontSize:12}}>{formErr}</div>}

                  <button type="submit" disabled={submitting||!name.trim()||!email.trim()}
                    style={{background:'var(--signal)',color:'#fff',border:'none',borderRadius:999,padding:'13px 20px',fontSize:14,fontFamily:'var(--f-sans)',fontWeight:600,cursor:submitting?'default':'pointer',opacity:submitting||!name.trim()||!email.trim()?0.5:1,transition:'opacity 0.1s'}}>
                    {submitting?'Confirmando…':'Confirmar cita →'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
