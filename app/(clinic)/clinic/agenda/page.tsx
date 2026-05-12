'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { Btn } from '@/components/ui/Btn'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from '@/components/clinic/Ic'
import { NewAppointmentModal } from '@/components/clinic/NewAppointmentModal'
import { AppointmentBlock } from '@/components/clinic/AppointmentBlock'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadAppointmentsForWeek,
  createAppointment,
  updateAppointmentStatus,
  type PractitionerRecord,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/clinic/queries'

const ROW_H     = 64
const DAYS_ES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getWeekStart(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  return d.toISOString().split('T')[0]
}

function getDays(weekStart: string): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return d
  })
}

function isoDate(d: Date): string { return d.toISOString().split('T')[0] }
function todayISO(): string       { return new Date().toISOString().split('T')[0] }

function formatWeekRange(weekStart: string): string {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekStart + 'T00:00:00')
  e.setDate(e.getDate() + 6)
  return `${s.getDate()} – ${e.getDate()} ${MONTHS_ES[e.getMonth()]} ${e.getFullYear()}`
}

function apptTop(appt: Appointment, startHour: number): number {
  const d = new Date(appt.starts_at)
  return Math.max(0, ((d.getHours() - startHour) * 60 + d.getMinutes()) / 60 * ROW_H)
}

function apptHeight(appt: Appointment): number {
  return Math.max(22, (appt.duration_minutes / 60) * ROW_H - 4)
}

