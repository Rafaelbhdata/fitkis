import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'
import type { FoodGroup } from '@/types'

// SMAE conversion utilities
// Based on Sistema Mexicano de Alimentos Equivalentes
// Average values per equivalent:
// - Verdura: ~25kcal, ~5g carbs
// - Fruta: ~60kcal, ~15g carbs
// - Carb: ~70kcal, ~15g carbs
// - Leguminosa: ~120kcal, ~20g carbs, ~8g protein
// - Proteina: ~75kcal, ~7g protein (low fat) or ~55kcal, ~7g protein (very low fat)
// - Grasa: ~45kcal, ~5g fat

interface NutrientData {
  carbohydrates_100g?: number
  proteins_100g?: number
  fat_100g?: number
  fiber_100g?: number
  sugars_100g?: number
  energy_kcal_100g?: number
}

interface OpenFoodFactsProduct {
  product_name?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number
  nutriments?: NutrientData
  image_front_url?: string
  categories_tags?: string[]
}

interface BarcodeLookupResult {
  success: boolean
  found: boolean
  product?: {
    name: string
    brand?: string
    serving_size?: string
    image_url?: string
    nutrients_per_100g?: {
      calories?: number
      carbs?: number
      protein?: number
      fat?: number
      fiber?: number
      sugar?: number
    }
    estimated_equivalents?: {
      group_type: FoodGroup
      quantity: number
      note?: string
    }[]
  }
  source: 'openfoodfacts' | 'cache' | 'not_found'
  error?: string
}

// SMAE equivalents are conventionally portion-based ("1 envase = 1 proteína")
// rather than strictly gram-based, and serving sizes from Open Food Facts are
// often inflated (whole package). Estimates here are intentionally conservative:
// higher thresholds, floor-rounding to .5, and a per-group cap.
const MAX_EQUIV_PER_GROUP = 1.5
function floorHalf(n: number) {
  return Math.floor(n * 2) / 2
}

