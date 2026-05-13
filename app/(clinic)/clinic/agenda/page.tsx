'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { Btn } from '@/components/ui/Btn'
import { Ic } from '@/components/clinic/Ic'
import { NewAppointmentModal } from '@/components/clinic/NewAppointmentModal'
import { AppointmentBlock } from '@/components/clinic/AppointmentBlock'
import { AppointmentDetailModal } from '@/components/clinic/AppointmentDetailModal'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadAppointmentsForWeek,
  createAppointment,
  updateAppointmentStatus,
  updateAppointmentNotes,
  type PractitionerRecord,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/clinic/queries'
import { MONTHS_SHORT, todayISO, scheduleHourRange } from '@/lib/clinic/calendar-utils'
import { getNowPartsInTimezone, getHourMinuteInTimezone, formatDateISOInTimezone, shiftDateISO } from '@/lib/utils'
import { LoadingState } from '@/components/ui/LoadingState'
import type { RescheduleReason } from '@/lib/clinic/appointment-meta'

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Zoom levels: row height per hour + whether to show 30-min sub-rows
const ZOOM_LEVELS = [
  { rowH: 80,  halfHour: false }, // default (1×)
  { rowH: 120, halfHour: true  }, // zoom in 1 (2×)
  { rowH: 160, halfHour: true  }, // zoom in máximo (3×)
] as const
type ZoomIdx = 0 | 1 | 2

function getWeekStart(offset: number): string {
  // Inicio de semana (lunes) en CDMX, independiente de la TZ del navegador.
  const { dayOfWeek, date: today } = getNowPartsInTimezone()
  const daysBack = (dayOfWeek + 6) % 7  // 0 = lunes
  return shiftDateISO(today, -daysBack + offset * 7)
}

function getDays(weekStart: string): Date[] {
  // Cada día se ancla a mediodía UTC para que `getDate()` con TZ devuelva el día correcto.
  const [y, m, d] = weekStart.split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i, 12)))
}

function isoDate(d: Date): string { return formatDateISOInTimezone(d) }

function formatWeekRange(weekStart: string): string {
  const sd = Number(weekStart.split('-')[2])
  const [ey, em, ed] = shiftDateISO(weekStart, 6).split('-').map(Number)
  return `${sd} – ${ed} ${MONTHS_SHORT[em - 1]} ${ey}`
}

function apptTop(appt: Appointment, startHour: number, rowH: number): number {
  const { hour, minute } = getHourMinuteInTimezone(appt.starts_at)
  return Math.max(0, ((hour - startHour) * 60 + minute) / 60 * rowH)
}

function apptHeight(appt: Appointment, rowH: number): number {
  return Math.max(28, (appt.duration_minutes / 60) * rowH - 4)
}

