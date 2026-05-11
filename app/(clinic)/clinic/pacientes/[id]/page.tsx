'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import Chip from '@/components/ui/Chip'
import { Ic } from '@/components/clinic/Ic'
import { findMockPatient, type MockPatient } from '@/lib/clinic/mock-data'

type Tab = 'resumen' | 'antropo' | 'alim' | 'gym' | 'plan' | 'msg'

const TABS: { k: Tab; n: string }[] = [
  { k: 'resumen', n: 'Resumen' },
  { k: 'antropo', n: 'Antropometría' },
  { k: 'alim', n: 'Alimentación' },
  { k: 'gym', n: 'Entrenamiento' },
  { k: 'plan', n: 'Plan vigente' },
  { k: 'msg', n: 'Conversación' },
]

// Adherence heatmap - 30 days, mostly green with a few gaps
const ADHERENCE_30D = [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1]

function BigSpark({
  values,
  color,
  w = 760,
  h = 180,
  label,
}: {
  values: number[]
  color: string
  w?: number
  h?: number
  label: string
}) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const r = max - min || 1
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 20) + 10,
    h - ((v - min) / r) * (h - 30) - 16,
  ])
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
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

function HeroComposition({ patient }: { patient: MockPatient }) {
  const w = patient.weight
  const f = patient.fat
  const m = patient.muscle
  const last = <T,>(a: T[]): T => a[a.length - 1]

  const stats = [
    { label: 'Peso', v: last(w), unit: 'kg', delta: w[w.length - 1] - w[0], invert: false, goal: 60.0 },
    {
      label: '% Grasa',
      v: last(f),
      unit: '%',
      delta: f[f.length - 1] - f[0],
      invert: false,
      goal: 22,
    },
    {
      label: 'Músculo',
      v: last(m),
      unit: 'kg',
      delta: m[m.length - 1] - m[0],
      invert: true,
      goal: 26,
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
        }}
      >
        <div className="fk-eyebrow">Composición corporal · 10 mediciones · 90 días</div>
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          última: hoy 08:14
        </span>
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
          const good = s.invert ? s.delta > 0 : s.delta < 0
          const deltaCol =
            Math.abs(s.delta) < 0.05 ? 'var(--ink-4)' : good ? 'var(--leaf)' : 'var(--berry)'
          return (
            <div key={s.label}>
              <div className="fk-eyebrow">{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span
                  className="fk-mono"
                  style={{ fontSize: 11, color: deltaCol, fontWeight: 500 }}
                >
                  {s.delta > 0 ? '↑' : '↓'} {Math.abs(s.delta).toFixed(1)}
                  {s.unit} · 90d
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}>
                  meta {s.goal}
                  {s.unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FoodLogPreview() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const rows = [
    { g: 'Verdura', target: 5, col: 'var(--leaf)', days: [5, 4, 5, 5, 4, 3] },
    { g: 'Fruta', target: 3, col: '#b8721d', days: [3, 3, 3, 4, 3, 3] },
    { g: 'Cereal', target: 5, col: 'var(--honey)', days: [5, 5, 4, 5, 5, 6] },
    { g: 'Proteína', target: 8, col: 'var(--berry)', days: [8, 7, 8, 9, 8, 8] },
    { g: 'Grasa', target: 4, col: 'var(--ink-3)', days: [4, 4, 3, 4, 5, 4] },
  ]
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--ink-7)',
        borderRadius: 14,
        padding: '22px 26px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div className="fk-eyebrow">Alimentación · semana en curso</div>
        <span style={{ fontSize: 11, color: 'var(--leaf)', fontFamily: 'var(--f-mono)' }}>
          6 de 7 días registrados
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gap: 6 }}>
        <div></div>
        {days.map((d) => (
          <div key={d} className="fk-eyebrow" style={{ textAlign: 'center' }}>
            {d}
          </div>
        ))}
        {rows.map((row) => (
          <FoodRow key={row.g} row={row} />
        ))}
      </div>
    </div>
  )
}

