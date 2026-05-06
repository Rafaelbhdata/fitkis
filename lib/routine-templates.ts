// lib/routine-templates.ts
//
// Catalogue of gym routine templates the onboarding wizard can hand to a
// user. Each template has a unique `key` stored on `user_profiles.active_
// template_key`. The Coach AI picks the best fit from this list based on
// the wizard answers.
//
// Phase 1 ships the metadata + the full content of `upper_lower_4d` (the
// app's existing routine, kept as the legacy default). Phases 2-3 wire
// the wizard and AI selection. Phase 3+ fills the remaining templates
// with real exercises — for now they're declared with empty `routines`
// so the AI can still see them and propose them, but starting one of
// those would need its content filled first.

import type { Routine } from '@/types'
import { ROUTINES, ROUTINE_SCHEDULE } from './constants'

export type Goal = 'lose_weight' | 'gain_muscle' | 'strength' | 'maintain'
export type Experience = 'new' | 'returning' | 'intermediate' | 'advanced'
export type Equipment = 'full_gym' | 'home_weights' | 'bodyweight'

export interface RoutineTemplate {
  key: string
  name: string
  // Short editorial description shown in the wizard's recommendation card.
  description: string
  // Whom is this for (used by the AI prompt).
  bestFor: string
  daysPerWeek: number
  // Day-of-week (Sun=0..Sat=6) → routine key inside `routines`.
  schedule: Record<number, string>
  // routine_key → full Routine spec (name, exercises, ...).
  routines: Record<string, Routine>
  // Compatibility hints used by the AI. The AI is free to ignore but the
  // wizard's rule-based fallback uses them when AI is unavailable.
  matchHints: {
    goals: Goal[]
    experience: Experience[]
    equipment: Equipment[]
    daysRange: [number, number] // inclusive
  }
}

export const ROUTINE_TEMPLATES: Record<string, RoutineTemplate> = {
  upper_lower_4d: {
    key: 'upper_lower_4d',
    name: 'Upper / Lower',
    description:
      'Cuatro días por semana, alternando torso y piernas. Equilibrio entre volumen y recuperación.',
    bestFor:
      'Intermedios o principiantes con buena adherencia. Cubre todo el cuerpo dos veces por semana.',
    daysPerWeek: 4,
    schedule: ROUTINE_SCHEDULE as Record<number, string>,
    routines: ROUTINES,
    matchHints: {
      goals: ['gain_muscle', 'strength', 'maintain'],
      experience: ['returning', 'intermediate', 'advanced'],
      equipment: ['full_gym', 'home_weights'],
      daysRange: [4, 4],
    },
  },

  ppl_3d: {
    key: 'ppl_3d',
    name: 'Push / Pull / Legs',
    description:
      'Tres días por semana, un día por patrón de movimiento. Sesiones más largas pero menos frecuentes.',
    bestFor:
      'Principiantes ocupados o quienes vuelven después de pausa. Cobertura completa con compromiso bajo.',
    daysPerWeek: 3,
    schedule: { 1: 'push', 3: 'pull', 5: 'legs', 0: 'rest', 2: 'rest', 4: 'rest', 6: 'rest' },
    routines: {}, // TODO Phase 3: fill push/pull/legs exercises
    matchHints: {
      goals: ['lose_weight', 'maintain', 'gain_muscle'],
      experience: ['new', 'returning'],
      equipment: ['full_gym', 'home_weights'],
      daysRange: [3, 3],
    },
  },

  ppl_6d: {
    key: 'ppl_6d',
    name: 'Push / Pull / Legs · 6 días',
    description:
      'Seis días por semana, dos pasadas de PPL. Alto volumen para objetivos agresivos.',
    bestFor:
      'Avanzados que pueden recuperarse rápido. Máxima frecuencia muscular semanal.',
    daysPerWeek: 6,
    schedule: { 1: 'push', 2: 'pull', 3: 'legs', 4: 'push', 5: 'pull', 6: 'legs', 0: 'rest' },
    routines: {}, // TODO Phase 3
    matchHints: {
      goals: ['gain_muscle', 'strength'],
      experience: ['advanced'],
      equipment: ['full_gym'],
      daysRange: [6, 6],
    },
  },

  full_body_3d: {
    key: 'full_body_3d',
    name: 'Full Body · 3 días',
    description:
      'Tres días por semana, todo el cuerpo en cada sesión. Compounds primero, accesorios al final.',
    bestFor:
      'Principiantes absolutos. La forma más eficiente de cubrir el cuerpo aprendiendo los patrones básicos.',
    daysPerWeek: 3,
    schedule: { 1: 'fb_a', 3: 'fb_b', 5: 'fb_c', 0: 'rest', 2: 'rest', 4: 'rest', 6: 'rest' },
    routines: {}, // TODO Phase 3
    matchHints: {
      goals: ['lose_weight', 'maintain', 'gain_muscle'],
      experience: ['new'],
      equipment: ['full_gym', 'home_weights', 'bodyweight'],
      daysRange: [2, 3],
    },
  },

  glute_focus_4d: {
    key: 'glute_focus_4d',
    name: 'Glúteo · 4 días',
    description:
      'Cuatro días con enfoque en glúteo y posterior, dos sesiones de torso de soporte.',
    bestFor:
      'Quienes tienen al glúteo como objetivo principal. Más volumen en hip thrust, abducción y peso muerto.',
    daysPerWeek: 4,
    schedule: { 1: 'glute_a', 2: 'upper_support', 4: 'glute_b', 5: 'upper_support', 0: 'rest', 3: 'rest', 6: 'rest' },
    routines: {}, // TODO Phase 3
    matchHints: {
      goals: ['gain_muscle', 'maintain'],
      experience: ['returning', 'intermediate', 'advanced'],
      equipment: ['full_gym', 'home_weights'],
      daysRange: [4, 4],
    },
  },
}

/**
 * Rule-based fallback when the AI is unavailable. Picks the first template
 * whose hints best match the wizard answers. Conservative on purpose: if
 * nothing matches, returns Upper/Lower 4d (the historical default).
 */
export function pickTemplateFallback(input: {
  goal: Goal
  experience: Experience
  daysPerWeek: number
  equipment: Equipment
}): string {
  const candidates = Object.values(ROUTINE_TEMPLATES).filter((t) => {
    const inDaysRange =
      input.daysPerWeek >= t.matchHints.daysRange[0] &&
      input.daysPerWeek <= t.matchHints.daysRange[1]
    const goalOk = t.matchHints.goals.includes(input.goal)
    const expOk = t.matchHints.experience.includes(input.experience)
    const eqOk = t.matchHints.equipment.includes(input.equipment)
    return inDaysRange && goalOk && expOk && eqOk
  })
  return candidates[0]?.key ?? 'upper_lower_4d'
}

/**
 * Returns true when the template is fully implemented and can be served.
 * Used by the wizard to disable selection of stub templates (Phase 1 only
 * has upper_lower_4d filled in).
 */
export function isTemplateAvailable(key: string): boolean {
  const t = ROUTINE_TEMPLATES[key]
  return !!t && Object.keys(t.routines).length > 0
}
