// app/api/coach/onboard/route.ts
//
// Called by the mobile onboarding wizard's final step. Takes the user's
// answers + bodyweight, asks Claude to pick the best routine template
// and estimate initial weights for each exercise, and returns a personal
// summary the wizard renders verbatim.
//
// On any failure we fall back to the rule-based pickTemplateFallback so
// the user is never blocked — they just get no per-exercise initial
// weights and the generic template description.

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthedUser, requireProTier } from '@/lib/api-auth'

type Goal = 'lose_weight' | 'gain_muscle' | 'strength' | 'maintain'
type Experience = 'new' | 'returning' | 'intermediate' | 'advanced'
type Equipment = 'full_gym' | 'home_weights' | 'bodyweight'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const maxDuration = 60

const PRIMARY_MODEL = 'claude-sonnet-4-6'
const FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

async function callClaudeWithFallback(
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>
): Promise<Anthropic.Message> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const isRetriable = (err: any) => err?.status === 529 || err?.status === 429
  let lastError: any
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await anthropic.messages.create({ ...params, model })
      } catch (err) {
        lastError = err
        if (!isRetriable(err)) break
        if (attempt < 2) await sleep(500 * Math.pow(2, attempt))
      }
    }
  }
  throw lastError
}

type OnboardInput = {
  goal: Goal
  experience: Experience
  daysPerWeek: number
  sessionMinutes: number
  equipment: Equipment
  injuries: string[]
}

