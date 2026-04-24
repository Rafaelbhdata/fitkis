import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RoutineType } from '@/types'
import { ROUTINE_SCHEDULE, ROUTINES } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatShortDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

export function getToday(): string {
  return formatDateISO(new Date())
}

export function getDayOfWeek(): number {
  return new Date().getDay()
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

// Returns today's date (YYYY-MM-DD) in a specific IANA timezone.
// Why: server routes (Vercel) run in UTC, so `new Date()` + local getters
// would still return UTC. Use this in API routes to pin to the user's zone.
export function getTodayInTimezone(timezone = 'America/Mexico_City'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
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
import type { FoodGroup } from '@/types'

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
