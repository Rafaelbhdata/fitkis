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

// ─── Primitivos SVG / visuales ────────────────────────────────────────────────

/** Gauge semicircular — arco de 180° tipo velocímetro */
function SemicircleGauge({
  pct, size = 180, strokeW = 14,
}: { pct: number; size?: number; strokeW?: number }) {
  const r  = size / 2 - strokeW / 2 - 2
  const cx = size / 2
  const cy = size / 2

  const toXY = (p: number) => {
    const angle = Math.PI * (1 - p / 100)
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) }
  }

  const start    = toXY(0)
  const endBg    = toXY(99.99)   // evitar punto degenerado en 180°
  const valPoint = toXY(Math.max(0.5, Math.min(pct, 99.5)))

  const color = pct >= 80 ? 'var(--leaf)' : pct >= 60 ? 'var(--honey)' : 'var(--signal)'

  const bgPath  = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${endBg.x.toFixed(2)} ${endBg.y.toFixed(2)}`
  const valPath = pct > 0
    ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${valPoint.x.toFixed(2)} ${valPoint.y.toFixed(2)}`
    : null

  return (
    // overflow:hidden recorta la mitad inferior del SVG
    <div style={{ overflow: 'hidden', height: size / 2 + strokeW / 2, width: size }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <path d={bgPath}  fill="none" stroke="var(--paper-3)" strokeWidth={strokeW} strokeLinecap="round" />
        {valPath && (
          <path d={valPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {/* Dot en el extremo del arco */}
        {pct > 0 && pct < 100 && (
          <circle cx={valPoint.x} cy={valPoint.y} r={strokeW / 2 + 1} fill={color} />
        )}
      </svg>
    </div>
  )
}

/** Anillo circular de progreso */
function RingChart({
  value, max, size = 52, strokeW = 5, color = 'var(--leaf)',
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
 * `reverse=true`: 0 es bueno (cancelaciones).
 * `reverse=false`: alto es bueno (adherencia).
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
          transition: 'opacity 0.2s',
        }} />
      ))}
    </div>
  )
}

