/** Shared calendar/slot utilities — used by booking page and NewAppointmentModal */

export const MONTHS_CAP = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
export const MONTHS_LONG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]
export const MONTHS_SHORT = [
  'ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic',
]
export const DAYS_LONG  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
export const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
export const WEEK_LABELS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

/** "13 may 2026" — date-only ISO ('YYYY-MM-DD') o Date. */
export function fmtShortDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input + 'T00:00:00') : input
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "13 may 2026 · 14:30" — ISO datetime o Date. */
export function fmtShortDateTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()} · ${h}:${m}`
}

/** "miércoles 13 de mayo de 2026" — para headers de modales y reportes. */
export function fmtLongDate(input: string | Date): string {
  const d = typeof input === 'string'
    ? (input.length === 10 ? new Date(input + 'T00:00:00') : new Date(input))
    : input
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`
}
export const DURATIONS   = [15, 30, 45, 60] as const
export type DurationMin  = typeof DURATIONS[number]

// ─── Schedule types ────────────────────────────────────────────────────────────

export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom'

/** Maps JS getDay() (0=Sun, 1=Mon…6=Sat) to DayKey */
const JS_DAY_TO_KEY: DayKey[] = ['dom','lun','mar','mie','jue','vie','sab']

export function dateToDayKey(date: Date): DayKey {
  return JS_DAY_TO_KEY[date.getDay()]
}

export type Break = { start: string; end: string }  // "HH:MM"

export type DaySchedule = {
  enabled: boolean
  start:   string    // "HH:MM"
  end:     string    // "HH:MM"
  breaks:  Break[]
}

export type WeekSchedule = Record<DayKey, DaySchedule>

export const DAY_LABELS: Record<DayKey, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
}

export const DAY_ORDER: DayKey[] = ['lun','mar','mie','jue','vie','sab','dom']

/**
 * Devuelve [horaInicio, horaFin] que cubre todos los días habilitados del schedule.
 * Inicio se redondea hacia abajo, fin hacia arriba. Útil para renderizar la grilla
 * de agenda con el rango visible mínimo necesario.
 */
export function scheduleHourRange(schedule: WeekSchedule): { start: number; end: number } {
  let minStart = 24
  let maxEnd = 0
  for (const key of DAY_ORDER) {
    const day = schedule[key]
    if (!day.enabled) continue
    const sH = Math.floor(timeToMin(day.start) / 60)
    const eH = Math.ceil(timeToMin(day.end) / 60)
    if (sH < minStart) minStart = sH
    if (eH > maxEnd) maxEnd = eH
  }
  if (maxEnd === 0) return { start: 9, end: 17 } // ningún día habilitado: fallback
  return { start: minStart, end: maxEnd }
}

export const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  lun: { enabled: true,  start: '09:00', end: '18:00', breaks: [] },
  mar: { enabled: true,  start: '09:00', end: '18:00', breaks: [] },
  mie: { enabled: true,  start: '09:00', end: '18:00', breaks: [] },
  jue: { enabled: true,  start: '09:00', end: '18:00', breaks: [] },
  vie: { enabled: true,  start: '09:00', end: '18:00', breaks: [] },
  sab: { enabled: false, start: '09:00', end: '14:00', breaks: [] },
  dom: { enabled: false, start: '09:00', end: '14:00', breaks: [] },
}

// ─── Time helpers ──────────────────────────────────────────────────────────────

export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Options every 30 min from 06:00 to 22:00 */
export const TIME_OPTIONS: string[] = Array.from(
  { length: (22 - 6) * 2 + 1 },
  (_, i) => minToTime(6 * 60 + i * 30)
)

// ─── Date helpers ──────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export function firstDayOfMonth(y: number, m: number): number {
  const r = new Date(y, m, 1).getDay()
  return r === 0 ? 6 : r - 1
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

// ─── Slot generation ───────────────────────────────────────────────────────────

/**
 * Genera slots cada `durationMin` minutos dentro del horario del día.
 * Si no se pasa daySchedule usa 09:00–19:00 como fallback (legacy).
 * Slots que solapen con un break son omitidos.
 */
export function generateSlots(
  dateISO: string,
  durationMin: number,
  daySchedule?: DaySchedule,
): string[] {
  if (daySchedule && !daySchedule.enabled) return []

  const startMin = daySchedule ? timeToMin(daySchedule.start) : 9 * 60
  const endMin   = daySchedule ? timeToMin(daySchedule.end)   : 19 * 60
  const breaks   = daySchedule?.breaks ?? []

  const slots: string[] = []
  for (let m = startMin; m + durationMin <= endMin; m += durationMin) {
    const slotEnd = m + durationMin
    const inBreak = breaks.some(b => {
      const bs = timeToMin(b.start)
      const be = timeToMin(b.end)
      return m < be && slotEnd > bs
    })
    if (!inBreak) {
      slots.push(`${dateISO}T${minToTime(m)}:00`)
    }
  }
  return slots
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtDateShort(iso: string): string {
  const DAYS_LONG = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}
