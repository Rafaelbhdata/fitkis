// lib/ai-caps.ts
//
// Hard caps en el uso mensual de endpoints de AI por usuario. Cuenta filas
// en ai_usage_logs para el usuario × endpoint × mes actual (UTC). Si está
// en el cap o lo excede, el endpoint devuelve 429 sin llamar a Claude —
// protege el margen del Pro plan contra power users.
//
// Caps definidos en línea con el pricing model (Pro a $200 MXN/mes asume
// estos límites como worst case). Si suben, hay que recalcular el modelo.
//
// Uso típico (al inicio de cada route AI, antes de la primera llamada a
// Claude):
//
//   const cap = await checkCap(adminSupabase, user.id, 'chat')
//   if (cap.over) {
//     return NextResponse.json(
//       { error: 'cap-exceeded', ...cap.payload },
//       { status: 429 }
//     )
//   }

import type { SupabaseClient } from '@supabase/supabase-js'

export const AI_CAPS = {
  // /api/chat — counts ROUND-TRIPS (one log row per callClaudeWithFallback).
  // With tool use averaging 2.5 round-trips per user message, 500 ≈ 200
  // user messages per month, ~6.6 user messages/day.
  chat: 500,
  // /api/plate-analysis — one log per foto analizada.
  'plate-analysis': 100,
  // /api/inbody-analysis — one log per scan.
  'inbody-analysis': 10,
  // /api/barcode-ai-estimate — one log per AI fallback when OFF/EAN missed.
  'barcode-ai-estimate': 50,
} as const

export type CappedEndpoint = keyof typeof AI_CAPS

/**
 * Returns the UTC ISO timestamp of the first millisecond of the current
 * UTC month. We use UTC so users in any timezone get reset at the same
 * instant globally, and to match how Supabase stores created_at.
 */
function getMonthStartUtcIso(): string {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return start.toISOString()
}

/**
 * Returns the UTC ISO timestamp of the first millisecond of NEXT UTC
 * month — i.e., when the cap resets.
 */
function getMonthResetUtcIso(): string {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return next.toISOString()
}

export type CapResult =
  | { over: false; used: number; cap: number }
  | {
      over: true
      used: number
      cap: number
      payload: {
        endpoint: CappedEndpoint
        used: number
        cap: number
        resetsOn: string  // ISO timestamp of next reset
      }
    }

/**
 * Check whether the user is at or above the cap for this endpoint this
 * month. Returns over=true when used >= cap. Counts rows in
 * ai_usage_logs (not a separate counters table) — simple and consistent
 * with how telemetry already lives.
 *
 * Race condition note: two concurrent requests can both pass the check
 * when at cap - 1, both succeed, ending at cap + 1. Acceptable at our
 * scale; if it ever matters, migrate to atomic counters.
 */
export async function checkCap(
  supabase: SupabaseClient,
  userId: string,
  endpoint: CappedEndpoint
): Promise<CapResult> {
  const monthStart = getMonthStartUtcIso()
  const cap = AI_CAPS[endpoint]

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', monthStart)

  // On query error, fail OPEN — let the request through. Cap enforcement
  // is a margin-protection feature, not a security feature. Better to
  // serve the user and lose a few cents than to block them on a transient
  // DB issue.
  if (error) {
    console.error('[checkCap] count query failed; failing open:', error)
    return { over: false, used: 0, cap }
  }

  const used = count ?? 0
  if (used >= cap) {
    return {
      over: true,
      used,
      cap,
      payload: {
        endpoint,
        used,
        cap,
        resetsOn: getMonthResetUtcIso(),
      },
    }
  }
  return { over: false, used, cap }
}
