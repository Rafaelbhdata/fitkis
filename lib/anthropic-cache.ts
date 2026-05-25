// lib/anthropic-cache.ts
//
// Helpers para Anthropic prompt caching. Cachear bloques grandes y estáticos
// reduce el costo input ~90% en cache hits. Reglas: solo bloques >1024 tokens
// (Sonnet) son cacheables; máximo 4 breakpoints por request; el cache_control
// va en el último bloque que querés cachear (todo lo previo se cachea auto).
//
// Uso típico (tools array):
//   const cachedTools = markLastBlockCached(tools)
//   await anthropic.messages.create({ tools: cachedTools, ... })
//
// Telemetría (siempre lográ esto):
//   const usage = extractCacheUsage(response)
//   await logUsage({ ...usage, endpoint, model, user_id })

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

type Cacheable = { cache_control?: { type: 'ephemeral' } }

/**
 * Returns a new array with the last block marked for caching. The original
 * array is not mutated. Anthropic caches every block PRIOR to and including
 * the marked one, so marking only the last gives you the longest cached
 * prefix with a single breakpoint.
 */
export function markLastBlockCached<T extends object>(blocks: T[]): T[] {
  if (blocks.length === 0) return blocks
  const result = [...blocks]
  const last = result[result.length - 1]
  result[result.length - 1] = {
    ...last,
    cache_control: { type: 'ephemeral' },
  } as T & Cacheable
  return result
}

/**
 * Marca un string system prompt como cacheable convirtiéndolo a la forma de
 * bloques de Anthropic. Usá esto cuando tu system prompt es 100% estático y
 * supera el mínimo cacheable.
 */
export function cachedSystem(prompt: string): Anthropic.TextBlockParam[] {
  return [
    {
      type: 'text',
      text: prompt,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

export type CacheUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

/**
 * Extracts all four token counters from an Anthropic Message response. Cache
 * counters (creation/read) are typed `number | null` in the SDK and we
 * normalize null to 0 here, so the returned CacheUsage uses plain `number`
 * for every field. Returns 0 for cache counters when the API didn't surface
 * them (e.g., first request before cache is warm).
 */
export function extractCacheUsage(response: Anthropic.Message): CacheUsage {
  const { usage } = response
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  }
}

export type LogUsageInput = CacheUsage & {
  user_id: string
  endpoint: string
  model: string
}

/**
 * Inserts a row into ai_usage_logs. Best-effort: failures are swallowed
 * because we never want telemetry to break the user-facing API call.
 * Call this after every Claude invocation.
 */
export async function logUsage(
  supabase: SupabaseClient,
  input: LogUsageInput
): Promise<void> {
  try {
    const { error } = await supabase.from('ai_usage_logs').insert(input)
    if (error) {
      // Supabase returns soft errors (table missing, RLS denial, etc.) as
      // { error } without throwing. Log them for visibility.
      console.error('[logUsage] insert failed:', error)
    }
  } catch (err) {
    // Hard failures (network errors, syntax issues). Still don't break the route.
    console.error('[logUsage] insert threw:', err)
  }
}
