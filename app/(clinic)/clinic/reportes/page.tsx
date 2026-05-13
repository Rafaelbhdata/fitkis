'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LoadingState } from '@/components/ui/LoadingState'
import { Ic } from '@/components/clinic/Ic'
import { chipStyle } from '@/components/clinic/ui/Chip'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadPracticeKPIs,
  loadAllAppointmentsForDay,
  isCompletedAppointment,
  type PracticeKPIs,
  type PractitionerRecord,
  type Appointment,
} from '@/lib/clinic/queries'
import { getTodayInTimezone } from '@/lib/utils'
import { fmtLongDate, fmtShortDateTime, MONTHS_CAP } from '@/lib/clinic/calendar-utils'

// ─── Helpers de presentación ────────────────────────────────────────────────

function apptStatusMeta(appt: Appointment): { label: string; color: string; bg: string } {
  if (appt.status === 'cancelled')    return { label: 'Cancelada',       color: 'var(--ink-4)',  bg: 'var(--ink-8)' }
  if (appt.status === 'no_show')      return { label: 'No se presentó',  color: 'var(--honey)',  bg: 'var(--honey-soft)' }
  if (appt.status === 'rescheduling') return { label: 'Reagendando',     color: 'var(--signal)', bg: '#fff3f0' }
  if (isCompletedAppointment(appt))   return { label: 'Completada',      color: 'var(--leaf)',   bg: 'var(--leaf-soft)' }
  return { label: 'Programada', color: 'var(--sky)', bg: 'var(--sky-soft)' }
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--ink-7)',
      borderRadius: 14,
      padding: '24px 28px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionEyebrow({ text }: { text: string }) {
  return <div className="fk-eyebrow" style={{ marginBottom: 16 }}>{text}</div>
}

