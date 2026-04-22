import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
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
            // Ignore - middleware handles session refresh
          }
        },
      },
    }
  )
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Type for analysis result
export interface PlateAnalysisResult {
  success: boolean
  items: {
    food_name: string
    group_type: FoodGroup
    quantity: number
    confidence: 'alta' | 'media' | 'baja'
    notes?: string
  }[]
  total_equivalents: Record<FoodGroup, number>
  reasoning: string
  suggestions?: string
}

const ANALYSIS_SYSTEM_PROMPT = `Eres un nutriólogo experto en el Sistema Mexicano de Alimentos Equivalentes (SMAE).
Tu tarea es analizar fotos de platos de comida y estimar los equivalentes nutricionales.

SISTEMA DE EQUIVALENTES (SMAE):
Un "equivalente" es una porción estándar de un alimento que aporta nutrientes similares.

GRUPOS Y EJEMPLOS DE PORCIONES:
- verdura: 1 taza de vegetales crudos, ½ taza cocidos
- fruta: 1 pieza mediana, 1 taza picada
- carb (carbohidratos): ½ taza de arroz/pasta, 1 tortilla, 1 rebanada pan
- leguminosa: ⅓ taza de frijoles/lentejas cocidos
- proteina: 30g de carne/pescado/pollo (tamaño palma), 1 huevo
- grasa: 1 cucharadita de aceite, ⅓ aguacate, 10 nueces

REGLAS ESPECIALES:
- Yogurt griego = 1 proteína + 1 grasa
- Queso = principalmente proteína (panela/cottage) o proteína+grasa (otros)
- Aceite de cocción cuenta como grasa
- Salsas/aderezos: estimar si contienen grasa adicional

PROCESO DE ANÁLISIS:
1. Identifica cada componente visible en el plato
2. Estima el tamaño de cada porción comparando con referencias visuales
3. Convierte a equivalentes del SMAE
4. Asigna nivel de confianza basado en qué tan clara es la imagen y el alimento

RESPONDE SIEMPRE EN ESTE FORMATO JSON:
{
  "items": [
    {
      "food_name": "nombre del alimento identificado",
      "group_type": "verdura|fruta|carb|proteina|grasa|leguminosa",
      "quantity": número de equivalentes (puede ser decimal),
      "confidence": "alta|media|baja",
      "notes": "notas sobre la estimación (opcional)"
    }
  ],
  "reasoning": "explicación breve de cómo llegaste a estas estimaciones",
  "suggestions": "sugerencias si algo no está claro o hay dudas (opcional)"
}

IMPORTANTE:
- Sé conservador en las estimaciones si hay incertidumbre
- Si un alimento tiene múltiples grupos (ej: taco con carne y tortilla), sepáralos
- Si no puedes identificar algo, usa confidence "baja" y menciona en notes
- Los valores de quantity pueden ser decimales (0.5, 1.5, etc.)
- Si la imagen no es de comida o no se puede analizar, devuelve items vacío con un mensaje en reasoning`

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { image, meal } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 })
    }

    // Extract base64 data from data URL if present
    let imageData = image
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mediaType = matches[1] as typeof mediaType
        imageData = matches[2]
      }
    }

    // Call Claude Vision
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `Analiza esta foto de comida${meal ? ` (${meal})` : ''} y estima los equivalentes del SMAE. Responde SOLO con JSON válido.`,
            },
          ],
        },
      ],
    })

    // Extract text response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    if (!textContent) {
      return NextResponse.json({ error: 'No se pudo analizar la imagen' }, { status: 500 })
    }

    // Parse JSON response
    let analysis: Omit<PlateAnalysisResult, 'success' | 'total_equivalents'>
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      analysis = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse analysis:', textContent.text)
      return NextResponse.json({
        error: 'Error al procesar la respuesta del análisis',
        raw: textContent.text
      }, { status: 500 })
    }

    // Calculate totals
    const total_equivalents: Record<FoodGroup, number> = {
      verdura: 0,
      fruta: 0,
      carb: 0,
      leguminosa: 0,
      proteina: 0,
      grasa: 0,
    }

    for (const item of analysis.items || []) {
      if (item.group_type in total_equivalents) {
        total_equivalents[item.group_type] += item.quantity
      }
    }

    // Log the analysis for the practitioner/user to review later
    try {
      await supabase
        .from('plate_analysis_logs')
        .insert({
          user_id: user.id,
          meal: meal || null,
          analysis_result: {
            items: analysis.items,
            reasoning: analysis.reasoning,
            suggestions: analysis.suggestions,
            total_equivalents,
          },
        })
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log plate analysis:', logError)
    }

    const result: PlateAnalysisResult = {
      success: true,
      items: analysis.items || [],
      total_equivalents,
      reasoning: analysis.reasoning || '',
      suggestions: analysis.suggestions,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Plate analysis error:', error)
    return NextResponse.json(
      { error: 'Error al analizar la imagen' },
      { status: 500 }
    )
  }
}
