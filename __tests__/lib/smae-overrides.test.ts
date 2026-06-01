import {
  loadOverridesForUser,
  formatOverridesForPrompt,
  type SmaeOverride,
} from '@/lib/smae-overrides'

// Builds a chainable mock that resolves the final await with the given value.
function mockChain(resolvedValue: any) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(resolvedValue),
    then: undefined,
  }
  return chain
}

describe('loadOverridesForUser', () => {
  it('returns empty array when user has no active practitioner', async () => {
    const supabase: any = {
      from: (table: string) => {
        if (table === 'practitioner_patients') {
          return mockChain({ data: null, error: null })
        }
        return mockChain({ data: [], error: null })
      },
    }
    const result = await loadOverridesForUser(supabase, 'user-1')
    expect(result).toEqual([])
  })

  it('returns overrides + customs with food name resolved', async () => {
    const supabase: any = {
      from: (table: string) => {
        if (table === 'practitioner_patients') {
          return mockChain({
            data: { practitioner_id: 'prac-1' },
            error: null,
          })
        }
        // practitioner_smae_overrides
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [
                {
                  id: 'o-1',
                  food_id: 'food-aguacate',
                  name: null,
                  notes: 'Para dislipidemia',
                  verdura: 0, fruta: 0, carb: 0,
                  proteina: 0, grasa: 2, leguminosa: 0,
                  food_equivalents_global: { name: 'Aguacate Hass mediano' },
                },
                {
                  id: 'o-2',
                  food_id: null,
                  name: 'Whey Birdman vainilla',
                  notes: null,
                  verdura: 0, fruta: 0, carb: 0.5,
                  proteina: 2, grasa: 0, leguminosa: 0,
                  food_equivalents_global: null,
                },
              ],
              error: null,
            }),
          }),
        }
      },
    }
    const result = await loadOverridesForUser(supabase, 'user-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      food_name: 'Aguacate Hass mediano',
      equivalents: { grasa: 2 },
      notes: 'Para dislipidemia',
      is_custom: false,
    })
    expect(result[1]).toMatchObject({
      food_name: 'Whey Birdman vainilla',
      equivalents: { carb: 0.5, proteina: 2 },
      is_custom: true,
    })
  })

  it('returns empty when practitioner has no overrides', async () => {
    const supabase: any = {
      from: (table: string) => {
        if (table === 'practitioner_patients') {
          return mockChain({
            data: { practitioner_id: 'prac-1' },
            error: null,
          })
        }
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      },
    }
    const result = await loadOverridesForUser(supabase, 'user-1')
    expect(result).toEqual([])
  })
})

describe('formatOverridesForPrompt', () => {
  it('returns empty string when no overrides', () => {
    expect(formatOverridesForPrompt([])).toBe('')
  })

  it('formats overrides as readable rules with non-zero groups only', () => {
    const overrides: SmaeOverride[] = [
      {
        food_name: 'Aguacate Hass mediano',
        equivalents: { verdura: 0, fruta: 0, carb: 0, proteina: 0, grasa: 2, leguminosa: 0 },
        notes: null,
        is_custom: false,
      },
    ]
    const result = formatOverridesForPrompt(overrides)
    expect(result).toContain('REGLAS ESPECÍFICAS DE TU NUTRIÓLOGA')
    expect(result).toContain('Aguacate Hass mediano')
    expect(result).toContain('2 grasa')
    expect(result).not.toContain('0 verdura')
  })

  it('marks custom foods with a tag', () => {
    const overrides: SmaeOverride[] = [
      {
        food_name: 'Whey Birdman',
        equivalents: { verdura: 0, fruta: 0, carb: 0, proteina: 2, grasa: 0, leguminosa: 0 },
        notes: null,
        is_custom: true,
      },
    ]
    const result = formatOverridesForPrompt(overrides)
    expect(result).toContain('(custom)')
  })

  it('includes notes when present', () => {
    const overrides: SmaeOverride[] = [
      {
        food_name: 'Tortilla maíz',
        equivalents: { verdura: 0, fruta: 0, carb: 1, proteina: 0, grasa: 0.5, leguminosa: 0 },
        notes: 'Para pacientes con RI',
        is_custom: false,
      },
    ]
    const result = formatOverridesForPrompt(overrides)
    expect(result).toContain('Para pacientes con RI')
  })
})
