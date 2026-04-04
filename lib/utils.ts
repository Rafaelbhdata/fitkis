import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function getRoutineForDay(dayOfWeek: number): string | null {
  const routineMap: Record<number, string | null> = {
    0: null,      // domingo - descanso
    1: 'upper_a', // lunes
    2: 'lower_a', // martes
    3: null,      // miércoles - descanso
    4: 'upper_b', // jueves
    5: 'lower_b', // viernes
    6: null,      // sábado - descanso
  }
  return routineMap[dayOfWeek]
}

export function getRoutineName(routineType: string): string {
  const names: Record<string, string> = {
    upper_a: 'Upper A — Pecho, Hombro, Tríceps',
    upper_b: 'Upper B — Espalda, Bíceps',
    lower_a: 'Lower A — Cuádriceps, Glúteos',
    lower_b: 'Lower B — Isquios, Glúteos, Core',
  }
  return names[routineType] || routineType
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
