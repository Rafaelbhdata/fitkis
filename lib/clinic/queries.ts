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
import type { WeekSchedule } from './calendar-utils'
import { DEFAULT_WEEK_SCHEDULE } from './calendar-utils'

/**
 * Tipo permisivo. La Database está tipada pero las RPCs (`get_practitioner_patients`,
 * `get_user_by_email`) no, y forzar genéricos hace todo el módulo `never`. El legacy
 * usaba `(supabase as any)`; preferimos un tipo nombrado que admita ambos clientes
 * (browser y server) sin perder autocomplete en operaciones table-based.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>

const STAGNATION_MIN_DAYS     = 21   // ventana mínima entre primera y última medición
const STAGNATION_MIN_LOGS     = 3    // mediciones necesarias para detectar estancamiento
const STAGNATION_MAX_DELTA_KG = 1.0  // cambio total < 1 kg → peso estancado

// =============================================================================
// PRACTITIONER
// =============================================================================

export type PractitionerRecord = {
  id: string
  display_name: string
  license_number: string | null
  specialty: string | null
  clinic_name: string | null
  address: string | null
  schedule: WeekSchedule
  default_duration: number
  inactivity_threshold_days: number
  min_adherence_pct: number
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
    .select('id, display_name, license_number, specialty, clinic_name, address, schedule, default_duration, inactivity_threshold_days, min_adherence_pct')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    display_name: data.display_name,
    license_number: data.license_number ?? null,
    specialty: data.specialty ?? null,
    clinic_name: data.clinic_name ?? null,
    address: data.address ?? null,
    schedule: (data.schedule as WeekSchedule) ?? DEFAULT_WEEK_SCHEDULE,
    default_duration: (data.default_duration as number) ?? 60,
    inactivity_threshold_days: (data.inactivity_threshold_days as number) ?? 7,
    min_adherence_pct: (data.min_adherence_pct as number) ?? 60,
  }
}

export type PractitionerUpdate = {
  display_name?: string
  license_number?: string | null
  specialty?: string | null
  clinic_name?: string | null
  address?: string | null
  schedule?: WeekSchedule
  default_duration?: number
  inactivity_threshold_days?: number
  min_adherence_pct?: number
}

export async function updatePractitioner(
  supabase: SB,
  practitionerId: string,
  patch: PractitionerUpdate
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from('practitioners')
    .update(patch as never)
    .eq('id', practitionerId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
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
  practitionerId: string,
  thresholds: { inactivityDays: number; minAdherencePct: number } = { inactivityDays: 7, minAdherencePct: 60 }
): Promise<MockPatient[]> {
  const { data, error } = await supabase
    .rpc('get_practitioner_patients' as never, { practitioner_uuid: practitionerId } as never)
  const relations = (data ?? []) as GetPractitionerPatientsRow[]

  if (error || relations.length === 0) {
    return []
  }

  const patientIds = relations.map((r) => r.patient_id)

  const cutoff30 = new Date()
  cutoff30.setDate(cutoff30.getDate() - 30)
  const cutoffISO = cutoff30.toISOString().split('T')[0]

  // Bulk-fetch food/gym dates for last 30 days — 2 queries total regardless of list size
  const [{ data: foodRows }, { data: gymRows }] = await Promise.all([
    supabase
      .from('food_logs')
      .select('user_id, date')
      .in('user_id', patientIds)
      .gte('date', cutoffISO)
      .order('date', { ascending: false }),
    supabase
      .from('gym_sessions')
      .select('user_id, date')
      .in('user_id', patientIds)
      .gte('date', cutoffISO)
      .order('date', { ascending: false }),
  ])

  const lastFoodByPatient: Record<string, string> = {}
  const lastGymByPatient:  Record<string, string> = {}
  const activityDatesByPatient: Record<string, Set<string>> = {}

  for (const row of (foodRows ?? []) as { user_id: string; date: string }[]) {
    if (!lastFoodByPatient[row.user_id]) lastFoodByPatient[row.user_id] = row.date
    ;(activityDatesByPatient[row.user_id] ??= new Set()).add(row.date)
  }
  for (const row of (gymRows ?? []) as { user_id: string; date: string }[]) {
    if (!lastGymByPatient[row.user_id]) lastGymByPatient[row.user_id] = row.date
    ;(activityDatesByPatient[row.user_id] ??= new Set()).add(row.date)
  }

  const enriched = await Promise.all(
    relations.map((rel, index) =>
      enrichPatient(
        supabase, rel, index,
        lastFoodByPatient[rel.patient_id],
        lastGymByPatient[rel.patient_id],
        activityDatesByPatient[rel.patient_id],
        thresholds.inactivityDays,
      )
    )
  )

  return enriched
}

async function enrichPatient(
  supabase: SB,
  rel: GetPractitionerPatientsRow,
  index: number,
  lastFoodDate?: string,
  lastGymDate?: string,
  activityDates?: Set<string>,
  inactivityDays = 7,
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

  const daysSinceActivity = computeLastActivityDays(weightHistory, lastFoodDate, lastGymDate)
  const goal     = formatGoal(weightArr, profile?.goal_weight_kg)
  const alert    = computeAlert(daysSinceActivity, weightHistory, inactivityDays)
  const lastSeen = formatLastSeen(rel, daysSinceActivity)
  const initial  = pickInitial(rel.patient_name, rel.patient_email)
  const displayName = rel.patient_name || rel.patient_email || `Paciente ${rel.patient_id.slice(0, 6)}`

  // Merge weight dates (last 30 days) with food/gym dates for adherence + streak
  const cutoffISO = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })()
  const allDates = new Set(activityDates)
  for (const w of weightHistory) {
    if (w.date >= cutoffISO) allDates.add(w.date)
  }
  const adherence = allDates.size > 0 ? Math.round((allDates.size / 30) * 100) : null
  const streak    = computeStreak(allDates)

  return {
    id: index + 1,
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
    adherence,
    streak,
    days_since_activity: daysSinceActivity,
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
  adherence: number | null   // % días con actividad en la ventana
  streak: number             // racha actual en días consecutivos
  adherence_window: {
    days: number              // tamaño de la ventana en días
    since_appointment: boolean // true si la ventana arranca en la última cita completada
    since_date: string        // 'YYYY-MM-DD' — fecha inicio de la ventana
  }
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

  // Ventana de adherencia: desde la última cita completada (si existe y es ≤90d),
  // sino fallback a 30 días rolling. Esto le da a la nutrióloga contexto real:
  // "¿qué tan adherente ha sido desde la última vez que nos vimos?"
  const lastAppt = await loadLastCompletedAppointment(supabase, practitionerId, patientId)
  const today = new Date()
  const MAX_WINDOW_DAYS = 90
  let windowStart: Date
  let sinceAppointment = false
  if (lastAppt) {
    const apptDate = new Date(lastAppt.starts_at)
    const daysSinceAppt = Math.floor((today.getTime() - apptDate.getTime()) / 86_400_000)
    if (daysSinceAppt > 0 && daysSinceAppt <= MAX_WINDOW_DAYS) {
      windowStart = apptDate
      sinceAppointment = true
    } else {
      windowStart = new Date(today)
      windowStart.setDate(windowStart.getDate() - 30)
    }
  } else {
    windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 30)
  }
  const cutoffISO = windowStart.toISOString().split('T')[0]
  const windowDays = Math.max(1, Math.floor((today.getTime() - windowStart.getTime()) / 86_400_000))

  const [{ data: profile }, { data: weights }, { data: diet }, { data: relsRaw }, { data: foodDates }, { data: gymDates }] =
    await Promise.all([
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
      // `auth.users.email` no es accesible vía RLS desde el cliente. Reusamos
      // `get_practitioner_patients` que ya nos devuelve email + nombre. Ineficiente
      // (trae toda la lista de pacientes para encontrar uno) pero correcto.
      // TODO Fase 3: nueva RPC `get_patient_for_practitioner(p_uuid, pat_uuid)` que
      // devuelva email + name en un solo round-trip O materializar email en
      // `user_profiles` al crear la relación.
      supabase
        .rpc('get_practitioner_patients' as never, { practitioner_uuid: practitionerId } as never),
      supabase
        .from('food_logs')
        .select('date')
        .eq('user_id', patientId)
        .gte('date', cutoffISO),
      supabase
        .from('gym_sessions')
        .select('date')
        .eq('user_id', patientId)
        .gte('date', cutoffISO),
    ])

  const profileWithName = profile as { height_cm?: number; goal_weight_kg?: number; display_name?: string } | null
  const rels = (relsRaw ?? []) as GetPractitionerPatientsRow[]
  const myRel = rels.find((r) => r.patient_id === patientId)

  const email = myRel?.patient_email ?? ''
  const displayName =
    myRel?.patient_name ||
    profileWithName?.display_name ||
    email ||
    `Paciente ${patientId.slice(0, 6)}`

  const weightHistory = ((weights ?? []) as WeightLog[]).slice().reverse()
  const weightArr = weightHistory.map((w) => w.weight_kg).filter((v): v is number => v != null)
  const daysSinceActivity = computeLastActivityDays(weightHistory)

  const allDates = new Set<string>()
  for (const w of weightHistory) { if (w.date >= cutoffISO) allDates.add(w.date) }
  for (const r of (foodDates ?? []) as { date: string }[]) allDates.add(r.date)
  for (const r of (gymDates  ?? []) as { date: string }[]) allDates.add(r.date)
  const adherence = allDates.size > 0 ? Math.round((allDates.size / windowDays) * 100) : null
  const streak    = computeStreak(allDates)

  return {
    patient_id: patientId,
    email,
    name: displayName,
    initial: pickInitial(displayName, email),
    height_m: profileWithName?.height_cm != null ? Number((profileWithName.height_cm / 100).toFixed(2)) : undefined,
    goal_weight_kg: profileWithName?.goal_weight_kg ?? undefined,
    goal: formatGoal(weightArr, profileWithName?.goal_weight_kg),
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
    adherence,
    streak,
    adherence_window: {
      days: windowDays,
      since_appointment: sinceAppointment,
      since_date: cutoffISO,
    },
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

export function daysBetween(isoDate: string): number {
  const d = new Date(isoDate + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

/**
 * Días desde el último registro considerando peso, comida y gym.
 * Devuelve undefined si no hay ningún registro en ninguna fuente.
 */
