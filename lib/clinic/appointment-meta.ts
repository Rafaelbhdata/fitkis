import type { AppointmentStatus } from './queries'

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:    'Agendada',
  confirmed:    'Confirmada',
  completed:    'Completada',
  cancelled:    'Cancelada',
  no_show:      'No asistió',
  rescheduling: 'Reagendando',
}

export const APPOINTMENT_STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled:    'var(--leaf)',
  confirmed:    'var(--leaf)',
  completed:    'var(--leaf)',
  cancelled:    'var(--berry)',
  no_show:      'var(--honey)',
  rescheduling: '#e65100',
}

export type RescheduleReason = 'no_show' | 'custom'
