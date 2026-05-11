'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import { Segments } from '@/components/ui/Segments'
import { Ic } from '@/components/clinic/Ic'
import { findMockPatient } from '@/lib/clinic/mock-data'

type GroupKey = 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'
type MealKey = 'desayuno' | 'snack1' | 'comida' | 'snack2' | 'cena' | 'snack3'

type GroupDef = {
  k: GroupKey
  n: string
  sub: string
  c: string
  bg: string
  eq: string
  /** Equivalencias por grupo en el plan anterior (v4), para comparar. */
  prev: number
  /** kcal aprox por equivalente. */
  kcal: number
}

const GROUPS: GroupDef[] = [
  {
    k: 'verdura',
    n: 'Verdura',
    sub: 'libres · base del plato',
    c: 'var(--leaf)',
    bg: 'var(--leaf-soft)',
    eq: '≈ 1 taza cruda · 25 kcal',
    prev: 5,
    kcal: 25,
  },
  {
    k: 'fruta',
    n: 'Fruta',
    sub: 'fructosa natural',
    c: '#b8721d',
    bg: '#f3e4cf',
    eq: '≈ 1 pza mediana · 60 kcal',
    prev: 3,
    kcal: 60,
  },
  {
    k: 'carb',
    n: 'Cereal',
    sub: 'energía principal',
    c: 'var(--honey)',
    bg: 'var(--honey-soft)',
    eq: '≈ ½ taza cocido · 70 kcal',
    prev: 5,
    kcal: 70,
  },
  {
    k: 'proteina',
    n: 'Proteína animal',
    sub: 'magras preferentes',
    c: 'var(--berry)',
    bg: 'var(--berry-soft)',
    eq: '≈ 30 g · 75 kcal',
    prev: 8,
    kcal: 75,
  },
  {
    k: 'grasa',
    n: 'Grasa',
    sub: 'aceites + semillas',
    c: 'var(--ink-3)',
    bg: 'var(--paper-3)',
    eq: '≈ 1 cdta · 45 kcal',
    prev: 4,
    kcal: 45,
  },
  {
    k: 'leguminosa',
    n: 'Leguminosa',
    sub: 'opcional · alterna',
    c: 'var(--sky)',
    bg: 'var(--sky-soft)',
    eq: '≈ ½ taza · 120 kcal',
    prev: 1,
    kcal: 120,
  },
]

const MEAL_LABELS: Record<MealKey, string> = {
  desayuno: 'Desayuno',
  snack1: 'Snack mañana',
  comida: 'Comida',
  snack2: 'Snack tarde',
  cena: 'Cena',
  snack3: 'Snack noche',
}

const PHONE_PREVIEW_GROUPS = GROUPS.map((g) => ({ ...g, short: g.n.split(' ')[0] }))

