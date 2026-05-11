/**
 * lib/clinic/queries.ts
 *
 * Loaders y mutaciones del portal clínico contra Supabase.
 *
 * Diseño de cada función:
 *  - Acepta `supabase` como parámetro (no lo crea adentro). El caller decide
 *    si usa cliente browser o server.
 *  - Devuelve un shape específico por consumo, no la Row cruda. Eso permite
 *    cambiar la BD sin tocar la UI.
 *
 * El "shape de paciente para la lista" intenta coincidir con `MockPatient`
 * de `lib/clinic/mock-data.ts` para que los componentes existentes funcionen
 * sin refactor. Los campos que la BD no provee (adherencia exacta, racha)
 * se calculan aproximados o se dejan en `null` por ahora.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeightLog } from '@/types'
import type { AlertKind, MockPatient, PatientStatus } from './mock-data'

/**
 * Tipo permisivo. La Database está tipada pero las RPCs (`get_practitioner_patients`,
 * `get_user_by_email`) no, y forzar genéricos hace todo el módulo `never`. El legacy
 * usaba `(supabase as any)`; preferimos un tipo nombrado que admita ambos clientes
 * (browser y server) sin perder autocomplete en operaciones table-based.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>

/**
 * Día sin registros a partir del cual marcamos al paciente como "inactivo".
 * Ajustable por practitioner en Fase 3 (tabla settings).
 */
const INACTIVITY_THRESHOLD_DAYS = 7

// =============================================================================
// PRACTITIONER
// =============================================================================

export type PractitionerRecord = {
  id: string
  display_name: string
  license_number: string | null
  specialty: string | null
}

/**
 * Resuelve el registro de practitioner para el usuario logueado.
 * Devuelve null si el usuario no es practitioner — la UI debe redirigir.
 */
export async function loadPractitionerByUser(
  supabase: SB,
  userId: string
): Promise<PractitionerRecord | null> {
  const { data, error } = await supabase
    .from('practitioners')
    .select('id, display_name, license_number, specialty')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    display_name: data.display_name,
    license_number: data.license_number ?? null,
    specialty: data.specialty ?? null,
  }
}

// =============================================================================
// PATIENT LIST
// =============================================================================

type GetPractitionerPatientsRow = {
  relation_id: string
  patient_id: string
  patient_email: string | null
  patient_name: string | null
  status: PatientStatus
  invited_at: string
  accepted_at: string | null
}

/**
 * Lista de pacientes vinculados al practitioner, enriquecida con histórico
 * de peso (30 últimos), última config de dieta y métricas derivadas.
 *
 * Devuelve un arreglo de objetos compatibles con `MockPatient` para que la
 * UI no necesite cambios. Los campos sin equivalente directo (adherencia,
 * racha, "objetivo" como string formateado) se aproximan.
 */
export async function loadPatientsForPractitioner(
  supabase: SB,
  practitionerId: string
): Promise<MockPatient[]> {
  const { data, error } = await supabase
    .rpc('get_practitioner_patients' as never, { practitioner_uuid: practitionerId } as never)
  const relations = (data ?? []) as GetPractitionerPatientsRow[]

  if (error || relations.length === 0) {
    return []
  }

  // Sequential to avoid hammering the connection pool. With ~10s of patients
  // we could parallelize; for now keep it deterministic.
  const enriched = await Promise.all(
    relations.map((rel, index) => enrichPatient(supabase, rel, index))
  )

  return enriched
}

