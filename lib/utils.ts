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
  return new Date().toISOString().split('T')[0]
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