function computeLastActivityDays(
  weightHistory: WeightLog[],
  lastFoodDate?: string,
  lastGymDate?:  string,
): number | undefined {
  const candidates: number[] = []
  if (weightHistory.length) {
    candidates.push(daysBetween(weightHistory[weightHistory.length - 1].date))
  }
  if (lastFoodDate) candidates.push(daysBetween(lastFoodDate))
  if (lastGymDate)  candidates.push(daysBetween(lastGymDate))
  if (!candidates.length) return undefined
  return Math.min(...candidates)
}

/**
 * Detecta estancamiento: paciente activo cuyo peso no ha cambiado
 * significativamente en al menos STAGNATION_MIN_DAYS con 3+ mediciones.
 */
function isStagnant(weightHistory: WeightLog[]): boolean {
  const ws = weightHistory.filter((w) => w.weight_kg != null)
  if (ws.length < STAGNATION_MIN_LOGS) return false
  const recent = ws.slice(-STAGNATION_MIN_LOGS) // últimas N mediciones
  const spanDays = daysBetween(recent[0].date) - daysBetween(recent[recent.length - 1].date)
  if (spanDays < STAGNATION_MIN_DAYS) return false
  const delta = Math.abs((recent[recent.length - 1].weight_kg ?? 0) - (recent[0].weight_kg ?? 0))
  return delta < STAGNATION_MAX_DELTA_KG
}

