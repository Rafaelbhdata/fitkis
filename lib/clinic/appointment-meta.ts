import type { Appointment, AppointmentStatus } from './queries'
import { isCompletedAppointment } from './queries'

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:    'Agendada',
  cancelled:    'Cancelada',
  no_show:      'No asistió',
  rescheduling: 'Reagendando',
}

export const APPOINTMENT_STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled:    'var(--leaf)',
  cancelled:    'var(--berry)',
  no_show:      'var(--honey)',
  rescheduling: '#e65100',
}

/**
 * Etiqueta a mostrar al usuario. Para una cita scheduled cuya hora ya pasó
 * mostramos "Completada" (derivado), aunque en BD siga siendo `scheduled`.
 */
export function displayAppointmentStatus(
  appt: Pick<Appointment, 'status' | 'starts_at' | 'duration_minutes'>
): { label: string; color: string; isCompleted: boolean } {
  if (isCompletedAppointment(appt)) {
    return { label: 'Completada', color: 'var(--ink-5)', isCompleted: true }
  }
  return {
    label: APPOINTMENT_STATUS_LABEL[appt.status],
    color: APPOINTMENT_STATUS_COLOR[appt.status],
    isCompleted: false,
  }
}

export type RescheduleReason = 'no_show' | 'custom'