export default function AgendaPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [busyBlocks,   setBusyBlocks]   = useState<Array<{ start: string; end: string }>>([])
  const [loading, setLoading]           = useState(true)
  const [weekOffset, setWeekOffset]     = useState(0)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [detailAppt, setDetailAppt]   = useState<Appointment | null>(null)
  const [startHour, setStartHour]       = useState(9)
  const [endHour, setEndHour]           = useState(17)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [zoomIdx, setZoomIdx]           = useState<ZoomIdx>(0)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const zi = localStorage.getItem('agenda_zoom')
    if (zi) setZoomIdx(Number(zi) as ZoomIdx)
  }, [])

  // Sincroniza el rango visible de la grilla con el schedule del practitioner.
  // Si la nutrióloga forzó manualmente un rango distinto (override), respeta eso.
  useEffect(() => {
    if (!practitioner) return
    const overrideRaw = localStorage.getItem('agenda_hours_override')
    const override = overrideRaw ? JSON.parse(overrideRaw) as { start: number; end: number } : null
    if (override) {
      setStartHour(override.start)
      setEndHour(override.end)
    } else {
      const { start, end } = scheduleHourRange(practitioner.schedule)
      setStartHour(start)
      setEndHour(end)
    }
  }, [practitioner])

  function changeZoom(delta: 1 | -1) {
    setZoomIdx(prev => {
      const next = Math.max(0, Math.min(2, prev + delta)) as ZoomIdx
      localStorage.setItem('agenda_zoom', String(next))
      return next
    })
  }

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

  const { rowH, halfHour } = ZOOM_LEVELS[zoomIdx]

  const weekStart = getWeekStart(weekOffset)
  const days      = getDays(weekStart)
  const today     = todayISO()
  const hours     = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const totalH    = hours.length * rowH

  const { hour: nowHour, minute: nowMinute } = getNowPartsInTimezone()
  const nowTop = ((nowHour - startHour) * 60 + nowMinute) / 60 * rowH
  const showNow = nowTop >= 0 && nowTop <= totalH

  const fetchAppts = useCallback(async () => {
    if (!practitioner) return
    setLoading(true)
    const weekEnd = shiftDateISO(weekStart, 6)
    const [data, busyRes] = await Promise.all([
      loadAppointmentsForWeek(supabase, practitioner.id, weekStart),
      fetch(`/api/calendar-busy?practitionerId=${practitioner.id}&from=${weekStart}&to=${weekEnd}`)
        .then(r => r.json())
        .catch(() => ({ busy: [] })),
    ])
    setAppointments(data)
    setBusyBlocks(busyRes.busy ?? [])
    setLoading(false)
  }, [practitioner, supabase, weekStart])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await updateAppointmentStatus(supabase, id, status)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleNotesChange(id: string, notes: string) {
    await updateAppointmentNotes(supabase, id, notes)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, notes: notes.trim() || null } : a))
  }

  async function handleCreate(payload: {
    practitioner_id: string; patient_name: string; patient_email?: string
    patient_id?: string; starts_at: string; duration_minutes: number; notes?: string
  }) {
    const { error } = await createAppointment(supabase, payload)
    return { error }
  }

  async function handleRescheduleConfirm(reason: RescheduleReason, customMessage?: string) {
    if (!detailAppt || !practitioner) return
    const newStatus = reason === 'no_show' ? 'no_show' : 'rescheduling'
    setAppointments(prev => prev.map(a => a.id === detailAppt.id ? { ...a, status: newStatus } : a))
    await fetch('/api/reschedule-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId:    detailAppt.id,
        practitionerId:   practitioner.id,
        practitionerName: practitioner.display_name,
        patientName:      detailAppt.patient_name,
        patientEmail:     detailAppt.patient_email ?? '',
        originalDate:     detailAppt.starts_at,
        reason,
        customMessage,
      }),
    })
  }

  function saveHours(sh: number, eh: number) {
    localStorage.setItem('agenda_hours_override', JSON.stringify({ start: sh, end: eh }))
    // Limpieza de keys legacy
    localStorage.removeItem('agenda_start_hour')
    localStorage.removeItem('agenda_end_hour')
    setStartHour(sh); setEndHour(eh)
  }

  function resetHoursToSchedule() {
    localStorage.removeItem('agenda_hours_override')
    if (practitioner) {
      const { start, end } = scheduleHourRange(practitioner.schedule)
      setStartHour(start); setEndHour(end)
    }
  }

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const day of days) map[isoDate(day)] = []
    for (const appt of appointments) {
      const key = appt.starts_at.slice(0, 10)
      if (map[key]) map[key].push(appt)
    }
    return map
  }, [days, appointments])

  const layoutsByDay = useMemo(() => {
    const result: Record<string, Array<{ appt: Appointment; col: number; totalCols: number }>> = {}
    for (const [key, appts] of Object.entries(apptsByDay)) {
      if (appts.length === 0) { result[key] = []; continue }
      const sorted = [...appts].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      const colEnds: number[] = []
      const assigned: Array<{ appt: Appointment; col: number; startMs: number; endMs: number }> = []
      for (const appt of sorted) {
        const startMs = new Date(appt.starts_at).getTime()
        const endMs   = startMs + appt.duration_minutes * 60_000
        let col = colEnds.findIndex(t => t <= startMs)
        if (col === -1) { col = colEnds.length; colEnds.push(0) }
        colEnds[col] = endMs
        assigned.push({ appt, col, startMs, endMs })
      }
      result[key] = assigned.map(item => {
        const overlapping = assigned.filter(o => item.startMs < o.endMs && item.endMs > o.startMs)
        return { appt: item.appt, col: item.col, totalCols: Math.max(...overlapping.map(o => o.col)) + 1 }
      })
    }
    return result
  }, [apptsByDay])

  const spinner = <LoadingState label="Cargando agenda" minHeight={400} />

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
          <Btn variant="signal" size="md" onClick={() => setNewApptOpen(true)}>
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
        {weekOffset !== 0 && navBtn(() => setWeekOffset(0), 'Hoy')}
        {navBtn(() => setWeekOffset(o => o+1), <>Siguiente <Ic.chevR width={12} height={12} /></>)}
        <span className="fk-mono" style={{ fontSize:11, color:'var(--ink-5)', minWidth:52, textAlign:'right' }}>
          {appointments.length > 0 ? `${appointments.length} cita${appointments.length !== 1 ? 's' : ''}` : ''}
        </span>

        {/* Zoom controls */}
        <div style={{ display:'flex', alignItems:'center', gap:0, border:'1px solid var(--ink-7)', borderRadius:8, overflow:'hidden', flexShrink:0 }}>
          <button onClick={() => changeZoom(-1)} disabled={zoomIdx === 0}
            style={{ background:'none', border:'none', borderRight:'1px solid var(--ink-7)', padding:'6px 10px', fontSize:14, cursor: zoomIdx === 0 ? 'default' : 'pointer', color: zoomIdx === 0 ? 'var(--ink-6)' : 'var(--ink-3)', fontFamily:'var(--f-mono)', lineHeight:1 }}>
            −
          </button>
          <span style={{ padding:'0 8px', fontSize:10, fontFamily:'var(--f-mono)', color:'var(--ink-4)', letterSpacing:'0.05em', userSelect:'none' }}>
            {['1×','2×','3×'][zoomIdx]}
          </span>
          <button onClick={() => changeZoom(1)} disabled={zoomIdx === 2}
            style={{ background:'none', border:'none', borderLeft:'1px solid var(--ink-7)', padding:'6px 10px', fontSize:14, cursor: zoomIdx === 2 ? 'default' : 'pointer', color: zoomIdx === 2 ? 'var(--ink-6)' : 'var(--ink-3)', fontFamily:'var(--f-mono)', lineHeight:1 }}>
            +
          </button>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'8px 32px', borderBottom:'1px solid var(--ink-7)', flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-5)', letterSpacing:'0.08em', textTransform:'uppercase', flexShrink:0 }}>Guía</span>
        {([
          { bg:'#f1ffed', border:'rgba(74,124,58,0.55)',  label:'Agendada'    },
          { bg:'#fbefef', border:'rgba(200,30,30,0.3)',   label:'Cancelada'   },
          { bg:'#f6e0e0', border:'rgba(180,0,0,0.75)',    label:'No asistió'  },
          { bg:'#fff3e0', border:'#e65100',               label:'Reagendando' },
          { bg:'var(--paper)', border:'var(--ink-6)',     label:'Cal. externo' },
        ] as const).map(({ bg, border, label }) => (
          <div key={label} style={{ background:bg, borderLeft:`2px solid ${border}`, borderRadius:3, padding:'0 5px', lineHeight:'16px' }}>
            <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.04em', whiteSpace:'nowrap', fontWeight:700 }}>{label}</span>
          </div>
        ))}
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
                    <button
                      onClick={resetHoursToSchedule}
                      style={{ marginTop:6, width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--ink-7)', background:'#fff', fontSize:11, fontFamily:'var(--f-sans)', color:'var(--ink-3)', cursor:'pointer' }}
                    >
                      Usar horario del consultorio
                    </button>
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
                  <div key={h} style={{ height:rowH, borderBottom:'1px solid var(--ink-7)', position:'relative' }}>
                    <span className="fk-mono" style={{ position:'absolute', top:7, left:0, right:0, textAlign:'center', fontSize:10, color:'var(--ink-5)' }}>{h}:00</span>
                    {halfHour && (
                      <span className="fk-mono" style={{ position:'absolute', top: rowH / 2 + 4, left:0, right:0, textAlign:'center', fontSize:9, color:'var(--ink-6)' }}>{h}:30</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Day columns */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', flex:1 }}>
                {days.map((day) => {
                  const key = isoDate(day); const isToday = key === today
                  const layout = (layoutsByDay[key] ?? []).filter(({ appt: a }) => {
                    const { hour: h } = getHourMinuteInTimezone(a.starts_at)
                    return h >= startHour && h < endHour
                  })
                  // Bloques del calendario externo que caen en este día
                  const dayBusy = busyBlocks.filter(b => b.start.startsWith(key))
                  return (
                    <div key={key} style={{ position:'relative', height:totalH, borderLeft:'1px solid var(--ink-7)', background: isToday ? 'rgba(255,90,31,0.018)' : '#fff' }}>
                      {/* Hour lines */}
                      {hours.map((_, hi) => (
                        <div key={hi} style={{ position:'absolute', top:hi*rowH, left:0, right:0, height:1, background:'var(--ink-7)' }} />
                      ))}
                      {/* Half-hour lines */}
                      {halfHour && hours.map((_, hi) => (
                        <div key={`h-${hi}`} style={{ position:'absolute', top:hi*rowH + rowH/2, left:0, right:0, height:1, background:'var(--ink-7)', opacity:0.35 }} />
                      ))}
                      {/* Current time */}
                      {isToday && showNow && (
                        <div style={{ position:'absolute', top:nowTop, left:0, right:0, height:2, background:'var(--signal)', zIndex:3, opacity:0.8 }}>
                          <div style={{ position:'absolute', left:-4, top:-3, width:8, height:8, borderRadius:999, background:'var(--signal)' }} />
                        </div>
                      )}
                      {/* Bloques externos "Ocupado" */}
                      {dayBusy.map((block, bi) => {
                        const { hour: bh, minute: bm } = getHourMinuteInTimezone(block.start)
                        const endMs  = new Date(block.end).getTime()
                        const startMs = new Date(block.start).getTime()
                        const durMin = Math.round((endMs - startMs) / 60_000)
                        const top    = Math.max(0, ((bh - startHour) * 60 + bm) / 60 * rowH)
                        const height = Math.max(16, (durMin / 60) * rowH - 2)
                        if (bh < startHour || bh >= endHour) return null
                        return (
                          <div key={`busy-${bi}`} style={{
                            position: 'absolute',
                            top, height,
                            left: 2, right: 2,
                            background: 'repeating-linear-gradient(45deg, var(--ink-7) 0, var(--ink-7) 1px, transparent 0, transparent 50%) 0 0 / 6px 6px',
                            backgroundColor: 'var(--paper)',
                            border: '1px solid var(--ink-6)',
                            borderRadius: 4,
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 6,
                            overflow: 'hidden',
                          }}>
                            <span style={{
                              fontFamily: 'var(--f-mono)', fontSize: 9,
                              color: 'var(--ink-4)', letterSpacing: '0.06em',
                              textTransform: 'uppercase', whiteSpace: 'nowrap',
                              userSelect: 'none',
                            }}>
                              Ocupado
                            </span>
                          </div>
                        )
                      })}
                      {layout.map(({ appt, col, totalCols }) => (
                        <AppointmentBlock key={appt.id} appt={appt}
                          top={apptTop(appt, startHour, rowH)} height={apptHeight(appt, rowH)}
                          col={col} totalCols={totalCols}
                          onOpen={setDetailAppt} />
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
          defaultDuration={practitioner.default_duration}
          schedule={practitioner.schedule}
          onClose={() => setNewApptOpen(false)}
          onCreated={() => { setNewApptOpen(false); fetchAppts() }}
          createAppointment={handleCreate}
        />
      )}

      {detailAppt && (
        <AppointmentDetailModal
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
          onRescheduleConfirm={handleRescheduleConfirm}
        />
      )}
    </div>
  )
}