function computeStreak(dates: Set<string>): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (dates.has(d.toISOString().split('T')[0])) streak++
    else break
  }
  return streak
}

function computeAlert(daysSinceActivity: number | undefined, weightHistory: WeightLog[], inactivityDays = 7): AlertKind {
  if (daysSinceActivity == null || daysSinceActivity >= inactivityDays) return 'inactividad'
  if (isStagnant(weightHistory)) return 'estancamiento'
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

// =============================================================================
// PATIENTS — BASIC (para selects/dropdowns, sin enrich pesado)
// =============================================================================

export type PatientBasic = {
  patient_id: string
  patient_name: string | null
  patient_email: string | null
}

/** Lista mínima de pacientes vinculados al practitioner — solo id, nombre y email. */
export async function loadPatientsBasic(
  supabase: SB,
  practitionerId: string,
): Promise<PatientBasic[]> {
  const { data } = await supabase
    .rpc('get_practitioner_patients' as never, { practitioner_uuid: practitionerId } as never)
  return ((data ?? []) as GetPractitionerPatientsRow[])
    .filter(r => r.status === 'active')
    .map(r => ({ patient_id: r.patient_id, patient_name: r.patient_name, patient_email: r.patient_email }))
}

// =============================================================================
// APPOINTMENTS
// =============================================================================

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduling'

export type Appointment = {
  id: string
  practitioner_id: string
  patient_id: string | null
  patient_name: string
  patient_email: string | null
  starts_at: string          // ISO string, UTC
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  created_at: string
}

/** Citas de la semana que empieza en weekStart (ISO date string 'YYYY-MM-DD') */
export async function loadAppointmentsForWeek(
  supabase: SB,
  practitionerId: string,
  weekStart: string,   // 'YYYY-MM-DD'
): Promise<Appointment[]> {
  const end = new Date(weekStart + 'T00:00:00')
  end.setDate(end.getDate() + 7)
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .gte('starts_at', weekStart + 'T00:00:00')
    .lt('starts_at', end.toISOString())
    .order('starts_at', { ascending: true })
  return (data ?? []) as Appointment[]
}

export async function createAppointment(
  supabase: SB,
  payload: {
    practitioner_id: string
    patient_name: string
    patient_email?: string
    patient_id?: string
    starts_at: string    // ISO string
    duration_minutes?: number
    notes?: string
  }
): Promise<{ data: Appointment | null; error: string | null }> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...payload, duration_minutes: payload.duration_minutes ?? 50 } as never)
    .select()
    .single()
  return { data: data as Appointment | null, error: error?.message ?? null }
}