type OnboardOutput = {
  templateKey: string
  initialWeights: Record<string, number>
  summary: string
  source: 'ai' | 'fallback'
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthedUser(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    // For onboard we DON'T 403 Lite users — they still need a routine.
    // We just skip the Claude call and fall through to rule-based pick.
    const tierCheck = await requireProTier(supabase, user.id)
    const skipAI = !tierCheck.ok

    const input = (await request.json()) as OnboardInput

    if (!input.goal || !input.experience || !input.daysPerWeek || !input.equipment) {
      return NextResponse.json({ error: 'Respuestas incompletas' }, { status: 400 })
    }

    // Pull the user's most recent bodyweight to anchor the AI's load math.
    const { data: weightRow } = await supabase
      .from('weight_logs')
      .select('weight_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    const bodyweightKg =
      (weightRow as { weight_kg?: number } | null)?.weight_kg ?? null

    // Pull the live blueprint catalog from the DB. Only templates that
    // actually have exercises in routine_blueprint_exercises are eligible
    // — that's our "available" check now (replaces the file-based stub
    // mechanism).
    const { data: blueprints, error: bpErr } = await (supabase as any)
      .from('routine_blueprints')
      .select('template_key, name, description, best_for, goal, experience_min, days_per_week, equipment')
      .eq('active', true)
    if (bpErr) {
      return NextResponse.json({ error: 'Blueprint read failed', detail: bpErr.message }, { status: 500 })
    }
    const allBlueprints = (blueprints ?? []) as Array<{
      template_key: string
      name: string
      description: string | null
      best_for: string | null
      goal: Goal
      experience_min: Experience
      days_per_week: number
      equipment: Equipment
    }>

    // Pull the exercises that belong to each template. Used by the AI to
    // estimate per-exercise initial weights.
    const { data: bpExercises } = await (supabase as any)
      .from('routine_blueprint_exercises')
      .select(`
        template_key,
        exercise_db_id,
        exercise:exercises (id, name, equipment)
      `)
    const exercisesByTemplate: Record<string, Array<{ id: string; name: string; equipment: string }>> = {}
    ;((bpExercises ?? []) as any[]).forEach((row) => {
      const ex = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
      if (!ex) return
      if (!exercisesByTemplate[row.template_key]) exercisesByTemplate[row.template_key] = []
      // Deduplicate per template (an exercise may appear in multiple days).
      if (!exercisesByTemplate[row.template_key].some((e) => e.id === ex.id)) {
        exercisesByTemplate[row.template_key].push({
          id: ex.id,
          name: ex.name,
          equipment: ex.equipment ?? '',
        })
      }
    })

    // Build the templates section the AI sees.
    const templatesBlock = allBlueprints
      .map((t) => `- key: ${t.template_key}
  name: ${t.name}
  description: ${t.description ?? ''}
  bestFor: ${t.best_for ?? ''}
  goal: ${t.goal} | experience_min: ${t.experience_min} | days: ${t.days_per_week} | equipment: ${t.equipment}`)
      .join('\n\n')

    // Rule-based fallback used when AI fails. Picks the closest template
    // by exact equipment match + closest days.
    const ruleBasedFallback = (): string => {
      const sameEquip = allBlueprints.filter((t) => t.equipment === input.equipment)
      const pool = sameEquip.length > 0 ? sameEquip : allBlueprints
      // Pick the template whose days_per_week is closest to the input.
      pool.sort((a, b) =>
        Math.abs(a.days_per_week - input.daysPerWeek) -
        Math.abs(b.days_per_week - input.daysPerWeek)
      )
      return pool[0]?.template_key ?? ''
    }
    const validKeys = new Set(allBlueprints.map((t) => t.template_key))

    const systemPrompt = `Eres Coach Fit, el coach AI de FitKis. Un usuario está terminando su onboarding y necesita que le recomiendes un plan inicial.

Tu trabajo es UNO solo: devolver JSON con la rutina correcta y cargas iniciales conservadoras.

TEMPLATES DISPONIBLES:
${templatesBlock}

EJERCICIOS POR TEMPLATE (usa los ids tal cual):
${JSON.stringify(exercisesByTemplate, null, 2)}

REGLAS DE CARGAS INICIALES (CRÍTICO — los usuarios prueban la primera sesión y si las cargas están muy altas se desmotivan o se lesionan):

Estas son cargas para la PRIMERA sesión. NO son las cargas reales del usuario, son un punto de partida deliberadamente cómodo. La meta es que la primera sesión se sienta ligera-a-moderada para que aprenda la técnica con margen, y que el sistema vaya subiendo carga sesión a sesión.

PORCENTAJES SOBRE PESO CORPORAL TOTAL (bodyweight, no per-side):

Compounds (banca con barra, sentadilla, peso muerto):
- new (nuevo): 20-25% del bodyweight
- returning (vuelve después de pausa): 30-35%
- intermediate: 40-50%  ← NUNCA más
- advanced: 55-65%      ← NUNCA más

Press militar / overhead:
- Aproximadamente 60% del valor de bench para esa misma persona.

Accesorios / aislamiento (curl, elevaciones laterales, extensiones, etc.):
- 8-15% del bodyweight, según el ejercicio. Curl bíceps puede ser 12%, elevaciones laterales 5-8%.

EJEMPLOS para anclar tu cálculo (peso corporal 70 kg = 154 lbs):
- nuevo: bench ~30-35 lbs total, sentadilla ~30-40 lbs total, curl bíceps ~15 lbs.
- intermedio: bench ~65-75 lbs total, sentadilla ~70-90 lbs total, press militar ~40-50 lbs total.
- advanced: bench ~90-100 lbs total, sentadilla ~100-120 lbs total.

PESOS ABSURDOS QUE NO DEBES PROPONER:
- Bench 185 lbs para alguien de 70 kg intermedio. Eso es 120% bodyweight, nivel competitivo.
- Sentadilla > 1.5× bodyweight como inicio. Imposible para v1.
- Curl bíceps > 30 lbs por mano. Eso solo lo hacen advanced muy fuertes.

EQUIPO:
- Si el ejercicio dice "Mancuernas" en el nombre o equipment, tu número es PESO POR MANCUERNA (cada mano). Aplica el porcentaje al total y divide entre 2.
- Si dice "Barra" / "Smith" / "Press de Banca": peso TOTAL incluyendo la barra (40-45 lbs típicos).
- Si dice "Máquina" / "Polea": calcula similar al equivalente con barra pero ~80% por la asistencia mecánica.

OUTPUT:
- Cargas en LIBRAS (lbs). Convierte de kg si necesitas (kg × 2.205).
- Redondea a múltiplos de 5 lbs. Mínimo 5 lbs.
- NO incluyas ejercicios sin peso (plancha, abdominales sin carga, sentadilla goblet sin peso, etc.) — omítelos del JSON.

Si el peso corporal es desconocido, usa 70 kg (154 lbs) como default y aplica los rangos de "nuevo" para ser ultra-conservador.

REGLAS DE TEMPLATE:
- Solo recomienda templates marcados [AVAILABLE].
- El número de días que dijo el usuario es un COMPROMISO, no un máximo. Si existe un template con exactamente esos días, ese gana.
- Si NO existe un template AVAILABLE con exactamente ese número de días, elige el más cercano y di la verdad en el summary, pero de forma natural y conversacional.
- Ajusta también al objetivo + experiencia.
- Si las lesiones del usuario son incompatibles con el template (ej: dolor de hombro grave + Upper Lower con press intenso), elige otro y nótalo en el summary.

TONO DEL SUMMARY (CRÍTICO):
- 2-3 frases, español editorial. No suena a IA repitiendo el input.
- Prohibido: "mencionaste", "indicaste", "dijiste que", "según tus respuestas", "templates disponibles". Esas frases delatan que estás repasando el formulario.
- Cuando hay un mismatch de días, redacta como un coach humano. Ejemplos del nivel correcto:
  - "Pediste cinco días. De momento solo tengo planes de cuatro y seis, así que empezamos con cuatro — te queda un día extra de recuperación, que tampoco viene mal."
  - "Tu objetivo encaja con seis días, pero a esa frecuencia el riesgo de quemarte es real. Empezamos con cuatro y vamos de menos a más."
- Cuando NO hay mismatch, simplemente describe el plan y qué esperar la primera semana. Sin preámbulos.
- No menciones "el template", "la rutina recomendada", "el plan que elegí". Hablas en primera persona del coach: "empezamos con", "vas a", "te toca".

FORMATO DE RESPUESTA — JSON sin markdown, sin explicaciones extras:
{
  "template_key": "<key del template>",
  "initial_weights": { "<exercise_id>": <number_lbs>, ... },
  "summary": "<2-3 frases en español, tono calmado y editorial. Explica brevemente por qué este template y qué esperar la primera semana. Sin asteriscos ni markdown.>"
}`

    const userMessage = `Mis respuestas del onboarding:
- Objetivo: ${input.goal}
- Experiencia: ${input.experience}
- Días disponibles por semana: ${input.daysPerWeek}
- Tiempo por sesión: ${input.sessionMinutes} minutos
- Equipo: ${input.equipment}
- Lesiones / molestias: ${input.injuries.length > 0 ? input.injuries.join(', ') : 'ninguna'}
- Mi peso corporal: ${bodyweightKg ? `${bodyweightKg} kg` : 'no registrado'}

Recomiéndame un plan.`

    let aiResult: OnboardOutput | null = null
    try {
      // Skip the Anthropic call entirely for Lite tier — rule-based
      // fallback below produces a valid (less personalized) result.
      if (skipAI) throw new Error('lite_tier_skip')
      const response = await callClaudeWithFallback({
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        const raw = textBlock.text.trim()
        const cleaned = raw
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
          .trim()
        const parsed = JSON.parse(cleaned) as {
          template_key: string
          initial_weights: Record<string, number>
          summary: string
        }
        if (
          parsed.template_key &&
          validKeys.has(parsed.template_key) &&
          parsed.summary
        ) {
          aiResult = {
            templateKey: parsed.template_key,
            initialWeights: parsed.initial_weights ?? {},
            summary: parsed.summary,
            source: 'ai',
          }
        }
      }
    } catch (err) {
      console.error('Onboarding AI call failed, will fall back:', err)
    }

    // Fallback path — rule-based picker against the live blueprint set,
    // no per-exercise weights, generic blueprint description as summary.
    if (!aiResult) {
      const templateKey = ruleBasedFallback()
      const t = allBlueprints.find((b) => b.template_key === templateKey)
      aiResult = {
        templateKey,
        initialWeights: {},
        summary: t ? `${t.description ?? ''} ${t.best_for ?? ''}`.trim() : '',
        source: 'fallback',
      }
    }

    return NextResponse.json(aiResult)
  } catch (error) {
    console.error('Onboarding endpoint error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Error generando plan', detail: message },
      { status: 500 }
    )
  }
}
