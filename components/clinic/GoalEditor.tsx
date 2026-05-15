'use client'

import { useState, useEffect } from 'react'
import { ModalShell, ModalClose, ModalBtn } from '@/components/clinic/ui/Modal'

export type GoalType = 'bajar_grasa' | 'ganar_musculo' | 'mantenimiento' | 'rendimiento'

const GOAL_META: Record<GoalType, { label: string; icon: string; desc: string; color: string; soft: string }> = {
  bajar_grasa:   { label: 'Bajar grasa',   icon: '🔥', desc: 'Reducir % grasa y masa grasa',   color: 'var(--berry)',  soft: 'var(--berry-soft)'  },
  ganar_musculo: { label: 'Ganar músculo', icon: '💪', desc: 'Aumentar masa muscular',          color: 'var(--leaf)',   soft: 'var(--leaf-soft)'   },
  mantenimiento: { label: 'Mantenimiento', icon: '⚖️', desc: 'Sostener composición actual',     color: 'var(--honey)',  soft: 'var(--honey-soft)'  },
  rendimiento:   { label: 'Rendimiento',   icon: '🏃', desc: 'Optimizar fuerza y resistencia',  color: 'var(--signal)', soft: 'var(--signal-soft)' },
}

// ─── GoalBadge ────────────────────────────────────────────────────────────────

interface GoalBadgeProps {
  goalType?: GoalType
  onEdit: () => void
  editable?: boolean
}

export function GoalBadge({ goalType, onEdit, editable = false }: GoalBadgeProps) {
  if (!goalType) {
    return (
      <button
        onClick={onEdit}
        style={{ background: 'var(--paper-2)', border: '1px dashed var(--ink-6)', borderRadius: 6, cursor: 'pointer', padding: '4px 10px', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        + Definir objetivo
      </button>
    )
  }

  const { label, color, soft } = GOAL_META[goalType]

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, background: soft, fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color, fontWeight: 600 }}>
        {label}
      </span>
      {editable && (
        <button
          onClick={onEdit}
          title="Editar objetivo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--ink-5)', lineHeight: 1 }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5.5 12.74l-2.83.71.71-2.83L11.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── GoalProgress ─────────────────────────────────────────────────────────────

interface GoalProgressProps {
  current: number
  goal: number
  unit: string
  metric: 'peso' | 'grasa' | 'musculo'
  invert?: boolean
}

export function GoalProgress({ current, goal, unit, metric, invert = false }: GoalProgressProps) {
  const COLOR_MAP = { peso: 'var(--ink-3)', grasa: 'var(--honey)', musculo: 'var(--leaf)' }

  const pct = Math.round(
    invert
      ? current <= goal ? 100 : Math.max(0, (1 - (current - goal) / current) * 100)
      : goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  )

  const monoSm: React.CSSProperties = { fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.04em' }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={monoSm}>{current}{unit}</span>
        <span style={monoSm}>meta {goal}{unit}</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'var(--ink-7)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: COLOR_MAP[metric], transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ ...monoSm, marginTop: 3 }}>{pct}% de avance</div>
    </div>
  )
}

// ─── GoalEditorModal ──────────────────────────────────────────────────────────

interface GoalEditorModalProps {
  open: boolean
  onClose: () => void
  onSave: (goals: {
    goal_type?: GoalType
    goal_weight_kg?: number | null
    goal_body_fat_pct?: number | null
    goal_muscle_kg?: number | null
  }) => Promise<void>
  initial?: {
    goal_type?: GoalType
    goal_weight_kg?: number
    goal_body_fat_pct?: number
    goal_muscle_kg?: number
  }
}

export function GoalEditorModal({ open, onClose, onSave, initial }: GoalEditorModalProps) {
  const [goalType, setGoalType] = useState<GoalType | undefined>(initial?.goal_type)
  const [weightKg, setWeightKg] = useState(initial?.goal_weight_kg?.toString() ?? '')
  const [fatPct,   setFatPct]   = useState(initial?.goal_body_fat_pct?.toString() ?? '')
  const [muscleKg, setMuscleKg] = useState(initial?.goal_muscle_kg?.toString() ?? '')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!open) return
    setGoalType(initial?.goal_type)
    setWeightKg(initial?.goal_weight_kg?.toString() ?? '')
    setFatPct(initial?.goal_body_fat_pct?.toString() ?? '')
    setMuscleKg(initial?.goal_muscle_kg?.toString() ?? '')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  async function handleSave() {
    setSaving(true)
    await onSave({
      goal_type:         goalType,
      goal_weight_kg:    weightKg  ? parseFloat(weightKg)  : null,
      goal_body_fat_pct: fatPct    ? parseFloat(fatPct)    : null,
      goal_muscle_kg:    muscleKg  ? parseFloat(muscleKg)  : null,
    })
    setSaving(false)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', border: '1px solid var(--ink-7)', borderRadius: 8,
    background: 'var(--paper)', fontSize: 13, fontFamily: 'var(--f-sans)',
    width: '100%', boxSizing: 'border-box', outline: 'none', color: 'var(--ink)',
  }

  const GOALS = Object.keys(GOAL_META) as GoalType[]

  return (
    <ModalShell onClose={onClose} maxWidth={520}>

      {/* Header */}
      <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--ink-7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            Objetivo del paciente
          </div>
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 20, fontWeight: 300, color: 'var(--ink)', fontStyle: 'italic' }}>
            Definir metas
          </div>
        </div>
        <ModalClose onClick={onClose} />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ink-7)' }}>

        {/* Tipo de objetivo */}
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Tipo de objetivo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {GOALS.map(g => {
            const { label, icon, desc, color, soft } = GOAL_META[g]
            const selected = goalType === g
            return (
              <button
                key={g}
                onClick={() => setGoalType(selected ? undefined : g)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${selected ? color : 'var(--ink-7)'}`, background: selected ? soft : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.12s, background 0.12s' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 500, color: selected ? color : 'var(--ink)', marginTop: 4 }}>{label}</span>
                <span style={{ fontFamily: 'var(--f-sans)', fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.4 }}>{desc}</span>
              </button>
            )
          })}
        </div>

        {/* Metas numéricas */}
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Metas numéricas (opcional)
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Peso meta (kg)',  value: weightKg, set: setWeightKg },
            { label: '% Grasa meta',    value: fatPct,   set: setFatPct   },
            { label: 'Músculo meta (kg)', value: muscleKg, set: setMuscleKg },
          ].map(({ label, value, set }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                {label}
              </div>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder="—"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

      </div>

      {/* Footer */}
      <div style={{ padding: '14px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <ModalBtn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</ModalBtn>
        <ModalBtn variant="signal" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar objetivo'}
        </ModalBtn>
      </div>

    </ModalShell>
  )
}
