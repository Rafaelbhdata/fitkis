import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RoutineType, FoodGroup } from '@/types'
import { ROUTINE_SCHEDULE, ROUTINES } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Zona horaria canónica del proyecto. Toda fecha/hora visible al usuario
// se pinea a CDMX, independientemente de la TZ del navegador o de Vercel (UTC).
export const APP_TZ = 'America/Mexico_City'

// Parse a date input as a LOCAL date.
// Why: `new Date("2026-04-22")` is parsed as UTC midnight, which in CDMX (UTC-6)
// renders as April 21 — shifting headings by one day. Detect plain YYYY-MM-DD
// strings and build the Date from local components instead.
export function parseLocalDate(date: Date | string): Date {
  if (date instanceof Date) return date
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(date)
}

export function formatDate(date: Date | string): string {
  const isDateOnly = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  return parseLocalDate(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(isDateOnly ? {} : { timeZone: APP_TZ }),
  })
}

export function formatShortDate(date: Date | string): string {
  const isDateOnly = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  return parseLocalDate(date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(isDateOnly ? {} : { timeZone: APP_TZ }),
  })
}

export function getToday(): string {
  return getTodayInTimezone()
}

export function getDayOfWeek(): number {
  return getNowPartsInTimezone().dayOfWeek
}

export function getRoutineForDay(dayOfWeek: number): RoutineType | null {
  const routineKey = ROUTINE_SCHEDULE[dayOfWeek]
  if (routineKey === 'rest') return null
  return routineKey as RoutineType
}

export function getRoutineName(routineType: RoutineType | string): string {
  const routine = ROUTINES[routineType]
  if (routine) {
    return `${routine.name} — ${routine.subtitle}`
  }
  return routineType
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Bajo peso'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Sobrepeso'
  if (bmi < 35) return 'Obesidad I'
  if (bmi < 40) return 'Obesidad II'
  return 'Obesidad III'
}

// Format date as YYYY-MM-DD in the user's LOCAL timezone.
// Why: toISOString() returns UTC, which causes logs made after 6pm CDMX
// to be saved under the next day's date — losing them from "today's" view.
export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Convierte un string a slug seguro para filenames: "Juan Pérez" → "juan-perez". */
export function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Returns today's date (YYYY-MM-DD) in a specific IANA timezone.
// Why: server routes (Vercel) run in UTC, so `new Date()` + local getters
// would still return UTC. Use this in API routes to pin to the user's zone.
export function getTodayInTimezone(timezone = APP_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

// YYYY-MM-DD para cualquier Date, fijado a una TZ específica (CDMX por defecto).
export function formatDateISOInTimezone(date: Date, timezone = APP_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date)
}

// Aritmética de días sobre un YYYY-MM-DD sin riesgo de drift por TZ.
// Útil para calcular cutoffs ("hace 30 días en CDMX") y comparar contra columnas DATE.
export function shiftDateISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// Hora, minuto y día de la semana de "ahora" en una TZ específica.
// Usar en API routes (Vercel = UTC) en lugar de `new Date().getHours()/getDay()`.
export function getNowPartsInTimezone(timezone = APP_TZ): {
  hour: number; minute: number; dayOfWeek: number; date: string
} {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour12: false, weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const hour = parseInt(get('hour'), 10) % 24
  const minute = parseInt(get('minute'), 10)
  const dayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }
  const dayOfWeek = dayMap[get('weekday')] ?? 0
  return { hour, minute, dayOfWeek, date: formatDateISOInTimezone(now, timezone) }
}

// Hora y minuto de un timestamp ISO en una TZ específica.
// Usar para posicionar bloques de cita o extraer la hora local del slot.
export function getHourMinuteInTimezone(input: Date | string, timezone = APP_TZ): {
  hour: number; minute: number
} {
  const d = typeof input === 'string' ? new Date(input) : input
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  return { hour: get('hour') % 24, minute: get('minute') }
}

// Día de la semana (0=Dom, 6=Sáb) de cualquier Date en una TZ específica.
export function getDayOfWeekInTimezone(date: Date, timezone = APP_TZ): number {
  const w = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date)
  return ({ Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 } as Record<string, number>)[w] ?? 0
}

// Formato HH:mm en CDMX para un timestamptz/ISO.
export function fmtTimeCDMX(input: Date | string, timezone = APP_TZ): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
  })
}

