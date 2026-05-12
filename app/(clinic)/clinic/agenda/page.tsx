'use client'

import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import Link from 'next/link'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { Btn } from '@/components/ui/Btn'
import { Chip } from '@/components/ui/Chip'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from '@/components/clinic/Ic'
import { NewAppointmentModal } from '@/components/clinic/NewAppointmentModal'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadAppointmentsForWeek,
  createAppointment,
  updateAppointmentStatus,
  type PractitionerRecord,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/clinic/queries'

// ─── Helpers de fecha ────────────────────────────────────────────────────────

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function getWeekStart(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7)
  return d.toISOString().split('T')[0]
}

function formatWeekRange(weekStart: string): string {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekStart + 'T00:00:00')
  e.setDate(e.getDate() + 6)
  return `${s.getDate()} – ${e.getDate()} ${MONTHS_ES[e.getMonth()]} ${e.getFullYear()}`
}

function getDaysOfWeek(weekStart: string): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return d
  })
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── StatusChip ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const STATUS_TONE: Record<AppointmentStatus, 'ink' | 'sky' | 'leaf' | 'berry' | 'honey'> = {
  scheduled: 'ink',
  confirmed: 'sky',
  completed: 'leaf',
  cancelled: 'berry',
  no_show: 'honey',
}

// ─── AppointmentCard ─────────────────────────────────────────────────────────

type CardProps = {
  appt: Appointment
  onStatusChange: (id: string, status: AppointmentStatus) => void
}

