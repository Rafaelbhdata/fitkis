/** Shared calendar/slot utilities — used by booking page and NewAppointmentModal */

export const MONTHS_CAP = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
export const MONTHS_SHORT = [
  'ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic',
]
export const WEEK_LABELS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']
export const DURATIONS   = [15, 30, 45, 60] as const

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

/** Returns time slots every `durationMin` minutes between 09:00 and 19:00. */
export function generateSlots(dateISO: string, durationMin: number): string[] {
  const slots: string[] = []
  for (let m = 9*60; m + durationMin <= 19*60; m += durationMin) {
    const h = Math.floor(m / 60), mm = m % 60
    slots.push(`${dateISO}T${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`)
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