export async function updateAppointmentStatus(
  supabase: SB,
  id: string,
  status: AppointmentStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .update({ status } as never)
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function updateAppointmentNotes(
  supabase: SB,
  id: string,
  notes: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .update({ notes: notes.trim() || null } as never)
    .eq('id', id)
  return { error: error?.message ?? null }
}

/** Última cita completada de un paciente con un practitioner específico */
export async function loadLastCompletedAppointment(
  supabase: SB,
  practitionerId: string,
  patientId: string,
): Promise<Appointment | null> {
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Appointment | null
}

/** Citas de hoy para un practitioner (usado en el sidebar) */
export async function loadAppointmentsForDay(
  supabase: SB,
  practitionerId: string,
  date: string,   // 'YYYY-MM-DD' en la zona local
): Promise<Appointment[]> {
  const next = new Date(date + 'T00:00:00')
  next.setDate(next.getDate() + 1)
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .gte('starts_at', date + 'T00:00:00')
    .lt('starts_at', next.toISOString())
    .not('status', 'in', '("cancelled","no_show")')
    .order('starts_at', { ascending: true })
  return (data ?? []) as Appointment[]
}

/** Practitioner público (para la página de reservas) */
export async function loadPractitionerPublic(
  supabase: SB,
  practitionerId: string,
): Promise<{ id: string; display_name: string; specialty: string; clinic_name: string | null } | null> {
  const { data } = await supabase
    .from('practitioners')
    .select('id, display_name, specialty, clinic_name')
    .eq('id', practitionerId)
    .eq('active', true)
    .maybeSingle()
  return data as { id: string; display_name: string; specialty: string; clinic_name: string | null } | null
}

/** Reservar cita (usado desde la API pública — sin sesión de usuario) */
export async function bookAppointmentPublic(
  supabase: SB,
  payload: {
    practitioner_id: string
    patient_name: string
    patient_email: string
    starts_at: string
    duration_minutes?: number
    notes?: string
  }
): Promise<{ data: Appointment | null; error: string | null }> {
  // Verificar conflicto de horario.
  // Nota: esta lógica asume que todas las citas tienen la misma duración para la
  // detección de solapamiento con citas que empiezan antes de la nueva pero terminan
  // dentro de ella. Por ahora es aceptable con la duración por defecto de 50 min.
  const startDt = new Date(payload.starts_at)
  const endDt = new Date(startDt.getTime() + (payload.duration_minutes ?? 50) * 60_000)
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('practitioner_id', payload.practitioner_id)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('starts_at', endDt.toISOString())
    .gte('starts_at', startDt.toISOString())
    .limit(1)
  if (conflicts && conflicts.length > 0) {
    return { data: null, error: 'Este horario ya está ocupado.' }
  }
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...payload, duration_minutes: payload.duration_minutes ?? 50 } as never)
    .select()
    .single()
  return { data: data as Appointment | null, error: error?.message ?? null }
}