function KPITile({
  label, value, unit, sub, accent,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  accent?: string
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--ink-7)',
      borderRadius: 12,
      padding: '20px 22px',
    }}>
      <div className="fk-eyebrow" style={{ color: 'var(--ink-4)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 10 }}>
        <span className="fk-serif" style={{
          fontSize: 40,
          fontWeight: 300,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: accent ?? 'var(--ink)',
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function AdherenceBar({ distribution, total }: {
  distribution: PracticeKPIs['adherence_distribution']
  total: number
}) {
  if (total === 0) return (
    <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
      Sin pacientes activos
    </p>
  )

  const segments = [
    { key: 'high',      label: 'Alta (≥80%)',   count: distribution.high,      color: 'var(--leaf)' },
    { key: 'medium',    label: 'Media (60–79%)', count: distribution.medium,    color: 'var(--honey)' },
    { key: 'low',       label: 'Baja (<60%)',    count: distribution.low,       color: 'var(--signal)' },
    { key: 'sin_datos', label: 'Sin datos',      count: distribution.sin_datos, color: 'var(--ink-6)' },
  ]

  return (
    <div>
      {/* Barra apilada */}
      <div style={{
        display: 'flex',
        height: 10,
        borderRadius: 6,
        overflow: 'hidden',
        gap: 2,
        marginBottom: 14,
      }}>
        {segments.map(s => s.count > 0 && (
          <div
            key={s.key}
            title={`${s.label}: ${s.count}`}
            style={{
              flex: s.count,
              background: s.color,
              borderRadius: 3,
            }}
          />
        ))}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
              <strong style={{ color: 'var(--ink)' }}>{s.count}</strong> {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ALERT_META: Record<string, { text: string; color: string; bg: string }> = {
  inactividad:    { text: 'Inactividad',    color: 'var(--berry)', bg: 'var(--berry-soft)' },
  estancamiento:  { text: 'Peso estancado', color: 'var(--honey)', bg: 'var(--honey-soft)' },
}

// ─── Calculadora de plataforma ────────────────────────────────────────────────

const STORAGE_KEY = 'fitkis_cost_per_patient'

function PlatformCalculator({ activePatients }: { activePatients: number }) {
  const [cost, setCost] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setCost(saved)
  }, [])

  function handleChange(v: string) {
    const clean = v.replace(/[^0-9.]/g, '')
    setCost(clean)
    if (clean) localStorage.setItem(STORAGE_KEY, clean)
    else localStorage.removeItem(STORAGE_KEY)
  }

  const numCost = parseFloat(cost)
  const total = !isNaN(numCost) && numCost > 0 ? numCost * activePatients : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fk-eyebrow" style={{ color: 'var(--ink-4)' }}>
            Costo por paciente / mes
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={e => handleChange(e.target.value)}
              placeholder="0.00"
              style={{
                width: 120,
                padding: '10px 14px',
                fontFamily: 'var(--f-mono)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink)',
                background: 'var(--paper)',
                border: '1.5px solid var(--ink-6)',
                borderRadius: 8,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {total !== null && (
          <>
            <div style={{
              fontSize: 22,
              color: 'var(--ink-5)',
              fontFamily: 'var(--f-mono)',
              alignSelf: 'flex-end',
              paddingBottom: 8,
            }}>
              ×
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
              <span className="fk-eyebrow" style={{ color: 'var(--ink-4)' }}>Pacientes activos</span>
              <span style={{
                fontSize: 18,
                fontWeight: 600,
                fontFamily: 'var(--f-mono)',
                padding: '10px 14px',
                background: 'var(--paper)',
                border: '1.5px solid var(--ink-6)',
                borderRadius: 8,
                color: 'var(--ink)',
              }}>
                {activePatients}
              </span>
            </div>
            <div style={{
              fontSize: 22,
              color: 'var(--ink-5)',
              fontFamily: 'var(--f-mono)',
              alignSelf: 'flex-end',
              paddingBottom: 8,
            }}>
              =
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
              <span className="fk-eyebrow" style={{ color: 'var(--ink-4)' }}>Total mensual</span>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'var(--f-mono)',
                padding: '10px 14px',
                background: total > 0 ? '#f0fdf4' : 'var(--paper)',
                border: `1.5px solid ${total > 0 ? 'var(--leaf)' : 'var(--ink-6)'}`,
                borderRadius: 8,
                color: total > 0 ? 'var(--leaf)' : 'var(--ink)',
              }}>
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>

      {total === null && activePatients > 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', margin: 0 }}>
          Ingresa el costo por paciente para ver el total mensual de la suscripción.
        </p>
      )}
      {activePatients === 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', margin: 0 }}>
          No tienes pacientes activos vinculados.
        </p>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [kpis,        setKpis]        = useState<PracticeKPIs | null>(null)
  const [todayAppts,  setTodayAppts]  = useState<Appointment[]>([])
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const todayCDMX = getTodayInTimezone()

  useEffect(() => {
    if (userLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const pract = await loadPractitionerByUser(supabase, user.id)
        if (cancelled) return
        if (!pract) {
          setError('No tienes registro de nutriólogo en esta cuenta.')
          setLoading(false)
          return
        }
        setPractitioner(pract)
        const [data, appts] = await Promise.all([
          loadPracticeKPIs(supabase, pract.id, {
            inactivityDays:  pract.inactivity_threshold_days,
            minAdherencePct: pract.min_adherence_pct,
          }),
          loadAllAppointmentsForDay(supabase, pract.id, todayCDMX),
        ])
        if (cancelled) return
        setKpis(data)
        setTodayAppts(appts)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, userLoading, supabase, todayCDMX])

  if (loading)      return <LoadingState label="Cargando dashboard" />
  if (error || !kpis) return (
    <div style={{ padding: '60px 40px' }}>
      <div className="fk-eyebrow" style={{ color: 'var(--berry)' }}>Error</div>
      <p className="fk-serif" style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300, marginTop: 8 }}>
        {error ?? 'No se pudieron cargar los datos.'}
      </p>
    </div>
  )

  // Valores derivados
  const [yy, mm] = todayCDMX.split('-').map(Number)
  const monthLabel = `${MONTHS_CAP[mm - 1]} ${yy}`

  const todayTotal     = todayAppts.length
  const todayCompleted = todayAppts.filter(isCompletedAppointment).length
  const todayCancelled = todayAppts.filter(a => a.status === 'cancelled' || a.status === 'no_show').length
  const todayPending   = todayTotal - todayCompleted - todayCancelled

  const monthTotal = kpis.appointments_month.total

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>

      {/* ── Header ── */}
      <div style={{ padding: '24px 40px 0' }}>
        <div className="fk-eyebrow">Práctica · {monthLabel}</div>
        <h1 className="fk-serif" style={{
          fontSize: 42,
          fontWeight: 300,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: '8px 0 0',
        }}>
          <span style={{ fontStyle: 'italic' }}>Dashboard</span>
        </h1>
      </div>

      <div style={{ padding: '24px 40px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Sección 1: Hoy ── */}
        <SectionCard>
          <SectionEyebrow text={`HOY · ${fmtLongDate(todayCDMX).toUpperCase()}`} />

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 24, marginBottom: todayAppts.length > 0 ? 20 : 0, flexWrap: 'wrap' }}>
            {[
              { label: 'citas hoy',   value: todayTotal,     accent: 'var(--ink)' },
              { label: 'completadas', value: todayCompleted, accent: 'var(--leaf)' },
              { label: 'pendientes',  value: todayPending,   accent: 'var(--sky)' },
              { label: 'canceladas',  value: todayCancelled, accent: todayCancelled > 0 ? 'var(--berry)' : 'var(--ink-5)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  fontSize: 28,
                  fontWeight: 600,
                  fontFamily: 'var(--f-sans)',
                  color: s.accent,
                  lineHeight: 1,
                }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Lista de citas */}
          {todayAppts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
              Agenda libre hoy.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayAppts.map(appt => {
                const meta    = apptStatusMeta(appt)
                const timeFmt = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
                  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
                })
                const isCancelled = appt.status === 'cancelled'
                return (
                  <div
                    key={appt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      border: '1px solid var(--ink-7)',
                      borderRadius: 10,
                      borderLeft: `3px solid ${meta.color}`,
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink-3)',
                      minWidth: 42,
                    }}>
                      {timeFmt}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 14,
                      fontFamily: 'var(--f-sans)',
                      color: isCancelled ? 'var(--ink-5)' : 'var(--ink)',
                      textDecoration: isCancelled ? 'line-through' : 'none',
                    }}>
                      {appt.patient_name}
                    </span>
                    <span style={chipStyle(meta.color, meta.bg)}>{meta.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Sección 2: Consultoría ── */}
        <div>
          <div className="fk-eyebrow" style={{ marginBottom: 12, paddingLeft: 2 }}>
            CONSULTORÍA · {monthLabel.toUpperCase()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <KPITile
              label="Pacientes activos"
              value={kpis.active_patients}
              sub="en tu práctica"
            />
            <KPITile
              label="Nuevos este mes"
              value={kpis.new_patients_month}
              sub={kpis.new_patients_month === 0 ? 'sin altas este mes' : `se vincularon en ${monthLabel}`}
              accent={kpis.new_patients_month > 0 ? 'var(--leaf)' : undefined}
            />
            <KPITile
              label="Invitaciones pendientes"
              value={kpis.pending_invites}
              sub={kpis.pending_invites === 0 ? 'todos vinculados' : 'por aceptar'}
              accent={kpis.pending_invites > 0 ? 'var(--honey)' : undefined}
            />
            <KPITile
              label="Citas completadas"
              value={kpis.appointments_month.completed}
              sub={monthTotal > 0 ? `de ${monthTotal} agendadas este mes` : 'sin citas este mes'}
            />
            <KPITile
              label="Cancelaciones"
              value={kpis.appointments_month.cancelled}
              sub={monthTotal > 0 ? `${pct(kpis.appointments_month.cancelled, monthTotal)} del total` : '—'}
              accent={kpis.appointments_month.cancelled > 0 ? 'var(--berry)' : undefined}
            />
            <KPITile
              label="No-shows"
              value={kpis.appointments_month.no_show}
              sub={monthTotal > 0 ? `${pct(kpis.appointments_month.no_show, monthTotal)} del total` : '—'}
              accent={kpis.appointments_month.no_show > 0 ? 'var(--honey)' : undefined}
            />
          </div>
        </div>

        {/* ── Sección 3: Progreso clínico ── */}
        <SectionCard>
          <SectionEyebrow text="PROGRESO CLÍNICO · ÚLTIMOS 30 DÍAS" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32, alignItems: 'start' }}>
            {/* Adherencia media */}
            <div>
              <div className="fk-eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 8 }}>
                Adherencia media
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="fk-serif" style={{
                  fontSize: 56,
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  color: kpis.avg_adherence == null ? 'var(--ink-5)'
                    : kpis.avg_adherence >= 80 ? 'var(--leaf)'
                    : kpis.avg_adherence >= 60 ? 'var(--honey)'
                    : 'var(--signal)',
                }}>
                  {kpis.avg_adherence ?? '—'}
                </span>
                {kpis.avg_adherence != null && (
                  <span style={{ fontSize: 16, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>%</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', marginTop: 6 }}>
                {practitioner
                  ? `umbral mínimo ${practitioner.min_adherence_pct}%`
                  : 'registro de alimentos y actividad'}
              </div>
            </div>

            {/* Distribución */}
            <div>
              <div className="fk-eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 12 }}>
                Distribución por paciente
              </div>
              <AdherenceBar
                distribution={kpis.adherence_distribution}
                total={kpis.active_patients}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Sección 4: Alertas ── */}
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionEyebrow text="REQUIEREN ATENCIÓN" />
            {kpis.patients_needing_attention.length > 0 && (
              <span style={{
                fontSize: 11,
                color: 'var(--berry)',
                fontFamily: 'var(--f-mono)',
                background: 'var(--berry-soft)',
                padding: '3px 8px',
                borderRadius: 20,
              }}>
                {kpis.patients_needing_attention.length} paciente{kpis.patients_needing_attention.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {kpis.patients_needing_attention.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
              Sin alertas activas. Todo en orden.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kpis.patients_needing_attention.map(p => {
                const alertMeta = p.alert ? ALERT_META[p.alert] : null
                return (
                  <Link
                    key={p.patient_id}
                    href={`/clinic/pacientes/${p.patient_id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--ink-7)',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>
                        {p.name}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                        {p.days_since_activity != null
                          ? `hace ${p.days_since_activity}d sin registros`
                          : 'sin registros'}
                        {p.adherence != null && ` · ${p.adherence}% adherencia`}
                      </div>
                    </div>
                    {alertMeta && (
                      <span style={chipStyle(alertMeta.color, alertMeta.bg)}>
                        {alertMeta.text}
                      </span>
                    )}
                    <Ic.chevR />
                  </Link>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Sección 5: Plataforma ── */}
        <SectionCard>
          <SectionEyebrow text="PLATAFORMA · FITKIS" />
          <PlatformCalculator activePatients={kpis.active_patients} />
        </SectionCard>

      </div>
    </div>
  )
}
