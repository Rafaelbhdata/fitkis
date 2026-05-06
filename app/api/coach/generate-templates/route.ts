// app/api/coach/generate-templates/route.ts
//
// One-shot generator: asks Claude to build the 12 v1 routine blueprints
// using exercise IDs from the synced ExerciseDB catalog. Writes the
// result to routine_blueprints + routine_blueprint_exercises.
//
// Idempotent — re-running wipes the existing rows for templates it
// generates and replaces them, leaving any other rows untouched.
//
// Auth: gated by SYNC_SECRET, same pattern as /api/exercises/sync.

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PRIMARY_MODEL = 'claude-sonnet-4-6'
const FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

async function callClaudeWithFallback(
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>
): Promise<Anthropic.Message> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const isRetriable = (err: any) => err?.status === 529 || err?.status === 429
  let last: any
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await anthropic.messages.create({ ...params, model })
      } catch (err) {
        last = err
        if (!isRetriable(err)) break
        if (attempt < 2) await sleep(500 * Math.pow(2, attempt))
      }
    }
  }
  throw last
}

// The 12 templates we want Claude to build. Schedule keys reference the
// day_keys Claude will fill in below. Sun=0..Sat=6.
const TEMPLATE_SPECS = [
  {
    key: 'full_body_3d_gym', name: 'Full Body · 3 días',
    description: 'Tres días por semana, todo el cuerpo en cada sesión.',
    bestFor: 'Principiantes que quieren cubrir todo el cuerpo aprendiendo los patrones básicos.',
    goal: 'gain_muscle', experienceMin: 'new', daysPerWeek: 3, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'fb_a', 2: 'rest', 3: 'fb_b', 4: 'rest', 5: 'fb_c', 6: 'rest' },
    daySpec: 'Cada día (fb_a, fb_b, fb_c) cubre cuerpo completo: 1 compound de pierna, 1 de empuje, 1 de jalón, 1 accesorio core. Varía los ejercicios entre días para que un mismo músculo se trabaje desde ángulos distintos.',
  },
  {
    key: 'full_body_3d_home', name: 'Full Body · 3 días · Casa',
    description: 'Tres días con mancuernas/equipo casero, full body cada sesión.',
    bestFor: 'Quien entrena en casa con mancuernas básicas.',
    goal: 'maintain', experienceMin: 'new', daysPerWeek: 3, equipment: 'home_weights',
    schedule: { 0: 'rest', 1: 'fb_a', 2: 'rest', 3: 'fb_b', 4: 'rest', 5: 'fb_c', 6: 'rest' },
    daySpec: 'Cada día con dumbbell o body weight. Compounds primero, accesorios al final.',
  },
  {
    key: 'full_body_3d_bw', name: 'Full Body · Bodyweight',
    description: 'Tres días, solo peso corporal. Sin equipo.',
    bestFor: 'Cero equipo. Comienza desde cero.',
    goal: 'maintain', experienceMin: 'new', daysPerWeek: 3, equipment: 'bodyweight',
    schedule: { 0: 'rest', 1: 'fb_a', 2: 'rest', 3: 'fb_b', 4: 'rest', 5: 'fb_c', 6: 'rest' },
    daySpec: 'Solo body weight: lagartijas, sentadillas, planchas, dominadas si hay barra, etc.',
  },
  {
    key: 'upper_lower_4d_gym', name: 'Upper / Lower · 4 días',
    description: 'Dos días de torso + dos de piernas. El clásico.',
    bestFor: 'Intermedios. Cubre todo dos veces por semana.',
    goal: 'gain_muscle', experienceMin: 'returning', daysPerWeek: 4, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'upper_a', 2: 'lower_a', 3: 'rest', 4: 'upper_b', 5: 'lower_b', 6: 'rest' },
    daySpec: 'upper_a: pecho/hombros/tríceps con foco horizontal (banca). upper_b: espalda/bíceps + hombros con foco vertical (jalón, press militar). lower_a: cuádriceps-dominante (sentadilla). lower_b: posterior chain (peso muerto, hip thrust).',
  },
  {
    key: 'upper_lower_4d_home', name: 'Upper / Lower · Casa',
    description: 'Upper/Lower 4 días con mancuernas. Sin barra ni máquinas.',
    bestFor: 'Casa con dumbbells. Estructura intermedia accesible.',
    goal: 'gain_muscle', experienceMin: 'returning', daysPerWeek: 4, equipment: 'home_weights',
    schedule: { 0: 'rest', 1: 'upper_a', 2: 'lower_a', 3: 'rest', 4: 'upper_b', 5: 'lower_b', 6: 'rest' },
    daySpec: 'Mismo principio que el de gym pero con dumbbell substitutes. No barbell, no machines.',
  },
  {
    key: 'ppl_3d_gym', name: 'Push / Pull / Legs',
    description: 'Tres días, un patrón por sesión.',
    bestFor: 'Quien tiene 3 días pero quiere foco específico por sesión.',
    goal: 'gain_muscle', experienceMin: 'returning', daysPerWeek: 3, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'push', 2: 'rest', 3: 'pull', 4: 'rest', 5: 'legs', 6: 'rest' },
    daySpec: 'push: pecho + hombros + tríceps. pull: espalda + bíceps. legs: cuádriceps + posterior + pantorrilla.',
  },
  {
    key: 'ppl_6d_gym', name: 'PPL · 6 días',
    description: 'Dos pasadas semanales de Push/Pull/Legs.',
    bestFor: 'Avanzados que aguantan alto volumen.',
    goal: 'gain_muscle', experienceMin: 'advanced', daysPerWeek: 6, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'push', 2: 'pull', 3: 'legs', 4: 'push', 5: 'pull', 6: 'legs' },
    daySpec: 'Mismo PPL repetido. Si puedes, varía algunos ejercicios entre la primera y segunda pasada de cada patrón para variedad de estímulo.',
  },
  {
    key: 'pplul_5d_gym', name: 'PPLUL · 5 días',
    description: 'Push, Pull, Legs, Upper, Lower. Híbrido potente.',
    bestFor: 'Intermedios+ con 5 días disponibles.',
    goal: 'gain_muscle', experienceMin: 'intermediate', daysPerWeek: 5, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'push', 2: 'pull', 3: 'legs', 4: 'upper', 5: 'lower', 6: 'rest' },
    daySpec: 'PPL los primeros 3 días + Upper/Lower los últimos 2 para volumen extra. Upper/Lower varían los ejercicios respecto a PPL.',
  },
  {
    key: 'bro_split_5d_gym', name: 'Bro Split · 5 días',
    description: 'Un grupo muscular por día.',
    bestFor: 'Hipertrofia clásica. Volumen alto por grupo, frecuencia 1×/semana.',
    goal: 'gain_muscle', experienceMin: 'intermediate', daysPerWeek: 5, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'chest', 2: 'back', 3: 'legs', 4: 'shoulders', 5: 'arms', 6: 'rest' },
    daySpec: 'chest: 4-5 ejercicios de pecho. back: 4-5 de espalda. legs: 4-5 de pierna. shoulders: 4 de hombro. arms: 2-3 de bíceps + 2-3 de tríceps.',
  },
  {
    key: 'glute_focus_4d_gym', name: 'Glúteo · 4 días',
    description: 'Cuatro días con énfasis en glúteo y posterior.',
    bestFor: 'Glúteo como objetivo principal.',
    goal: 'gain_muscle', experienceMin: 'returning', daysPerWeek: 4, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'glute_a', 2: 'upper_support', 3: 'rest', 4: 'glute_b', 5: 'upper_support', 6: 'rest' },
    daySpec: 'glute_a: hip thrust pesado + sentadilla + abducción. glute_b: peso muerto rumano + glute kickback + posterior. upper_support: 4-5 ejercicios de torso completo de mantenimiento.',
  },
  {
    key: 'glute_focus_4d_home', name: 'Glúteo · 4 días · Casa',
    description: 'Glute focus con mancuernas y banco.',
    bestFor: 'Mismo objetivo, en casa.',
    goal: 'gain_muscle', experienceMin: 'returning', daysPerWeek: 4, equipment: 'home_weights',
    schedule: { 0: 'rest', 1: 'glute_a', 2: 'upper_support', 3: 'rest', 4: 'glute_b', 5: 'upper_support', 6: 'rest' },
    daySpec: 'Mismo principio que el de gym pero con dumbbell. Hip thrust en piso, RDL con dumbbell, etc.',
  },
  {
    key: 'strength_3d_gym', name: 'Fuerza · 3 días',
    description: 'Compounds pesados, reps bajas, descansos largos. Foco en fuerza pura.',
    bestFor: 'Quien quiere subir números en banca, sentadilla, peso muerto.',
    goal: 'strength', experienceMin: 'returning', daysPerWeek: 3, equipment: 'full_gym',
    schedule: { 0: 'rest', 1: 'str_a', 2: 'rest', 3: 'str_b', 4: 'rest', 5: 'str_c', 6: 'rest' },
    daySpec: 'str_a: sentadilla + banca + accesorio. str_b: peso muerto + press militar + accesorio. str_c: sentadilla frontal + banca inclinada + accesorio. Reps 3-5, descansos 3-5 min.',
  },
] as const

