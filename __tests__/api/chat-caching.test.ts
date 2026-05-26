import { markLastBlockCached } from '@/lib/anthropic-cache'

// We test the cache_control placement strategy at the unit level. Full
// E2E with the SDK is out of scope here — we trust the SDK to forward
// the marked blocks correctly to the API.

describe('chat route — cache strategy', () => {
  it('marks only the LAST tool with cache_control', () => {
    // Simulate the 16 tools we have in chat/route.ts
    const tools = Array.from({ length: 16 }, (_, i) => ({
      name: `tool_${i}`,
      description: 'd',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    }))

    const cached = markLastBlockCached(tools)

    // All but last: no cache_control
    for (let i = 0; i < 15; i++) {
      expect((cached[i] as any).cache_control).toBeUndefined()
    }
    // Last: has cache_control
    expect((cached[15] as any).cache_control).toEqual({ type: 'ephemeral' })
  })

  it('preserves all tool fields when marking', () => {
    const tools = [{
      name: 'add_food_log',
      description: 'Registra un alimento',
      input_schema: { type: 'object' as const, properties: { meal: { type: 'string' } }, required: ['meal'] },
    }]
    const cached = markLastBlockCached(tools)
    expect(cached[0]).toMatchObject({
      name: 'add_food_log',
      description: 'Registra un alimento',
      input_schema: { type: 'object', properties: { meal: { type: 'string' } }, required: ['meal'] },
      cache_control: { type: 'ephemeral' },
    })
  })
})