/** Próxima cita futura (no cancelada) de un paciente con un practitioner */
export async function loadNextAppointmentForPatient(
  supabase: SB,
  practitionerId: string,
  patientId: string,
): Promise<Appointment | null> {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .not('status', 'in', '("cancelled","no_show","completed")')
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data as Appointment | null
}

// =============================================================================
// LIBRARY TEMPLATES — biblioteca del nutriólogo
// =============================================================================

export type LibraryTemplateKind = 'plan' | 'mensaje' | 'receta'

export type LibraryPlanEquivs = {
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
}

export type LibraryTemplate = {
  id: string
  practitioner_id: string
  kind: LibraryTemplateKind
  title: string
  body: string
  plan_equivs: LibraryPlanEquivs | null
  created_at: string
  updated_at: string
}

export async function loadLibraryTemplates(
  supabase: SB,
  practitionerId: string,
  kind?: LibraryTemplateKind,
): Promise<LibraryTemplate[]> {
  let q = supabase
    .from('library_templates')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .order('updated_at', { ascending: false })
  if (kind) q = q.eq('kind', kind)
  const { data } = await q
  return (data ?? []) as LibraryTemplate[]
}

export async function createLibraryTemplate(
  supabase: SB,
  payload: {
    practitioner_id: string
    kind: LibraryTemplateKind
    title: string
    body?: string
    plan_equivs?: LibraryPlanEquivs | null
  }
): Promise<{ data: LibraryTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from('library_templates')
    .insert({
      practitioner_id: payload.practitioner_id,
      kind: payload.kind,
      title: payload.title.trim(),
      body: (payload.body ?? '').trim(),
      plan_equivs: payload.plan_equivs ?? null,
    } as never)
    .select()
    .single()
  return { data: data as LibraryTemplate | null, error: error?.message ?? null }
}