export async function POST(request: Request) {
  const url = new URL(request.url)
  const secretParam = url.searchParams.get('secret')
  const secretHeader = request.headers.get('x-sync-secret')
  const expected = process.env.SYNC_SECRET
  if (!expected) return NextResponse.json({ error: 'SYNC_SECRET missing' }, { status: 500 })
  if (secretParam !== expected && secretHeader !== expected) {
    return NextResponse.json({ error: 'Bad secret' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Pull a compact view of the catalog so Claude can pick by id without
  // burning huge token budgets.
  const { data: catalog, error: catError } = await admin
    .from('exercises')
    .select('id, name, body_part, target, equipment')
    .order('id')
  if (catError || !catalog) {
    return NextResponse.json({ error: 'Catalog read failed', detail: catError?.message }, { status: 500 })
  }

  const catalogText = catalog
    .map((e: any) => `${e.id} | ${e.name} | ${e.body_part} | target:${e.target} | eq:${e.equipment}`)
    .join('\n')

  // System prompt — tight to keep Claude on-rails and force valid JSON.
  const system = `Eres un coach de fuerza experto armando rutinas para una app móvil de entrenamiento.

CONTEXTO:
Tienes un catálogo de ${catalog.length} ejercicios indexados por ID. Cada línea es: id | nombre | body_part | target | equipment.

Tu trabajo: para cada template que recibas, devuelve los ejercicios concretos (con sus IDs del catálogo) que llenan cada sesión. Sets, reps y descansos también.

REGLAS UNIVERSALES:
- Cada sesión tiene 4-6 ejercicios. Compounds primero (1-2), accesorios después.
- Sets típicos: compounds 3-5 sets, accesorios 3-4 sets.
- Reps: hipertrofia 8-12, fuerza 3-6, resistencia 12-15.
- Rest: compounds pesados 90-180s, accesorios 60-90s, fuerza pura 180-300s.
- NUNCA repitas el mismo ID dentro de una sesión.
- Match el equipment del template: si dice home_weights solo usa equipment=dumbbell o body weight; si dice bodyweight solo body weight.
- Para el target del músculo del día (ej "push"), apunta a body_part=chest, shoulders, upper arms (tríceps).
- Da preferencia a ejercicios con nombres reconocibles (squat, bench press, etc.) sobre variaciones exóticas.

FORMATO DE SALIDA (JSON estricto, sin markdown):
{
  "templates": [
    {
      "template_key": "<key del template>",
      "days": {
        "<day_key>": [
          { "exercise_db_id": "<id>", "sets": <n>, "reps": "<string>", "rest_seconds": <n>, "tip_es": "<opcional, frase corta editorial>" }
        ]
      }
    }
  ]
}

NO incluyas comentarios. NO uses markdown. Solo el JSON crudo.`

  const userMsg = `Arma estos ${TEMPLATE_SPECS.length} templates:

${TEMPLATE_SPECS.map((t) => `---
key: ${t.key}
nombre: ${t.name}
goal: ${t.goal} | exp_min: ${t.experienceMin} | days: ${t.daysPerWeek} | equipment: ${t.equipment}
schedule (sun=0..sat=6): ${JSON.stringify(t.schedule)}
day_keys que necesitas llenar: ${Array.from(new Set(Object.values(t.schedule).filter((v) => v !== 'rest'))).join(', ')}
spec: ${t.daySpec}`).join('\n')}

CATÁLOGO COMPLETO:
${catalogText}

Devuelve el JSON con los 12 templates y todos sus day_keys completos.`

  let aiJson: any = null
  try {
    const resp = await callClaudeWithFallback({
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userMsg }],
    })
    const text = resp.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No text response')
    const cleaned = text.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    aiJson = JSON.parse(cleaned)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'AI generation failed', detail }, { status: 500 })
  }

  if (!Array.isArray(aiJson?.templates)) {
    return NextResponse.json({ error: 'AI returned malformed payload' }, { status: 500 })
  }

  // Validate that every exercise_db_id Claude returned actually exists.
  const validIds = new Set(catalog.map((e: any) => e.id))

  const blueprintRows: any[] = []
  const exerciseRows: any[] = []
  const skipped: string[] = []

  for (const spec of TEMPLATE_SPECS) {
    const aiTemplate = aiJson.templates.find((t: any) => t.template_key === spec.key)
    if (!aiTemplate || !aiTemplate.days) {
      skipped.push(`${spec.key} — missing in AI response`)
      continue
    }
    blueprintRows.push({
      template_key: spec.key,
      name: spec.name,
      description: spec.description,
      best_for: spec.bestFor,
      goal: spec.goal,
      experience_min: spec.experienceMin,
      days_per_week: spec.daysPerWeek,
      equipment: spec.equipment,
      schedule: spec.schedule,
      active: true,
      updated_at: new Date().toISOString(),
    })
    for (const [dayKey, exs] of Object.entries(aiTemplate.days)) {
      if (!Array.isArray(exs)) continue
      ;(exs as any[]).forEach((ex, i) => {
        if (!validIds.has(ex.exercise_db_id)) {
          skipped.push(`${spec.key}/${dayKey}#${i} — invalid id ${ex.exercise_db_id}`)
          return
        }
        exerciseRows.push({
          template_key: spec.key,
          day_key: dayKey,
          order_index: i,
          exercise_db_id: ex.exercise_db_id,
          sets: ex.sets ?? 3,
          reps: String(ex.reps ?? '8-10'),
          rest_seconds: ex.rest_seconds ?? 90,
          tip_es: ex.tip_es ?? null,
        })
      })
    }
  }

  // Wipe + replace, atomic-ish. Delete old rows for the templates we
  // generated, then insert fresh.
  const keys = blueprintRows.map((r) => r.template_key)
  if (keys.length > 0) {
    await admin.from('routine_blueprint_exercises').delete().in('template_key', keys)
    const { error: bpErr } = await admin.from('routine_blueprints').upsert(blueprintRows, { onConflict: 'template_key' })
    if (bpErr) return NextResponse.json({ error: 'Blueprint upsert failed', detail: bpErr.message }, { status: 500 })

    if (exerciseRows.length > 0) {
      const { error: exErr } = await admin.from('routine_blueprint_exercises').insert(exerciseRows)
      if (exErr) return NextResponse.json({ error: 'Exercise insert failed', detail: exErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    templates_generated: blueprintRows.length,
    exercises_inserted: exerciseRows.length,
    skipped,
  })
}