function estimateSMAEEquivalents(nutrients: NutrientData, servingGrams: number = 100): { group_type: FoodGroup; quantity: number; note?: string }[] {
  const equivalents: { group_type: FoodGroup; quantity: number; note?: string }[] = []

  // Get nutrient values (per serving)
  const carbs = ((nutrients.carbohydrates_100g || 0) * servingGrams) / 100
  const protein = ((nutrients.proteins_100g || 0) * servingGrams) / 100
  const fat = ((nutrients.fat_100g || 0) * servingGrams) / 100
  const fiber = ((nutrients.fiber_100g || 0) * servingGrams) / 100
  const sugar = ((nutrients.sugars_100g || 0) * servingGrams) / 100

  // Estimate protein equivalents (1 equiv = ~7g protein)
  if (protein >= 7) {
    const proteinEquiv = Math.min(floorHalf(protein / 7), MAX_EQUIV_PER_GROUP)
    if (proteinEquiv > 0) {
      equivalents.push({
        group_type: 'proteina',
        quantity: proteinEquiv,
        note: `~${protein.toFixed(0)}g proteína`
      })
    }
  }

  // Estimate fat equivalents (1 equiv = ~5g fat)
  if (fat >= 5) {
    const fatEquiv = Math.min(floorHalf(fat / 5), MAX_EQUIV_PER_GROUP)
    if (fatEquiv > 0) {
      equivalents.push({
        group_type: 'grasa',
        quantity: fatEquiv,
        note: `~${fat.toFixed(0)}g grasa`
      })
    }
  }

  // Estimate carb equivalents (1 equiv = ~15g carbs)
  // Subtract fiber to get net carbs for more accurate estimation
  const netCarbs = carbs - fiber
  if (netCarbs >= 15) {
    // Check if it's likely a legume (high protein + carbs)
    if (protein >= 7 && netCarbs >= 20) {
      const legumEquiv = Math.min(floorHalf(netCarbs / 20), MAX_EQUIV_PER_GROUP) // Legumes have ~20g carbs per equiv
      if (legumEquiv > 0) {
        equivalents.push({
          group_type: 'leguminosa',
          quantity: legumEquiv,
          note: `~${netCarbs.toFixed(0)}g carbohidratos netos`
        })
      }
    } else {
      // Regular carb
      const carbEquiv = Math.min(floorHalf(netCarbs / 15), MAX_EQUIV_PER_GROUP)
      if (carbEquiv > 0) {
        equivalents.push({
          group_type: 'carb',
          quantity: carbEquiv,
          note: `~${netCarbs.toFixed(0)}g carbohidratos netos`
        })
      }
    }
  }

  // If high in sugar and low in other macros, might be fruit
  if (sugar > 10 && protein < 3 && fat < 3) {
    // Could also be a fruit product, but we'll keep it as carb for packaged products
  }

  // Default: if nothing calculated, return a minimal estimate based on calories
  if (equivalents.length === 0) {
    const calories = nutrients.energy_kcal_100g
    if (calories && calories > 50) {
      // Rough estimate: assume mixed macros
      equivalents.push({
        group_type: 'carb',
        quantity: 0.5,
        note: 'Estimación basada en calorías'
      })
    }
  }

  return equivalents
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthedUser(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    if (!barcode) {
      return NextResponse.json({ error: 'Se requiere código de barras' }, { status: 400 })
    }

    // First check local cache
    const { data: cached } = await supabase
      .from('barcode_cache')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (cached) {
      // Re-estimate equivalents on cache hit so older rows benefit from
      // calibration updates without needing to re-fetch from Open Food Facts.
      const cachedProduct = cached.product_data
      if (cachedProduct?.nutrients_per_100g) {
        const np = cachedProduct.nutrients_per_100g
        const nutriments: NutrientData = {
          carbohydrates_100g: np.carbs,
          proteins_100g: np.protein,
          fat_100g: np.fat,
          fiber_100g: np.fiber,
          sugars_100g: np.sugar,
          energy_kcal_100g: np.calories,
        }
        const servingMatch = (cachedProduct.serving_size || '').match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i)
        const servingGrams = servingMatch ? parseFloat(servingMatch[1]) : 100
        cachedProduct.estimated_equivalents = estimateSMAEEquivalents(nutriments, servingGrams)
      }
      const result: BarcodeLookupResult = {
        success: true,
        found: true,
        product: cachedProduct,
        source: 'cache'
      }
      return NextResponse.json(result)
    }

    // Query Open Food Facts API
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'FitKis/1.0 (https://fitkis.app; contact@fitkis.app)'
        }
      }
    )

    if (!offResponse.ok) {
      const result: BarcodeLookupResult = {
        success: true,
        found: false,
        source: 'not_found',
        error: 'Error al consultar Open Food Facts'
      }
      return NextResponse.json(result)
    }

    const offData = await offResponse.json()

    if (offData.status !== 1 || !offData.product) {
      const result: BarcodeLookupResult = {
        success: true,
        found: false,
        source: 'not_found'
      }
      return NextResponse.json(result)
    }

    const product: OpenFoodFactsProduct = offData.product
    const nutriments = product.nutriments || {}

    // Parse serving size
    let servingGrams = 100
    if (product.serving_quantity) {
      servingGrams = product.serving_quantity
    } else if (product.serving_size) {
      // Try to parse serving size like "30g" or "100 ml"
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i)
      if (match) {
        servingGrams = parseFloat(match[1])
      }
    }

    // Estimate SMAE equivalents
    const equivalents = estimateSMAEEquivalents(nutriments, servingGrams)

    const productData = {
      name: product.product_name || 'Producto sin nombre',
      brand: product.brands,
      serving_size: product.serving_size || `${servingGrams}g`,
      image_url: product.image_front_url,
      nutrients_per_100g: {
        calories: nutriments.energy_kcal_100g,
        carbs: nutriments.carbohydrates_100g,
        protein: nutriments.proteins_100g,
        fat: nutriments.fat_100g,
        fiber: nutriments.fiber_100g,
        sugar: nutriments.sugars_100g,
      },
      estimated_equivalents: equivalents,
    }

    // Cache the result (don't await to not block response)
    supabase
      .from('barcode_cache')
      .insert({
        barcode,
        product_data: productData,
        source: 'openfoodfacts',
      })
      .then(() => {}, () => {})

    const result: BarcodeLookupResult = {
      success: true,
      found: true,
      product: productData,
      source: 'openfoodfacts'
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Barcode lookup error:', error)
    return NextResponse.json(
      { error: 'Error al buscar el producto' },
      { status: 500 }
    )
  }
}
