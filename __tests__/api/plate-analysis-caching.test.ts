import { cachedSystem } from '@/lib/anthropic-cache'

// Plate-analysis system prompt is currently ~524 tokens — below the 1024
// cacheable minimum, so the route itself does not use cachedSystem yet.
// These tests verify the helper is ready for when the prompt grows.

describe('plate-analysis route — cache strategy (forward-compatible)', () => {
  it('wraps a system prompt in a cached text block', () => {
    const blocks = cachedSystem('Eres un nutriólogo experto en SMAE...')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      type: 'text',
      cache_control: { type: 'ephemeral' },
    })
    expect(blocks[0].text).toContain('nutriólogo')
  })
})
