import { markLastBlockCached, extractCacheUsage } from '@/lib/anthropic-cache'
import type Anthropic from '@anthropic-ai/sdk'

describe('markLastBlockCached', () => {
  it('marks only the last tool block with cache_control', () => {
    const tools: Anthropic.Tool[] = [
      { name: 'a', description: 'd', input_schema: { type: 'object', properties: {}, required: [] } },
      { name: 'b', description: 'd', input_schema: { type: 'object', properties: {}, required: [] } },
    ]
    const result = markLastBlockCached(tools)
    expect((result[0] as any).cache_control).toBeUndefined()
    expect((result[1] as any).cache_control).toEqual({ type: 'ephemeral' })
  })

  it('returns input unchanged if empty', () => {
    expect(markLastBlockCached([])).toEqual([])
  })

  it('does not mutate the input array', () => {
    const tools: Anthropic.Tool[] = [
      { name: 'a', description: 'd', input_schema: { type: 'object', properties: {}, required: [] } },
    ]
    const original = JSON.stringify(tools)
    markLastBlockCached(tools)
    expect(JSON.stringify(tools)).toBe(original)
  })
})

describe('extractCacheUsage', () => {
  it('normalizes null cache counters to 0', () => {
    const response = {
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    } as any
    expect(extractCacheUsage(response)).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    })
  })

  it('reads all four counters from usage', () => {
    const response = {
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 500,
      },
    } as any
    expect(extractCacheUsage(response)).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 2000,
      cache_read_input_tokens: 500,
    })
  })

  it('defaults missing cache counters to 0', () => {
    const response = {
      usage: { input_tokens: 100, output_tokens: 50 },
    } as any
    const result = extractCacheUsage(response)
    expect(result.cache_creation_input_tokens).toBe(0)
    expect(result.cache_read_input_tokens).toBe(0)
  })
})

describe('logUsage', () => {
  it('inserts a row with all token counters into ai_usage_logs', async () => {
    const { logUsage } = await import('@/lib/anthropic-cache')
    const insertedRows: any[] = []
    const mockSupabase = {
      from: (table: string) => ({
        insert: (row: any) => {
          insertedRows.push({ table, row })
          return Promise.resolve({ error: null })
        },
      }),
    } as any

    await logUsage(mockSupabase, {
      user_id: 'user-1',
      endpoint: 'chat',
      model: 'claude-sonnet-4-6',
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 2000,
      cache_read_input_tokens: 500,
    })

    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0].table).toBe('ai_usage_logs')
    expect(insertedRows[0].row).toMatchObject({
      user_id: 'user-1',
      endpoint: 'chat',
      input_tokens: 100,
      cache_read_input_tokens: 500,
    })
  })

  it('does not throw when insert fails (logging is best-effort)', async () => {
    const { logUsage } = await import('@/lib/anthropic-cache')
    const mockSupabase = {
      from: () => ({
        insert: () => Promise.resolve({ error: new Error('db down') }),
      }),
    } as any

    await expect(
      logUsage(mockSupabase, {
        user_id: 'user-1',
        endpoint: 'chat',
        model: 'claude-sonnet-4-6',
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      })
    ).resolves.not.toThrow()
  })
})