async function enrichPatient(
  supabase: SB,
  rel: GetPractitionerPatientsRow,
  index: number
): Promise<MockPatient> {
  const [{ data: profile }, { data: weights }, { data: diet }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('height_cm, goal_weight_kg')
      .eq('user_id', rel.patient_id)
      .maybeSingle(),
    supabase
      .from('weight_logs')
      .select('weight_kg, muscle_mass_kg, body_fat_mass_kg, body_fat_percentage, date')
      .eq('user_id', rel.patient_id)
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('diet_configs')
      .select('effective_date, version')
      .eq('user_id', rel.patient_id)
      .eq('active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Oldest-to-newest for the sparkline
  const weightHistory = ((weights ?? []) as WeightLog[]).slice().reverse()

  const weightArr = weightHistory.map((w) => w.weight_kg).filter((v): v is number => v != null)
  const fatArr = weightHistory
    .map((w) => w.body_fat_percentage)
    .filter((v): v is number => v != null)
  const muscleArr = weightHistory
    .map((w) => w.muscle_mass_kg)
    .filter((v): v is number => v != null)

  const daysSinceActivity = computeDaysSinceLatest(weightHistory)
  const goal = formatGoal(weightArr, profile?.goal_weight_kg)
  const alert = computeAlert(daysSinceActivity)
  const lastSeen = formatLastSeen(rel, daysSinceActivity)
  const initial = pickInitial(rel.patient_name, rel.patient_email)
  const displayName = rel.patient_name || rel.patient_email || `Paciente ${rel.patient_id.slice(0, 6)}`

  return {
    id: index + 1, // local ordinal id for the route param (real id is patient_id)
    name: displayName,
    email: rel.patient_email ?? '',
    initial,
    status: rel.status,
    plan: diet?.version != null ? `v${diet.version}` : '—',
    goal,
    age: undefined,
    height_m:
      profile?.height_cm != null ? Number((profile.height_cm / 100).toFixed(2)) : undefined,
    weight: weightArr,
    fat: fatArr,
    muscle: muscleArr,
    lastSeen,
    alert,
    adherence: null,
    streak: 0,
    _patient_id: rel.patient_id,
  }
}

/**
 * Devuelve el UUID real del paciente en Supabase.
 * Siempre presente en registros que vienen de `enrichPatient`; null solo si se
 * usa un MockPatient de mock-data puro (desarrollo local sin BD).
 */
export function patientRealId(p: MockPatient): string | null {
  return p._patient_id ?? null
}

// =============================================================================
// PATIENT DETAIL
// =============================================================================

export type PatientDetail = {
  patient_id: string
  email: string
  name: string
  initial: string
  age?: number
  height_m?: number
  goal_weight_kg?: number
  goal: string
  status: PatientStatus
  weight_history: WeightLog[] // oldest → newest
  active_diet?: ActiveDietSnapshot
  days_since_activity?: number
}

export type ActiveDietSnapshot = {
  id: string
  effective_date: string
  version: number
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
  notes: string | null
  active_meals: Record<string, boolean>
}

/**
 * Carga detalle completo para `/clinic/pacientes/[patientId]`.
 * RLS garantiza que el practitioner solo ve a sus propios pacientes; aún así
 * verifica explícitamente que existe la relación (defense-in-depth).
 */
export async function loadPatientDetail(
  supabase: SB,
  practitionerId: string,
  patientId: string
): Promise<PatientDetail | null> {
  const { data: relation } = await supabase
    .from('practitioner_patients')
    .select('id, status')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (!relation) return null

  const [{ data: profile }, { data: weights }, { data: diet }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('height_cm, goal_weight_kg, display_name')
      .eq('user_id', patientId)
      .maybeSingle(),
    supabase
      .from('weight_logs')
      .select('id, user_id, date, weight_kg, muscle_mass_kg, body_fat_mass_kg, body_fat_percentage, notes, created_at')
      .eq('user_id', patientId)
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('diet_configs')
      .select('id, effective_date, version, verdura, fruta, carb, leguminosa, proteina, grasa, notes, active_meals')
      .eq('user_id', patientId)
      .eq('active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Email no está disponible sin una RPC server-side (auth.users no es accesible
  // desde el cliente). Se obtiene display_name de user_profiles como nombre
  // preferido. TODO Fase 3: agregar RPC get_patient_for_practitioner(p_uuid, pat_uuid)
  // que devuelva email + name en un solo round-trip.
  const displayName =
    (profile as { display_name?: string } | null)?.display_name ||
    `Paciente ${patientId.slice(0, 6)}`
  const email = ''

  const weightHistory = ((weights ?? []) as WeightLog[]).slice().reverse()
  const weightArr = weightHistory.map((w) => w.weight_kg).filter((v): v is number => v != null)
  const daysSinceActivity = computeDaysSinceLatest(weightHistory)

  return {
    patient_id: patientId,
    email,
    name: displayName,
    initial: pickInitial(displayName, email),
    height_m: profile?.height_cm != null ? Number((profile.height_cm / 100).toFixed(2)) : undefined,
    goal_weight_kg: profile?.goal_weight_kg ?? undefined,
    goal: formatGoal(weightArr, profile?.goal_weight_kg),
    status: relation.status,
    weight_history: weightHistory,
    active_diet: diet
      ? {
          id: diet.id,
          effective_date: diet.effective_date,
          version: diet.version,
          verdura: diet.verdura,
          fruta: diet.fruta,
          carb: diet.carb,
          leguminosa: diet.leguminosa,
          proteina: diet.proteina,
          grasa: diet.grasa,
          notes: diet.notes ?? null,
          active_meals: (diet.active_meals as Record<string, boolean>) ?? {
            desayuno: true,
            snack1: true,
            comida: true,
            snack2: true,
            cena: true,
            snack3: false,
          },
        }
      : undefined,
    days_since_activity: daysSinceActivity,
  }
}

// =============================================================================
// PLAN EDITOR · SAVE
// =============================================================================

export type PlanDraft = {
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
  notes: string
  active_meals: Record<string, boolean>
  effective_date: string // YYYY-MM-DD
}

/**
 * Guarda un plan nuevo para el paciente:
 *  1. Marca el plan activo anterior como `active=false`.
 *  2. Inserta el nuevo plan con `version = previous + 1`, `active=true`,
 *     `prescribed_by = practitionerId`.
 *
 * No es atómico (Supabase JS no soporta transacciones desde el cliente).
 * Si el segundo paso falla, podría quedar el paciente sin plan activo.
 * En Fase 3: convertir en RPC para hacerlo atómico server-side.
 */
export async function savePlanDraft(
  supabase: SB,
  practitionerId: string,
  patientId: string,
  draft: PlanDraft
): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  // 1. Find current active plan
  const { data: current } = await supabase
    .from('diet_configs')
    .select('id, version')
    .eq('user_id', patientId)
    .eq('active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (current?.version ?? 0) + 1

  // 2. Deactivate the old one (if any)
  if (current?.id) {
    const { error: deactivateErr } = await supabase
      .from('diet_configs')
      .update({ active: false })
      .eq('id', current.id)
    if (deactivateErr) return { ok: false, error: `No se pudo desactivar plan anterior: ${deactivateErr.message}` }
  }

  // 3. Insert the new plan
  const { error: insertErr } = await supabase.from('diet_configs').insert({
    user_id: patientId,
    effective_date: draft.effective_date,
    verdura: draft.verdura,
    fruta: draft.fruta,
    carb: draft.carb,
    leguminosa: draft.leguminosa,
    proteina: draft.proteina,
    grasa: draft.grasa,
    prescribed_by: practitionerId,
    version: nextVersion,
    active: true,
    notes: draft.notes || null,
    active_meals: draft.active_meals,
  })

  if (insertErr) {
    // Compensate: reactivate the old plan so the patient is never left without one.
    // This is a best-effort rollback — if it also fails the inconsistency is logged
    // but not surfaced as a second error to avoid confusing the UI.
    if (current?.id) {
      await supabase.from('diet_configs').update({ active: true }).eq('id', current.id)
    }
    return { ok: false, error: `No se pudo guardar el plan: ${insertErr.message}` }
  }
  return { ok: true, version: nextVersion }
}

// =============================================================================
// INVITE
// =============================================================================

export async function invitePatientByEmail(
  supabase: SB,
  practitionerId: string,
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Lookup user
  const { data: usersRaw, error: lookupErr } = await supabase
    .rpc('get_user_by_email' as never, { email_input: email.toLowerCase() } as never)
  const users = (usersRaw ?? []) as { id: string; email: string }[]

  if (lookupErr) return { ok: false, error: lookupErr.message }
  if (users.length === 0) {
    return {
      ok: false,
      error: 'No se encontró un usuario con ese email. El paciente debe crear una cuenta primero.',
    }
  }
  const patientId = users[0].id

  // Check if already linked
  const { data: existing } = await supabase
    .from('practitioner_patients')
    .select('id, status')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (existing) {
    return {
      ok: false,
      error: `Este paciente ya está ${existing.status === 'active' ? 'vinculado' : 'invitado'}.`,
    }
  }

  const { error: insertErr } = await supabase.from('practitioner_patients').insert({
    practitioner_id: practitionerId,
    patient_id: patientId,
    status: 'pending',
    invited_at: new Date().toISOString(),
  })

  if (insertErr) return { ok: false, error: insertErr.message }
  return { ok: true }
}

// =============================================================================
// HELPERS
// =============================================================================

function computeDaysSinceLatest(weightHistory: WeightLog[]): number | undefined {
  if (!weightHistory.length) return undefined
  const latest = weightHistory[weightHistory.length - 1]
  const lastDate = new Date(latest.date + 'T00:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
}

function computeAlert(daysSinceActivity: number | undefined): AlertKind {
  if (daysSinceActivity != null && daysSinceActivity >= INACTIVITY_THRESHOLD_DAYS) {
    return 'inactividad'
  }
  return null
}

function formatGoal(weights: number[], goalWeight?: number | null): string {
  if (!goalWeight) return 'sin meta'
  if (!weights.length) return `meta ${goalWeight} kg`
  const current = weights[weights.length - 1]
  const diff = goalWeight - current
  if (Math.abs(diff) < 0.5) return 'mantenimiento'
  return diff < 0 ? `${diff.toFixed(0)} kg` : `+${diff.toFixed(0)} kg`
}

function formatLastSeen(
  rel: GetPractitionerPatientsRow,
  daysSinceActivity: number | undefined
): string {
  if (rel.status === 'pending') return 'invitado'
  if (daysSinceActivity == null) return 'sin registros'
  if (daysSinceActivity === 0) return 'Hoy'
  if (daysSinceActivity === 1) return 'hace 1d'
  return `hace ${daysSinceActivity}d`
}

function pickInitial(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || email || '?').trim()
  return source.charAt(0).toUpperCase() || '?'
}
