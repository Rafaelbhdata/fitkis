'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import { LoadingState } from '@/components/ui/LoadingState'
import { Ic } from '@/components/clinic/Ic'
import { ConsultationNotesCard } from '@/components/clinic/ConsultationNotesCard'
import { generatePatientReport } from '@/components/clinic/PatientReportPDF'
import { BigSpark } from '@/components/clinic/BigSpark'
import { InBodyModal } from '@/components/clinic/InBodyModal'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPatientDetail,
  loadPractitionerByUser,
  loadPatientFoodLogs,
  loadPatientGymSessions,
  loadNextAppointmentForPatient,
  loadConsultationNotes,
  loadAppointmentNotesForPatient,
  daysBetween,
  type PatientDetail,
  type PractitionerRecord,
  type FoodLogEntry,
  type GymSessionEntry,
  type Appointment,
} from '@/lib/clinic/queries'
import type { WeightLog } from '@/types'
import { getTodayInTimezone, getNowPartsInTimezone, shiftDateISO } from '@/lib/utils'

type Tab = 'resumen' | 'antropo' | 'alim' | 'gym' | 'plan' | 'msg'

const TABS: { k: Tab; n: string }[] = [
  { k: 'resumen', n: 'Resumen' },
  { k: 'antropo', n: 'Antropometría' },
  { k: 'alim', n: 'Alimentación' },
  { k: 'gym', n: 'Entrenamiento' },
  { k: 'plan', n: 'Plan vigente' },
  { k: 'msg', n: 'Conversación' },
]

