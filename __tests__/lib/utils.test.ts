import { cn, formatDate, formatShortDate, getToday, formatDuration, calculateBMI, getBMICategory } from '@/lib/utils'

describe('cn (class name utility)', () => {
  it('merges class names', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('handles arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })
})

describe('formatDate', () => {
  it('returns a string with day name in Spanish', () => {
    const result = formatDate('2026-03-23T12:00:00')
    // Should contain a Spanish day name
    expect(result).toMatch(/lunes|martes|miércoles|jueves|viernes|sábado|domingo/i)
  })

  it('returns a string with month name in Spanish', () => {
    const result = formatDate('2026-03-23T12:00:00')
    expect(result).toMatch(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i)
  })

  it('formats Date object correctly', () => {
    const date = new Date(2026, 3, 3, 12, 0, 0) // April 3, 2026 at noon (local time)
    const result = formatDate(date)
    expect(result).toMatch(/3/)
    expect(result).toMatch(/abril/i)
  })

  it('includes day number in result', () => {
    const result = formatDate('2026-04-15T12:00:00')
    expect(result).toMatch(/15/)
  })
})

describe('formatShortDate', () => {
  it('returns short month format', () => {
    const result = formatShortDate('2026-03-23T12:00:00')
    expect(result).toMatch(/mar/i)
  })

  it('formats Date object to short format', () => {
    const date = new Date(2026, 3, 15, 12, 0, 0) // April 15 at noon
    const result = formatShortDate(date)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/abr/i)
  })
})

describe('getToday', () => {
  it('returns today in ISO format YYYY-MM-DD', () => {
    const today = getToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a valid date string', () => {
    const today = getToday()
    const date = new Date(today)
    expect(date.toString()).not.toBe('Invalid Date')
  })
})

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('00:45')
  })

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('01:00')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('02:05')
  })

  it('formats hours when over 60 minutes', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('pads single digit seconds', () => {
    expect(formatDuration(65)).toBe('01:05')
  })
})

describe('calculateBMI', () => {
  it('calculates BMI correctly for normal weight', () => {
    // 70kg, 175cm = 70 / (1.75 * 1.75) = 22.86
    const bmi = calculateBMI(70, 175)
    expect(bmi).toBeCloseTo(22.86, 1)
  })

  it('calculates BMI for user profile (86kg, 163cm)', () => {
    // 86kg, 163cm = 86 / (1.63 * 1.63) = 32.37
    const bmi = calculateBMI(86, 163)
    expect(bmi).toBeCloseTo(32.37, 1)
  })

  it('calculates BMI for underweight', () => {
    // 50kg, 175cm = 50 / (1.75 * 1.75) = 16.33
    const bmi = calculateBMI(50, 175)
    expect(bmi).toBeCloseTo(16.33, 1)
  })
})

describe('getBMICategory', () => {
  it('returns "Bajo peso" for BMI < 18.5', () => {
    expect(getBMICategory(16)).toBe('Bajo peso')
    expect(getBMICategory(18.4)).toBe('Bajo peso')
  })

  it('returns "Normal" for BMI 18.5-24.9', () => {
    expect(getBMICategory(18.5)).toBe('Normal')
    expect(getBMICategory(22)).toBe('Normal')
    expect(getBMICategory(24.9)).toBe('Normal')
  })

  it('returns "Sobrepeso" for BMI 25-29.9', () => {
    expect(getBMICategory(25)).toBe('Sobrepeso')
    expect(getBMICategory(27)).toBe('Sobrepeso')
    expect(getBMICategory(29.9)).toBe('Sobrepeso')
  })

  it('returns "Obesidad I" for BMI 30-34.9', () => {
    expect(getBMICategory(30)).toBe('Obesidad I')
    expect(getBMICategory(32.4)).toBe('Obesidad I') // User's initial BMI
    expect(getBMICategory(34.9)).toBe('Obesidad I')
  })

  it('returns "Obesidad II" for BMI 35-39.9', () => {
    expect(getBMICategory(35)).toBe('Obesidad II')
    expect(getBMICategory(37)).toBe('Obesidad II')
    expect(getBMICategory(39.9)).toBe('Obesidad II')
  })

  it('returns "Obesidad III" for BMI >= 40', () => {
    expect(getBMICategory(40)).toBe('Obesidad III')
    expect(getBMICategory(45)).toBe('Obesidad III')
  })
})
