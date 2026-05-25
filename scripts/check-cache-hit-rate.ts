// scripts/check-cache-hit-rate.ts
//
// CLI script para ver el cache hit rate semanal por endpoint.
// Corre con: npx ts-node scripts/check-cache-hit-rate.ts
//
// Outputs:
//   endpoint            | calls | cache_read% | est_savings_USD
//   chat                |   523 |       87.4% | $4.21
//   plate-analysis      |    81 |       62.1% | $0.34

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Sonnet 4.6 pricing (USD per million tokens)
const SONNET_INPUT = 3.0
const SONNET_OUTPUT = 15.0
// Cache read is 10% of base input; cache write is 1.25x base input.
// Savings = (cache_read_tokens × 0.9 × $3/M) — what we would have paid without caching.

async function main() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('endpoint, input_tokens, cache_creation_input_tokens, cache_read_input_tokens')
    .gte('created_at', since)
  if (error) throw error

  const byEndpoint = new Map<string, {
    calls: number
    input: number
    creation: number
    read: number
  }>()

  for (const row of data ?? []) {
    const e = row.endpoint
    const cur = byEndpoint.get(e) ?? { calls: 0, input: 0, creation: 0, read: 0 }
    cur.calls += 1
    cur.input += row.input_tokens ?? 0
    cur.creation += row.cache_creation_input_tokens ?? 0
    cur.read += row.cache_read_input_tokens ?? 0
    byEndpoint.set(e, cur)
  }

  console.log('endpoint               | calls |   read%  | savings USD (7d)')
  console.log('-----------------------+-------+----------+------------------')
  for (const [e, s] of byEndpoint.entries()) {
    const cacheable = s.read + s.creation
    const readPct = cacheable > 0 ? (s.read / cacheable) * 100 : 0
    const savings = (s.read * 0.9 * SONNET_INPUT) / 1_000_000
    console.log(
      `${e.padEnd(22)} | ${String(s.calls).padStart(5)} | ${readPct.toFixed(1).padStart(6)}% | $${savings.toFixed(2).padStart(8)}`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
