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
import { fmtLongDate, MONTHS_CAP } from '@/lib/clinic/calendar-utils'
import { ClinicTopbar } from '@/components/clinic/Topbar'

// ─── Primitivos visuales ─────────────────────────────────────────────────────

/** Anillo circular de progreso SVG */
function RingChart({
  value, max, size = 60, strokeW = 5, color = 'var(--leaf)',
}: { value: number; max: number; size?: number; strokeW?: number; color?: string }) {
  const r    = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const pct  = max > 0 ? Math.min(1, value / max) : 0
  const cx   = size / 2
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--paper-3)" strokeWidth={strokeW} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

/**
 * Semáforo — 3 dots rojo/amarillo/verde.
 * `reverse=true`: 0 es bueno (ej. cancelaciones).
 * `reverse=false`: alto es bueno (ej. adherencia, pct %).
 */
function Semaforo({ value, lo, hi, reverse = false, size = 9 }: {
  value: number; lo: number; hi: number; reverse?: boolean; size?: number
}) {
  let state: 'red' | 'yellow' | 'green'
  if (reverse) {
    state = value === 0 ? 'green' : value <= lo ? 'yellow' : 'red'
  } else {
    state = value >= hi ? 'green' : value >= lo ? 'yellow' : 'red'
  }
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {(['red', 'yellow', 'green'] as const).map(s => (
        <div key={s} style={{
          width: size, height: size, borderRadius: '50%',
          background: s === 'red' ? 'var(--berry)' : s === 'yellow' ? 'var(--honey)' : 'var(--leaf)',
          opacity: s === state ? 1 : 0.15,
        }} />
      ))}
    </div>
  )
}

/** Barra horizontal de progreso inline */
function BarFill({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ height: 5, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  )
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

function apptStatusMeta(appt: Appointment): { label: string; color: string; bg: string } {
  if (appt.status === 'cancelled')    return { label: 'Cancelada',      color: 'var(--ink-4)',  bg: 'var(--paper-3)'     }
  if (appt.status === 'no_show')      return { label: 'No se presentó', color: 'var(--honey)',  bg: 'var(--honey-soft)'  }
  if (appt.status === 'rescheduling') return { label: 'Reagendando',    color: 'var(--signal)', bg: 'var(--signal-soft)' }
  if (isCompletedAppointment(appt))   return { label: 'Completada',     color: 'var(--leaf)',   bg: 'var(--leaf-soft)'   }
  return { label: 'Programada', color: 'var(--sky)', bg: 'var(--sky-soft)' }
}

function numPct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}
function strPct(n: number, total: number) {
  return `${numPct(n, total)}%`
}

// ─── Tarjetas KPI ─────────────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--ink-7)',
      borderRadius: 14, padding: '24px 28px', ...style,
    }}>
      {children}
    </div>
  )
}

/** Tarjeta KPI base — número grande + eyebrow + sub opcional */
function KPICard({
  label, value, unit, sub, accent, right, bottom,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  accent?: string
  right?: React.ReactNode   // elemento visual a la derecha del número
  bottom?: React.ReactNode  // elemento bajo el número (barra, leyenda)
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--ink-7)',
      borderRadius: 14, padding: '22px 24px',
    }}>
      <div className="fk-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="fk-serif" style={{
              fontSize: 44, fontWeight: 300,
              letterSpacing: '-0.02em', lineHeight: 1,
              color: accent ?? 'var(--ink)',
            }}>
              {value}
            </span>
            {unit && (
              <span style={{ fontSize: 14, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{unit}</span>
            )}
          </div>
          {sub && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{sub}</div>
          )}
        </div>
        {right}
      </div>
      {bottom}
    </div>
  )
}

// ─── Sección Hoy ──────────────────────────────────────────────────────────────

