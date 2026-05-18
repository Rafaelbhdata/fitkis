'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import { LoadingState } from '@/components/ui/LoadingState'
import { Ic } from '@/components/clinic/Ic'
import { ConsultationNotesCard } from '@/components/clinic/ConsultationNotesCard'
import { generatePatientReport } from '@/components/clinic/PatientReportPDF'
import { InBodyModal } from '@/components/clinic/InBodyModal'
import { GoalBadge, GoalEditorModal, type GoalType } from '@/components/clinic/GoalEditor'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPatientDetail,
  loadPractitionerByUser,
  loadPatientFoodLogs,
  loadPatientGymSessions,
  loadNextAppointmentForPatient,
  loadConsultationNotes,
  loadAppointmentNotesForPatient,
  updatePatientGoals,
  updatePatientTier,
  resendInvitation,
  removePatientRelation,
  daysBetween,
  type PatientDetail,
  type PractitionerRecord,
  type FoodLogEntry,
  type GymSessionEntry,
  type Appointment,
} from '@/lib/clinic/queries'
import type { WeightLog } from '@/types'
import { getTodayInTimezone, getNowPartsInTimezone, shiftDateISO, calculateBMI } from '@/lib/utils'

type Tab = 'resumen' | 'alim' | 'gym' | 'msg'

const TABS: { k: Tab; n: string }[] = [
  { k: 'resumen', n: 'Resumen' },
  { k: 'alim', n: 'Alimentación' },
  { k: 'gym', n: 'Entrenamiento' },
  { k: 'msg', n: 'Conversación' },
]


