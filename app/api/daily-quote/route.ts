// app/api/daily-quote/route.ts
//
// Returns a single quote-of-the-day for ALL users (cached globally per date).
// On the first request of the day, calls Claude to generate a real quote
// from a real philosopher / habits author; stores it in `daily_quotes`;
// subsequent requests in the same day return the cached row.
//
// Cost: 1 Claude call per day for the entire app.

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getTodayInTimezone } from '@/lib/utils'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Service-role client so we can read/write daily_quotes regardless of RLS
// (the table policy only grants SELECT to authenticated; INSERT goes via
// service role).
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SYSTEM_PROMPT = `Eres un curador de citas filosóficas. Tu tarea es escoger una cita REAL de un autor REAL conocido sobre hábitos, disciplina, constancia, transformación personal, estoicismo o crecimiento.

Autores aceptables (ejemplos): Marco Aurelio, Epicteto, Séneca, Aristóteles, Plutarco, Confucio, Lao Tsé, Viktor Frankl, James Clear, Charles Duhigg, Stephen Covey, Will Durant, Carl Jung, Marco Aurelio, Friedrich Nietzsche.

REGLAS ESTRICTAS:
1. La cita DEBE ser real. No inventes ni parafrases.
2. El autor DEBE ser real y conocido.
3. La obra DEBE ser real.
4. Devuelve la cita en español natural (traducción cuidada, no literal awkward).
5. Cita corta (idealmente 8-25 palabras). Una sola frase o dos máximo.
6. NO uses citas de auto-ayuda baratas o de redes sociales.
7. Si no estás seguro de la atribución, escoge otra cita.

FORMATO:
Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones extras:
{
  "quote": "...",
  "author": "...",
  "source": "..."
}`

export async function GET(request: Request) {
  const { user } = await getAuthedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayInTimezone('America/Mexico_City')

  // 1. Try cached.
  const { data: existing } = await adminSupabase
    .from('daily_quotes')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      quote: existing.quote,
      author: existing.author,
      source: existing.source,
      date: existing.date,
      cached: true,
    })
  }

  // 2. No cache — generate via Claude.
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: 'Dame la cita filosófica de hoy.',
        },
      ],
    })

    // Extract text content
    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON (strip ```json fences if present)
    const raw = textBlock.text.trim()
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned) as {
      quote: string
      author: string
      source: string
    }

    if (!parsed.quote || !parsed.author) {
      throw new Error('Invalid quote payload from Claude')
    }

    // 3. Cache it. ON CONFLICT DO NOTHING handles a race where two
    // requests fire simultaneously on the same day — the second insert
    // will fail silently and we re-read.
    const { error: insertErr } = await adminSupabase
      .from('daily_quotes')
      .insert({
        date: today,
        quote: parsed.quote,
        author: parsed.author,
        source: parsed.source ?? null,
      })

    // If insert failed because another request already wrote, re-fetch.
    if (insertErr) {
      const { data: fresh } = await adminSupabase
        .from('daily_quotes')
        .select('*')
        .eq('date', today)
        .maybeSingle()
      if (fresh) {
        return NextResponse.json({
          quote: fresh.quote,
          author: fresh.author,
          source: fresh.source,
          date: fresh.date,
          cached: true,
        })
      }
      // Otherwise propagate
      console.error('daily_quotes insert failed:', insertErr)
    }

    return NextResponse.json({
      quote: parsed.quote,
      author: parsed.author,
      source: parsed.source,
      date: today,
      cached: false,
    })
  } catch (err) {
    console.error('daily-quote generation failed:', err)
    // Fallback: a hardcoded quote so the widget never breaks.
    return NextResponse.json({
      quote: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.',
      author: 'Aristóteles',
      source: 'Ética a Nicómaco',
      date: today,
      cached: false,
      fallback: true,
    })
  }
}
