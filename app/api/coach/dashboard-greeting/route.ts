// app/api/coach/dashboard-greeting/route.ts
//
// Per-user, per-day cached greeting for the Dashboard's Coach Fit card.
// On the first call of the day for a user, builds a context blob from
// the request payload and asks Claude Haiku for a one-line message.
// Cached in `coach_dashboard_greetings`. Subsequent calls same-day
// return the cached row with no model invocation.
//
// Cost: 1 Haiku call per user per day.

import { NextResponse } from 'next/server'
import { getAuthedUser, requireProTier } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getTodayInTimezone } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type Body = {
  context: {
    firstName?: string | null
    plateAvgPct?: number          // 0-100 across plate groups, today
    lowestGroup?: string | null   // e.g. "verduras", "proteínas"
    lowestRemaining?: number      // count remaining of lowest group
    habitsCompleted?: number
    habitsTotal?: number
    weightKg?: number | null
    weightTrendKg?: number | null // negative = losing
    daysSinceLastGym?: number | null
    isGymDay?: boolean
    routineLabel?: string | null  // "Upper A" if today is a gym day
  }
}

const SYSTEM_PROMPT = `Eres Coach Fit, el coach personal del usuario en una app de salud y fitness.

Tu trabajo: escribir UNA sola línea de saludo o nudge para el dashboard de hoy. La meta es que se sienta personal, observador y vivo — no genérico.

REGLAS DURAS:
1. Responde con UNA frase, máximo 18 palabras. Sin saltos de línea.
2. Español neutro mexicano. Tono cálido pero directo, no zalamero. Cero emojis.
3. NO digas "hola" ni "buenos días" — entra directo a observar o invitar.
4. Si hay datos relevantes (faltan verduras, racha de hábitos, sesión gym pendiente, peso bajando), úsalos. Si no, una invitación genuina.
5. NO inventes datos. Si no tienes contexto, una pregunta corta sirve.
6. NO uses "vamos por más", "tú puedes", "sigue así" — frases canned. Sé observador.
7. Sin signos de exclamación al final.

EJEMPLOS DEL TONO QUE QUIERO:
- "Te faltan dos verduras para cerrar el plato — ¿las metemos en la cena?"
- "Llevas tres días corridos con todos los hábitos. ¿Qué está funcionando?"
- "Hoy toca Upper B y ya bajaste 1.2 kg esta semana — buen momento para subir el peso del press."
- "Sin sesión registrada en cuatro días. ¿Pasó algo o solo se atravesó la semana?"
- "Plato y hábitos al 100. ¿Algo en mente o solo un día limpio?"

EJEMPLOS DE LO QUE NO QUIERO:
- "¡Buen día campeón! Vamos con todo hoy"  → cliché, exclamación
- "Sigue así, tú puedes lograrlo"  → vacío
- "Recuerda hidratarte y descansar"  → genérico

FORMATO DE RESPUESTA:
Solo el texto de la frase. Sin JSON. Sin comillas. Sin prefijos. Una línea.`

function buildUserPrompt(ctx: Body['context']): string {
  const parts: string[] = []
  if (ctx.firstName) parts.push(`Usuario: ${ctx.firstName}`)
  if (typeof ctx.plateAvgPct === 'number') parts.push(`Plato hoy: ${Math.round(ctx.plateAvgPct)}%`)
  if (ctx.lowestGroup && typeof ctx.lowestRemaining === 'number' && ctx.lowestRemaining > 0) {
    parts.push(`Faltan ${ctx.lowestRemaining} ${ctx.lowestGroup}`)
  }
  if (typeof ctx.habitsCompleted === 'number' && typeof ctx.habitsTotal === 'number') {
    parts.push(`Hábitos: ${ctx.habitsCompleted}/${ctx.habitsTotal}`)
  }
  if (typeof ctx.weightKg === 'number') {
    let wp = `Peso actual: ${ctx.weightKg.toFixed(1)} kg`
    if (typeof ctx.weightTrendKg === 'number' && Math.abs(ctx.weightTrendKg) >= 0.1) {
      const dir = ctx.weightTrendKg < 0 ? 'bajando' : 'subiendo'
      wp += ` (${dir} ${Math.abs(ctx.weightTrendKg).toFixed(1)} kg semana)`
    }
    parts.push(wp)
  }
  if (ctx.isGymDay && ctx.routineLabel) {
    parts.push(`Hoy toca: ${ctx.routineLabel}`)
  } else if (ctx.isGymDay === false) {
    parts.push('Hoy es día de descanso')
  }
  if (typeof ctx.daysSinceLastGym === 'number') {
    parts.push(`Última sesión gym: hace ${ctx.daysSinceLastGym} día${ctx.daysSinceLastGym === 1 ? '' : 's'}`)
  }

  if (parts.length === 0) return 'Sin datos hoy. Saluda con una invitación corta.'
  return parts.join('. ') + '. Genera el saludo de hoy.'
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tierCheck = await requireProTier(supabase, user.id)
  if (!tierCheck.ok) {
    return NextResponse.json(
      { error: 'Feature requiere plan Pro', code: 'tier_required', tier: tierCheck.tier },
      { status: 403 }
    )
  }

  const today = getTodayInTimezone('America/Mexico_City')

  // 1. Cached?
  const { data: existing } = await adminSupabase
    .from('coach_dashboard_greetings')
    .select('message, date')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: existing.message, date: existing.date, cached: true })
  }

  // 2. Generate.
  const body = (await request.json().catch(() => ({}))) as Body
  const ctx = body?.context ?? {}

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response')

    // Strip surrounding quotes / whitespace / trailing punctuation noise.
    const clean = textBlock.text
      .trim()
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/\n+/g, ' ')
      .trim()

    if (!clean || clean.length < 5) throw new Error('Empty greeting')

    // 3. Cache.
    const { error: insertErr } = await adminSupabase
      .from('coach_dashboard_greetings')
      .insert({ user_id: user.id, date: today, message: clean })

    if (insertErr) {
      // Race: another concurrent request inserted first. Re-fetch.
      const { data: fresh } = await adminSupabase
        .from('coach_dashboard_greetings')
        .select('message, date')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()
      if (fresh) {
        return NextResponse.json({ message: fresh.message, date: fresh.date, cached: true })
      }
    }

    return NextResponse.json({ message: clean, date: today, cached: false })
  } catch (err) {
    console.error('dashboard-greeting generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
