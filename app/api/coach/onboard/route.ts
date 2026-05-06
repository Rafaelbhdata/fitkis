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
import { getAuthedUser } from '@/lib/api-auth'
import {
  ROUTINE_TEMPLATES,
  pickTemplateFallback,
  isTemplateAvailable,
  type Goal,
  type Experience,
  type Equipment,
} from '@/lib/routine-templates'

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

    // Build the templates section. We only let the AI recommend templates
    // that are actually implemented (have routines). Stubs are listed so
    // the AI is aware of the catalog but flagged so it doesn't pick them.
    const templatesBlock = Object.values(ROUTINE_TEMPLATES)
      .map((t) => {
        const status = isTemplateAvailable(t.key) ? 'AVAILABLE' : 'NOT YET AVAILABLE — do not pick'
        return `- key: ${t.key} [${status}]
  name: ${t.name}
  description: ${t.description}
  bestFor: ${t.bestFor}
  days: ${t.daysPerWeek}
  matchHints: goals=${t.matchHints.goals.join('|')}, experience=${t.matchHints.experience.join('|')}, equipment=${t.matchHints.equipment.join('|')}, days=${t.matchHints.daysRange.join('-')}`
      })
      .join('\n\n')

    // List of exercises the AI can suggest weights for. Only takes them
    // from currently-available templates so we never hand it ids that
    // won't render.
    const exercisesByTemplate: Record<string, Array<{ id: string; name: string; equipment: string }>> = {}
    for (const t of Object.values(ROUTINE_TEMPLATES)) {
      if (!isTemplateAvailable(t.key)) continue
      const flat: { id: string; name: string; equipment: string }[] = []
      for (const r of Object.values(t.routines)) {
        for (const ex of r.exercises) {
          flat.push({ id: ex.id, name: ex.name, equipment: ex.equipment })
        }
      }
      exercisesByTemplate[t.key] = flat
    }

    const systemPrompt = `Eres Coach Fit, el coach AI de FitKis. Un usuario está terminando su onboarding y necesita que le recomiendes un plan inicial.

Tu trabajo es UNO solo: devolver JSON con la rutina correcta y cargas iniciales conservadoras.

TEMPLATES DISPONIBLES:
${templatesBlock}

EJERCICIOS POR TEMPLATE (usa los ids tal cual):
${JSON.stringify(exercisesByTemplate, null, 2)}

REGLAS DE CARGAS INICIALES:
- Conservadoras siempre. Es mejor que la primera sesión se sienta ligera.
- Para principiantes / nuevos: ~25-30% del peso corporal en compounds (banca, sentadilla, peso muerto), ~10-15% en accesorios.
- Para retornantes: ~35-45% del peso corporal en compounds.
- Para intermedios: ~50-60% del peso corporal en compounds.
- Para mancuernas, divide entre 2 (es por mano).
- Para máquinas/poleas, calcula similar al barbell pero un poco menos por la asistencia mecánica.
- Si el peso corporal del usuario es null/desconocido, usa 70 kg como default razonable.
- Las cargas son en LIBRAS (lbs). Convierte de kg si necesitas (kg × 2.2).
- Redondea a múltiplos de 5 lbs. Mínimo 5 lbs.
- Solo da pesos para ejercicios CON peso (no plancha, no abdominales sin carga).

REGLAS DE TEMPLATE:
- Solo recomienda templates marcados [AVAILABLE].
- El número de días que dijo el usuario es un COMPROMISO, no un máximo. Si existe un template con exactamente esos días, ese gana.
- Si NO existe un template AVAILABLE con exactamente ese número de días (por ejemplo, el usuario dijo 5 días pero solo tenemos templates de 3, 4 y 6), elige el más cercano y EXPLÍCITAMENTE en el summary di algo como "Por ahora tenemos templates de 4 y 6 días — empezamos con 4 y te avisamos cuando esté disponible la versión de 5". Honestidad por encima de la apariencia de personalización.
- Ajusta también al objetivo + experiencia.
- Si las lesiones del usuario son incompatibles con el template (ej: dolor de hombro grave + Upper Lower con press intenso), elige otro y nótalo en el summary.

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
          isTemplateAvailable(parsed.template_key) &&
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

    // Fallback path — rule-based picker, no per-exercise weights, generic
    // template description as summary. Always returns a valid plan.
    if (!aiResult) {
      const key = pickTemplateFallback({
        goal: input.goal,
        experience: input.experience,
        daysPerWeek: input.daysPerWeek,
        equipment: input.equipment,
      })
      const templateKey = isTemplateAvailable(key) ? key : 'upper_lower_4d'
      const t = ROUTINE_TEMPLATES[templateKey]
      aiResult = {
        templateKey,
        initialWeights: {},
        summary: `${t.description} ${t.bestFor}`,
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