export async function updateLibraryTemplate(
  supabase: SB,
  id: string,
  patch: { title?: string; body?: string; plan_equivs?: LibraryPlanEquivs | null }
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = {}
  if (patch.title !== undefined)       update.title = patch.title.trim()
  if (patch.body !== undefined)        update.body = patch.body.trim()
  if (patch.plan_equivs !== undefined) update.plan_equivs = patch.plan_equivs
  const { error } = await supabase
    .from('library_templates')
    .update(update as never)
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteLibraryTemplate(
  supabase: SB,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('library_templates')
    .delete()
    .eq('id', id)
  return { error: error?.message ?? null }
}

// =============================================================================
// PRACTICE REPORTS — KPIs globales de la práctica
// =============================================================================

export type PracticeKPIs = {
  active_patients:        number
  pending_invites:        number
  avg_adherence:          number | null  // % promedio sobre los pacientes con datos
  appointments_next_7d:   number
  patients_needing_attention: Array<{
    patient_id: string
    name: string
    alert: AlertKind
    days_since_activity?: number
    adherence: number | null
  }>
  weight_trend: Array<{ date: string; avg_weight: number }>  // últimos 60 días, promedio diario
}

/**
 * KPIs agregados de la práctica del nutriólogo.
 * Reusa loadPatientsForPractitioner para evitar duplicar lógica de enriquecimiento.
 */
export async function loadPracticeKPIs(
  supabase: SB,
  practitionerId: string,
  thresholds: { inactivityDays: number; minAdherencePct: number },
): Promise<PracticeKPIs> {
  const patients = await loadPatientsForPractitioner(supabase, practitionerId, thresholds)
  const activePatients = patients.filter(p => p.status === 'active')

  const adherenceVals = activePatients
    .map(p => p.adherence)
    .filter((v): v is number => v != null)
  const avgAdherence = adherenceVals.length
    ? Math.round(adherenceVals.reduce((a, b) => a + b, 0) / adherenceVals.length)
    : null

  // Citas próximas 7 días (excluyendo canceladas/no_show)
  const now = new Date()
  const next7 = new Date(now); next7.setDate(next7.getDate() + 7)
  const { data: apptRows } = await supabase
    .from('appointments')
    .select('id')
    .eq('practitioner_id', practitionerId)
    .gte('starts_at', now.toISOString())
    .lt('starts_at', next7.toISOString())
    .not('status', 'in', '("cancelled","no_show")')
  const appointmentsNext7d = (apptRows ?? []).length

  // Pacientes que requieren atención: alerta activa o adherencia bajo umbral
  const needAttention = activePatients
    .filter(p => p.alert != null || (p.adherence != null && p.adherence < thresholds.minAdherencePct))
    .map(p => ({
      patient_id: p._patient_id ?? '',
      name: p.name,
      alert: p.alert,
      days_since_activity: p.days_since_activity,
      adherence: p.adherence,
    }))
    .sort((a, b) => (a.adherence ?? 0) - (b.adherence ?? 0))
    .slice(0, 10)

  // Tendencia de peso del grupo (60 días) — promedio diario de todos los pacientes activos
  const patientIds = activePatients.map(p => p._patient_id).filter((v): v is string => !!v)
  let weightTrend: Array<{ date: string; avg_weight: number }> = []
  if (patientIds.length > 0) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60)
    const { data: weightRows } = await supabase
      .from('weight_logs')
      .select('date, weight_kg')
      .in('user_id', patientIds)
      .gte('date', cutoff.toISOString().split('T')[0])
      .not('weight_kg', 'is', null)
    const byDate: Record<string, { sum: number; count: number }> = {}
    for (const r of (weightRows ?? []) as { date: string; weight_kg: number }[]) {
      if (r.weight_kg == null) continue
      const slot = byDate[r.date] ??= { sum: 0, count: 0 }
      slot.sum += r.weight_kg
      slot.count += 1
    }
    weightTrend = Object.entries(byDate)
      .map(([date, v]) => ({ date, avg_weight: Number((v.sum / v.count).toFixed(1)) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    active_patients: activePatients.length,
    pending_invites: patients.filter(p => p.status === 'pending').length,
    avg_adherence: avgAdherence,
    appointments_next_7d: appointmentsNext7d,
    patients_needing_attention: needAttention,
    weight_trend: weightTrend,
  }
}

// =============================================================================
// CONSULTATION NOTES — apuntes del nutriólogo por paciente
// =============================================================================

export type ConsultationNoteTag =
  | 'ajuste_plan'
  | 'recordatorio'
  | 'reagenda'
  | 'objetivo'
  | 'observacion'

export type ConsultationNote = {
  id: string
  practitioner_id: string
  patient_id: string
  appointment_id: string | null
  note_date: string       // 'YYYY-MM-DD'
  body: string
  tags: ConsultationNoteTag[]
  created_at: string
  updated_at: string
}

export type AppointmentNote = {
  appointment_id: string
  starts_at: string                // ISO datetime de la cita
  duration_minutes: number
  status: AppointmentStatus
  body: string
}

/**
 * Notas escritas dentro de citas (appointments.notes) que tengan contenido.
 * Se exponen al detalle del paciente como entries read-only, mezcladas con
 * las consultation_notes ordinarias.
 */
export async function loadAppointmentNotesForPatient(
  supabase: SB,
  practitionerId: string,
  patientId: string,
): Promise<AppointmentNote[]> {
  const { data } = await supabase
    .from('appointments')
    .select('id, starts_at, duration_minutes, status, notes')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .not('notes', 'is', null)
    .order('starts_at', { ascending: false })

  return ((data ?? []) as Array<{ id: string; starts_at: string; duration_minutes: number; status: AppointmentStatus; notes: string | null }>)
    .filter(r => r.notes && r.notes.trim() !== '')
    .map(r => ({
      appointment_id:   r.id,
      starts_at:        r.starts_at,
      duration_minutes: r.duration_minutes,
      status:           r.status,
      body:             (r.notes ?? '').trim(),
    }))
}

/** Notas del nutriólogo para un paciente, ordenadas por fecha descendente. */
export async function loadConsultationNotes(
  supabase: SB,
  practitionerId: string,
  patientId: string,
): Promise<ConsultationNote[]> {
  const { data } = await supabase
    .from('consultation_notes')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('patient_id', patientId)
    .order('note_date', { ascending: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as ConsultationNote[]
}

export async function createConsultationNote(
  supabase: SB,
  payload: {
    practitioner_id: string
    patient_id: string
    body: string
    tags?: ConsultationNoteTag[]
    appointment_id?: string | null
    note_date?: string
  }
): Promise<{ data: ConsultationNote | null; error: string | null }> {
  const { data, error } = await supabase
    .from('consultation_notes')
    .insert({
      practitioner_id: payload.practitioner_id,
      patient_id: payload.patient_id,
      body: payload.body.trim(),
      tags: payload.tags ?? [],
      appointment_id: payload.appointment_id ?? null,
      note_date: payload.note_date ?? new Date().toISOString().split('T')[0],
    } as never)
    .select()
    .single()
  return { data: data as ConsultationNote | null, error: error?.message ?? null }
}

export async function updateConsultationNote(
  supabase: SB,
  id: string,
  patch: { body?: string; tags?: ConsultationNoteTag[]; note_date?: string }
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = {}
  if (patch.body !== undefined)      update.body = patch.body.trim()
  if (patch.tags !== undefined)      update.tags = patch.tags
  if (patch.note_date !== undefined) update.note_date = patch.note_date
  const { error } = await supabase
    .from('consultation_notes')
    .update(update as never)
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteConsultationNote(
  supabase: SB,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('consultation_notes')
    .delete()
    .eq('id', id)
  return { error: error?.message ?? null }
}

// =============================================================================
// ADMIN
// =============================================================================

/**
 * Verifica si el usuario tiene rol 'admin' en user_profiles.
 * Usado por middleware y API routes para proteger rutas de administración.
 */
export async function isAdminUser(supabase: SB, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}

export type ProfessionalRow = {
  id: string
  user_id: string
  display_name: string
  license_number: string | null
  specialty: string | null
  clinic_name: string | null
  active: boolean
  created_at: string
  patient_count: number
}

/**
 * Lista todos los profesionales registrados en la plataforma.
 * Solo accesible para admins (RLS lo garantiza + se verifica en la UI/API).
 */
export async function loadAllProfessionals(supabase: SB): Promise<ProfessionalRow[]> {
  // 2 queries en lugar de N+1: una para practitioners, otra para todos los conteos.
  const [{ data, error }, { data: relations }] = await Promise.all([
    supabase
      .from('practitioners')
      .select('id, user_id, display_name, license_number, specialty, clinic_name, active, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('practitioner_patients')
      .select('practitioner_id')
      .eq('status', 'active'),
  ])

  if (error || !data) return []

  // Agrupar conteos en JS — evita un round-trip por practitioner
  const countMap = ((relations ?? []) as { practitioner_id: string }[]).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.practitioner_id] = (acc[row.practitioner_id] ?? 0) + 1
      return acc
    },
    {}
  )

  return (data as Omit<ProfessionalRow, 'patient_count'>[]).map((p) => ({
    ...p,
    patient_count: countMap[p.id] ?? 0,
  }))
}

/**
 * Desactiva un profesional (soft-delete: active = false).
 * Sus pacientes vinculados y datos históricos se conservan.
 */
export async function deactivateProfessional(
  supabase: SB,
  practitionerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from('practitioners')
    .update({ active: false })
    .eq('id', practitionerId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Reactiva un profesional previamente desactivado.
 */
export async function reactivateProfessional(
  supabase: SB,
  practitionerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from('practitioners')
    .update({ active: true })
    .eq('id', practitionerId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// =============================================================================
// PATIENT DATA — para tabs del detalle clínico
// =============================================================================

export type FoodLogEntry = {
  date: string
  meal: string
  group_type: string
  quantity: number
  food_name: string | null
}

export type GymSetEntry = {
  exercise_id: string
  set_number: number
  lbs: number | null
  reps: number | null
  feeling: string | null
}

export type GymSessionEntry = {
  id: string
  date: string
  routine_type: string
  cardio_minutes: number | null
  cardio_speed: number | null
  duration_seconds: number | null
  sets: GymSetEntry[]
}

/**
 * Food logs del paciente para los últimos N días.
 * Usado en la tab Alimentación del detalle clínico.
 */
export async function loadPatientFoodLogs(
  supabase: SB,
  patientId: string,
  days = 30
): Promise<FoodLogEntry[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('food_logs')
    .select('date, meal, group_type, quantity, food_name')
    .eq('user_id', patientId)
    .gte('date', cutoffStr)
    .order('date', { ascending: false })

  if (error || !data) return []
  return data as FoodLogEntry[]
}

/**
 * Últimas 20 sesiones de gym del paciente, incluyendo series.
 * Usado en la tab Entrenamiento del detalle clínico.
 */
export async function loadPatientGymSessions(
  supabase: SB,
  patientId: string
): Promise<GymSessionEntry[]> {
  const { data, error } = await supabase
    .from('gym_sessions')
    .select(`
      id, date, routine_type, cardio_minutes, cardio_speed, duration_seconds,
      session_sets(exercise_id, set_number, lbs, reps, feeling)
    `)
    .eq('user_id', patientId)
    .order('date', { ascending: false })
    .limit(20)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map((s) => ({
    id: s.id as string,
    date: s.date as string,
    routine_type: s.routine_type as string,
    cardio_minutes: (s.cardio_minutes as number | null) ?? null,
    cardio_speed: (s.cardio_speed as number | null) ?? null,
    duration_seconds: (s.duration_seconds as number | null) ?? null,
    sets: ((s.session_sets as GymSetEntry[]) ?? []).sort(
      (a, b) => a.set_number - b.set_number
    ),
  }))
}