function HeroComposition({ patient }: { patient: PatientDetail }) {
  const ws = patient.weight_history
  const w = ws.map((r) => r.weight_kg).filter((v): v is number => v != null)
  const f = ws.map((r) => r.body_fat_percentage).filter((v): v is number => v != null)
  const m = ws.map((r) => r.muscle_mass_kg).filter((v): v is number => v != null)
  const last = <T,>(a: T[]): T | undefined => (a.length ? a[a.length - 1] : undefined)

  const stats = [
    {
      label: 'Peso',
      v: last(w),
      unit: 'kg',
      delta: w.length >= 2 ? w[w.length - 1] - w[0] : undefined,
      invert: false,
      goal: patient.goal_weight_kg,
    },
    {
      label: '% Grasa',
      v: last(f),
      unit: '%',
      delta: f.length >= 2 ? f[f.length - 1] - f[0] : undefined,
      invert: false,
      goal: undefined,
    },
    {
      label: 'Músculo',
      v: last(m),
      unit: 'kg',
      delta: m.length >= 2 ? m[m.length - 1] - m[0] : undefined,
      invert: true,
      goal: undefined,
    },
  ]

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--ink-7)',
        borderRadius: 14,
        padding: '28px 28px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 6,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div className="fk-eyebrow">
          Composición corporal · {ws.length} medición{ws.length === 1 ? '' : 'es'}
        </div>
        {ws.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
            última: {formatDateShort(ws[ws.length - 1].date)}
          </span>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 36,
          marginTop: 18,
        }}
      >
        {stats.map((s) => {
          const good = s.delta == null ? null : s.invert ? s.delta > 0 : s.delta < 0
          const deltaCol =
            s.delta == null || Math.abs(s.delta) < 0.05
              ? 'var(--ink-4)'
              : good
                ? 'var(--leaf)'
                : 'var(--berry)'
          return (
            <div key={s.label}>
              <div className="fk-eyebrow">{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                {s.v != null ? (
                  <>
                    <span
                      className="fk-serif"
                      style={{
                        fontSize: 54,
                        fontWeight: 300,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        color: 'var(--ink)',
                      }}
                    >
                      {s.v.toFixed(1)}
                    </span>
                    <span
                      className="fk-mono"
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {s.unit}
                    </span>
                  </>
                ) : (
                  <span
                    className="fk-serif"
                    style={{
                      fontSize: 54,
                      fontWeight: 300,
                      lineHeight: 1,
                      color: 'var(--ink-5)',
                    }}
                  >
                    —
                  </span>
                )}
              </div>
              {s.delta != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span
                    className="fk-mono"
                    style={{ fontSize: 11, color: deltaCol, fontWeight: 500 }}
                  >
                    {s.delta > 0 ? '↑' : '↓'} {Math.abs(s.delta).toFixed(1)}
                    {s.unit} · 30d
                  </span>
                  {s.goal != null && (
                    <span
                      style={{ fontSize: 10, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}
                    >
                      meta {s.goal}
                      {s.unit}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RightRail({ patient, nextAppointment }: { patient: PatientDetail; nextAppointment: Appointment | null }) {
  const groups = [
    {
      g: 'Verdura',
      n: patient.active_diet?.verdura ?? 0,
      c: 'var(--leaf)',
      bg: 'var(--leaf-soft)',
    },
    { g: 'Fruta', n: patient.active_diet?.fruta ?? 0, c: '#b8721d', bg: '#f3e4cf' },
    { g: 'Cereal', n: patient.active_diet?.carb ?? 0, c: 'var(--honey)', bg: 'var(--honey-soft)' },
    {
      g: 'Proteína',
      n: patient.active_diet?.proteina ?? 0,
      c: 'var(--berry)',
      bg: 'var(--berry-soft)',
    },
    { g: 'Grasa', n: patient.active_diet?.grasa ?? 0, c: 'var(--ink-3)', bg: 'var(--paper-3)' },
    {
      g: 'Legumin.',
      n: patient.active_diet?.leguminosa ?? 0,
      c: 'var(--sky)',
      bg: 'var(--sky-soft)',
    },
  ]
  const totalEquivs = groups.reduce((acc, g) => acc + g.n, 0)
  const activeMealsCount = patient.active_diet
    ? Object.values(patient.active_diet.active_meals).filter(Boolean).length
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Plan vigente */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
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
            <div
              className="fk-serif"
              style={{
                fontSize: 22,
                fontWeight: 300,
                fontStyle: 'italic',
                marginTop: 6,
                lineHeight: 1.1,
              }}
            >
              {totalEquivs} equivalente{totalEquivs === 1 ? '' : 's'} · {activeMealsCount} comida
              {activeMealsCount === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {groups.map((g) => (
                <div
                  key={g.g}
                  style={{
                    background: g.bg,
                    borderRadius: 8,
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: g.c,
                      fontFamily: 'var(--f-sans)',
                      fontWeight: 500,
                    }}
                  >
                    {g.g}
                  </span>
                  <span className="fk-serif" style={{ fontSize: 18, fontWeight: 300, color: g.c }}>
                    {g.n}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)' }}
          >
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
            border: '1px solid var(--ink-7)',
            background: '#fff',
            fontSize: 12,
            fontFamily: 'var(--f-sans)',
            fontWeight: 500,
            color: 'var(--ink)',
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
              Ve a Agenda para programar
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
        {patient.adherence != null ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="fk-serif" style={{ fontSize: 36, fontWeight: 300, lineHeight: 1 }}>
                {patient.adherence}
              </span>
              <span style={{ fontSize: 14, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>%</span>
            </div>
            <div style={{ marginTop: 10, height: 6, background: 'var(--paper-3)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${patient.adherence}%`,
                  background: patient.adherence >= 70 ? 'var(--leaf)' : patient.adherence >= 40 ? 'var(--honey)' : 'var(--berry)',
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
        ) : (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)' }}>
            {patient.adherence_window.since_appointment
              ? 'Sin registros desde la última consulta.'
              : 'Sin registros en los últimos 30 días.'}
          </div>
        )}
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
  const [baseIndex, setBaseIndex] = useState(history.length - 1)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editTarget, setEditTarget]       = useState<WeightLog | undefined>(undefined)
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null)

  function openCreate() { setEditTarget(undefined); setModalOpen(true) }
  function openEdit(row: WeightLog) { setEditTarget(row); setModalOpen(true) }

  async function openLightbox(path: string) {
    const { data } = await supabase.storage.from('inbody-scans').createSignedUrl(path, 3600)
    if (data?.signedUrl) setLightboxUrl(data.signedUrl)
  }

  const emptyState = history.length === 0

  const base   = emptyState ? null : history[Math.min(baseIndex, history.length - 1)]
  const latest = emptyState ? null : history[0]

  const comparisons = base && latest ? [
    { label: 'Peso',          first: base.weight_kg,          last: latest.weight_kg,          unit: 'kg', invert: false, color: 'var(--ink)'   },
    { label: '% Grasa',       first: base.body_fat_percentage, last: latest.body_fat_percentage, unit: '%',  invert: false, color: 'var(--berry)' },
    { label: 'Masa muscular', first: base.muscle_mass_kg,      last: latest.muscle_mass_kg,      unit: 'kg', invert: true,  color: 'var(--leaf)'  },
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <img src={lightboxUrl} alt="InBody scan" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
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
          {/* Comparativa */}
          <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="fk-eyebrow">Comparativa · vs. hoy</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comparar con</span>
                <select
                  value={baseIndex}
                  onChange={(e) => setBaseIndex(Number(e.target.value))}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--ink-7)', background: 'var(--paper-2)', fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-2)', cursor: 'pointer', outline: 'none' }}
                >
                  {history.map((row, i) => (
                    <option key={i} value={i}>
                      {formatDateShort(row.date)}{i === 0 ? ' (hoy)' : i === history.length - 1 ? ' (inicio)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
              {comparisons.map((s) => {
                const delta = s.first != null && s.last != null ? s.last - s.first : null
                const good  = delta == null ? null : (s.invert ? delta > 0 : delta < 0)
                const dCol  = delta == null || Math.abs(delta) < 0.05 ? 'var(--ink-4)' : (good ? 'var(--leaf)' : 'var(--berry)')
                return (
                  <div key={s.label}>
                    <div className="fk-eyebrow" style={{ marginBottom: 10 }}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{formatDateShort(base!.date)}</div>
                        <span className="fk-serif" style={{ fontSize: 28, fontWeight: 300, color: 'var(--ink-5)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {s.first != null ? s.first.toFixed(1) : '—'}
                        </span>
                        {s.first != null && <span className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-5)', marginLeft: 2 }}>{s.unit}</span>}
                      </div>
                      <span style={{ color: 'var(--ink-6)', fontSize: 14, marginBottom: 3 }}>→</span>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Hoy</div>
                        <span className="fk-serif" style={{ fontSize: 42, fontWeight: 300, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {s.last != null ? s.last.toFixed(1) : '—'}
                        </span>
                        {s.last != null && <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 3 }}>{s.unit}</span>}
                      </div>
                    </div>
                    {delta != null && (
                      <div className="fk-mono" style={{ fontSize: 11, color: dCol, fontWeight: 500, marginTop: 8 }}>
                        {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}{s.unit}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Historial */}
          <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ink-7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="fk-eyebrow">Historial</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>más reciente primero</span>
                <button
                  onClick={openCreate}
                  style={{ padding: '5px 14px', borderRadius: 7, border: '1px solid var(--ink-5)', background: 'transparent', fontFamily: 'var(--f-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', cursor: 'pointer' }}
                >
                  + Registrar
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 80px 48px', gap: 10, padding: '9px 24px', background: 'var(--paper-2)', borderBottom: '1px solid var(--ink-7)' }}>
              {['Fecha', 'Peso', '% Grasa', 'Masa grasa', 'Músculo', 'Notas', ''].map((h, i) => (
                <div key={i} className="fk-eyebrow">{h}</div>
              ))}
            </div>
            {history.map((row, i) => (
              <div
                key={row.id || i}
                style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 80px 48px', gap: 10, padding: '12px 24px', borderBottom: i < history.length - 1 ? '1px solid var(--ink-7)' : 'none', background: i === 0 ? 'rgba(245,244,239,0.6)' : 'transparent', alignItems: 'center' }}
              >
                {/* Fecha + icono foto */}
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
                {/* Métricas */}
                {([
                  { v: row.weight_kg,          unit: 'kg', col: i === 0 ? 'var(--ink)' : 'var(--ink-2)'   },
                  { v: row.body_fat_percentage, unit: '%',  col: i === 0 ? 'var(--berry)' : 'var(--ink-3)' },
                  { v: row.body_fat_mass_kg,    unit: 'kg', col: i === 0 ? 'var(--berry)' : 'var(--ink-3)' },
                  { v: row.muscle_mass_kg,      unit: 'kg', col: i === 0 ? 'var(--leaf)'  : 'var(--ink-3)' },
                ] as { v: number | null | undefined; unit: string; col: string }[]).map(({ v, unit, col }, ci) => (
                  <div key={ci} className="fk-mono" style={{ fontSize: i === 0 ? 14 : 12, color: v != null ? col : 'var(--ink-6)', fontWeight: i === 0 ? 500 : 400 }}>
                    {v != null ? `${v.toFixed(1)} ${unit}` : '—'}
                  </div>
                ))}
                {/* Notas */}
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.notes || '—'}
                </div>
                {/* Editar */}
                <button
                  onClick={() => openEdit(row)}
                  title="Editar registro"
                  style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', fontSize: 12, color: 'var(--ink-5)', borderRadius: 6, fontFamily: 'var(--f-mono)' }}
                >
                  Editar
                </button>
              </div>
            ))}
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
            <div className="fk-eyebrow" style={{ marginBottom: 4 }}>
              {daysRegistered} de 7 días registrados
            </div>
            <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic' }}>{weekLabel}</div>
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
          <div style={{ height: '100%', width: `${(daysRegistered / 7) * 100}%`, background: daysRegistered >= 6 ? 'var(--leaf)' : daysRegistered >= 4 ? 'var(--honey)' : 'var(--berry)', borderRadius: 999, transition: 'width 0.3s ease' }} />
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
              <div key={`${g.key}-label`} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: g.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>{g.label}</span>
              </div>
              {weekISODates.map((date) => {
                const consumed = logMap[date]?.[g.key] ?? 0
                const target   = budget[g.key] ?? 0
                const hasData  = !!logMap[date]
                const over     = consumed > target
                const met      = consumed > 0 && consumed >= target
                const partial  = consumed > 0 && consumed < target

                const cellBg  = !hasData ? 'var(--paper-2)' : over ? 'var(--berry-soft)' : met ? g.bg : partial ? `${g.bg}` : 'var(--paper-2)'
                const cellCol = !hasData ? 'var(--ink-6)'   : over ? 'var(--berry)'       : met ? g.color : partial ? g.color : 'var(--ink-5)'
                const opacity  = partial ? 0.6 : 1

                return (
                  <div key={`${g.key}-${date}`} style={{ aspectRatio: '1', borderRadius: 6, background: cellBg, border: '1px solid var(--ink-7)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity }}>
                    <span className="fk-mono" style={{ fontSize: 11, color: cellCol, fontWeight: met || over ? 600 : 400 }}>
                      {hasData ? (consumed > 0 ? consumed : '·') : ''}
                    </span>
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
            { col: 'var(--ink-7)', label: 'Sin registros' },
          ].map(({ col, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Presupuesto de referencia */}
      {patient.active_diet ? (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--honey-soft)', borderRadius: 14, padding: '16px 20px' }}>
          <div className="fk-eyebrow" style={{ color: '#8a6411', marginBottom: 10 }}>Presupuesto del plan · v{patient.active_diet.version}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FOOD_GROUPS.map((g) => (
              <div key={g.key} style={{ background: g.bg, borderRadius: 8, padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, color: g.color, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>{g.label}</span>
                <span className="fk-serif" style={{ fontSize: 16, fontWeight: 300, color: g.color }}>{budget[g.key]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textAlign: 'center', padding: '8px 0' }}>
          Sin plan activo — usando valores de referencia por defecto
        </div>
      )}
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
// Tab: Plan vigente
// ─────────────────────────────────────────────────────────────────────────────

function TabPlanVigente({ patient }: { patient: PatientDetail }) {
  const diet = patient.active_diet

  if (!diet) {
    return (
      <div style={{ background: 'var(--cream)', border: '1px solid var(--honey-soft)', borderRadius: 14, padding: '40px 32px', textAlign: 'center' }}>
        <div className="fk-eyebrow" style={{ color: '#8a6411', marginBottom: 12 }}>Sin plan activo</div>
        <p className="fk-serif" style={{ fontSize: 26, fontStyle: 'italic', fontWeight: 300, margin: '0 0 20px' }}>
          Este paciente aún no tiene un plan asignado.
        </p>
        <Link href={`/clinic/pacientes/${patient.patient_id}/plan`} style={{ textDecoration: 'none' }}>
          <Btn variant="primary" icon={<Ic.plus />}>Crear primer plan</Btn>
        </Link>
      </div>
    )
  }

  const totalEquivs   = diet.verdura + diet.fruta + diet.carb + diet.proteina + diet.grasa + diet.leguminosa
  const activeMeals   = Object.entries(diet.active_meals).filter(([, v]) => v).map(([k]) => k)
  const kcalApprox    = Math.round(diet.verdura*25 + diet.fruta*60 + diet.carb*70 + diet.proteina*75 + diet.grasa*45 + diet.leguminosa*120)

  const groupKcal: Record<string, number> = { verdura: 25, fruta: 60, carb: 70, proteina: 75, grasa: 45, leguminosa: 120 }
  const groupValues: Record<string, number> = { verdura: diet.verdura, fruta: diet.fruta, carb: diet.carb, proteina: diet.proteina, grasa: diet.grasa, leguminosa: diet.leguminosa }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="fk-eyebrow" style={{ marginBottom: 6 }}>Plan v{diet.version} · vigente desde {formatDateShort(diet.effective_date)}</div>
            <div className="fk-serif" style={{ fontSize: 30, fontWeight: 300, fontStyle: 'italic', lineHeight: 1.1 }}>
              {totalEquivs} equivalentes · {activeMeals.length} comidas
            </div>
            <div className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>≈ {kcalApprox} kcal/día</div>
          </div>
          <Link href={`/clinic/pacientes/${patient.patient_id}/plan`} style={{ textDecoration: 'none' }}>
            <Btn variant="ghost" size="sm">Actualizar plan →</Btn>
          </Link>
        </div>

        {/* Grupos grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {FOOD_GROUPS.map((g) => {
            const n    = groupValues[g.key] ?? 0
            const kcal = (groupKcal[g.key] ?? 0) * n
            return (
              <div key={g.key} style={{ background: g.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: g.color, fontFamily: 'var(--f-sans)', fontWeight: 500, marginBottom: 2 }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: g.color, fontFamily: 'var(--f-mono)', opacity: 0.7 }}>≈ {kcal} kcal</div>
                </div>
                <span className="fk-serif" style={{ fontSize: 36, fontWeight: 300, color: g.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{n}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comidas activas */}
      <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '20px 24px' }}>
        <div className="fk-eyebrow" style={{ marginBottom: 14 }}>Comidas activas · {activeMeals.length} de 6</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {Object.entries(MEAL_LABEL).map(([k, v]) => {
            const isActive = diet.active_meals[k] === true
            return (
              <div key={k} style={{ padding: '10px 14px', borderRadius: 8, border: isActive ? '1.5px solid var(--ink)' : '1px solid var(--ink-7)', background: isActive ? 'var(--paper-2)' : '#fff', opacity: isActive ? 1 : 0.5 }}>
                <div className="fk-serif" style={{ fontSize: 14, fontWeight: 400, color: isActive ? 'var(--ink)' : 'var(--ink-4)' }}>{v}</div>
                <div className="fk-mono" style={{ fontSize: 9, color: isActive ? 'var(--ink-3)' : 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{isActive ? 'activa' : 'inactiva'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notas */}
      {diet.notes && (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--honey-soft)', borderRadius: 14, padding: '20px 24px' }}>
          <div className="fk-eyebrow" style={{ color: '#8a6411', marginBottom: 10 }}>Notas para el paciente</div>
          <p className="fk-serif" style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, fontStyle: 'italic' }}>
            "{diet.notes}"
          </p>
        </div>
      )}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const ws = patient.weight_history.map((r) => r.weight_kg).filter((v): v is number => v != null)
  const dropKg = ws.length >= 2 ? ws[0] - ws[ws.length - 1] : 0

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
                background: 'var(--leaf-soft)',
                color: 'var(--leaf)',
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
                {patient.status === 'active' ? 'Paciente · activo' : `Paciente · ${patient.status}`}
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
                  gap: 14,
                  fontFamily: 'var(--f-mono)',
                  flexWrap: 'wrap',
                }}
              >
                {patient.email && <span>{patient.email}</span>}
                {patient.height_m && (
                  <>
                    <span>·</span>
                    <span>{patient.height_m.toFixed(2)} m</span>
                  </>
                )}
                <span>·</span>
                <span>objetivo {patient.goal}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
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
              <Btn variant="primary" icon={<Ic.plus />}>
                {patient.active_diet ? 'Editar plan' : 'Crear plan'}
              </Btn>
            </Link>
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
              <HeroComposition patient={patient} />
              <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                  <div>
                    <div className="fk-eyebrow">Tendencia · Peso</div>
                    <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}>
                      {ws.length < 2 ? 'Aún sin tendencia — falta más histórico' : dropKg > 0 ? `Bajando · –${dropKg.toFixed(1)} kg en ${ws.length} mediciones` : dropKg < 0 ? `Subiendo · +${Math.abs(dropKg).toFixed(1)} kg en ${ws.length} mediciones` : 'Estable · sin cambios significativos'}
                    </div>
                  </div>
                </div>
                <BigSpark values={ws} color="var(--ink)" label={`w-${patient.patient_id}`} />
              </div>
              {practitioner && (
                <ConsultationNotesCard practitionerId={practitioner.id} patientId={patient.patient_id} />
              )}
            </>
          )}
          {tab === 'antropo' && <TabAntropometria patient={patient} supabase={supabase} onRefresh={refreshPatient} />}
          {tab === 'alim'   && <TabAlimentacion patient={patient} foodLogs={foodLogs} loading={foodLoading} error={foodError} />}
          {tab === 'gym'    && <TabGym sessions={gymSessions} loading={gymLoading} error={gymError} />}
          {tab === 'plan'   && <TabPlanVigente patient={patient} />}
          {tab === 'msg'    && <TabConversacion patient={patient} />}
        </div>

        <RightRail patient={patient} nextAppointment={nextAppointment} />
      </div>
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
