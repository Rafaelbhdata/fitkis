/**
 * Metadatos canónicos por estado de cita. Los colores específicos del
 * componente (bg/border de bloques en la grilla, etc.) viven en el componente
 * porque dependen del contexto visual; aquí solo el label y el color "ánimo".
 */
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
  scheduled:    'rgba(74,124,58,1)',
  confirmed:    'rgba(74,124,58,1)',
  completed:    'var(--leaf)',
  cancelled:    'rgba(180,30,30,0.85)',
  no_show:      'var(--honey)',
  rescheduling: '#e65100',
}

/** Motivos al reagendar una cita. Determina la plantilla del email al paciente. */
export type RescheduleReason = 'no_show' | 'custom'
