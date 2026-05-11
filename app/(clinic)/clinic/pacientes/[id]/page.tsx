'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from '@/components/clinic/Ic'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPatientDetail,
  loadPractitionerByUser,
  type PatientDetail,
} from '@/lib/clinic/queries'

type Tab = 'resumen' | 'antropo' | 'alim' | 'gym' | 'plan' | 'msg'

const TABS: { k: Tab; n: string }[] = [
  { k: 'resumen', n: 'Resumen' },
  { k: 'antropo', n: 'Antropometría' },
  { k: 'alim', n: 'Alimentación' },
  { k: 'gym', n: 'Entrenamiento' },
  { k: 'plan', n: 'Plan vigente' },
  { k: 'msg', n: 'Conversación' },
]

function BigSpark({
  values,
  color,
  h = 180,
  label,
}: {
  values: number[]
  color: string
  h?: number
  label: string
}) {
  if (!values || values.length < 2) {
    return (
      <div
        style={{
          height: h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-5)',
          fontSize: 13,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        sin historial de peso aún
      </div>
    )
  }
  const w = 760
  const min = Math.min(...values)
  const max = Math.max(...values)
  const r = max - min || 1
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 20) + 10,
    h - ((v - min) / r) * (h - 30) - 16,
  ])
  const d = pts
    .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const area = `${d} L${last[0]} ${h - 4} L${first[0]} ${h - 4} Z`

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${label})`} />
      <path
        d={d}
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((pt, i) => (
        <circle
          key={i}
          cx={pt[0]}
          cy={pt[1]}
          r={i === pts.length - 1 ? 3.5 : 2}
          fill={i === pts.length - 1 ? color : '#fff'}
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

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

function RightRail({ patient }: { patient: PatientDetail }) {
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

      {/* Próxima consulta — placeholder Fase 3 */}
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
        <div
          className="fk-serif"
          style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 8, lineHeight: 1.2 }}
        >
          Agenda — fase 3
        </div>
        <div
          style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 6, fontFamily: 'var(--f-mono)' }}
        >
          tabla `appointments` por crear
        </div>
      </div>

      {/* Adherencia — placeholder */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
        <div className="fk-eyebrow">Adherencia · 30 días</div>
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)' }}>
          Cálculo basado en registros diarios pendiente · fase 3.
        </div>
      </div>

      {/* Quick send */}
      <div
        style={{
          background: 'var(--signal-soft)',
          border: '1px solid var(--signal-soft)',
          borderRadius: 14,
          padding: '18px 22px',
        }}
      >
        <div className="fk-eyebrow" style={{ color: '#a33a0f' }}>
          Enviar al paciente · próximamente
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
          Recetario, listas de compras y material educativo se cablean cuando esté lista la
          Biblioteca (fase 3).
        </div>
      </div>
    </div>
  )
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: patientId } = use(params)
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [tab, setTab] = useState<Tab>('resumen')
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const detail = await loadPatientDetail(supabase, practitioner.id, patientId)
        if (cancelled) return
        setPatient(detail)
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

  if (loading || userLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
        }}
      >
        <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
        <span
          className="fk-mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Cargando paciente
        </span>
      </div>
    )
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
    <div style={{ flex: 1, background: 'var(--paper)', minHeight: '100%' }}>
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
            <Btn variant="ghost" icon={<Ic.share />} disabled>
              Reporte PDF
            </Btn>
            <Btn variant="ghost" icon={<Ic.book />} disabled>
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
          {tab === 'resumen' ? (
            <>
              <HeroComposition patient={patient} />

              <div
                style={{
                  background: '#fff',
                  border: '1px solid var(--ink-7)',
                  borderRadius: 14,
                  padding: '24px 28px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="fk-eyebrow">Tendencia · Peso</div>
                    <div
                      className="fk-serif"
                      style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}
                    >
                      {ws.length < 2
                        ? 'Aún sin tendencia — falta más histórico'
                        : dropKg > 0
                          ? `Bajando · –${dropKg.toFixed(1)} kg en ${ws.length} mediciones`
                          : dropKg < 0
                            ? `Subiendo · +${Math.abs(dropKg).toFixed(1)} kg en ${ws.length} mediciones`
                            : 'Estable · sin cambios significativos'}
                    </div>
                  </div>
                </div>
                <BigSpark values={ws} color="var(--ink)" label={`w-${patient.patient_id}`} />
              </div>

              <div
                style={{
                  background: 'var(--cream)',
                  border: '1px solid var(--honey-soft)',
                  borderRadius: 14,
                  padding: '22px 26px',
                }}
              >
                <div className="fk-eyebrow" style={{ color: '#8a6411' }}>
                  Notas de consulta · próximamente
                </div>
                <p
                  className="fk-serif"
                  style={{
                    fontSize: 16,
                    fontWeight: 300,
                    lineHeight: 1.5,
                    color: 'var(--ink-3)',
                    margin: '10px 0 0',
                    fontStyle: 'italic',
                  }}
                >
                  Tabla `consultation_notes` por crear en Fase 3. Aquí aparecerán tus apuntes con
                  chips de acciones (ajustes al plan, recordatorios, reagenda).
                </p>
              </div>
            </>
          ) : (
            <div
              style={{
                background: '#fff',
                border: '1px dashed var(--ink-6)',
                borderRadius: 14,
                padding: '48px 28px',
                textAlign: 'center',
              }}
            >
              <div className="fk-eyebrow" style={{ marginBottom: 8 }}>
                Próximamente
              </div>
              <p
                className="fk-serif"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 300, margin: 0 }}
              >
                Pestaña "{TABS.find((t) => t.k === tab)?.n}" en construcción.
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 8 }}>
                Vuelve a "Resumen" para ver el contenido cableado.
              </p>
            </div>
          )}
        </div>

        <RightRail patient={patient} />
      </div>
    </div>
  )
}

function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  return `${d.getDate()} ${months[d.getMonth()]}`
}