export default function PlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const patient = findMockPatient(Number(id))

  const [budget, setBudget] = useState<Record<GroupKey, number>>({
    verdura: 5,
    fruta: 3,
    carb: 5,
    proteina: 8,
    grasa: 4,
    leguminosa: 1,
  })
  const [meals, setMeals] = useState<Record<MealKey, boolean>>({
    desayuno: true,
    snack1: true,
    comida: true,
    snack2: true,
    cena: true,
    snack3: false,
  })
  const [notes, setNotes] = useState(
    'Mantén la consistencia de la mañana. Snack tarde sube a 1 fruta + grasa para evitar antojo. Hidratación 2.5 L.'
  )

  if (!patient) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center' }}>
        <p
          className="fk-serif"
          style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300 }}
        >
          Paciente no encontrado.
        </p>
        <Link
          href="/clinic"
          style={{ color: 'var(--signal)', fontSize: 13, fontFamily: 'var(--f-mono)' }}
        >
          ← Volver a Mis pacientes
        </Link>
      </div>
    )
  }

  const total = Object.values(budget).reduce((a, b) => a + b, 0)
  const kcalApprox = GROUPS.reduce((sum, g) => sum + budget[g.k] * g.kcal, 0)
  const proteinPct = kcalApprox > 0 ? Math.round(((budget.proteina * 7) / (kcalApprox / 4)) * 100) : 0
  const mealsOn = Object.values(meals).filter(Boolean).length

  return (
    <div style={{ flex: 1, background: 'var(--paper)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 40px 0' }}>
        <Link
          href={`/clinic/pacientes/${patient.id}`}
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
          <Ic.chevL /> {patient.name}
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
          <div>
            <div className="fk-eyebrow">Editar plan · paciente {patient.name}</div>
            <h1
              className="fk-serif"
              style={{
                fontSize: 38,
                fontWeight: 300,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                margin: '8px 0 0',
              }}
            >
              <span style={{ fontStyle: 'italic' }}>Nueva</span> prescripción · v5
            </h1>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-4)',
                marginTop: 8,
                fontFamily: 'var(--f-mono)',
              }}
            >
              basado en SMAE · sustituye {patient.plan} vigente desde el 24 abr
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              guardado · borrador hace 2 min
            </span>
            <Btn variant="ghost">Vista previa paciente</Btn>
            <Btn variant="primary" icon={<Ic.check />}>
              Guardar y enviar
            </Btn>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '24px 40px 40px',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 24,
        }}
      >
        {/* Main editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Effective date */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--ink-7)',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="fk-eyebrow">Fecha efectiva</div>
              <div
                className="fk-serif"
                style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}
              >
                Lunes 12 de mayo, 2026
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Hoy', 'Mañana', 'Lunes próx.', 'Personalizar'].map((d, i) => {
                const active = i === 2
                return (
                  <button
                    key={d}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid var(--ink-7)',
                      background: active ? 'var(--ink)' : '#fff',
                      color: active ? 'var(--paper)' : 'var(--ink-3)',
                      fontSize: 11,
                      fontFamily: 'var(--f-sans)',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Budget editor */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--ink-7)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--ink-7)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="fk-eyebrow">Presupuesto diario · equivalentes SMAE</div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: 6 }}>
                  <span className="fk-serif" style={{ fontSize: 32, fontWeight: 300 }}>
                    {total} <span style={{ fontSize: 14, color: 'var(--ink-4)' }}>equiv.</span>
                  </span>
                  <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    ≈ {kcalApprox} kcal · proteína {proteinPct}% · sin sobreestimar grasa
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['copiar v4', 'plantilla déficit', '+ IA sugerir'].map((t) => (
                  <button
                    key={t}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--ink-7)',
                      background: '#fff',
                      fontSize: 11,
                      fontFamily: 'var(--f-mono)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {GROUPS.map((g) => {
                const v = budget[g.k]
                const diff = v - g.prev
                const diffColor =
                  diff > 0
                    ? 'var(--leaf)'
                    : diff < 0
                      ? 'var(--berry)'
                      : 'var(--ink-4)'
                return (
                  <div
                    key={g.k}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '10px 1.4fr 2fr 1.2fr',
                      gap: 18,
                      padding: '18px 24px',
                      borderBottom: '1px solid var(--ink-7)',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: g.c }} />
                    <div>
                      <div className="fk-serif" style={{ fontSize: 18, fontWeight: 400 }}>
                        {g.n}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-4)',
                          marginTop: 2,
                          fontFamily: 'var(--f-sans)',
                        }}
                      >
                        {g.sub} · {g.eq}
                      </div>
                    </div>
                    <div>
                      <Segments value={v} max={12} color={g.c} h={6} gap={3} />
                      <div
                        className="fk-mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-4)',
                          marginTop: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>v4: {g.prev}</span>
                        <span style={{ color: diffColor }}>
                          {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'sin cambio'}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        onClick={() =>
                          setBudget((b) => ({ ...b, [g.k]: Math.max(0, b[g.k] - 1) }))
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--ink-7)',
                          background: '#fff',
                          cursor: 'pointer',
                          fontSize: 16,
                          color: 'var(--ink-3)',
                        }}
                      >
                        −
                      </button>
                      <span
                        className="fk-serif"
                        style={{
                          fontSize: 30,
                          fontWeight: 300,
                          width: 36,
                          textAlign: 'center',
                          color: g.c,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {v}
                      </span>
                      <button
                        onClick={() => setBudget((b) => ({ ...b, [g.k]: b[g.k] + 1 }))}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--ink-7)',
                          background: '#fff',
                          cursor: 'pointer',
                          fontSize: 16,
                          color: 'var(--ink-3)',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Active meals */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--ink-7)',
              borderRadius: 14,
              padding: '20px 24px',
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
              <div>
                <div className="fk-eyebrow">Comidas activas</div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    marginTop: 3,
                    fontFamily: 'var(--f-sans)',
                  }}
                >
                  {mealsOn} de 6 · paciente verá solo las activas en su app
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {(Object.entries(MEAL_LABELS) as [MealKey, string][]).map(([k, v]) => {
                const on = meals[k]
                return (
                  <button
                    key={k}
                    onClick={() => setMeals((m) => ({ ...m, [k]: !m[k] }))}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: on ? '1.5px solid var(--ink)' : '1px solid var(--ink-7)',
                      background: on ? 'var(--paper-2)' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        className="fk-serif"
                        style={{
                          fontSize: 16,
                          fontWeight: 400,
                          color: on ? 'var(--ink)' : 'var(--ink-4)',
                        }}
                      >
                        {v}
                      </span>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          background: on ? 'var(--ink)' : 'transparent',
                          border: on ? 'none' : '1px solid var(--ink-6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        {on && <Ic.check width={10} height={10} />}
                      </span>
                    </div>
                    <div
                      className="fk-mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {on ? 'activa' : 'inactiva'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--ink-7)',
              borderRadius: 14,
              padding: '20px 24px',
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
              <div className="fk-eyebrow">Notas para {patient.name.split(' ')[0]}</div>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                aparece en su app · max 280
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 280))}
              style={{
                width: '100%',
                minHeight: 90,
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid var(--ink-7)',
                background: 'var(--paper)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.5,
                color: 'var(--ink-2)',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                'Hidratación 2.5 L',
                'No cenar después de 21h',
                'Pesarse lunes 7am en ayunas',
                'Si hambre extrema · 1 verdura libre',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setNotes((n) => (n.endsWith(s) ? n : `${n.trim()} ${s}.`))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px dashed var(--ink-6)',
                    background: 'transparent',
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--f-sans)',
                    cursor: 'pointer',
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail · preview */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'sticky',
            top: 20,
            alignSelf: 'start',
          }}
        >
          <div className="fk-eyebrow">Vista previa móvil</div>

          {/* Phone preview */}
          <div
            style={{
              width: 300,
              height: 580,
              borderRadius: 36,
              background: 'var(--ink)',
              padding: 8,
              alignSelf: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 30,
                background: 'var(--paper)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 22px 0 24px',
                }}
              >
                <span className="fk-mono" style={{ fontSize: 11, fontWeight: 600 }}>
                  9:41
                </span>
                <div style={{ width: 60, height: 18, background: 'var(--ink)', borderRadius: 999 }} />
                <span className="fk-mono" style={{ fontSize: 11 }}>
                  ●●●
                </span>
              </div>
              <div style={{ padding: '10px 18px 0' }}>
                <div className="fk-eyebrow" style={{ color: 'var(--signal)' }}>
                  Nuevo plan · v5
                </div>
                <div
                  className="fk-serif"
                  style={{ fontSize: 22, fontWeight: 300, marginTop: 4, lineHeight: 1.1 }}
                >
                  Hola {patient.name.split(' ')[0]},
                </div>
                <div
                  className="fk-serif"
                  style={{
                    fontSize: 14,
                    color: 'var(--ink-3)',
                    fontStyle: 'italic',
                    marginTop: 2,
                  }}
                >
                  tu Dra. Rocío actualizó tu plan.
                </div>
              </div>
              <div
                style={{
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                }}
              >
                {PHONE_PREVIEW_GROUPS.map((g) => (
                  <div key={g.k} style={{ background: g.bg, borderRadius: 8, padding: '8px 10px' }}>
                    <div
                      style={{
                        fontSize: 9,
                        color: g.c,
                        fontFamily: 'var(--f-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {g.short}
                    </div>
                    <div
                      className="fk-serif"
                      style={{ fontSize: 20, fontWeight: 300, color: g.c, lineHeight: 1 }}
                    >
                      {budget[g.k]}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  margin: '4px 18px',
                  padding: '10px 12px',
                  background: 'var(--cream)',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: '#8a6411',
                    fontFamily: 'var(--f-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Nota
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-2)',
                    marginTop: 3,
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                  }}
                >
                  {notes.length > 90 ? `${notes.slice(0, 90)}…` : notes}
                </div>
              </div>
              <div
                style={{
                  margin: 'auto 18px 14px',
                  padding: '12px',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  borderRadius: 999,
                  textAlign: 'center',
                  fontSize: 12,
                  fontFamily: 'var(--f-sans)',
                  fontWeight: 500,
                }}
              >
                Aceptar y comenzar
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--ink-7)',
              borderRadius: 14,
              padding: '16px 18px',
            }}
          >
            <div className="fk-eyebrow">Antes de enviar</div>
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
              {[
                { ok: total >= 18 && total <= 32, t: 'Total de equivalentes coherente con objetivo' },
                { ok: budget.proteina >= 6, t: 'Proteína suficiente para masa muscular' },
                { ok: mealsOn >= 4, t: 'Comidas activas ≥ 4' },
                { ok: false, t: 'No has agendado próxima consulta' },
              ].map((c) => (
                <li
                  key={c.t}
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 12,
                    marginBottom: 8,
                    color: c.ok ? 'var(--ink-2)' : 'var(--honey)',
                    fontFamily: 'var(--f-sans)',
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: c.ok ? 'var(--leaf-soft)' : 'var(--honey-soft)',
                      color: c.ok ? 'var(--leaf)' : 'var(--honey)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {c.ok ? <Ic.check width={10} height={10} /> : '!'}
                  </span>
                  <span>{c.t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
