import { AI_CAPS, checkCap, type CappedEndpoint } from '@/lib/ai-caps'

// Build a minimal Supabase mock whose .from(...).select(...).eq(...).eq(...).gte(...)
// chain returns { count, error } on the final await.
function mockSupabase(result: { count?: number; error?: Error }) {
  // Each chain method returns `this` so .eq().eq().gte() composes, except
  // the final `gte` resolves the promise with { count, error }.
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    gte: () => Promise.resolve({ count: result.count ?? 0, error: result.error ?? null }),
  }
  return { from: () => chain } as any
}

describe('AI_CAPS constants', () => {
  it('defines exactly the 4 capped endpoints', () => {
    const keys = Object.keys(AI_CAPS).sort()
    expect(keys).toEqual([
      'barcode-ai-estimate',
      'chat',
      'inbody-analysis',
      'plate-analysis',
    ])
  })

  it('all caps are positive integers', () => {
    for (const cap of Object.values(AI_CAPS)) {
      expect(Number.isInteger(cap)).toBe(true)
      expect(cap).toBeGreaterThan(0)
    }
  })
})

describe('checkCap', () => {
  it('returns over=false when usage is below cap', async () => {
    const supabase = mockSupabase({ count: 50 })
    const result = await checkCap(supabase, 'user-1', 'chat')
    expect(result.over).toBe(false)
    expect(result.used).toBe(50)
    expect(result.cap).toBe(AI_CAPS.chat)
  })

  it('returns over=true when usage equals cap', async () => {
    const supabase = mockSupabase({ count: AI_CAPS['plate-analysis'] })
    const result = await checkCap(supabase, 'user-1', 'plate-analysis')
    expect(result.over).toBe(true)
    if (result.over) {
      expect(result.used).toBe(AI_CAPS['plate-analysis'])
      expect(result.cap).toBe(AI_CAPS['plate-analysis'])
      expect(result.payload.endpoint).toBe('plate-analysis')
      expect(result.payload.resetsOn).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('returns over=true when usage exceeds cap', async () => {
    const supabase = mockSupabase({ count: AI_CAPS.chat + 10 })
    const result = await checkCap(supabase, 'user-1', 'chat')
    expect(result.over).toBe(true)
  })

  it('treats null count as 0', async () => {
    const supabase = mockSupabase({ count: undefined })
    const result = await checkCap(supabase, 'user-1', 'inbody-analysis')
    expect(result.over).toBe(false)
    expect(result.used).toBe(0)
  })

  it('fails OPEN on query error (lets request through)', async () => {
    const supabase = mockSupabase({ error: new Error('db down') })
    const result = await checkCap(supabase, 'user-1', 'barcode-ai-estimate')
    expect(result.over).toBe(false)
    expect(result.used).toBe(0)
  })

  it('payload.resetsOn is the 1st of NEXT UTC month at 00:00', async () => {
    const supabase = mockSupabase({ count: AI_CAPS.chat })
    const result = await checkCap(supabase, 'user-1', 'chat')
    if (result.over) {
      const reset = new Date(result.payload.resetsOn)
      expect(reset.getUTCDate()).toBe(1)
      expect(reset.getUTCHours()).toBe(0)
      expect(reset.getUTCMinutes()).toBe(0)
      // Must be in the future relative to now (between 0 and 32 days away)
      const diffMs = reset.getTime() - Date.now()
      expect(diffMs).toBeGreaterThan(0)
      expect(diffMs).toBeLessThan(32 * 24 * 60 * 60 * 1000)
    }
  })
})