function RightRail({ patient, nextAppointment }: { patient: PatientDetail; nextAppointment: Appointment | null }) {
  const groups = [
    { g: 'Verdura',  n: patient.active_diet?.verdura    ?? 0, c: 'var(--leaf)',   bg: 'var(--leaf-soft)'  },
    { g: 'Fruta',    n: patient.active_diet?.fruta      ?? 0, c: '#b8721d',       bg: '#f3e4cf'           },
    { g: 'Cereal',   n: patient.active_diet?.carb       ?? 0, c: 'var(--honey)',  bg: 'var(--honey-soft)' },
    { g: 'Proteína', n: patient.active_diet?.proteina   ?? 0, c: 'var(--berry)',  bg: 'var(--berry-soft)' },
    { g: 'Grasa',    n: patient.active_diet?.grasa      ?? 0, c: 'var(--ink-3)',  bg: 'var(--paper-3)'   },
    { g: 'Legumin.', n: patient.active_diet?.leguminosa ?? 0, c: 'var(--sky)',    bg: 'var(--sky-soft)'  },
  ]
  const totalEquivs = groups.reduce((acc, g) => acc + g.n, 0)
  const activeMealsCount = patient.active_diet
    ? Object.values(patient.active_diet.active_meals).filter(Boolean).length
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Plan vigente */}
      <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="fk-eyebrow">
            Plan {patient.active_diet ? `vigente · v${patient.active_diet.version}` : '· sin plan'}
          </div>
          {patient.active_diet && (
            <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
              desde {formatDateShort(patient.active_diet.effective_date)}
            </span>
          )}
        </div>
        {patient.active_diet ? (
          <>
            <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 6, lineHeight: 1.1 }}>
              {totalEquivs} equivalente{totalEquivs === 1 ? '' : 's'} · {activeMealsCount} comida{activeMealsCount === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {groups.map((g) => (
                <div key={g.g} style={{ background: g.bg, borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: g.c, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>{g.g}</span>
                  <span className="fk-serif" style={{ fontSize: 18, fontWeight: 300, color: g.c }}>{g.n}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {Object.entries(MEAL_LABEL).map(([k, v]) => {
                const active = patient.active_diet!.active_meals[k] === true
                return (
                  <span key={k} title={v} style={{
                    flex: 1, textAlign: 'center',
                    padding: '5px 0',
                    borderRadius: 8,
                    fontSize: 10, fontFamily: 'var(--f-mono)', fontWeight: 700,
                    background: active ? 'var(--ink-4)' : 'var(--paper-3)',
                    color: active ? 'var(--paper)' : 'var(--ink-7)',
                  }}>
                    {k.startsWith('snack') ? `S${k.slice(-1)}` : v[0]}
                  </span>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)' }}>
            Este paciente aún no tiene un plan activo. Crea uno para empezar el seguimiento.
          </div>
        )}
        <Link
          href={`/clinic/pacientes/${patient.patient_id}/plan`}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 14,
            padding: '10px',
            textAlign: 'center',
            borderRadius: 999,
            border: '1px solid #ff5a1f',
            background: '#ff5a1f',
            fontSize: 12,
            fontFamily: 'var(--f-sans)',
            fontWeight: 500,
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          {patient.active_diet ? 'Editar plan →' : 'Crear primer plan →'}
        </Link>
      </div>

      {/* Próxima consulta */}
      <div
        style={{
          background: 'var(--ink)',
          color: 'var(--paper)',
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
        <div className="fk-eyebrow" style={{ color: 'var(--signal)' }}>
          Próxima consulta
        </div>
        {nextAppointment ? (
          <>
            <div
              className="fk-serif"
              style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 8, lineHeight: 1.2 }}
            >
              {formatAppointmentDate(nextAppointment.starts_at)}
            </div>
            <div
              style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 6, fontFamily: 'var(--f-mono)' }}
            >
              {formatAppointmentTime(nextAppointment.starts_at)} · {nextAppointment.duration_minutes} min
            </div>
          </>
        ) : (
          <>
            <div
              className="fk-serif"
              style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 8, lineHeight: 1.2 }}
            >
              Sin cita agendada
            </div>
            <div
              style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 6, fontFamily: 'var(--f-mono)' }}
            >
              Ve a <a href="/clinic/agenda" style={{ color: '#fff', textDecoration: 'underline' }}>agenda</a> para programar
            </div>
          </>
        )}
      </div>

      {/* Adherencia */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
        <div className="fk-eyebrow">
          Adherencia · {patient.adherence_window.since_appointment
            ? `${patient.adherence_window.days} d desde última cita`
            : `${patient.adherence_window.days} días`}
        </div>
        {(() => {
          const pct = patient.adherence ?? 0
          return (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="fk-serif" style={{ fontSize: 36, fontWeight: 300, lineHeight: 1 }}>
                  {pct}
                </span>
                <span style={{ fontSize: 14, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>%</span>
              </div>
              <div style={{ marginTop: 10, height: 6, background: 'var(--paper-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: pct >= 70 ? 'var(--leaf)' : pct >= 40 ? 'var(--honey)' : 'var(--berry)',
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              {patient.streak > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                  racha · {patient.streak} día{patient.streak !== 1 ? 's' : ''} consecutivo{patient.streak !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Quick link · Biblioteca */}
      <Link
        href="/clinic/biblioteca"
        style={{
          display: 'block',
          background: 'var(--signal-soft)',
          border: '1px solid var(--signal-soft)',
          borderRadius: 14,
          padding: '18px 22px',
          textDecoration: 'none',
        }}
      >
        <div className="fk-eyebrow" style={{ color: '#a33a0f' }}>
          Biblioteca de plantillas
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#a33a0f',
            marginTop: 10,
            fontFamily: 'var(--f-sans)',
            lineHeight: 1.5,
            opacity: 0.85,
          }}
        >
          Reusa planes, mensajes y recetas guardadas. Ir a la biblioteca →
        </div>
      </Link>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants for tabs
// ─────────────────────────────────────────────────────────────────────────────

const FOOD_GROUPS = [
  { key: 'verdura',    label: 'Verdura',    color: 'var(--leaf)',   bg: 'var(--leaf-soft)'  },
  { key: 'fruta',      label: 'Fruta',      color: '#b8721d',       bg: '#f3e4cf'           },
  { key: 'carb',       label: 'Cereal',     color: 'var(--honey)',  bg: 'var(--honey-soft)' },
  { key: 'proteina',   label: 'Proteína',   color: 'var(--berry)',  bg: 'var(--berry-soft)' },
  { key: 'grasa',      label: 'Grasa',      color: 'var(--ink-3)',  bg: 'var(--paper-3)'   },
  { key: 'leguminosa', label: 'Leguminosa', color: 'var(--sky)',    bg: 'var(--sky-soft)'  },
] as const

const DEFAULT_BUDGET: Record<string, number> = {
  verdura: 4, fruta: 2, carb: 4, proteina: 8, grasa: 6, leguminosa: 1,
}

const ROUTINE_META: Record<string, { label: string; color: string; bg: string }> = {
  upper_a: { label: 'Upper A', color: 'var(--leaf)',  bg: 'var(--leaf-soft)'  },
  upper_b: { label: 'Upper B', color: 'var(--sky)',   bg: 'var(--sky-soft)'   },
  lower_a: { label: 'Lower A', color: 'var(--berry)', bg: 'var(--berry-soft)' },
  lower_b: { label: 'Lower B', color: 'var(--honey)', bg: 'var(--honey-soft)' },
}

const FEELING_LABEL: Record<string, string> = {
  muy_pesado: 'Muy pesado', dificil: 'Difícil', perfecto: 'Perfecto',
  ligero: 'Ligero', quiero_mas: 'Quiero más',
}

const MEAL_LABEL: Record<string, string> = {
  desayuno: 'Desayuno', snack1: 'Snack mañana', comida: 'Comida',
  snack2: 'Snack tarde', cena: 'Cena', snack3: 'Snack noche',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getMonday(offsetWeeks = 0): Date {
  // Lunes de la semana actual en CDMX, devuelto como Date anclado a mediodía UTC
  // para que los siguientes `.setDate(... + i)` y `getDate()` se mantengan consistentes.
  const { dayOfWeek, date: todayISO } = getNowPartsInTimezone()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayISO = shiftDateISO(todayISO, diff + offsetWeeks * 7)
  const [y, m, d] = mondayISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function toISO(d: Date): string {
  // Date anclado a mediodía UTC: en CDMX (-6) sigue siendo el mismo día.
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Semáforo de rango — portado del módulo Peso (app móvil)
// ─────────────────────────────────────────────────────────────────────────────

type ZoneColor = 'green' | 'yellow' | 'red'
type Zone = { color: ZoneColor; to: number; label: string }
type RangeMeterConfig = { min: number; max: number; zones: Zone[] }

// Colores semáforo vivos (igual que la app: green-600 / amber-500 / red-600).
const ZONE_HEX: Record<ZoneColor, string> = {
  green:  '#16a34a',
  yellow: '#f59e0b',
  red:    '#dc2626',
}

const METER_RANGES: Record<string, RangeMeterConfig> = {
  bmi:      { min: 15, max: 40, zones: [{ color: 'yellow', to: 18.5, label: 'Bajo peso' },  { color: 'green',  to: 25, label: 'Normal'     }, { color: 'red', to: 40, label: 'Sobrepeso' }] },
  bf_pct:   { min: 5,  max: 35, zones: [{ color: 'green',  to: 18,   label: 'Saludable' },  { color: 'yellow', to: 25, label: 'Elevado'     }, { color: 'red', to: 35, label: 'Alto'       }] },
  muscle:   { min: 25, max: 45, zones: [{ color: 'red',    to: 30,   label: 'Bajo'      },  { color: 'yellow', to: 35, label: 'Medio'       }, { color: 'green', to: 45, label: 'Alto'     }] },
  fat_mass: { min: 5,  max: 30, zones: [{ color: 'green',  to: 15,   label: 'Saludable' },  { color: 'yellow', to: 22, label: 'Elevado'     }, { color: 'red', to: 30, label: 'Alto'       }] },
}

function meterActiveIdx(value: number, cfg: RangeMeterConfig): number {
  for (let i = 0; i < cfg.zones.length; i++) {
    if (value <= cfg.zones[i].to) return i
  }
  return cfg.zones.length - 1
}

function RangeMeter({ value, config, goalValue }: { value?: number; config: RangeMeterConfig; goalValue?: number }) {
  const { min, max, zones } = config
  const hasValue    = value != null
  const clamped     = hasValue ? Math.max(min, Math.min(max, value as number)) : min
  const arrowPct    = hasValue ? ((clamped - min) / (max - min)) * 100 : 0
  const activeIdx   = hasValue ? meterActiveIdx(value as number, config) : -1
  const hasGoal     = goalValue != null
  const goalClamped = hasGoal ? Math.max(min, Math.min(max, goalValue as number)) : min
  const goalPct     = hasGoal ? ((goalClamped - min) / (max - min)) * 100 : 0

  return (
    <div style={{ position: 'relative', marginTop: 10, userSelect: 'none' }}>
      {hasValue && (
        <div style={{
          position: 'absolute', top: -7,
          left: `${arrowPct}%`, transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
          borderTop: '5px solid var(--ink)',
        }} />
      )}
      {hasGoal && (
        <div style={{
          position: 'absolute',
          left: `${goalPct}%`, transform: 'translateX(-50%)',
          top: 0, height: 6, width: 2,
          background: 'var(--sky)',
          zIndex: 1, borderRadius: 1,
        }} />
      )}
      <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--paper-3)' }}>
        {zones.map((z, i) => {
          const from = i === 0 ? min : zones[i - 1].to
          return (
            <div key={i} style={{
              flexGrow: z.to - from, flexBasis: 0,
              background: ZONE_HEX[z.color],
              opacity: hasValue && activeIdx !== i ? 0.2 : 1,
              borderRadius: i === 0 ? '999px 0 0 999px' : i === zones.length - 1 ? '0 999px 999px 0' : 0,
            }} />
          )
        })}
      </div>
      <div style={{ position: 'relative', height: 20, marginTop: 2 }}>
        {hasGoal && (
          <div style={{
            position: 'absolute', top: 0,
            left: `${goalPct}%`, transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
            borderBottom: '5px solid var(--sky)',
          }} />
        )}
        <span style={{ position: 'absolute', top: 7, left: 0, fontSize: 8, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)' }}>{min}</span>
        {zones.slice(0, -1).map((z, i) => (
          <span key={i} style={{ position: 'absolute', top: 7, left: `${((z.to - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)', fontSize: 8, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)' }}>
            {z.to}
          </span>
        ))}
        <span style={{ position: 'absolute', top: 7, right: 0, fontSize: 8, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)' }}>{max}</span>
      </div>
    </div>
  )
}

function MetricCard({
  metricKey, label, value, baseValue, numericValue, unit, delta, deltaUnit, deltaLowerIsBetter, goalNumeric, selected, onSelect,
}: {
  metricKey: string
  label: string
  value: string
  baseValue?: string
  numericValue?: number
  unit?: string
  delta?: number
  deltaUnit: string
  deltaLowerIsBetter: boolean
  goalNumeric?: number
  selected?: boolean
  onSelect?: () => void
}) {
  const showDelta   = delta != null && Math.abs(delta) >= 0.05
  const deltaIsGood = showDelta && (deltaLowerIsBetter ? delta! < 0 : delta! > 0)
  const arrow       = showDelta ? (delta! > 0 ? '↑' : '↓') : ''
  const config      = METER_RANGES[metricKey]
  const zoneLabel   = numericValue != null ? config.zones[meterActiveIdx(numericValue, config)].label : null

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: 'left', width: '100%', cursor: 'pointer',
        background: '#fff',
        border: selected ? '2px solid var(--signal)' : '1px solid var(--ink-7)',
        borderRadius: 14,
        padding: selected ? '15px' : '16px',
        boxShadow: selected ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
        transform: selected ? 'translateY(-2px)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
      }}
    >
      <div className="fk-eyebrow">{label}</div>
      <div style={{ marginTop: 8 }}>
        {baseValue != null ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {/* Antes */}
            <div>
              <div style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>antes</div>
              <span className="fk-serif" style={{ fontSize: 22, fontWeight: 300, color: 'var(--ink-3)', lineHeight: 1 }}>{baseValue}</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--ink-6)', paddingBottom: 3 }}>→</span>
            {/* Ahora */}
            <div>
              <div style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--signal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ahora</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="fk-serif" style={{ fontSize: 44, fontWeight: 300, color: 'var(--signal)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
                {unit && <span className="fk-mono" style={{ fontSize: 12, color: 'var(--ink-4)' }}>{unit}</span>}
              </div>
            </div>
            {showDelta && (
              <span className="fk-mono" style={{
                fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                background: deltaIsGood ? 'var(--leaf-soft)' : 'var(--berry-soft)',
                color: deltaIsGood ? 'var(--leaf)' : 'var(--berry)',
                alignSelf: 'flex-end', marginBottom: 4,
              }}>
                {arrow} {Math.abs(delta!).toFixed(1)}{deltaUnit}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span className="fk-serif" style={{ fontSize: 44, fontWeight: 300, color: 'var(--signal)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
            {unit && <span className="fk-mono" style={{ fontSize: 12, color: 'var(--ink-4)' }}>{unit}</span>}
            {showDelta && (
              <span className="fk-mono" style={{
                fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                background: deltaIsGood ? 'var(--leaf-soft)' : 'var(--berry-soft)',
                color: deltaIsGood ? 'var(--leaf)' : 'var(--berry)',
              }}>
                {arrow} {Math.abs(delta!).toFixed(1)}{deltaUnit}
              </span>
            )}
          </div>
        )}
      </div>
      <RangeMeter value={numericValue} config={config} goalValue={goalNumeric} />
      {zoneLabel && (
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--f-sans)' }}>{zoneLabel}</div>
      )}
    </button>
  )
}

function TrendChart({
  data, meta, rangeConfig,
}: {
  data: { value: number; date: string }[]
  meta: { label: string; unit: string; color: string }
  rangeConfig?: RangeMeterConfig
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const el = pathRef.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray  = `${len}`
    el.style.strokeDashoffset = `${len}`
    el.style.transition = 'none'
    el.getBoundingClientRect()
    el.style.transition = 'stroke-dashoffset 0.85s cubic-bezier(0.4, 0, 0.2, 1)'
    el.style.strokeDashoffset = '0'
  }, [data])

  if (data.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          sin datos suficientes
        </span>
      </div>
    )
  }

  const W = 720, H = 180
  const padL = 38, padR = 16, padT = 12, padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const vals = data.map(d => d.value)
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const span = maxV - minV || 1
  const yMin = minV - span * 0.18
  const yMax = maxV + span * 0.18

  const xAt = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const yAt = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), value: d.value, date: d.date }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = pts.length >= 2
    ? `M ${pts[0].x},${padT + plotH} L ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${pts[pts.length - 1].x},${padT + plotH} Z`
    : ''

  const yTicks = [yMax, yMin + (yMax - yMin) / 2, yMin]

  const xCount = Math.min(5, data.length)
  const xIndices = data.length <= 5
    ? data.map((_, i) => i)
    : Array.from({ length: xCount }, (_, k) => Math.round((k * (data.length - 1)) / (xCount - 1)))

  const zoneBands = rangeConfig ? rangeConfig.zones.map((z, i) => {
    const from = i === 0 ? rangeConfig.min : rangeConfig.zones[i - 1].to
    const top    = yAt(Math.min(z.to, yMax))
    const bottom = yAt(Math.max(from, yMin))
    return bottom > top ? { color: ZONE_HEX[z.color], top, bottom, label: z.label } : null
  }).filter((b): b is NonNullable<typeof b> => b !== null) : []

  const gradId = `tg-${meta.label.replace(/\s+/g, '')}`
  const clipId = `tc-${meta.label.replace(/\s+/g, '')}`
  const hovered = hoverIdx != null ? pts[hoverIdx] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Grid lines + Y labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)}
              stroke="var(--ink-7)" strokeWidth={1} />
            <text x={padL - 6} y={yAt(v) + 3.5} textAnchor="end" fontSize={8.5}
              fill="var(--ink-5)" fontFamily="var(--f-mono)">
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X-axis date labels */}
        {xIndices.map(i => (
          <text key={i} x={xAt(i)} y={H - 5} textAnchor="middle" fontSize={8.5}
            fill="var(--ink-5)" fontFamily="var(--f-mono)">
            {formatDateShort(data[i].date)}
          </text>
        ))}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />}

        {/* Line */}
        {pts.length >= 2 && (
          <path ref={pathRef} d={linePath} fill="none"
            stroke={meta.color} strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots + hit targets */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
            <circle cx={p.x} cy={p.y}
              r={hoverIdx === i ? 5 : i === pts.length - 1 ? 3.5 : 2}
              fill={hoverIdx === i || i === pts.length - 1 ? meta.color : 'rgba(255,255,255,0.4)'}
              stroke={meta.color} strokeWidth={1.5}
              style={{ pointerEvents: 'none' }} />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: `${(hovered.x / W) * 100}%`,
          top: `${(hovered.y / H) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 10px))',
          pointerEvents: 'none',
          background: '#fff',
          borderRadius: 8, padding: '6px 10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 15, fontWeight: 300, color: 'var(--ink)', lineHeight: 1.2 }}>
            {hovered.value.toFixed(1)}{meta.unit ? ` ${meta.unit}` : ''}
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            {formatDateShort(hovered.date)}
          </div>
        </div>
      )}
    </div>
  )
}

const CHART_CONFIGS: Record<string, { label: string; unit: string; lowerIsBetter: boolean }> = {
  weight:   { label: 'Peso',          unit: 'kg', lowerIsBetter: true  },
  bmi:      { label: 'IMC',           unit: '',   lowerIsBetter: true  },
  bf_pct:   { label: '% Grasa',       unit: '%',  lowerIsBetter: true  },
  muscle:   { label: 'Masa Muscular', unit: 'kg', lowerIsBetter: false },
  fat_mass: { label: 'Masa Grasa',    unit: 'kg', lowerIsBetter: true  },
}

function trendLabel(values: number[], unit: string): string {
  if (values.length < 2) return 'Aún sin tendencia — falta más histórico'
  const delta = values[values.length - 1] - values[0]
  if (Math.abs(delta) < 0.05) return 'Estable · sin cambios significativos'
  const dir  = delta < 0 ? 'Bajando' : 'Subiendo'
  const sign = delta < 0 ? '–' : '+'
  return `${dir} · ${sign}${Math.abs(delta).toFixed(1)}${unit ? ` ${unit}` : ''} en ${values.length} mediciones`
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Antropometría
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = import('@supabase/supabase-js').SupabaseClient<any, any, any>

function TabAntropometria({
  patient,
  supabase,
  onRefresh,
}: {
  patient: PatientDetail
  supabase: SupabaseAny
  onRefresh: () => void
}) {
  // history[0] = más reciente, history[last] = más antiguo
  const history = [...patient.weight_history].reverse()
  const [baseIndex, setBaseIndex]         = useState(history.length - 1)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editTarget, setEditTarget]       = useState<WeightLog | undefined>(undefined)
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null)
  const [historialOpen, setHistorialOpen]   = useState(false)
  const [selectedChart, setSelectedChart]   = useState<'weight' | 'bmi' | 'bf_pct' | 'muscle' | 'fat_mass'>('weight')

  function openCreate() { setEditTarget(undefined); setModalOpen(true) }
  function openEdit(row: WeightLog) { setEditTarget(row); setModalOpen(true) }

  async function openLightbox(path: string) {
    const { data } = await supabase.storage.from('inbody-scans').createSignedUrl(path, 3600)
    if (data?.signedUrl) setLightboxUrl(data.signedUrl)
  }

  const emptyState = history.length === 0

  const base   = emptyState ? null : history[Math.min(baseIndex, history.length - 1)]
  const latest = emptyState ? null : history[0]

  const calcBmi   = (wkg: number) => patient.height_m ? wkg / (patient.height_m * patient.height_m) : undefined
  const latestBmi = latest?.weight_kg != null ? calcBmi(latest.weight_kg) : undefined
  const baseBmi   = base?.weight_kg   != null ? calcBmi(base.weight_kg)   : undefined

  const chartMeta        = CHART_CONFIGS[selectedChart]
  const chartDataPoints  = patient.weight_history.map(r => {
    let value: number | null = null
    if (selectedChart === 'weight')   value = r.weight_kg ?? null
    if (selectedChart === 'bmi')      value = patient.height_m && r.weight_kg != null ? r.weight_kg / (patient.height_m * patient.height_m) : null
    if (selectedChart === 'bf_pct')   value = r.body_fat_percentage ?? null
    if (selectedChart === 'muscle')   value = r.muscle_mass_kg ?? null
    if (selectedChart === 'fat_mass') value = r.body_fat_mass_kg ?? null
    return value != null ? { value, date: r.date } : null
  }).filter((v): v is { value: number; date: string } => v !== null)

  const chartColor = (() => {
    if (chartDataPoints.length < 2) return 'var(--ink-4)'
    const delta = chartDataPoints[chartDataPoints.length - 1].value - chartDataPoints[0].value
    if (Math.abs(delta) < 0.05) return 'var(--ink-4)'
    const good = chartMeta.lowerIsBetter ? delta < 0 : delta > 0
    return good ? '#16a34a' : '#dc2626'
  })()

  function toggleChart(m: typeof selectedChart) {
    setSelectedChart(prev => prev === m ? 'weight' : m)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          {lightboxUrl.split('?')[0].endsWith('.pdf') ? (
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 12, padding: '32px 40px', textAlign: 'center', cursor: 'default' }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                Reporte InBody (PDF)
              </div>
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--signal)', textDecoration: 'underline' }}
              >
                Abrir PDF en nueva pestaña
              </a>
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => setLightboxUrl(null)}
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <img src={lightboxUrl} alt="InBody scan" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          )}
        </div>
      )}

      <InBodyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); onRefresh() }}
        supabase={supabase}
        patientId={patient.patient_id}
        existing={editTarget}
      />

      {/* empty state con botón */}
      {emptyState ? (
        <div style={{ background: '#fff', border: '1px dashed var(--ink-6)', borderRadius: 14, padding: '48px 28px', textAlign: 'center' }}>
          <div className="fk-eyebrow" style={{ marginBottom: 8, color: 'var(--signal)' }}>Sin datos aún</div>
          <p className="fk-serif" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 300, margin: 0 }}>
            Sin mediciones registradas aún
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 8, marginBottom: 20, fontFamily: 'var(--f-sans)' }}>
            El paciente puede registrar su peso desde la app móvil, o puedes subirlo tú.
          </p>
          <button
            onClick={openCreate}
            style={{ padding: '10px 22px', borderRadius: 9, border: '1.5px solid var(--ink-3)', background: 'transparent', fontFamily: 'var(--f-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', cursor: 'pointer' }}
          >
            + Registrar medición
          </button>
        </div>
      ) : (
        <>
          {/* Composición corporal · grid de indicadores con semáforo */}
          <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="fk-eyebrow">Composición corporal · actual</div>
              {history.length >= 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comparar con</span>
                  <select
                    value={baseIndex}
                    onChange={(e) => setBaseIndex(Number(e.target.value))}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--ink-7)', background: 'var(--paper-2)', fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-2)', cursor: 'pointer', outline: 'none' }}
                  >
                    {history.map((row, i) => (
                      <option key={i} value={i}>
                        {formatDateShort(row.date)}{row.date === getTodayInTimezone() ? ' (hoy)' : i === history.length - 1 ? ' (inicio)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* Peso — métrica central */}
            <div style={{ textAlign: 'center', padding: '4px 0 22px' }}>
              {/* Regla editorial con etiqueta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--ink-7)' }} />
                <span style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Peso</span>
                <div style={{ flex: 1, height: 1, background: 'var(--ink-7)' }} />
              </div>

              {/* Número protagonista */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                <span className="fk-serif" style={{ fontSize: 76, fontWeight: 300, color: 'var(--signal)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {latest!.weight_kg != null ? latest!.weight_kg.toFixed(1) : '—'}
                </span>
                <span className="fk-mono" style={{ fontSize: 15, color: 'var(--ink-4)' }}>kg</span>
              </div>

              {/* Comparativa centrada */}
              {base !== latest && base!.weight_kg != null && latest!.weight_kg != null && (() => {
                const d = latest!.weight_kg - base!.weight_kg
                const good = d < 0
                return (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>antes</span>
                    <span className="fk-serif" style={{ fontSize: 18, fontWeight: 300, color: 'var(--ink-3)', lineHeight: 1 }}>{base!.weight_kg.toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-6)' }}>→</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ahora</span>
                    {Math.abs(d) >= 0.05 && (
                      <span className="fk-mono" style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                        background: good ? 'var(--leaf-soft)' : 'var(--berry-soft)',
                        color: good ? 'var(--leaf)' : 'var(--berry)',
                      }}>
                        {d > 0 ? '↑' : '↓'} {Math.abs(d).toFixed(1)} kg
                      </span>
                    )}
                    {patient.goal_weight_kg != null && (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--ink-6)' }}>→</span>
                        <span style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>objetivo</span>
                        <span className="fk-serif" style={{ fontSize: 18, fontWeight: 300, color: 'var(--ink-3)', lineHeight: 1 }}>{patient.goal_weight_kg.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Divisor inferior */}
              <div style={{ height: 1, background: 'var(--ink-7)', marginTop: 22 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <MetricCard
                metricKey="bmi"
                label="IMC"
                value={latestBmi != null ? latestBmi.toFixed(1) : '—'}
                baseValue={base !== latest && baseBmi != null ? baseBmi.toFixed(1) : undefined}
                numericValue={latestBmi}
                delta={latestBmi != null && baseBmi != null ? latestBmi - baseBmi : undefined}
                deltaUnit=""
                deltaLowerIsBetter
                goalNumeric={patient.goal_bmi ?? undefined}
                selected={selectedChart === 'bmi'}
                onSelect={() => toggleChart('bmi')}
              />
              <MetricCard
                metricKey="muscle"
                label="Masa Muscular"
                value={latest!.muscle_mass_kg != null ? latest!.muscle_mass_kg.toFixed(1) : '—'}
                baseValue={base !== latest && base!.muscle_mass_kg != null ? base!.muscle_mass_kg.toFixed(1) : undefined}
                numericValue={latest!.muscle_mass_kg ?? undefined}
                unit="kg"
                delta={latest!.muscle_mass_kg != null && base!.muscle_mass_kg != null ? latest!.muscle_mass_kg - base!.muscle_mass_kg : undefined}
                deltaUnit="kg"
                deltaLowerIsBetter={false}
                goalNumeric={patient.goal_muscle_kg ?? undefined}
                selected={selectedChart === 'muscle'}
                onSelect={() => toggleChart('muscle')}
              />
              <MetricCard
                metricKey="bf_pct"
                label="% Grasa"
                value={latest!.body_fat_percentage != null ? latest!.body_fat_percentage.toFixed(1) : '—'}
                baseValue={base !== latest && base!.body_fat_percentage != null ? base!.body_fat_percentage.toFixed(1) : undefined}
                numericValue={latest!.body_fat_percentage ?? undefined}
                unit="%"
                delta={latest!.body_fat_percentage != null && base!.body_fat_percentage != null ? latest!.body_fat_percentage - base!.body_fat_percentage : undefined}
                deltaUnit="%"
                deltaLowerIsBetter
                goalNumeric={patient.goal_body_fat_pct ?? undefined}
                selected={selectedChart === 'bf_pct'}
                onSelect={() => toggleChart('bf_pct')}
              />
              <MetricCard
                metricKey="fat_mass"
                label="Masa Grasa"
                value={latest!.body_fat_mass_kg != null ? latest!.body_fat_mass_kg.toFixed(1) : '—'}
                baseValue={base !== latest && base!.body_fat_mass_kg != null ? base!.body_fat_mass_kg.toFixed(1) : undefined}
                numericValue={latest!.body_fat_mass_kg ?? undefined}
                unit="kg"
                delta={latest!.body_fat_mass_kg != null && base!.body_fat_mass_kg != null ? latest!.body_fat_mass_kg - base!.body_fat_mass_kg : undefined}
                deltaUnit="kg"
                deltaLowerIsBetter
                goalNumeric={patient.goal_fat_mass_kg ?? undefined}
                selected={selectedChart === 'fat_mass'}
                onSelect={() => toggleChart('fat_mass')}
              />
            </div>
            {!patient.height_m && (
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}>
                IMC no disponible — registra la talla del paciente para calcularlo
              </div>
            )}

            {/* Historial desplegable */}
            <div style={{ marginTop: 20, borderTop: '1px solid var(--ink-7)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setHistorialOpen((o) => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <div className="fk-eyebrow">Historial · {history.length} registro{history.length !== 1 ? 's' : ''}</div>
                  <div style={{ color: 'var(--ink-5)', transform: historialOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                    <Ic.chevR width={12} height={12} />
                  </div>
                </button>
                <button
                  onClick={openCreate}
                  style={{ padding: '5px 14px', borderRadius: 7, border: '1px solid var(--ink-5)', background: 'transparent', fontFamily: 'var(--f-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', cursor: 'pointer' }}
                >
                  + Registrar
                </button>
              </div>

              {historialOpen && (
                <div style={{ marginTop: 14, border: '1px solid var(--ink-7)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 1fr 80px 48px', gap: 10, padding: '9px 24px', background: 'var(--paper-2)', borderBottom: '1px solid var(--ink-7)' }}>
                    {['Fecha', 'Peso', 'IMC', 'Músculo', '% Grasa', 'Masa grasa', 'Notas', ''].map((h, i) => (
                      <div key={i} className="fk-eyebrow">{h}</div>
                    ))}
                  </div>
                  {history.map((row, i) => {
                    const rowBmi = row.weight_kg != null && patient.height_m != null
                      ? row.weight_kg / (patient.height_m * patient.height_m)
                      : null
                    return (
                    <div
                      key={row.id || i}
                      style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 1fr 80px 48px', gap: 10, padding: '12px 24px', borderBottom: i < history.length - 1 ? '1px solid var(--ink-7)' : 'none', background: i === 0 ? 'rgba(245,244,239,0.6)' : 'transparent', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div className="fk-mono" style={{ fontSize: 12, fontWeight: i === 0 ? 500 : 400, color: 'var(--ink-2)' }}>{formatDateShort(row.date)}</div>
                          {row.inbody_photo_url && (
                            <button
                              onClick={() => openLightbox(row.inbody_photo_url!)}
                              title="Ver foto InBody"
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1, color: 'var(--ink-4)', fontSize: 13 }}
                            >
                              ◉
                            </button>
                          )}
                        </div>
                        {i === 0 && <div style={{ fontSize: 9, color: 'var(--signal)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>última</div>}
                      </div>
                      {([
                        { v: row.weight_kg,          unit: 'kg', col: i === 0 ? 'var(--ink)' : 'var(--ink-2)'   },
                        { v: rowBmi,                 unit: '',   col: i === 0 ? 'var(--ink-2)' : 'var(--ink-3)' },
                        { v: row.muscle_mass_kg,      unit: 'kg', col: i === 0 ? 'var(--leaf)'  : 'var(--ink-3)' },
                        { v: row.body_fat_percentage, unit: '%',  col: i === 0 ? 'var(--berry)' : 'var(--ink-3)' },
                        { v: row.body_fat_mass_kg,    unit: 'kg', col: i === 0 ? 'var(--berry)' : 'var(--ink-3)' },
                      ] as { v: number | null | undefined; unit: string; col: string }[]).map(({ v, unit, col }, ci) => (
                        <div key={ci} className="fk-mono" style={{ fontSize: i === 0 ? 14 : 12, color: v != null ? col : 'var(--ink-6)', fontWeight: i === 0 ? 500 : 400 }}>
                          {v != null ? `${v.toFixed(1)}${unit ? ` ${unit}` : ''}` : '—'}
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.notes || '—'}
                      </div>
                      <button
                        onClick={() => openEdit(row)}
                        title="Editar registro"
                        style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', fontSize: 12, color: 'var(--ink-5)', borderRadius: 6, fontFamily: 'var(--f-mono)' }}
                      >
                        Editar
                      </button>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Gráfica dinámica */}
          <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div className="fk-eyebrow" style={{ marginBottom: 6 }}>
                  {chartMeta.label} · tendencia
                </div>
                <div style={{ fontFamily: 'var(--f-serif)', fontSize: 17, fontWeight: 300, fontStyle: 'italic', color: 'var(--ink-3)', lineHeight: 1.35 }}>
                  {trendLabel(chartDataPoints.map(d => d.value), chartMeta.unit)}
                </div>
              </div>
              {chartDataPoints.length > 0 && (
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
                  <div style={{ fontFamily: 'var(--f-serif)', fontSize: 40, fontWeight: 300, color: chartColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {chartDataPoints[chartDataPoints.length - 1].value.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', marginTop: 4 }}>
                    {chartMeta.unit || 'índice'}
                  </div>
                </div>
              )}
            </div>

            <TrendChart
              data={chartDataPoints}
              meta={{ ...chartMeta, color: chartColor }}
              rangeConfig={selectedChart !== 'weight' ? METER_RANGES[selectedChart] : undefined}
            />

            {selectedChart !== 'weight' && (
              <button
                onClick={() => setSelectedChart('weight')}
                style={{ marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', padding: 0, letterSpacing: '0.06em' }}
              >
                ← ver Peso
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Alimentación
// ─────────────────────────────────────────────────────────────────────────────

function TabAlimentacion({
  patient, foodLogs, loading, error,
}: {
  patient: PatientDetail
  foodLogs: FoodLogEntry[]
  loading: boolean
  error: string | null
}) {
  const [weekOffset, setWeekOffset] = useState(0)

  const budget: Record<string, number> = patient.active_diet
    ? { verdura: patient.active_diet.verdura, fruta: patient.active_diet.fruta, carb: patient.active_diet.carb, proteina: patient.active_diet.proteina, grasa: patient.active_diet.grasa, leguminosa: patient.active_diet.leguminosa }
    : DEFAULT_BUDGET

  const monday = getMonday(weekOffset)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const weekISODates = weekDates.map(toISO)
  const isCurrentWeek = weekOffset === 0

  // Agrupar logs por fecha y grupo
  const logMap: Record<string, Record<string, number>> = {}
  for (const log of foodLogs) {
    if (!logMap[log.date]) logMap[log.date] = {}
    logMap[log.date][log.group_type] = (logMap[log.date][log.group_type] ?? 0) + log.quantity
  }

  const daysRegistered = weekISODates.filter((d) => logMap[d] && Object.keys(logMap[d]).length > 0).length

  const weekLabel = (() => {
    const end = new Date(monday); end.setDate(monday.getDate() + 6)
    if (isCurrentWeek) return 'Esta semana'
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${monday.getDate()} – ${end.getDate()} ${months[end.getMonth()]}`
  })()

  if (loading) {
    return <LoadingState label="Cargando alimentación" compact />
  }

  if (error) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--berry)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>{error}</div>
  }

  if (foodLogs.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px dashed var(--ink-6)', borderRadius: 14, padding: '48px 28px', textAlign: 'center' }}>
        <div className="fk-eyebrow" style={{ marginBottom: 8, color: 'var(--signal)' }}>Sin registros</div>
        <p className="fk-serif" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 300, margin: 0 }}>El paciente aún no ha registrado alimentos</p>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 8, fontFamily: 'var(--f-sans)' }}>Los registros aparecen aquí cuando el paciente usa su app móvil.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Week nav + summary */}
      <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic' }}>{weekLabel}</div>
            <div className="fk-eyebrow" style={{ marginTop: 4 }}>
              {daysRegistered} de 7 días registrados
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setWeekOffset((o) => o - 1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--ink-7)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
              <Ic.chevL width={12} height={12} />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} style={{ padding: '0 10px', height: 32, borderRadius: 8, border: '1px solid var(--ink-7)', background: '#fff', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}>
                hoy
              </button>
            )}
            <button onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))} disabled={isCurrentWeek} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--ink-7)', background: '#fff', cursor: isCurrentWeek ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrentWeek ? 'var(--ink-7)' : 'var(--ink-3)' }}>
              <Ic.chevR width={12} height={12} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--ink-7)', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${(daysRegistered / 7) * 100}%`, background: 'var(--signal)', borderRadius: 999, transition: 'width 0.3s ease' }} />
        </div>

        {/* Grid: grupos × días */}
        <div style={{ display: 'grid', gridTemplateColumns: '88px repeat(7, 1fr)', gap: 4 }}>
          {/* Header días */}
          <div />
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center' }}>
              <div className="fk-eyebrow" style={{ marginBottom: 3 }}>{d}</div>
              <div className="fk-mono" style={{ fontSize: 11, color: toISO(weekDates[i]) === getTodayInTimezone() ? 'var(--signal)' : 'var(--ink-5)' }}>
                {weekDates[i].getDate()}
              </div>
            </div>
          ))}

          {/* Filas por grupo */}
          {FOOD_GROUPS.map((g) => (
            <>
              <div key={`${g.key}-label`} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 4, height: 54 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: g.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>{g.label}</span>
              </div>
              {weekISODates.map((date) => {
                const consumed  = logMap[date]?.[g.key] ?? 0
                const target    = budget[g.key] ?? 0
                const hasData   = !!logMap[date]
                const blocked   = target === 0  // la nutrióloga no asignó este grupo
                const over      = !blocked && consumed > target
                const fillPct   = !blocked && consumed > 0 ? Math.min(100, (consumed / target) * 100) : 0
                const fillBg    = over ? 'var(--berry-soft)' : g.bg
                const textColor = over ? 'var(--berry)' : g.color

                return (
                  <div key={`${g.key}-${date}`} style={{ height: 54, borderRadius: 6, border: '1px solid var(--ink-7)', position: 'relative', overflow: 'hidden', background: 'var(--paper-2)' }}>
                    {/* Patrón diagonal: grupo sin presupuesto en el plan */}
                    {blocked && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `repeating-linear-gradient(45deg, ${g.color} 0px, ${g.color} 2.5px, transparent 2.5px, transparent 9px)`,
                        opacity: 0.2,
                      }} />
                    )}
                    {/* Relleno vertical proporcional de abajo hacia arriba */}
                    {!blocked && hasData && consumed > 0 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${fillPct}%`, background: fillBg, transition: 'height 0.3s ease' }} />
                    )}
                    {/* Texto superpuesto */}
                    {!blocked && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        {hasData && consumed > 0 ? (
                          <>
                            <span className="fk-mono" style={{ fontSize: 10, color: textColor, fontWeight: 600, lineHeight: 1 }}>
                              {consumed}/{target}
                            </span>
                            <span className="fk-mono" style={{ fontSize: 9, color: textColor, lineHeight: 1 }}>
                              {Math.round((consumed / target) * 100)}%
                            </span>
                          </>
                        ) : hasData ? (
                          <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-5)' }}>·</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          ))}
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--ink-7)', flexWrap: 'wrap' }}>
          {[
            { col: 'var(--leaf)',  label: 'Cumplió presupuesto' },
            { col: 'var(--berry)', label: 'Excedió presupuesto' },
            { col: 'var(--ink-5)', label: 'Parcial' },
            { col: 'var(--ink-6)', label: 'Sin presupuesto', pattern: true },
            { col: 'var(--ink-7)', label: 'Sin registros' },
          ].map(({ col, label, pattern }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2, display: 'inline-block',
                background: pattern ? 'var(--paper-2)' : col,
                ...(pattern ? { backgroundImage: `repeating-linear-gradient(45deg, ${col} 0px, ${col} 2.5px, transparent 2.5px, transparent 9px)`, border: '1px solid var(--ink-7)' } : {}),
              }} />
              <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Entrenamiento
// ─────────────────────────────────────────────────────────────────────────────

function TabGym({
  sessions, loading, error,
}: {
  sessions: GymSessionEntry[]
  loading: boolean
  error: string | null
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) {
    return <LoadingState label="Cargando sesiones" compact />
  }

  if (error) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--berry)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>{error}</div>
  }

  if (sessions.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px dashed var(--ink-6)', borderRadius: 14, padding: '48px 28px', textAlign: 'center' }}>
        <div className="fk-eyebrow" style={{ marginBottom: 8, color: 'var(--signal)' }}>Sin sesiones</div>
        <p className="fk-serif" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 300, margin: 0 }}>El paciente aún no ha registrado sesiones de gym</p>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 8, fontFamily: 'var(--f-sans)' }}>Las sesiones aparecen aquí cuando el paciente usa su app móvil.</p>
      </div>
    )
  }

  const lastSession = sessions[0]
  const daysSinceLast = (() => {
    const d = daysBetween(lastSession.date)
    if (d === 0) return 'hoy'
    if (d === 1) return 'hace 1 día'
    return `hace ${d} días`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--ink-7)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--ink-7)' }}>
        {[
          { label: 'Sesiones registradas', n: sessions.length, sub: 'últimas 20 mostradas' },
          { label: 'Última sesión',         n: daysSinceLast,   sub: formatDateShort(lastSession.date) + ' · ' + (ROUTINE_META[lastSession.routine_type]?.label ?? lastSession.routine_type) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '18px 24px' }}>
            <div className="fk-eyebrow">{s.label}</div>
            <div className="fk-serif" style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.1, marginTop: 4, letterSpacing: '-0.02em' }}>{s.n}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3, fontFamily: 'var(--f-sans)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map((s) => {
          const meta    = ROUTINE_META[s.routine_type] ?? { label: s.routine_type, color: 'var(--ink-3)', bg: 'var(--paper-3)' }
          const isOpen  = expanded === s.id
          const exIds   = Array.from(new Set(s.sets.map((st) => st.exercise_id)))
          const exCount = exIds.length

          return (
            <div key={s.id} style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Session header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : s.id)}
                style={{ width: '100%', padding: '16px 20px', display: 'grid', gridTemplateColumns: '120px 1fr auto auto auto 24px', gap: 16, alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div className="fk-mono" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{formatDateShort(s.date)}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: meta.bg }}>
                  <span style={{ fontSize: 11, color: meta.color, fontFamily: 'var(--f-mono)', fontWeight: 500, letterSpacing: '0.04em' }}>{meta.label}</span>
                </div>
                {s.duration_seconds != null && (
                  <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{fmtDuration(s.duration_seconds)}</span>
                )}
                {s.cardio_minutes != null && (
                  <span className="fk-mono" style={{ fontSize: 11, color: 'var(--sky)' }}>{s.cardio_minutes}min cardio</span>
                )}
                <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{exCount} ejercicio{exCount !== 1 ? 's' : ''}</span>
                <div style={{ color: 'var(--ink-5)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <Ic.chevR width={12} height={12} />
                </div>
              </button>

              {/* Expanded: exercises */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--ink-7)', padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {exIds.map((exId) => {
                    const exSets = s.sets.filter((st) => st.exercise_id === exId)
                    return (
                      <div key={exId}>
                        <div className="fk-eyebrow" style={{ marginBottom: 8 }}>{exId.replace(/_/g, ' ')}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {exSets.map((st, si) => (
                            <div key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'var(--paper-2)', border: '1px solid var(--ink-7)' }}>
                              <span className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>#{st.set_number}</span>
                              <span className="fk-mono" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                                {st.lbs != null ? `${st.lbs}lbs` : '—'} × {st.reps != null ? st.reps : '—'}
                              </span>
                              {st.feeling && (
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: st.feeling === 'perfecto' ? 'var(--leaf-soft)' : st.feeling === 'muy_pesado' || st.feeling === 'dificil' ? 'var(--berry-soft)' : 'var(--honey-soft)', color: st.feeling === 'perfecto' ? 'var(--leaf)' : st.feeling === 'muy_pesado' || st.feeling === 'dificil' ? 'var(--berry)' : '#8a6411', fontFamily: 'var(--f-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  {FEELING_LABEL[st.feeling] ?? st.feeling}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Tab: Conversación — fuera de alcance del portal web (vive en fitkis-mobile)
// ─────────────────────────────────────────────────────────────────────────────

function TabConversacion({ patient }: { patient: PatientDetail }) {
  void patient
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 14, padding: '36px 32px' }}>
        <div className="fk-eyebrow" style={{ color: 'var(--signal)', marginBottom: 12 }}>Conversación · vive en la app</div>
        <p className="fk-serif" style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', lineHeight: 1.2, margin: '0 0 14px' }}>
          La mensajería directa es funcionalidad de la app del paciente
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-5)', fontFamily: 'var(--f-sans)', lineHeight: 1.6, margin: 0 }}>
          Para enviar contenido al paciente desde el portal, usa la{' '}
          <Link href="/clinic/biblioteca" style={{ color: 'var(--signal)', textDecoration: 'none', fontWeight: 500 }}>Biblioteca</Link>{' '}
          (plantillas, mensajes, recetas) o registra recordatorios en las{' '}
          <a href="#consultation-notes" style={{ color: 'var(--signal)', textDecoration: 'none', fontWeight: 500 }}>Notas de consulta</a>.
        </p>
      </div>
    </div>
  )
}

export default function PatientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id: patientId } = params
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [tab, setTab] = useState<Tab>('resumen')
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [resending, setResending] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Alimentación — carga lazy al activar la tab
  const [foodLogs, setFoodLogs]       = useState<FoodLogEntry[]>([])
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodError, setFoodError]     = useState<string | null>(null)
  const [foodFetched, setFoodFetched] = useState(false)

  // Entrenamiento — carga lazy al activar la tab
  const [gymSessions, setGymSessions]   = useState<GymSessionEntry[]>([])
  const [gymLoading, setGymLoading]     = useState(false)
  const [gymError, setGymError]         = useState<string | null>(null)
  const [gymFetched, setGymFetched]     = useState(false)

  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)
  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [tierSaving, setTierSaving] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const practitioner = await loadPractitionerByUser(supabase, user.id)
        if (cancelled) return
        if (!practitioner) {
          setError('No tienes registro de nutriólogo en esta cuenta.')
          setLoading(false)
          return
        }
        const [detail, nextAppt] = await Promise.all([
          loadPatientDetail(supabase, practitioner.id, patientId),
          loadNextAppointmentForPatient(supabase, practitioner.id, patientId),
        ])
        if (cancelled) return
        setPatient(detail)
        setNextAppointment(nextAppt)
        setPractitioner(practitioner)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, userLoading, supabase, patientId])

  // Carga lazy de food logs cuando se activa la tab de alimentación
  useEffect(() => {
    if (tab !== 'alim' || !patient || foodFetched) return
    let cancelled = false
    setFoodLoading(true)
    setFoodError(null)
    loadPatientFoodLogs(supabase, patient.patient_id, 42)
      .then((logs) => { if (!cancelled) { setFoodLogs(logs); setFoodFetched(true) } })
      .catch((e) => { if (!cancelled) setFoodError(e instanceof Error ? e.message : 'Error al cargar alimentación') })
      .finally(() => { if (!cancelled) setFoodLoading(false) })
    return () => { cancelled = true }
  }, [tab, patient, foodFetched, supabase])

  // Carga lazy de sesiones de gym cuando se activa la tab de entrenamiento
  useEffect(() => {
    if (tab !== 'gym' || !patient || gymFetched) return
    let cancelled = false
    setGymLoading(true)
    setGymError(null)
    loadPatientGymSessions(supabase, patient.patient_id)
      .then((sessions) => { if (!cancelled) { setGymSessions(sessions); setGymFetched(true) } })
      .catch((e) => { if (!cancelled) setGymError(e instanceof Error ? e.message : 'Error al cargar entrenamientos') })
      .finally(() => { if (!cancelled) setGymLoading(false) })
    return () => { cancelled = true }
  }, [tab, patient, gymFetched, supabase])

  // Recarga datos del paciente (weight_history) después de mutaciones desde el portal
  async function refreshPatient() {
    if (!practitioner) return
    const detail = await loadPatientDetail(supabase, practitioner.id, patientId)
    setPatient(detail)
  }

  async function handleSaveGoals(goals: {
    goal_type?: GoalType
    goal_weight_kg?: number | null
    goal_bmi?: number | null
    goal_body_fat_pct?: number | null
    goal_muscle_kg?: number | null
    goal_fat_mass_kg?: number | null
  }) {
    if (!patient) return
    await updatePatientGoals(supabase, patient.patient_id, goals)
    await refreshPatient()
  }

  if (loading || userLoading) {
    return <LoadingState label="Cargando paciente" />
  }

  if (error) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        <div className="fk-eyebrow" style={{ color: 'var(--berry)', marginBottom: 10 }}>
          Error
        </div>
        <p
          className="fk-serif"
          style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 300, lineHeight: 1.3 }}
        >
          {error}
        </p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center' }}>
        <div className="fk-eyebrow" style={{ marginBottom: 12 }}>
          Paciente no encontrado
        </div>
        <p
          className="fk-serif"
          style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300 }}
        >
          Este paciente no está vinculado a tu práctica.
        </p>
        <Link
          href="/clinic"
          style={{
            display: 'inline-block',
            marginTop: 20,
            fontSize: 13,
            color: 'var(--signal)',
            fontFamily: 'var(--f-mono)',
          }}
        >
          ← Volver a Mis pacientes
        </Link>
      </div>
    )
  }

  const latestMeasurement = patient.weight_history.at(-1) ?? null
  const latestMeasurementBmi = latestMeasurement?.weight_kg != null && patient.height_m != null
    ? calculateBMI(latestMeasurement.weight_kg, patient.height_m * 100)
    : undefined

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 40px 0' }}>
        <Link
          href="/clinic"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--ink-4)',
            cursor: 'pointer',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          <Ic.chevL /> Mis pacientes
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingBottom: 20,
            borderBottom: '1px solid var(--ink-7)',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: patient.status === 'declined' ? 'var(--berry-soft)' : 'var(--leaf-soft)',
                color: patient.status === 'declined' ? 'var(--berry)' : 'var(--leaf)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 30,
              }}
            >
              {patient.initial}
            </div>
            <div>
              <div className="fk-eyebrow" style={{ marginBottom: 4 }}>
                {patient.status === 'active'   ? 'Paciente · activo'
                  : patient.status === 'declined' ? 'Paciente · invitación rechazada'
                  : patient.status === 'pending'  ? 'Paciente · invitación pendiente'
                  : 'Paciente · inactivo'}
              </div>
              <h1
                className="fk-serif"
                style={{
                  fontSize: 38,
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {patient.name}
              </h1>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink-4)',
                  marginTop: 6,
                  display: 'flex',
                  gap: 10,
                  fontFamily: 'var(--f-mono)',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {patient.email && <span>{patient.email}</span>}
                {patient.age != null && (
                  <><span style={{ color: 'var(--ink-6)' }}>·</span><span>{patient.age} años</span></>
                )}
                {patient.height_m && (
                  <><span style={{ color: 'var(--ink-6)' }}>·</span><span>{(patient.height_m * 100).toFixed(0)} cm</span></>
                )}
                {patient.gender && (
                  <><span style={{ color: 'var(--ink-6)' }}>·</span><span style={{ textTransform: 'capitalize' }}>{patient.gender}</span></>
                )}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <GoalBadge goalType={patient.goal_type} onEdit={() => setGoalEditorOpen(true)} editable />
                <TierToggle
                  tier={patient.tier}
                  busy={tierSaving}
                  onChange={async (next) => {
                    if (next === patient.tier) return
                    setTierSaving(true)
                    const prev = patient.tier
                    setPatient((p) => p ? { ...p, tier: next } : p)
                    const res = await updatePatientTier(supabase, patient.patient_id, next)
                    if (!res.ok) {
                      setPatient((p) => p ? { ...p, tier: prev } : p)
                      alert('No se pudo actualizar la licencia: ' + res.error)
                    }
                    setTierSaving(false)
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {patient.status === 'declined' ? (
              <>
                <Btn
                  variant="ghost"
                  icon={<Ic.send />}
                  disabled={!practitioner || resending}
                  onClick={async () => {
                    if (!practitioner) return
                    if (!confirm('¿Reenviar la invitación a este paciente?')) return
                    setResending(true)
                    try {
                      const res = await resendInvitation(supabase, practitioner.id, patient.patient_id)
                      if (!res.ok) {
                        alert('Error al reenviar: ' + res.error)
                      } else {
                        setPatient((p) => p ? { ...p, status: 'pending' } : p)
                      }
                    } finally {
                      setResending(false)
                    }
                  }}
                >
                  {resending ? 'Reenviando…' : 'Reenviar invitación'}
                </Btn>
                <Btn
                  variant="ghost"
                  icon={<Ic.trash />}
                  disabled={!practitioner || removing}
                  onClick={async () => {
                    if (!practitioner) return
                    if (!confirm(`¿Eliminar a ${patient.name} de tu lista? Esta acción no se puede deshacer.`)) return
                    setRemoving(true)
                    try {
                      const res = await removePatientRelation(supabase, practitioner.id, patient.patient_id)
                      if (!res.ok) {
                        alert('Error al eliminar: ' + res.error)
                      } else {
                        router.push('/clinic/pacientes')
                      }
                    } finally {
                      setRemoving(false)
                    }
                  }}
                >
                  {removing ? 'Eliminando…' : 'Eliminar paciente'}
                </Btn>
              </>
            ) : (
              <>
                <Btn
                  variant="ghost"
                  icon={<Ic.share />}
                  disabled={!practitioner || generatingPDF}
                  onClick={async () => {
                    if (!practitioner) return
                    setGeneratingPDF(true)
                    try {
                      const [notes, appointmentNotes] = await Promise.all([
                        loadConsultationNotes(supabase, practitioner.id, patient.patient_id),
                        loadAppointmentNotesForPatient(supabase, practitioner.id, patient.patient_id),
                      ])
                      await generatePatientReport({ patient, practitioner, notes, appointmentNotes })
                    } catch (e) {
                      alert('No se pudo generar el reporte: ' + (e instanceof Error ? e.message : 'error'))
                    } finally {
                      setGeneratingPDF(false)
                    }
                  }}
                >
                  {generatingPDF ? 'Generando…' : 'Reporte PDF'}
                </Btn>
                <Btn
                  variant="ghost"
                  icon={<Ic.book />}
                  onClick={() => {
                    setTab('resumen')
                    setTimeout(() => {
                      document.getElementById('consultation-notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 50)
                  }}
                >
                  Notas de consulta
                </Btn>
                <Link
                  href={`/clinic/pacientes/${patient.patient_id}/plan`}
                  style={{ textDecoration: 'none' }}
                >
                  <Btn variant="signal" icon={<Ic.plus />}>
                    {patient.active_diet ? 'Editar plan' : 'Crear plan'}
                  </Btn>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 18 }}>
          {TABS.map((t) => {
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-4)',
                  fontFamily: 'var(--f-sans)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {t.n}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: '24px 40px 40px',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {tab === 'resumen' && (
            <>
              <TabAntropometria patient={patient} supabase={supabase} onRefresh={refreshPatient} />
              {practitioner && (
                <ConsultationNotesCard practitionerId={practitioner.id} patientId={patient.patient_id} />
              )}
            </>
          )}
          {tab === 'alim'   && <TabAlimentacion patient={patient} foodLogs={foodLogs} loading={foodLoading} error={foodError} />}
          {tab === 'gym'    && <TabGym sessions={gymSessions} loading={gymLoading} error={gymError} />}
          {tab === 'msg'    && <TabConversacion patient={patient} />}
        </div>

        <RightRail patient={patient} nextAppointment={nextAppointment} />
      </div>

      <GoalEditorModal
        open={goalEditorOpen}
        onClose={() => setGoalEditorOpen(false)}
        onSave={handleSaveGoals}
        initial={{
          goal_type:         patient.goal_type,
          goal_weight_kg:    patient.goal_weight_kg,
          goal_bmi:          patient.goal_bmi,
          goal_body_fat_pct: patient.goal_body_fat_pct,
          goal_muscle_kg:    patient.goal_muscle_kg,
          goal_fat_mass_kg:  patient.goal_fat_mass_kg,
        }}
        current={{
          weight_kg:    latestMeasurement?.weight_kg          ?? undefined,
          bmi:          latestMeasurementBmi,
          body_fat_pct: latestMeasurement?.body_fat_percentage ?? undefined,
          muscle_kg:    latestMeasurement?.muscle_mass_kg      ?? undefined,
          fat_mass_kg:  latestMeasurement?.body_fat_mass_kg    ?? undefined,
        }}
      />
    </div>
  )
}

function TierToggle({
  tier,
  busy,
  onChange,
}: {
  tier: 'lite' | 'pro'
  busy: boolean
  onChange: (next: 'lite' | 'pro') => void
}) {
  const options: Array<{ k: 'lite' | 'pro'; label: string }> = [
    { k: 'lite', label: 'Lite' },
    { k: 'pro',  label: 'Pro'   },
  ]
  return (
    <div
      role="group"
      aria-label="Licencia del paciente"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 999,
        border: '1px solid var(--ink-7)',
        background: 'var(--paper)',
        opacity: busy ? 0.6 : 1,
      }}
    >
      <span
        className="fk-mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-5)',
          padding: '0 8px 0 6px',
        }}
      >
        Licencia
      </span>
      {options.map((o) => {
        const active = tier === o.k
        return (
          <button
            key={o.k}
            type="button"
            disabled={busy || active}
            onClick={() => onChange(o.k)}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: 'none',
              background: active
                ? (o.k === 'pro' ? 'var(--signal)' : 'var(--ink)')
                : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-4)',
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: active || busy ? 'default' : 'pointer',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function formatAppointmentDate(isoString: string): string {
  const d = new Date(isoString)
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const TZ = 'America/Mexico_City'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, weekday: 'short', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const dayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }
  return `${days[dayMap[get('weekday')] ?? 0]} ${Number(get('day'))} ${months[Number(get('month')) - 1]}`
}

function formatAppointmentTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
  })
}

function formatDateShort(isoDate: string): string {
  // isoDate es YYYY-MM-DD: parseo manual sin TZ ambigua.
  const [, m, d] = isoDate.split('-').map(Number)
  const months = [
    'ene','feb','mar','abr','may','jun',
    'jul','ago','sep','oct','nov','dic',
  ]
  return `${d} ${months[m - 1]}`
}