function FoodRow({
  row,
}: {
  row: { g: string; target: number; col: string; days: number[] }
}) {
  return (
    <>
      <div
        style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: row.col }} />
        {row.g}
      </div>
      {row.days.map((d, i) => {
        const ok = d >= row.target
        const over = d > row.target
        return (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: 6,
              background: ok ? row.col : 'var(--paper-2)',
              opacity: ok ? (over ? 1 : 0.5) : 1,
              border: '1px solid var(--ink-7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: ok ? '#fff' : 'var(--ink-4)',
              fontWeight: 500,
            }}
          >
            {d}
          </div>
        )
      })}
    </>
  )
}

function RightRail({ patient }: { patient: MockPatient }) {
  const groups = [
    { g: 'Verdura', n: 5, c: 'var(--leaf)', bg: 'var(--leaf-soft)' },
    { g: 'Fruta', n: 3, c: '#b8721d', bg: '#f3e4cf' },
    { g: 'Cereal', n: 5, c: 'var(--honey)', bg: 'var(--honey-soft)' },
    { g: 'Proteína', n: 8, c: 'var(--berry)', bg: 'var(--berry-soft)' },
    { g: 'Grasa', n: 4, c: 'var(--ink-3)', bg: 'var(--paper-3)' },
    { g: 'Legumin.', n: 1, c: 'var(--sky)', bg: 'var(--sky-soft)' },
  ]

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
          <div className="fk-eyebrow">Plan vigente · {patient.plan}</div>
          <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
            desde 24 abr
          </span>
        </div>
        <div
          className="fk-serif"
          style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 6, lineHeight: 1.1 }}
        >
          26 equivalentes · 5 comidas
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 14,
          }}
        >
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
        <Link
          href={`/clinic/pacientes/${patient.id}/plan`}
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
          Editar plan →
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
        <div
          className="fk-serif"
          style={{ fontSize: 26, fontWeight: 300, fontStyle: 'italic', marginTop: 8, lineHeight: 1.1 }}
        >
          Jueves 15 mayo
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', marginTop: 4, fontFamily: 'var(--f-mono)' }}>
          10:30 · 30 min · presencial
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'var(--paper)',
              fontSize: 11,
              fontFamily: 'var(--f-sans)',
              cursor: 'pointer',
            }}
          >
            Reagendar
          </button>
          <button
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--signal)',
              color: '#fff',
              fontSize: 11,
              fontFamily: 'var(--f-sans)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Enviar recordatorio
          </button>
        </div>
      </div>

      {/* Adherence */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
        <div className="fk-eyebrow">Adherencia · 30 días</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
          <span
            className="fk-serif"
            style={{ fontSize: 48, fontWeight: 300, lineHeight: 1, color: 'var(--leaf)' }}
          >
            {patient.adherence ?? 0}
            <span style={{ fontSize: 18, color: 'var(--ink-4)' }}>%</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 14 }}>
          {ADHERENCE_30D.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 24,
                borderRadius: 2,
                background: v ? 'var(--leaf)' : 'var(--ink-7)',
                opacity: v ? 0.4 + (i / 30) * 0.6 : 1,
              }}
            />
          ))}
        </div>
        <div
          className="fk-mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-4)',
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>14 abr</span>
          <span>{patient.streak} racha · hoy</span>
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
          Enviar al paciente
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {[
            'Nuevo plan alimenticio',
            'Lista de compras semanal',
            'Recetario · 8 opciones',
            'Material educativo',
          ].map((x) => (
            <button
              key={x}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid rgba(163,58,15,0.15)',
                background: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontFamily: 'var(--f-sans)',
                color: 'var(--ink-2)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{x}</span>
              <Ic.arrow color="#a33a0f" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const patient = findMockPatient(Number(id))
  const [tab, setTab] = useState<Tab>('resumen')

  if (!patient) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center' }}>
        <div className="fk-eyebrow" style={{ marginBottom: 12 }}>
          Paciente no encontrado
        </div>
        <p className="fk-serif" style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300 }}>
          Este id no existe en los datos mock.
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

  const w = patient.weight
  const dropKg = w.length >= 2 ? w[0] - w[w.length - 1] : 0

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
                Paciente · activa hace 4 meses
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
                <span>{patient.email}</span>
                {patient.age && (
                  <>
                    <span>·</span>
                    <span>{patient.age} años</span>
                  </>
                )}
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
            <Btn variant="ghost" icon={<Ic.share />}>
              Reporte PDF
            </Btn>
            <Btn variant="ghost" icon={<Ic.book />}>
              Notas de consulta
            </Btn>
            <Link href={`/clinic/pacientes/${patient.id}/plan`} style={{ textDecoration: 'none' }}>
              <Btn variant="primary" icon={<Ic.plus />}>
                Editar plan
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
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {tab === 'resumen' ? (
            <>
              <HeroComposition patient={patient} />

              {/* Big chart */}
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
                  }}
                >
                  <div>
                    <div className="fk-eyebrow">Tendencia · Peso</div>
                    <div
                      className="fk-serif"
                      style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}
                    >
                      {dropKg > 0
                        ? `Bajando estable · –${dropKg.toFixed(1)} kg en 12 semanas`
                        : dropKg < 0
                          ? `Subiendo · +${Math.abs(dropKg).toFixed(1)} kg en 12 semanas`
                          : 'Estable · sin cambios significativos'}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      padding: 3,
                      background: 'var(--paper-2)',
                      borderRadius: 999,
                    }}
                  >
                    {['30d', '90d', '1a', 'Todo'].map((r, i) => (
                      <button
                        key={r}
                        style={{
                          padding: '4px 10px',
                          background: i === 1 ? '#fff' : 'transparent',
                          border: 'none',
                          borderRadius: 999,
                          fontSize: 11,
                          fontFamily: 'var(--f-mono)',
                          color: i === 1 ? 'var(--ink)' : 'var(--ink-4)',
                          cursor: 'pointer',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <BigSpark values={w} color="var(--ink)" label="w" />
                <div
                  style={{
                    display: 'flex',
                    gap: 18,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px solid var(--ink-7)',
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--f-mono)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>● peso · trend –0.20 kg/sem</span>
                  <span>● músculo +0.9 kg</span>
                  <span>● grasa –2.1%</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--leaf)' }}>ritmo saludable ✓</span>
                </div>
              </div>

              {/* Last consultation */}
              <div
                style={{
                  background: 'var(--cream)',
                  border: '1px solid var(--honey-soft)',
                  borderRadius: 14,
                  padding: '22px 26px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <div className="fk-eyebrow" style={{ color: '#8a6411' }}>
                    Notas última consulta · 24 abr
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                    Dra. Rocío M.
                  </span>
                </div>
                <p
                  className="fk-serif"
                  style={{
                    fontSize: 18,
                    fontWeight: 300,
                    lineHeight: 1.5,
                    color: 'var(--ink-2)',
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;Mantiene adherencia alta. Reporta hambre por la tarde — sube +1 fruta al
                  snack2 y agrega una porción más de proteína en cena. Reagendar en 3 semanas.&rdquo;
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <Chip tone="leaf">+1 fruta · snack tarde</Chip>
                  <Chip tone="berry">+1 proteína · cena</Chip>
                  <Chip tone="honey">reagendar 15/may</Chip>
                </div>
              </div>

              <FoodLogPreview />
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
                Vuelve a "Resumen" para ver el contenido implementado.
              </p>
            </div>
          )}
        </div>

        {/* Right rail */}
        <RightRail patient={patient} />
      </div>
    </div>
  )
}