// Expand a food log into one or more entries based on special-case dual-group foods.
// Yogurt griego: counts as 1 proteína + 1 grasa (CLAUDE.md food rules).
export function expandFoodLogEntry(
  foodName: string | null | undefined,
  groupType: FoodGroup,
  quantity: number
): Array<{ group_type: FoodGroup; quantity: number; food_name: string | null | undefined }> {
  const name = foodName || ''
  if (/yogurt\s*griego/i.test(name)) {
    return [
      { group_type: 'proteina', quantity, food_name: foodName },
      { group_type: 'grasa', quantity, food_name: foodName },
    ]
  }
  return [{ group_type: groupType, quantity, food_name: foodName }]
}

// Check if a date is a scheduled gym day (not rest)
export function isGymDay(date: Date): boolean {
  const jsDay = date.getDay()
  return ROUTINE_SCHEDULE[jsDay] !== 'rest'
}

// Calculate gym streak: consecutive workout days where rest days don't break the streak
// A streak breaks only if you miss a scheduled workout day
export function calculateGymStreak(
  gymSessions: { date: string }[],
  scheduleOverrides: { date: string; routine_type: string }[] = []
): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Create a Set of dates with gym sessions for quick lookup
  const sessionDates = new Set(gymSessions.map(s => s.date))

  // Create a map of overrides for quick lookup
  const overridesMap = new Map(scheduleOverrides.map(o => [o.date, o.routine_type]))

  let streak = 0
  let currentDate = new Date(today)

  // Check today first - if today is a gym day and we haven't gone yet,
  // don't count today but don't break the streak either
  const todayStr = formatDateISO(currentDate)
  const todayIsGymDay = overridesMap.has(todayStr)
    ? overridesMap.get(todayStr) !== 'rest'
    : isGymDay(currentDate)

  // If today is a gym day and we've already gone, count it
  if (todayIsGymDay && sessionDates.has(todayStr)) {
    streak = 1
  }

  // Go back in time checking each day
  currentDate.setDate(currentDate.getDate() - 1)

  while (true) {
    const dateStr = formatDateISO(currentDate)

    // Check if this day was a gym day (considering overrides)
    const wasGymDay = overridesMap.has(dateStr)
      ? overridesMap.get(dateStr) !== 'rest'
      : isGymDay(currentDate)

    if (wasGymDay) {
      // This was a gym day - did we go?
      if (sessionDates.has(dateStr)) {
        streak++
      } else {
        // Missed a gym day - streak broken
        break
      }
    }
    // Rest days don't affect the streak, just continue checking

    currentDate.setDate(currentDate.getDate() - 1)

    // Safety: don't go back more than 365 days
    if (streak > 365) break
  }

  return streak
}

// Calculate diet streak: consecutive days where food was logged AND within budget
export function calculateDietStreak(
  foodLogs: { date: string; group_type: FoodGroup; quantity: number }[],
  dailyBudget: Record<FoodGroup, number>
): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Group food logs by date
  const logsByDate = new Map<string, Map<FoodGroup, number>>()

  foodLogs.forEach(log => {
    if (!logsByDate.has(log.date)) {
      logsByDate.set(log.date, new Map())
    }
    const dateMap = logsByDate.get(log.date)!
    dateMap.set(log.group_type, (dateMap.get(log.group_type) || 0) + log.quantity)
  })

  let streak = 0
  let currentDate = new Date(today)

  // Check today - if nothing logged yet, don't count but don't break
  const todayStr = formatDateISO(currentDate)
  const todayLogs = logsByDate.get(todayStr)

  if (todayLogs && todayLogs.size > 0) {
    // Check if within budget
    let withinBudget = true
    todayLogs.forEach((consumed, group) => {
      if (consumed > dailyBudget[group]) {
        withinBudget = false
      }
    })
    if (withinBudget) streak = 1
  }

  // Go back in time
  currentDate.setDate(currentDate.getDate() - 1)

  while (true) {
    const dateStr = formatDateISO(currentDate)
    const dateLogs = logsByDate.get(dateStr)

    // Must have logged something
    if (!dateLogs || dateLogs.size === 0) {
      break
    }

    // Check if within budget for all groups
    let withinBudget = true
    dateLogs.forEach((consumed, group) => {
      if (consumed > dailyBudget[group]) {
        withinBudget = false
      }
    })

    if (withinBudget) {
      streak++
    } else {
      break
    }

    currentDate.setDate(currentDate.getDate() - 1)

    // Safety: don't go back more than 365 days
    if (streak > 365) break
  }

  return streak
}