function TodaySection({ appts }: { appts: Appointment[] }) {
  const total     = appts.length
  const completed = appts.filter(isCompletedAppointment).length
  const cancelled = appts.filter(a => a.status === 'cancelled' || a.status === 'no_show').length
  const pending   = total - completed - cancelled

  return (
    <SectionCard>
      <div className="fk-eyebrow" style={{ marginBottom: 16 }}>
        {`HOY · ${fmtLongDate(getTodayInTimezone()).toUpperCase()}`}
      </div>

      {/* Stats row + ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: total > 0 ? 20 : 0 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[
            { n: total,     label: 'citas',       color: 'var(--ink)'   },
            { n: completed, label: 'completadas',  color: 'var(--leaf)'  },
            { n: pending,   label: 'pendientes',   color: 'var(--sky)'   },
            { n: cancelled, label: 'canceladas',   color: cancelled > 0 ? 'var(--berry)' : 'var(--ink-5)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="fk-serif" style={{
                fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em',
                lineHeight: 1, color: s.color,
              }}>
                {s.n}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Anillo de progreso del día */}
        {total > 0 && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <RingChart
              value={completed} max={total} size={68} strokeW={6}
              color={completed === total ? 'var(--leaf)' : 'var(--sky)'}
            />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 0,
            }}>
              <span className="fk-serif" style={{ fontSize: 16, fontWeight: 300, lineHeight: 1 }}>
                {Math.round((completed / total) * 100)}
              </span>
              <span style={{ fontSize: 9, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>%</span>
            </div>
          </div>
        )}
      </div>

      {/* Lista de citas */}
      {total === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
          Agenda libre hoy.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {appts.map(appt => {
            const meta  = apptStatusMeta(appt)
            const time  = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
              hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
            })
            return (
              <div key={appt.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 14px',
                background: 'var(--paper)', borderRadius: 8,
                borderLeft: `3px solid ${meta.color}`,
              }}>
                <span className="fk-mono" style={{ fontSize: 13, fontWeight: 700, color: meta.color, minWidth: 42 }}>
                  {time}
                </span>
                <span style={{
                  flex: 1, fontSize: 14, fontFamily: 'var(--f-sans)',
                  color: appt.status === 'cancelled' ? 'var(--ink-5)' : 'var(--ink)',
                  textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none',
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
  )
}

// ─── Sección Progreso clínico ─────────────────────────────────────────────────

function AdherenceSection({ kpis, practitioner }: {
  kpis: PracticeKPIs; practitioner: PractitionerRecord | null
}) {
  const dist  = kpis.adherence_distribution
  const total = kpis.active_patients
  const avg   = kpis.avg_adherence
  const minPct = practitioner?.min_adherence_pct ?? 60

  const adherColor = avg == null ? 'var(--ink-5)'
    : avg >= 80 ? 'var(--leaf)'
    : avg >= 60 ? 'var(--honey)'
    : 'var(--signal)'

  const segments = [
    { key: 'high',      label: 'Alta',     count: dist.high,      color: 'var(--leaf)',   range: '≥80%'   },
    { key: 'medium',    label: 'Media',    count: dist.medium,    color: 'var(--honey)',  range: '60–79%' },
    { key: 'low',       label: 'Baja',     count: dist.low,       color: 'var(--signal)', range: '<60%'   },
    { key: 'sin_datos', label: 'Sin datos',count: dist.sin_datos, color: 'var(--ink-6)',  range: '—'      },
  ]

  return (
    <SectionCard>
      <div className="fk-eyebrow" style={{ marginBottom: 20 }}>PROGRESO CLÍNICO · ÚLTIMOS 30 DÍAS</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 40, alignItems: 'start' }}>
        {/* Número grande + semáforo */}
        <div>
          <div className="fk-eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 10 }}>
            Adherencia media
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="fk-serif" style={{
              fontSize: 64, fontWeight: 300,
              letterSpacing: '-0.03em', lineHeight: 1, color: adherColor,
            }}>
              {avg ?? '—'}
            </span>
            {avg != null && (
              <span style={{ fontSize: 18, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>%</span>
            )}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Semaforo value={avg ?? 0} lo={60} hi={80} />
            <span style={{ fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}>
              umbral {minPct}%
            </span>
          </div>
        </div>

        {/* Distribución visual */}
        <div>
          <div className="fk-eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 12 }}>
            Distribución · {total} paciente{total !== 1 ? 's' : ''}
          </div>

          {total === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
              Sin pacientes activos.
            </p>
          ) : (
            <>
              {/* Barra apilada gruesa */}
              <div style={{
                display: 'flex', height: 14, borderRadius: 7,
                overflow: 'hidden', gap: 2, marginBottom: 16,
              }}>
                {segments.map(s => s.count > 0 && (
                  <div key={s.key} title={`${s.label}: ${s.count}`}
                    style={{ flex: s.count, background: s.color, borderRadius: 4 }} />
                ))}
              </div>

              {/* Celdas por segmento */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {segments.map(s => (
                  <div key={s.key} style={{
                    background: s.count > 0 ? 'var(--paper)' : 'transparent',
                    border: `1px solid ${s.count > 0 ? 'var(--ink-7)' : 'var(--ink-7)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    opacity: s.count === 0 ? 0.45 : 1,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: s.color, marginBottom: 8,
                    }} />
                    <div className="fk-serif" style={{
                      fontSize: 28, fontWeight: 300,
                      letterSpacing: '-0.02em', lineHeight: 1,
                      color: s.count > 0 ? s.color : 'var(--ink-5)',
                    }}>
                      {s.count}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginTop: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>
                      {s.range}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </SectionCard>
  )
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
    clean ? localStorage.setItem(STORAGE_KEY, clean) : localStorage.removeItem(STORAGE_KEY)
  }

  const numCost = parseFloat(cost)
  const total = !isNaN(numCost) && numCost > 0 ? numCost * activePatients : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="fk-eyebrow">Costo por paciente / mes</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>$</span>
          <input
            type="text" inputMode="decimal" value={cost}
            onChange={e => handleChange(e.target.value)}
            placeholder="0.00"
            style={{
              width: 120, padding: '11px 14px',
              fontFamily: 'var(--f-mono)', fontSize: 18, fontWeight: 600,
              color: 'var(--ink)', background: '#fff',
              border: '1px solid var(--ink-7)', borderRadius: 10, outline: 'none',
            }}
          />
        </div>
      </div>

      {total !== null && (
        <>
          <span style={{ fontSize: 22, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', alignSelf: 'flex-end', paddingBottom: 10 }}>×</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
            <span className="fk-eyebrow">Pacientes activos</span>
            <span style={{
              fontSize: 18, fontWeight: 600, fontFamily: 'var(--f-mono)',
              padding: '11px 14px', background: 'var(--paper)',
              border: '1px solid var(--ink-7)', borderRadius: 10, color: 'var(--ink)',
            }}>
              {activePatients}
            </span>
          </div>
          <span style={{ fontSize: 22, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', alignSelf: 'flex-end', paddingBottom: 10 }}>=</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
            <span className="fk-eyebrow">Total mensual</span>
            <span style={{
              fontSize: 18, fontWeight: 700, fontFamily: 'var(--f-mono)',
              padding: '11px 14px', borderRadius: 10,
              background: 'var(--leaf-soft)', border: '1px solid var(--leaf)',
              color: 'var(--leaf)',
            }}>
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}

      {total === null && activePatients > 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', margin: 0, alignSelf: 'flex-end', paddingBottom: 14 }}>
          Ingresa el costo por paciente para calcular el total mensual.
        </p>
      )}
    </div>
  )
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

const ALERT_META: Record<string, { text: string; color: string; bg: string }> = {
  inactividad:   { text: 'Inactividad',    color: 'var(--berry)', bg: 'var(--berry-soft)' },
  estancamiento: { text: 'Peso estancado', color: 'var(--honey)', bg: 'var(--honey-soft)' },
}

function AlertsSection({ patients }: { patients: PracticeKPIs['patients_needing_attention'] }) {
  return (
    <SectionCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="fk-eyebrow">REQUIEREN ATENCIÓN</div>
        {patients.length > 0 && (
          <span style={{
            fontSize: 11, color: 'var(--berry)', fontFamily: 'var(--f-mono)',
            background: 'var(--berry-soft)', padding: '3px 8px', borderRadius: 20,
          }}>
            {patients.length} paciente{patients.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {patients.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Semaforo value={100} lo={60} hi={80} size={11} />
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
            Sin alertas activas. Todo en orden.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {patients.map(p => {
            const alertMeta = p.alert ? ALERT_META[p.alert] : null
            const adherColor = p.adherence == null ? 'var(--ink-5)'
              : p.adherence >= 80 ? 'var(--leaf)'
              : p.adherence >= 60 ? 'var(--honey)'
              : 'var(--signal)'
            return (
              <Link
                key={p.patient_id}
                href={`/clinic/pacientes/${p.patient_id}`}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px solid var(--ink-7)',
                  textDecoration: 'none', color: 'var(--ink)', gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                    {p.days_since_activity != null ? `hace ${p.days_since_activity}d sin registros` : 'sin registros'}
                    {p.adherence != null && ` · ${p.adherence}% adherencia`}
                  </div>
                </div>

                {/* Adherencia mini */}
                {p.adherence != null && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                    <RingChart value={p.adherence} max={100} size={36} strokeW={4} color={adherColor} />
                    <span style={{ fontSize: 9, color: adherColor, fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                      {p.adherence}%
                    </span>
                  </div>
                )}

                {alertMeta && <span style={chipStyle(alertMeta.color, alertMeta.bg)}>{alertMeta.text}</span>}
                <Ic.chevR />
              </Link>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [kpis,         setKpis]        = useState<PracticeKPIs | null>(null)
  const [todayAppts,   setTodayAppts]  = useState<Appointment[]>([])
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState<string | null>(null)
  const todayCDMX = getTodayInTimezone()

  useEffect(() => {
    if (userLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const pract = await loadPractitionerByUser(supabase, user.id)
        if (cancelled) return
        if (!pract) { setError('No tienes registro de nutriólogo en esta cuenta.'); setLoading(false); return }
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

  if (loading)        return <LoadingState label="Cargando dashboard" />
  if (error || !kpis) return (
    <div style={{ padding: '60px 40px' }}>
      <div className="fk-eyebrow" style={{ color: 'var(--berry)' }}>Error</div>
      <p className="fk-serif" style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300, marginTop: 8 }}>
        {error ?? 'No se pudieron cargar los datos.'}
      </p>
    </div>
  )

  const [, mm] = todayCDMX.split('-').map(Number)
  const [yy]   = todayCDMX.split('-').map(Number)
  const monthLabel   = `${MONTHS_CAP[mm - 1]} ${yy}`
  const monthTotal   = kpis.appointments_month.total
  const cancelledPct = numPct(kpis.appointments_month.cancelled, monthTotal)
  const noShowPct    = numPct(kpis.appointments_month.no_show,   monthTotal)

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>
      <ClinicTopbar
        sub={`Práctica · ${monthLabel}`}
        title={<><span style={{ fontStyle: 'italic' }}>Dashboard</span></>}
      />

      <div style={{ padding: '24px 40px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Hoy ── */}
        <TodaySection appts={todayAppts} />

        {/* ── Consultoría ── */}
        <div>
          <div className="fk-eyebrow" style={{ marginBottom: 12, paddingLeft: 2 }}>
            CONSULTORÍA · {monthLabel.toUpperCase()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>

            {/* Pacientes activos + anillo */}
            <KPICard
              label="Pacientes activos"
              value={kpis.active_patients}
              sub={kpis.pending_invites > 0 ? `+ ${kpis.pending_invites} invitación${kpis.pending_invites !== 1 ? 'es' : ''} pendiente${kpis.pending_invites !== 1 ? 's' : ''}` : 'todos vinculados'}
              right={
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <RingChart
                    value={kpis.active_patients}
                    max={kpis.active_patients + kpis.pending_invites}
                    size={52} strokeW={5}
                    color="var(--leaf)"
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 9, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>activos</span>
                  </div>
                </div>
              }
            />

            {/* Nuevos este mes */}
            <KPICard
              label="Nuevos este mes"
              value={kpis.new_patients_month}
              accent={kpis.new_patients_month > 0 ? 'var(--leaf)' : undefined}
              sub={kpis.new_patients_month === 0 ? 'sin altas este mes' : `vinculados en ${monthLabel}`}
              right={kpis.new_patients_month > 0 ? (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--leaf-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: 'var(--leaf)', flexShrink: 0,
                }}>
                  ↑
                </div>
              ) : undefined}
            />

            {/* Invitaciones pendientes */}
            <KPICard
              label="Invitaciones pendientes"
              value={kpis.pending_invites}
              accent={kpis.pending_invites > 0 ? 'var(--honey)' : undefined}
              sub={kpis.pending_invites === 0 ? 'todos vinculados' : 'esperando respuesta'}
              right={
                <Semaforo
                  value={kpis.pending_invites}
                  lo={1} hi={0}
                  reverse
                  size={11}
                />
              }
            />

            {/* Citas completadas + barra */}
            <KPICard
              label="Citas completadas"
              value={kpis.appointments_month.completed}
              sub={monthTotal > 0 ? `de ${monthTotal} agendadas este mes · ${strPct(kpis.appointments_month.completed, monthTotal)}` : 'sin citas este mes'}
              bottom={monthTotal > 0 ? (
                <BarFill value={kpis.appointments_month.completed} max={monthTotal} color="var(--leaf)" />
              ) : undefined}
            />

            {/* Cancelaciones + semáforo + barra */}
            <KPICard
              label="Cancelaciones"
              value={kpis.appointments_month.cancelled}
              accent={kpis.appointments_month.cancelled > 0 ? 'var(--berry)' : undefined}
              sub={monthTotal > 0 ? `${strPct(kpis.appointments_month.cancelled, monthTotal)} del total este mes` : '—'}
              right={
                <Semaforo
                  value={cancelledPct}
                  lo={15} hi={0}
                  reverse
                  size={11}
                />
              }
              bottom={monthTotal > 0 ? (
                <BarFill
                  value={kpis.appointments_month.cancelled} max={monthTotal}
                  color={cancelledPct > 15 ? 'var(--berry)' : cancelledPct > 0 ? 'var(--honey)' : 'var(--leaf)'}
                />
              ) : undefined}
            />

            {/* No-shows + semáforo + barra */}
            <KPICard
              label="No-shows"
              value={kpis.appointments_month.no_show}
              accent={kpis.appointments_month.no_show > 0 ? 'var(--honey)' : undefined}
              sub={monthTotal > 0 ? `${strPct(kpis.appointments_month.no_show, monthTotal)} del total este mes` : '—'}
              right={
                <Semaforo
                  value={noShowPct}
                  lo={10} hi={0}
                  reverse
                  size={11}
                />
              }
              bottom={monthTotal > 0 ? (
                <BarFill
                  value={kpis.appointments_month.no_show} max={monthTotal}
                  color={noShowPct > 10 ? 'var(--berry)' : noShowPct > 0 ? 'var(--honey)' : 'var(--leaf)'}
                />
              ) : undefined}
            />

          </div>
        </div>

        {/* ── Progreso clínico ── */}
        <AdherenceSection kpis={kpis} practitioner={practitioner} />

        {/* ── Alertas ── */}
        <AlertsSection patients={kpis.patients_needing_attention} />

        {/* ── Plataforma ── */}
        <SectionCard>
          <div className="fk-eyebrow" style={{ marginBottom: 20 }}>PLATAFORMA · FITKIS</div>
          <PlatformCalculator activePatients={kpis.active_patients} />
        </SectionCard>

      </div>
    </div>
  )
}