/** Grilla de puntos — cada círculo representa un paciente */
function PatientDotGrid({ distribution, total }: {
  distribution: PracticeKPIs['adherence_distribution']
  total: number
}) {
  if (total === 0) return (
    <p style={{ fontSize: 12, color: 'var(--ink-5)', fontStyle: 'italic', margin: 0 }}>
      Sin pacientes activos.
    </p>
  )
  const dots = [
    ...Array(distribution.high).fill({ color: 'var(--leaf)',   label: 'alta'     }),
    ...Array(distribution.medium).fill({ color: 'var(--honey)', label: 'media'    }),
    ...Array(distribution.low).fill({ color: 'var(--signal)',  label: 'baja'     }),
    ...Array(distribution.sin_datos).fill({ color: 'var(--ink-6)', label: 'sin datos' }),
  ] as Array<{ color: string; label: string }>

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {dots.map((d, i) => (
          <div key={i} title={d.label} style={{
            width: 11, height: 11, borderRadius: '50%',
            background: d.color,
          }} />
        ))}
      </div>
      {/* Leyenda compacta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
        {[
          { color: 'var(--leaf)',   label: 'Alta ≥80%',   n: distribution.high      },
          { color: 'var(--honey)',  label: 'Media 60–79%', n: distribution.medium   },
          { color: 'var(--signal)', label: 'Baja <60%',    n: distribution.low      },
          { color: 'var(--ink-6)', label: 'Sin datos',     n: distribution.sin_datos },
        ].filter(s => s.n > 0).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{s.n}</strong> {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tarjeta base ─────────────────────────────────────────────────────────────

function Card({ children, style, accent, accentBg, href }: {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
  accentBg?: string
  href?: string
}) {
  const [hovered, setHovered] = useState(false)

  const inner = (
    <div style={{
      ...(href ? { flex: 1 } : {}),
      background: '#fff',
      borderTop: '1px solid var(--ink-7)',
      borderRight: '1px solid var(--ink-7)',
      borderBottom: '1px solid var(--ink-7)',
      borderLeft: accent ? `4px solid ${accent}` : '1px solid var(--ink-7)',
      borderRadius: 14,
      transition: 'box-shadow 0.15s ease, transform 0.12s ease',
      ...(hovered ? { boxShadow: '0 6px 20px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' } : {}),
      ...style,
    }}>
      {children}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </Link>
    )
  }

  return inner
}

// ─── Sección 1: Hoy ───────────────────────────────────────────────────────────

function TodaySection({ appts }: { appts: Appointment[] }) {
  const total     = appts.length
  const completed = appts.filter(isCompletedAppointment).length
  const cancelled = appts.filter(a => a.status === 'cancelled' || a.status === 'no_show').length
  const pending   = total - completed - cancelled
  const ringColor = total === 0 ? 'var(--ink-6)'
    : completed === total ? 'var(--leaf)'
    : 'var(--sky)'

  const todayAccent  = total === 0 ? 'var(--ink-5)' : ringColor
  const todayAccentBg = ringColor === 'var(--leaf)' ? 'var(--leaf-soft)'
    : ringColor === 'var(--sky)' ? 'var(--sky-soft)'
    : '#fff'

  const stats = [
    { n: total,     label: 'citas',      color: 'var(--ink)'  },
    { n: completed, label: 'completadas', color: 'var(--leaf)' },
    { n: pending,   label: 'pendientes',  color: 'var(--sky)'  },
    { n: cancelled, label: 'canceladas',  color: cancelled > 0 ? 'var(--berry)' : 'var(--ink-5)' },
  ]

  return (
    <Card style={{ padding: '24px 28px' }} accent="var(--ink)" href="/clinic/agenda">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="fk-eyebrow">
          {`HOY · ${fmtLongDate(getTodayInTimezone()).toUpperCase()}`}
        </div>
        {total > 0 && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <RingChart value={completed} max={total} size={52} strokeW={5} color={ringColor} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="fk-serif" style={{ fontSize: 13, fontWeight: 300, lineHeight: 1, color: ringColor }}>
                {Math.round((completed / total) * 100)}
              </span>
              <span style={{ fontSize: 8, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}>%</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats — 4 columnas iguales con separadores */}
      <div style={{ display: 'flex' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1,
            paddingLeft: i > 0 ? 28 : 0,
            paddingRight: i < stats.length - 1 ? 28 : 0,
            borderLeft: i > 0 ? '1px solid var(--ink-7)' : 'none',
          }}>
            <div className="fk-serif" style={{
              fontSize: 44, fontWeight: 300,
              letterSpacing: '-0.03em', lineHeight: 1, color: s.color,
            }}>
              {s.n}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Lista de citas */}
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
          {appts.map(appt => {
            const meta = apptStatusMeta(appt)
            const time = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
              hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
            })
            return (
              <div key={appt.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 14px',
                background: 'var(--paper)', borderRadius: 8,
                borderLeft: `3px solid ${meta.color}`,
              }}>
                <span className="fk-mono" style={{
                  fontSize: 13, fontWeight: 700,
                  color: meta.color, minWidth: 42,
                }}>
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

      {total === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: '16px 0 0' }}>
          Agenda libre hoy.
        </p>
      )}
    </Card>
  )
}

// ─── Sección 2: Consultoría ───────────────────────────────────────────────────