function AppointmentCard({ appt, onStatusChange }: CardProps) {
  const [hover, setHover] = useState(false)
  const active = appt.status !== 'completed' && appt.status !== 'cancelled' && appt.status !== 'no_show'

  const cardStyle: CSSProperties = {
    background: hover ? 'var(--paper)' : '#fff',
    border: '1px solid var(--ink-7)',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 8,
    transition: 'background 0.15s',
    textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
    opacity: appt.status === 'cancelled' ? 0.6 : 1,
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
        <span
          className="fk-mono"
          style={{ fontSize: 11, color: 'var(--signal)', fontWeight: 500 }}
        >
          {formatTime(appt.starts_at)}
        </span>
        <Chip tone={STATUS_TONE[appt.status]}>{STATUS_LABEL[appt.status]}</Chip>
      </div>

      <div
        className="fk-serif"
        style={{
          fontSize: 15,
          fontWeight: 400,
          color: 'var(--ink)',
          marginBottom: 2,
          textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
        }}
      >
        {appt.patient_name}
      </div>

      <div
        className="fk-mono"
        style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: active ? 10 : 0 }}
      >
        {appt.duration_minutes} min
      </div>

      {active && (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange(appt.id, 'completed')}
            style={{ fontSize: 10, padding: '4px 9px' }}
          >
            Completar
          </Btn>
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange(appt.id, 'cancelled')}
            style={{ fontSize: 10, padding: '4px 9px', color: 'var(--berry)' }}
          >
            Cancelar
          </Btn>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AgendaPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newApptOpen, setNewApptOpen] = useState(false)

  const weekStart = getWeekStart(weekOffset)
  const days = getDaysOfWeek(weekStart)
  const today = todayISO()

  // Cargar practitioner una sola vez
  useEffect(() => {
    if (!user) return
    loadPractitionerByUser(supabase, user.id).then(setPractitioner)
  }, [user, supabase])

  // Cargar citas al cambiar semana o practitioner
  const fetchAppointments = useCallback(async () => {
    if (!practitioner) return
    setLoading(true)
    const data = await loadAppointmentsForWeek(supabase, practitioner.id, weekStart)
    setAppointments(data)
    setLoading(false)
  }, [practitioner, supabase, weekStart])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await updateAppointmentStatus(supabase, id, status)
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    )
  }

  async function handleCreate(payload: {
    practitioner_id: string
    patient_name: string
    patient_email?: string
    starts_at: string
    duration_minutes: number
    notes?: string
  }) {
    const { error } = await createAppointment(supabase, payload)
    if (!error) {
      setNewApptOpen(false)
      await fetchAppointments()
    }
    return { error }
  }

  if (userLoading || (!practitioner && !userLoading)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
      </div>
    )
  }

  const apptsByDay: Record<string, Appointment[]> = {}
  for (const day of days) {
    apptsByDay[isoDate(day)] = []
  }
  for (const appt of appointments) {
    const key = appt.starts_at.split('T')[0]
    if (apptsByDay[key]) apptsByDay[key].push(appt)
  }

  const totalAppts = appointments.length

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <ClinicTopbar
        sub="Agenda"
        title={
          <>
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Agenda </span>de consultas
          </>
        }
        right={
          <>
            {practitioner && (
              <Link
                href={`/agendar/${practitioner.id}`}
                target="_blank"
                style={{
                  fontSize: 12,
                  color: 'var(--sky)',
                  fontFamily: 'var(--f-sans)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Compartir agenda
                <Ic.arrow width={12} height={12} />
              </Link>
            )}
            <Btn variant="primary" size="sm" onClick={() => setNewApptOpen(true)}>
              <Ic.plus width={12} height={12} />
              Nueva cita
            </Btn>
          </>
        }
      />

      {/* Nav de semana */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 40px',
          borderBottom: '1px solid var(--ink-7)',
        }}
      >
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: '1px solid var(--ink-7)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            color: 'var(--ink-3)',
          }}
        >
          <Ic.chevL width={12} height={12} />
          Anterior
        </button>

        <span
          className="fk-serif"
          style={{ fontSize: 18, fontWeight: 300, color: 'var(--ink)', flex: 1, textAlign: 'center' }}
        >
          {formatWeekRange(weekStart)}
        </span>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: '1px solid var(--ink-7)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            color: 'var(--ink-3)',
          }}
        >
          Siguiente
          <Ic.chevR width={12} height={12} />
        </button>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              background: 'none',
              border: '1px solid var(--ink-7)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              color: 'var(--ink-4)',
            }}
          >
            Hoy
          </button>
        )}

        {totalAppts > 0 && (
          <span
            className="fk-mono"
            style={{ fontSize: 11, color: 'var(--ink-4)' }}
          >
            {totalAppts} {totalAppts === 1 ? 'cita' : 'citas'}
          </span>
        )}
      </div>

      {/* Contenido: loading / empty / grid */}
      <div style={{ padding: '24px 40px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
          </div>
        ) : totalAppts === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px dashed var(--ink-6)',
              borderRadius: 14,
              padding: '48px 28px',
              textAlign: 'center',
            }}
          >
            <div className="fk-eyebrow" style={{ marginBottom: 8, color: 'var(--signal)' }}>
              Sin citas
            </div>
            <p
              className="fk-serif"
              style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 300, margin: 0 }}
            >
              No hay citas agendadas para esta semana.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              border: '1px solid var(--ink-7)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {days.map((day, i) => {
              const key = isoDate(day)
              const isToday = key === today
              const dayAppts = apptsByDay[key] ?? []

              const colHeaderStyle: CSSProperties = {
                padding: '12px 14px',
                borderBottom: '1px solid var(--ink-7)',
                borderRight: i < 6 ? '1px solid var(--ink-7)' : undefined,
                background: isToday ? 'var(--signal-soft)' : 'var(--paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }

              const colBodyStyle: CSSProperties = {
                padding: '12px 10px',
                borderRight: i < 6 ? '1px solid var(--ink-7)' : undefined,
                minHeight: 120,
                verticalAlign: 'top',
              }

              return (
                <div key={key}>
                  {/* Cabecera del día */}
                  <div style={colHeaderStyle}>
                    <div>
                      <div
                        className="fk-eyebrow"
                        style={{ color: isToday ? 'var(--signal)' : 'var(--ink-4)', marginBottom: 2 }}
                      >
                        {DAYS_ES[i]}
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 300,
                          fontFamily: 'var(--f-serif)',
                          color: isToday ? 'var(--signal)' : 'var(--ink)',
                        }}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                    {dayAppts.length > 0 && (
                      <span
                        style={{
                          background: isToday ? 'var(--signal)' : 'var(--ink-6)',
                          color: isToday ? '#fff' : 'var(--ink-3)',
                          borderRadius: 999,
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontFamily: 'var(--f-mono)',
                          fontWeight: 500,
                        }}
                      >
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Citas del día */}
                  <div style={colBodyStyle}>
                    {dayAppts.map((appt) => (
                      <AppointmentCard
                        key={appt.id}
                        appt={appt}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nueva cita */}
      {newApptOpen && practitioner && (
        <NewAppointmentModal
          practitionerId={practitioner.id}
          onClose={() => setNewApptOpen(false)}
          onCreated={() => {
            setNewApptOpen(false)
            fetchAppointments()
          }}
          createAppointment={handleCreate}
        />
      )}
    </div>
  )
}