export default function AgendaPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [weekOffset, setWeekOffset]     = useState(0)
  const [newApptOpen, setNewApptOpen]   = useState(false)
  const [startHour, setStartHour]       = useState(9)
  const [endHour, setEndHour]           = useState(17)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sh = localStorage.getItem('agenda_start_hour')
    const eh = localStorage.getItem('agenda_end_hour')
    if (sh) setStartHour(Number(sh))
    if (eh) setEndHour(Number(eh))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false)
    }
    if (settingsOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [settingsOpen])

  useEffect(() => {
    if (!user) return
    loadPractitionerByUser(supabase, user.id).then(setPractitioner)
  }, [user, supabase])

  const weekStart = getWeekStart(weekOffset)
  const days      = getDays(weekStart)
  const today     = todayISO()
  const hours     = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const totalH    = hours.length * ROW_H

  const now    = new Date()
  const nowTop = ((now.getHours() - startHour) * 60 + now.getMinutes()) / 60 * ROW_H
  const showNow = nowTop >= 0 && nowTop <= totalH

  const fetchAppts = useCallback(async () => {
    if (!practitioner) return
    setLoading(true)
    const data = await loadAppointmentsForWeek(supabase, practitioner.id, weekStart)
    setAppointments(data)
    setLoading(false)
  }, [practitioner, supabase, weekStart])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await updateAppointmentStatus(supabase, id, status)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleCreate(payload: {
    practitioner_id: string; patient_name: string; patient_email?: string
    starts_at: string; duration_minutes: number; notes?: string
  }) {
    const { error } = await createAppointment(supabase, payload)
    if (!error) { setNewApptOpen(false); await fetchAppts() }
    return { error }
  }

  function saveHours(sh: number, eh: number) {
    localStorage.setItem('agenda_start_hour', String(sh))
    localStorage.setItem('agenda_end_hour', String(eh))
    setStartHour(sh); setEndHour(eh)
  }

  const apptsByDay: Record<string, Appointment[]> = {}
  for (const day of days) apptsByDay[isoDate(day)] = []
  for (const appt of appointments) {
    const key = appt.starts_at.slice(0, 10)
    if (apptsByDay[key]) apptsByDay[key].push(appt)
  }

  const spinner = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:400, gap:16 }}>
      <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
      <span className="fk-mono" style={{ fontSize:11, color:'var(--ink-4)', letterSpacing:'0.14em', textTransform:'uppercase' }}>Cargando agenda…</span>
    </div>
  )

  if (userLoading) return spinner

  const navBtn = (onClick: () => void, children: React.ReactNode) => (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'1px solid var(--ink-7)', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', color:'var(--ink-3)', fontFamily:'var(--f-sans)' }}>
      {children}
    </button>
  )

  return (
    <div style={{ background:'#fff', minHeight:'100vh' }}>
      <ClinicTopbar
        sub="Agenda"
        title={<><span style={{ fontStyle:'italic', fontWeight:300 }}>Agenda </span>de consultas</>}
        right={<>
          {practitioner && (
            <Link href={`/agendar/${practitioner.id}`} target="_blank"
              style={{ fontSize:12, color:'var(--signal)', fontFamily:'var(--f-sans)', textDecoration:'none' }}>
              Compartir agenda →
            </Link>
          )}
          <Btn variant="primary" size="sm" onClick={() => setNewApptOpen(true)}>
            <Ic.plus width={12} height={12} /> Nueva cita
          </Btn>
        </>}
      />

      {/* Week nav */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 32px', borderBottom:'1px solid var(--ink-7)' }}>
        {navBtn(() => setWeekOffset(o => o-1), <><Ic.chevL width={12} height={12} /> Anterior</>)}
        <span className="fk-serif" style={{ flex:1, textAlign:'center', fontSize:17, fontWeight:300 }}>
          {formatWeekRange(weekStart)}
        </span>
        {navBtn(() => setWeekOffset(o => o+1), <>Siguiente <Ic.chevR width={12} height={12} /></>)}
        {weekOffset !== 0 && navBtn(() => setWeekOffset(0), 'Hoy')}
        <span className="fk-mono" style={{ fontSize:11, color:'var(--ink-5)', minWidth:52, textAlign:'right' }}>
          {appointments.length > 0 ? `${appointments.length} cita${appointments.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {loading ? spinner : (
        <div style={{ overflowX:'auto', padding:'24px 32px 40px' }}>
          <div style={{ minWidth:860, border:'1px solid var(--ink-7)', borderRadius:14, overflow:'hidden' }}>

            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'64px repeat(7, 1fr)', borderBottom:'2px solid var(--ink-7)', background:'var(--paper)' }}>
              <div style={{ borderRight:'1px solid var(--ink-7)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }} ref={settingsRef}>
                <button onClick={() => setSettingsOpen(s => !s)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', borderRadius:6, color: settingsOpen ? 'var(--ink)' : 'var(--ink-5)' }}>
                  <Ic.settings width={14} height={14} />
                </button>
                {settingsOpen && (
                  <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, background:'#fff', border:'1px solid var(--ink-7)', borderRadius:10, padding:'14px 16px', zIndex:60, minWidth:200, boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}>
                    <div className="fk-eyebrow" style={{ marginBottom:12 }}>Horario visible</div>
                    {([
                      { label:'Inicio', value:startHour, opts:[7,8,9,10,11,12], fn:(v:number)=>saveHours(v,endHour) },
                      { label:'Fin',    value:endHour,   opts:[14,15,16,17,18,19,20,21], fn:(v:number)=>saveHours(startHour,v) },
                    ] as const).map(({ label, value, opts, fn }) => (
                      <label key={label} style={{ fontFamily:'var(--f-sans)', fontSize:12, color:'var(--ink-3)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:8 }}>
                        {label}
                        <select value={value} onChange={e => fn(Number(e.target.value))}
                          style={{ border:'1px solid var(--ink-6)', borderRadius:6, padding:'4px 8px', fontSize:12, fontFamily:'var(--f-mono)', background:'var(--paper)', color:'var(--ink)', outline:'none', cursor:'pointer' }}>
                          {opts.map((h: number) => <option key={h} value={h}>{h}:00</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {days.map((day, i) => {
                const key = isoDate(day); const isToday = key === today
                const count = apptsByDay[key]?.length ?? 0
                return (
                  <div key={key} style={{ padding:'10px 14px', borderLeft:'1px solid var(--ink-7)', background: isToday ? 'rgba(255,90,31,0.05)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div className="fk-eyebrow" style={{ color: isToday ? 'var(--signal)' : 'var(--ink-5)', marginBottom:2 }}>{DAYS_ES[i]}</div>
                      <div style={{ fontSize:22, fontFamily:'var(--f-serif)', fontWeight:300, color: isToday ? 'var(--signal)' : 'var(--ink)', lineHeight:1 }}>{day.getDate()}</div>
                    </div>
                    {count > 0 && (
                      <span style={{ width:20, height:20, borderRadius:999, display:'flex', alignItems:'center', justifyContent:'center', background: isToday ? 'var(--signal)' : 'var(--ink-5)', color:'#fff', fontSize:10, fontFamily:'var(--f-mono)', fontWeight:600 }}>{count}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Body */}
            <div style={{ display:'flex', overflowY:'auto', maxHeight:'calc(100vh - 300px)' }}>
              {/* Time labels */}
              <div style={{ width:64, flexShrink:0, borderRight:'1px solid var(--ink-7)' }}>
                {hours.map(h => (
                  <div key={h} style={{ height:ROW_H, borderBottom:'1px solid var(--ink-7)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:7 }}>
                    <span className="fk-mono" style={{ fontSize:10, color:'var(--ink-5)' }}>{h}:00</span>
                  </div>
                ))}
              </div>
              {/* Day columns */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', flex:1 }}>
                {days.map((day) => {
                  const key = isoDate(day); const isToday = key === today
                  const visible = (apptsByDay[key] ?? []).filter(a => {
                    const h = new Date(a.starts_at).getHours()
                    return h >= startHour && h < endHour
                  })
                  return (
                    <div key={key} style={{ position:'relative', height:totalH, borderLeft:'1px solid var(--ink-7)', background: isToday ? 'rgba(255,90,31,0.018)' : '#fff' }}>
                      {hours.map((_, hi) => (
                        <div key={hi} style={{ position:'absolute', top:hi*ROW_H, left:0, right:0, height:1, background:'var(--ink-7)' }} />
                      ))}
                      {isToday && showNow && (
                        <div style={{ position:'absolute', top:nowTop, left:0, right:0, height:2, background:'var(--signal)', zIndex:3, opacity:0.8 }}>
                          <div style={{ position:'absolute', left:-4, top:-3, width:8, height:8, borderRadius:999, background:'var(--signal)' }} />
                        </div>
                      )}
                      {visible.map(appt => (
                        <AppointmentBlock key={appt.id} appt={appt}
                          top={apptTop(appt, startHour)} height={apptHeight(appt)}
                          onStatusChange={handleStatusChange} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {newApptOpen && practitioner && (
        <NewAppointmentModal
          practitionerId={practitioner.id}
          onClose={() => setNewApptOpen(false)}
          onCreated={() => { setNewApptOpen(false); fetchAppts() }}
          createAppointment={handleCreate}
        />
      )}
    </div>
  )
}