function ConsultoriaSection({ kpis, monthLabel, monthTotal, alertPatients }: {
  kpis: PracticeKPIs
  monthLabel: string
  monthTotal: number
  alertPatients: PracticeKPIs['patients_needing_attention']
}) {
  const cancelledPct = numPct(kpis.appointments_month.cancelled, monthTotal)
  const noShowPct    = numPct(kpis.appointments_month.no_show, monthTotal)
  const completedPct = numPct(kpis.appointments_month.completed, monthTotal)

  const barColor = (pct: number, reverseGood: boolean) =>
    reverseGood
      ? pct === 0 ? 'var(--leaf)' : pct <= 15 ? 'var(--honey)' : 'var(--berry)'
      : pct >= 80 ? 'var(--leaf)' : pct >= 50 ? 'var(--honey)' : 'var(--signal)'

  return (
    <div>
      <div className="fk-eyebrow" style={{ marginBottom: 12, paddingLeft: 2 }}>
        CONSULTORÍA · {monthLabel.toUpperCase()}
      </div>

      {/* Bento: fila superior 3 tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>

        {/* Pacientes activos */}
        <Card style={{ padding: '22px 24px' }} accent="var(--sky)" accentBg="var(--sky-soft)" href="/clinic">
          <div className="fk-eyebrow">Pacientes con licencia activa</div>
          <div style={{ marginTop: 10 }}>
            {/* Número + fracción */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="fk-serif" style={{
                fontSize: 44, fontWeight: 300,
                letterSpacing: '-0.02em', lineHeight: 1,
                color: 'var(--sky)',
              }}>
                {kpis.active_patients}
              </span>
              <span style={{ fontSize: 16, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', fontWeight: 400 }}>
                / {kpis.total_linked}
              </span>
            </div>

            {/* Porcentaje en barra + número */}
            {kpis.total_linked > 0 && (() => {
              const pct = Math.round((kpis.active_patients / kpis.total_linked) * 100)
              return (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                      vinculados totales
                    </span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--sky)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sky)', borderRadius: 999 }} />
                  </div>
                </div>
              )
            })()}

          </div>
        </Card>

        {/* Nuevos este mes */}
        <Card style={{ padding: '22px 24px' }} accent="var(--leaf)" accentBg="var(--leaf-soft)">
          <div className="fk-eyebrow">Pacientes nuevos este mes</div>
          <div style={{ marginTop: 10 }}>
            {(() => {
              const prev      = kpis.active_patients - kpis.new_patients_month
              const growthPct = prev > 0
                ? Math.round((kpis.new_patients_month / prev) * 100)
                : kpis.new_patients_month > 0 ? 100 : 0
              const barPct    = Math.min(growthPct, 100)
              const color     = growthPct > 0 ? 'var(--leaf)' : 'var(--ink-4)'
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="fk-serif" style={{
                      fontSize: 44, fontWeight: 300,
                      letterSpacing: '-0.02em', lineHeight: 1,
                      color: kpis.new_patients_month > 0 ? 'var(--leaf)' : 'var(--ink)',
                    }}>
                      {kpis.new_patients_month}
                    </span>
                    <span style={{ fontSize: 16, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                      / {kpis.active_patients}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                        crecimiento de cartera
                      </span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--f-mono)', fontWeight: 700, color }}>
                        {growthPct > 0 ? '+' : ''}{growthPct}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', background: color, borderRadius: 999 }} />
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </Card>

        {/* Requieren atención */}
        <Card
          style={{ padding: '22px 24px' }}
          accent="var(--honey)"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="fk-eyebrow">Pacientes inactivos</div>
            {alertPatients.length > 0 && (
              <span style={{
                fontSize: 11, color: 'var(--berry)', fontFamily: 'var(--f-mono)',
                background: 'var(--berry-soft)', padding: '3px 10px', borderRadius: 20,
              }}>
                {alertPatients.length}
              </span>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            {alertPatients.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                <Semaforo value={100} lo={60} hi={80} size={9} />
                <span style={{ fontSize: 12, color: 'var(--leaf)', fontFamily: 'var(--f-mono)' }}>todo activo</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                {alertPatients.slice(0, 4).map(p => (
                  <Link key={p.patient_id} href={`/clinic/pacientes/${p.patient_id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <span style={{ fontSize: 13, fontFamily: 'var(--f-sans)', color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
                      {p.days_since_activity != null ? `${p.days_since_activity}d` : 'sin reg.'}
                    </span>
                  </Link>
                ))}
                {alertPatients.length > 4 && (
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                    +{alertPatients.length - 4} más
                  </span>
                )}
                <Link
                  href="/clinic?filter=atencion"
                  style={{ fontSize: 11, color: 'var(--honey)', fontFamily: 'var(--f-mono)', marginTop: 4, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Ver todos <Ic.chevR />
                </Link>
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* Fila inferior: citas (2/3) + sin cita (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12, alignItems: 'stretch' }}>
      <Card style={{ padding: '24px 28px' }} accent="var(--ink-5)" href="/clinic/agenda">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center' }}>

          {/* Número grande de total */}
          <div style={{ minWidth: 100 }}>
            <div className="fk-eyebrow" style={{ marginBottom: 10 }}>Citas · {monthLabel}</div>
            <span className="fk-serif" style={{
              fontSize: 56, fontWeight: 300,
              letterSpacing: '-0.03em', lineHeight: 1,
            }}>
              {monthTotal}
            </span>
            <div style={{ fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', marginTop: 6 }}>
              agendadas este mes
            </div>
          </div>

          {/* Bullet bars */}
          {monthTotal === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
              Sin citas este mes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  label: 'Completadas', n: kpis.appointments_month.completed,
                  pct: completedPct, color: barColor(completedPct, false),
                  semaforo: <Semaforo value={completedPct} lo={50} hi={80} size={8} />,
                },
                {
                  label: 'Cancelaciones', n: kpis.appointments_month.cancelled,
                  pct: cancelledPct, color: barColor(cancelledPct, true),
                  semaforo: <Semaforo value={cancelledPct} lo={15} hi={0} reverse size={8} />,
                },
                {
                  label: 'No-shows', n: kpis.appointments_month.no_show,
                  pct: noShowPct, color: barColor(noShowPct, true),
                  semaforo: <Semaforo value={noShowPct} lo={10} hi={0} reverse size={8} />,
                },
              ].map(b => (
                <div key={b.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.semaforo}
                      <span className="fk-eyebrow">{b.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span className="fk-serif" style={{ fontSize: 22, fontWeight: 300, color: b.color, lineHeight: 1 }}>
                        {b.n}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                        / {monthTotal} · {b.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Bullet bar con target line */}
                  <div style={{ height: 8, background: 'var(--paper-3)', borderRadius: 999, position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      width: `${b.pct}%`, height: '100%',
                      background: b.color, borderRadius: 999,
                      transition: 'width 0.5s ease-out',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Sin cita próxima */}
      {(() => {
        const sinCitaColor = 'var(--berry)'
        const pct = kpis.active_patients > 0
          ? Math.round((kpis.patients_without_upcoming_appt / kpis.active_patients) * 100)
          : 0
        return (
          <Card style={{ padding: '22px 24px' }} accent="var(--berry)" href="/clinic/agenda">
            <div className="fk-eyebrow">Pacientes sin cita · próximos 30 días</div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="fk-serif" style={{
                  fontSize: 44, fontWeight: 300,
                  letterSpacing: '-0.02em', lineHeight: 1,
                  color: sinCitaColor,
                }}>
                  {kpis.patients_without_upcoming_appt}
                </span>
                <span style={{ fontSize: 16, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                  / {kpis.active_patients}
                </span>
              </div>
              {kpis.active_patients > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                      de pacientes activos
                    </span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--f-mono)', fontWeight: 700, color: sinCitaColor }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: sinCitaColor, borderRadius: 999 }} />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )
      })()}

      </div>
    </div>
  )
}

// ─── Sección 3: Progreso clínico ──────────────────────────────────────────────

function ProgressSection({ kpis, practitioner }: {
  kpis: PracticeKPIs
  practitioner: PractitionerRecord | null
}) {
  const avg    = kpis.avg_adherence
  const minPct = practitioner?.min_adherence_pct ?? 60
  const color  = avg == null ? 'var(--ink-5)' : avg >= 80 ? 'var(--leaf)' : avg >= 60 ? 'var(--honey)' : 'var(--signal)'
  const progressBg = avg == null ? '#fff' : avg >= 80 ? 'var(--leaf-soft)' : avg >= 60 ? 'var(--honey-soft)' : 'var(--signal-soft)'

  return (
    <Card style={{ padding: '24px 28px' }} accent={color} accentBg={progressBg} href="/clinic">
      <div className="fk-eyebrow" style={{ marginBottom: 24 }}>
        PROGRESO CLÍNICO · ÚLTIMOS 30 DÍAS
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 48, alignItems: 'start' }}>

        {/* Gauge + número */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <SemicircleGauge pct={avg ?? 0} size={200} strokeW={16} />
          <div style={{ marginTop: -4, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <span className="fk-serif" style={{
                fontSize: 60, fontWeight: 300,
                letterSpacing: '-0.03em', lineHeight: 1, color,
              }}>
                {avg ?? '—'}
              </span>
              {avg != null && (
                <span style={{ fontSize: 20, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>%</span>
              )}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Semaforo value={avg ?? 0} lo={60} hi={80} size={10} />
              <span style={{ fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}>
                umbral {minPct}%
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginTop: 4 }}>
              adherencia promedio
            </div>
          </div>
        </div>

        {/* Dot grid */}
        <div>
          <div className="fk-eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 16 }}>
            {kpis.active_patients} PACIENTE{kpis.active_patients !== 1 ? 'S' : ''} · UN PUNTO CADA UNO
          </div>
          <PatientDotGrid
            distribution={kpis.adherence_distribution}
            total={kpis.active_patients}
          />
        </div>
      </div>
    </Card>
  )
}

// ─── Sección 4: Alertas ───────────────────────────────────────────────────────

const ALERT_META: Record<string, { text: string; color: string; bg: string }> = {
  inactividad:   { text: 'Inactividad',    color: 'var(--berry)', bg: 'var(--berry-soft)' },
  estancamiento: { text: 'Peso estancado', color: 'var(--honey)', bg: 'var(--honey-soft)' },
}

function AlertsSection({ patients }: { patients: PracticeKPIs['patients_needing_attention'] }) {
  const hasAlerts = patients.length > 0
  return (
    <Card
      style={{ padding: '24px 28px' }}
      accent={hasAlerts ? 'var(--berry)' : 'var(--leaf)'}
      accentBg={hasAlerts ? 'var(--berry-soft)' : 'var(--leaf-soft)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div className="fk-eyebrow">REQUIEREN ATENCIÓN</div>
        {patients.length > 0 ? (
          <span style={{
            fontSize: 11, color: 'var(--berry)', fontFamily: 'var(--f-mono)',
            background: 'var(--berry-soft)', padding: '3px 10px', borderRadius: 20,
          }}>
            {patients.length} paciente{patients.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Semaforo value={100} lo={60} hi={80} size={9} />
            <span style={{ fontSize: 11, color: 'var(--leaf)', fontFamily: 'var(--f-mono)' }}>todo en orden</span>
          </div>
        )}
      </div>

      {patients.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
          Sin alertas activas.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {patients.map(p => {
            const alertMeta  = p.alert ? ALERT_META[p.alert] : null
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
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                    {p.days_since_activity != null ? `hace ${p.days_since_activity}d sin registros` : 'sin registros'}
                    {p.adherence != null && ` · ${p.adherence}% adherencia`}
                  </div>
                </div>
                {p.adherence != null && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 44 }}>
                    <RingChart value={p.adherence} max={100} size={34} strokeW={4} color={adherColor} />
                    <span style={{ fontSize: 9, color: adherColor, fontFamily: 'var(--f-mono)', fontWeight: 700 }}>
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
    </Card>
  )
}

// ─── Sección 5: Plataforma ────────────────────────────────────────────────────

const STORAGE_KEY = 'fitkis_cost_per_patient'

function PlatformSection({ activePatients }: { activePatients: number }) {
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
  const total   = !isNaN(numCost) && numCost > 0 ? numCost * activePatients : null

  return (
    <Card style={{ padding: '24px 28px' }} accent="var(--honey)" accentBg="var(--honey-soft)">
      <div className="fk-eyebrow" style={{ marginBottom: 20 }}>PLATAFORMA · FITKIS</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Input */}
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
    </Card>
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

  const [yy, mm]    = todayCDMX.split('-').map(Number)
  const monthLabel  = `${MONTHS_CAP[mm - 1]} ${yy}`
  const monthTotal  = kpis.appointments_month.total

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>
      <ClinicTopbar
        sub={`Práctica · ${monthLabel}`}
        title={<><span style={{ fontStyle: 'italic' }}>Dashboard</span></>}
      />

      <div style={{ padding: '24px 40px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TodaySection    appts={todayAppts} />
        <ConsultoriaSection kpis={kpis} monthLabel={monthLabel} monthTotal={monthTotal} alertPatients={kpis.patients_needing_attention} />
        <ProgressSection kpis={kpis} practitioner={practitioner} />
        <PlatformSection activePatients={kpis.active_patients} />
      </div>
    </div>
  )
}
