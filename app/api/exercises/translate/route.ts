// app/api/exercises/translate/route.ts
//
// One-time (and on-demand for new entries) translator. Reads exercises
// where instructions_es IS NULL and asks Haiku to translate the English
// instructions into Spanish. Writes back to the row with translated_at.
//
// Loops internally until either the queue is empty OR the time budget
// is about to expire (Vercel function maxDuration). Caller hits the
// endpoint repeatedly until response shows remaining: 0. Idempotent —
// re-running only translates rows that haven't been done yet.

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

const BATCH_SIZE = 20
const TIME_BUDGET_MS = 100_000 // exit when only 20s left of the 120s budget

const SYSTEM_PROMPT = `Eres un traductor experto en fitness. Recibes instrucciones de ejercicios en inglés y devuelves la versión en español natural.

REGLAS:
- Español neutro (no de España, no muy regional). Imagina que coachas en Latinoamérica.
- Conserva el sentido técnico exacto (ej: "elbow flare" = "abre los codos", no "rebota los codos").
- Frases imperativas en segunda persona del singular ("acuéstate", "empuja").
- No agregues consejos extras ni adornos. Traduce, no reescribas.
- Mantén la cantidad de pasos: si vienen 5 instrucciones, devuelves 5.

FORMATO DE SALIDA (JSON estricto, sin markdown):
{
  "translations": [
    { "id": "<exercise_id>", "instructions_es": ["paso 1", "paso 2", "..."] }
  ]
}

NO incluyas markdown ni comentarios. Solo el JSON.`

export async function POST(request: Request) {
  const startTime = Date.now()

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

  let totalTranslated = 0
  let batchesProcessed = 0
  const failed: { id: string; reason: string }[] = []

  while (Date.now() - startTime < TIME_BUDGET_MS) {
    // Pull a batch of un-translated exercises with non-empty English steps.
    const { data: batch, error: fetchErr } = await admin
      .from('exercises')
      .select('id, name, instructions')
      .is('instructions_es', null)
      .not('instructions', 'is', null)
      .order('id')
      .limit(BATCH_SIZE)

    if (fetchErr) {
      return NextResponse.json({ error: 'Fetch failed', detail: fetchErr.message }, { status: 500 })
    }
    if (!batch || batch.length === 0) {
      // Queue empty — done.
      return NextResponse.json({
        ok: true,
        translated_this_call: totalTranslated,
        batches_processed: batchesProcessed,
        remaining: 0,
        failed,
      })
    }

    // Skip rows where instructions array is actually empty.
    const usable = batch.filter((b: any) => Array.isArray(b.instructions) && b.instructions.length > 0)
    if (usable.length === 0) {
      // Nothing to do for this batch but mark them so we don't re-fetch.
      await admin
        .from('exercises')
        .update({ instructions_es: [], translated_at: new Date().toISOString() })
        .in('id', batch.map((b: any) => b.id))
      batchesProcessed += 1
      continue
    }

    const userMsg = `Traduce estos ejercicios al español:

${usable.map((e: any) => `id: ${e.id}
nombre: ${e.name}
instructions:
${(e.instructions as string[]).map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`).join('\n\n')}

Devuelve el JSON con todos los ${usable.length} ejercicios traducidos.`

    let parsed: { translations: { id: string; instructions_es: string[] }[] } | null = null
    try {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      })
      const text = resp.content.find((b) => b.type === 'text')
      if (!text || text.type !== 'text') throw new Error('No text response')
      const cleaned = text.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      // Mark this batch's ids as failed so the loop doesn't infinite. We
      // don't write instructions_es; we DO write translated_at to a
      // sentinel epoch so we can re-try later by clearing it.
      usable.forEach((e: any) => failed.push({ id: e.id, reason: `parse: ${reason}`.slice(0, 120) }))
      // Still mark them with empty translation so they don't re-loop.
      // Caller can re-trigger by setting instructions_es back to NULL.
      await admin
        .from('exercises')
        .update({ instructions_es: [], translated_at: new Date('1970-01-01').toISOString() })
        .in('id', usable.map((e: any) => e.id))
      batchesProcessed += 1
      continue
    }

    if (!parsed || !Array.isArray(parsed.translations)) {
      usable.forEach((e: any) => failed.push({ id: e.id, reason: 'malformed AI response' }))
      await admin
        .from('exercises')
        .update({ instructions_es: [], translated_at: new Date('1970-01-01').toISOString() })
        .in('id', usable.map((e: any) => e.id))
      batchesProcessed += 1
      continue
    }

    // Upsert each translation. If an id is missing from Claude's output,
    // we mark it with empty array + epoch sentinel so the loop terminates.
    const claimed = new Set(parsed.translations.map((t) => t.id))
    const updates: { id: string; instructions_es: string[]; translated_at: string }[] = []

    for (const t of parsed.translations) {
      if (typeof t.id !== 'string' || !Array.isArray(t.instructions_es)) continue
      updates.push({
        id: t.id,
        instructions_es: t.instructions_es.filter((s) => typeof s === 'string'),
        translated_at: new Date().toISOString(),
      })
    }
    for (const e of usable) {
      if (!claimed.has(e.id)) {
        failed.push({ id: e.id, reason: 'AI omitted this id' })
        updates.push({
          id: e.id,
          instructions_es: [],
          translated_at: new Date('1970-01-01').toISOString(),
        })
      }
    }

    // Per-row UPDATEs. Upsert balks because the row needs `name` (NOT
    // NULL) and we're not sending it. Individual updates are ~20 round-
    // trips per batch but each is small and parallel-safe via Promise.all.
    if (updates.length > 0) {
      const results = await Promise.all(
        updates.map((u) =>
          admin
            .from('exercises')
            .update({
              instructions_es: u.instructions_es,
              translated_at: u.translated_at,
            })
            .eq('id', u.id)
        )
      )
      const failedUpdate = results.find((r) => r.error)
      if (failedUpdate?.error) {
        return NextResponse.json(
          {
            error: 'Update failed',
            detail: failedUpdate.error.message,
            translated_so_far: totalTranslated,
          },
          { status: 500 }
        )
      }
      totalTranslated += updates.filter((u) => u.instructions_es.length > 0).length
    }
    batchesProcessed += 1
  }

  // Time budget exhausted. Tell caller to come back.
  const { count: remaining } = await admin
    .from('exercises')
    .select('id', { count: 'exact', head: true })
    .is('instructions_es', null)
    .not('instructions', 'is', null)

  return NextResponse.json({
    ok: true,
    translated_this_call: totalTranslated,
    batches_processed: batchesProcessed,
    remaining: remaining ?? 0,
    failed,
  })
}
