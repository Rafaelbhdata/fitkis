// lib/smae-overrides.ts
//
// Carga las overrides de SMAE del practitioner del usuario y las
// formatea como sección del system prompt. Usado por los 3 endpoints
// de IA (chat, plate-analysis, barcode-ai-estimate) para que las
// estimaciones respeten el criterio de cada nutrióloga.
//
// Diseño:
// - Una nutri tiene un set de overrides por food (existentes) + customs.
// - El paciente tiene UN active practitioner — si tiene varios, el más
//   reciente gana (ORDER BY accepted_at DESC LIMIT 1).
// - Si el paciente no tiene practitioner activo, devuelve [] sin error.

import type { SupabaseClient } from '@supabase/supabase-js'

export type FoodGroupName = 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'

export type SmaeOverride = {
  food_name: string
  equivalents: Record<FoodGroupName, number>
  notes: string | null
  is_custom: boolean
}

/**
 * Loads all SMAE overrides for the practitioner of the given patient.
 * Returns [] if the patient has no active practitioner or no overrides.
 * Service-role caller expected (typically called from API routes).
 */
export async function loadOverridesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SmaeOverride[]> {
  const { data: link, error: linkError } = await supabase
    .from('practitioner_patients')
    .select('practitioner_id')
    .eq('patient_id', userId)
    .eq('status', 'active')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (linkError) {
    console.error('[loadOverridesForUser] practitioner_patients query failed:', linkError)
    return []
  }
  if (!link) return []
  const practitionerId = (link as { practitioner_id: string }).practitioner_id

  const { data: rows, error: rowsError } = await supabase
    .from('practitioner_smae_overrides')
    .select(`
      id, food_id, name, notes,
      verdura, fruta, carb, proteina, grasa, leguminosa,
      food_equivalents_global ( name )
    `)
    .eq('practitioner_id', practitionerId)

  if (rowsError) {
    console.error('[loadOverridesForUser] overrides query failed:', rowsError)
    return []
  }
  if (!rows) return []

  return (rows as any[]).map((row) => {
    const isCustom = row.food_id === null
    const globalName: string | undefined = row.food_equivalents_global?.name
    return {
      food_name: isCustom ? String(row.name) : (globalName ?? '(unknown)'),
      equivalents: {
        verdura: Number(row.verdura) || 0,
        fruta: Number(row.fruta) || 0,
        carb: Number(row.carb) || 0,
        proteina: Number(row.proteina) || 0,
        grasa: Number(row.grasa) || 0,
        leguminosa: Number(row.leguminosa) || 0,
      },
      notes: row.notes ?? null,
      is_custom: isCustom,
    } satisfies SmaeOverride
  })
}

/**
 * Formats the overrides as a Spanish-language prompt section. Empty
 * input returns empty string (caller can safely concat).
 *
 * Only includes groups with non-zero equivalents to keep the prompt
 * compact and unambiguous.
 */
export function formatOverridesForPrompt(overrides: SmaeOverride[]): string {
  if (overrides.length === 0) return ''
  const lines = overrides.map((o) => {
    const eqs = (Object.entries(o.equivalents) as [FoodGroupName, number][])
      .filter(([, v]) => v > 0)
      .map(([g, v]) => `${v} ${g}`)
      .join(' + ')
    const tag = o.is_custom ? ' (custom)' : ''
    const note = o.notes ? ` — ${o.notes}` : ''
    return `- ${o.food_name}${tag}: ${eqs || '0 (sin equivalentes)'}${note}`
  })
  return [
    '',
    'REGLAS ESPECÍFICAS DE TU NUTRIÓLOGA (estas tienen PRIORIDAD sobre el SMAE genérico — usa estos valores cuando el alimento aparezca o sea similar):',
    ...lines,
    '',
  ].join('\n')
}
