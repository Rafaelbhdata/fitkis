// Tests del shape de input/output esperado del endpoint.
// La autenticación + DB calls se mockean al nivel del módulo de api-auth.

describe('smae-overrides CRUD — input validation', () => {
  // We test the input validation logic via a small extracted helper
  // imported from the route module. The route module exports its
  // validator for testability.
  it('validateOverridePayload accepts a valid override row', async () => {
    const { validateOverridePayload } = await import('@/app/api/practitioner/smae-overrides/route')
    const result = validateOverridePayload({
      food_id: '00000000-0000-0000-0000-000000000001',
      verdura: 0, fruta: 0, carb: 0,
      proteina: 0, grasa: 2, leguminosa: 0,
      notes: 'Para dislipidemia',
    })
    expect(result.ok).toBe(true)
  })

  it('validateOverridePayload accepts a valid custom food row', async () => {
    const { validateOverridePayload } = await import('@/app/api/practitioner/smae-overrides/route')
    const result = validateOverridePayload({
      food_id: null,
      name: 'Whey Birdman',
      portion: '1 scoop',
      verdura: 0, fruta: 0, carb: 0.5,
      proteina: 2, grasa: 0, leguminosa: 0,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects when neither food_id nor name is set', async () => {
    const { validateOverridePayload } = await import('@/app/api/practitioner/smae-overrides/route')
    const result = validateOverridePayload({
      food_id: null,
      name: null,
      verdura: 0, fruta: 0, carb: 0,
      proteina: 0, grasa: 0, leguminosa: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects when both food_id and name are set', async () => {
    const { validateOverridePayload } = await import('@/app/api/practitioner/smae-overrides/route')
    const result = validateOverridePayload({
      food_id: '00000000-0000-0000-0000-000000000001',
      name: 'Aguacate',
      verdura: 0, fruta: 0, carb: 0,
      proteina: 0, grasa: 2, leguminosa: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects when equivalents are out of range', async () => {
    const { validateOverridePayload } = await import('@/app/api/practitioner/smae-overrides/route')
    const result = validateOverridePayload({
      food_id: '00000000-0000-0000-0000-000000000001',
      verdura: -1, fruta: 0, carb: 0,
      proteina: 0, grasa: 0, leguminosa: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects when all equivalents are zero', async () => {
    const { validateOverridePayload } = await import('@/app/api/practitioner/smae-overrides/route')
    const result = validateOverridePayload({
      food_id: '00000000-0000-0000-0000-000000000001',
      verdura: 0, fruta: 0, carb: 0,
      proteina: 0, grasa: 0, leguminosa: 0,
    })
    expect(result.ok).toBe(false)
  })
})
