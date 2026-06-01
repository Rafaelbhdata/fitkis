import { NextResponse } from 'next/server'
import { getAuthedUser, requireProTier } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'
import type { FoodGroup } from '@/types'
import { extractCacheUsage, logUsage } from '@/lib/anthropic-cache'
import { checkCap } from '@/lib/ai-caps'
import { createClient } from '@supabase/supabase-js'
import { loadOverridesForUser, formatOverridesForPrompt } from '@/lib/smae-overrides'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
    const { user, supabase } = await getAuthedUser(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const tierCheck = await requireProTier(supabase, user.id)
    if (!tierCheck.ok) {
      return NextResponse.json(
        { error: 'Feature requiere plan Pro', code: 'tier_required', tier: tierCheck.tier },
        { status: 403 }
      )
    }

    const cap = await checkCap(adminSupabase, user.id, 'plate-analysis')
    if (cap.over) {
      return NextResponse.json(
        { error: 'cap-exceeded', code: 'cap_exceeded', ...cap.payload },
        { status: 429 }
      )
    }

    const { image, meal } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 })
    }
    // Bound image size — base64 of a JPEG photo is typically <2 MB.
    // 5 MB cap leaves headroom while preventing 10 MB+ abuse payloads.
    if (typeof image !== 'string' || image.length > 5_000_000) {
      return NextResponse.json({ error: 'Imagen demasiado grande' }, { status: 413 })
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

    // NOTE: We do NOT wrap ANALYSIS_SYSTEM_PROMPT with cachedSystem() because
    // the prompt is ~524 tokens — below Anthropic's 1024-token minimum for
    // caching to activate (Sonnet). If the prompt grows past 1024 tokens in
    // the future, switch to: system: cachedSystem(ANALYSIS_SYSTEM_PROMPT).

    // Load practitioner SMAE overrides for this user
    const overrides = await loadOverridesForUser(adminSupabase, user.id)
    const overridesSection = formatOverridesForPrompt(overrides)
    const finalSystemPrompt = overridesSection
      ? ANALYSIS_SYSTEM_PROMPT + overridesSection
      : ANALYSIS_SYSTEM_PROMPT

    // Call Claude Vision
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: finalSystemPrompt,
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

    await logUsage(adminSupabase, {
      user_id: user.id,
      endpoint: 'plate-analysis',
      model: 'claude-sonnet-4-6',
      ...extractCacheUsage(response),
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
    const message = error instanceof Error ? error.message : String(error)
    const name = error instanceof Error ? error.name : 'Error'
    return NextResponse.json(
      { error: `Error al analizar la imagen: ${name}: ${message}` },
      { status: 500 }
    )
  }
}
