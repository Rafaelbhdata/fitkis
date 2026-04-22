import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { FoodGroup } from '@/types'

function createRouteHandlerClient() {
  const cookieStore = cookies()

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore
          }
        },
      },
    }
  )
}

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

function estimateSMAEEquivalents(nutrients: NutrientData, servingGrams: number = 100): { group_type: FoodGroup; quantity: number; note?: string }[] {
  const equivalents: { group_type: FoodGroup; quantity: number; note?: string }[] = []

  // Get nutrient values (per serving)
  const carbs = ((nutrients.carbohydrates_100g || 0) * servingGrams) / 100
  const protein = ((nutrients.proteins_100g || 0) * servingGrams) / 100
  const fat = ((nutrients.fat_100g || 0) * servingGrams) / 100
  const fiber = ((nutrients.fiber_100g || 0) * servingGrams) / 100
  const sugar = ((nutrients.sugars_100g || 0) * servingGrams) / 100

  // Estimate protein equivalents (1 equiv = ~7g protein)
  if (protein >= 5) {
    const proteinEquiv = Math.round((protein / 7) * 2) / 2 // Round to nearest 0.5
    if (proteinEquiv > 0) {
      equivalents.push({
        group_type: 'proteina',
        quantity: proteinEquiv,
        note: `~${protein.toFixed(0)}g proteína`
      })
    }
  }

  // Estimate fat equivalents (1 equiv = ~5g fat)
  if (fat >= 3) {
    const fatEquiv = Math.round((fat / 5) * 2) / 2
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
  if (netCarbs >= 10) {
    // Check if it's likely a legume (high protein + carbs)
    if (protein >= 5 && netCarbs >= 15) {
      const legumEquiv = Math.round((netCarbs / 20) * 2) / 2 // Legumes have ~20g carbs per equiv
      if (legumEquiv > 0) {
        equivalents.push({
          group_type: 'leguminosa',
          quantity: legumEquiv,
          note: `~${netCarbs.toFixed(0)}g carbohidratos netos`
        })
      }
    } else {
      // Regular carb
      const carbEquiv = Math.round((netCarbs / 15) * 2) / 2
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
    const supabase = createRouteHandlerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
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
      const result: BarcodeLookupResult = {
        success: true,
        found: true,
        product: cached.product_data,
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
      .then(() => {})
      .catch(() => {})

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
