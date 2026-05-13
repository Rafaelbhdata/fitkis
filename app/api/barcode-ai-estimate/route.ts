// app/api/barcode-ai-estimate/route.ts
//
// Fallback when Open Food Facts doesn't know a product (common for
// Mexican market items). User types a product name + optional brand
// + serving guess; Claude estimates SMAE equivalents based on its
// nutrition knowledge.
//
// One Sonnet call per request — no caching since the input is the
// user's typed text, which varies.

import { NextResponse } from 'next/server'
import { getAuthedUser, requireProTier } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'
import type { FoodGroup } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 30

const SYSTEM_PROMPT = `Eres un nutriólogo experto en el Sistema Mexicano de Alimentos Equivalentes (SMAE).

Te dan el NOMBRE de un producto empacado mexicano (a veces con marca o tamaño de porción) y debes ESTIMAR sus equivalentes nutricionales del SMAE para una porción típica.

GRUPOS Y EQUIVALENTES POR PORCIÓN:
- verdura: 1 taza crudo, ½ taza cocido (~25 kcal, 5g carbs)
- fruta: 1 pieza mediana (~60 kcal, 15g carbs)
- carb: ½ taza arroz/pasta, 1 tortilla, 1 rebanada pan (~70 kcal, 15g carbs)
- leguminosa: ⅓ taza frijol/lenteja cocido (~120 kcal, 20g carbs, 8g proteína)
- proteina: 30g de carne/pescado/pollo, 1 huevo (~75 kcal, 7g proteína)
- grasa: 1 cdita aceite, ⅓ aguacate, 10 nueces (~45 kcal, 5g grasa)

REGLAS:
1. Usa una porción típica del producto (no toda la caja). Si el usuario dio el tamaño, úsalo.
2. Sé conservador: si el producto tiene azúcar añadida, cuenta como carb.
3. Yogurt griego = 1 proteína + 1 grasa. Atún en agua = 1-2 proteína. Aguacate = grasa.
4. Si no conoces el producto o no tienes confianza alta, devuelve items vacío con un mensaje en reasoning.
5. Limita máximo a 4 equivalents totales.

FORMATO DE RESPUESTA (JSON, sin markdown, sin nada más):
{
  "items": [
    { "group_type": "proteina", "quantity": 1.5, "note": "~12g de proteína" }
  ],
  "reasoning": "explicación corta de cómo llegaste",
  "confidence": "alta" | "media" | "baja"
}`

type Body = {
  productName: string
  barcode?: string
  servingHint?: string
}

type EstimateItem = {
  group_type: FoodGroup
  quantity: number
  note?: string
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tierCheck = await requireProTier(supabase, user.id)
  if (!tierCheck.ok) {
    return NextResponse.json(
      { error: 'Feature requiere plan Pro', code: 'tier_required', tier: tierCheck.tier },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as Partial<Body>
  const productName = (body.productName ?? '').trim()
  if (!productName) {
    return NextResponse.json({ error: 'productName required' }, { status: 400 })
  }

  const userPrompt = [
    `Producto: ${productName}`,
    body.barcode ? `Código: ${body.barcode}` : null,
    body.servingHint ? `Porción de referencia: ${body.servingHint}` : null,
    'Estima los equivalentes SMAE.',
  ].filter(Boolean).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response' }, { status: 502 })
    }

    const raw = textBlock.text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No JSON in response', raw }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      items: EstimateItem[]
      reasoning?: string
      confidence?: string
    }

    // Sanity-clamp quantities to plausible range.
    const items = (parsed.items ?? [])
      .filter((it) =>
        ['verdura', 'fruta', 'carb', 'leguminosa', 'proteina', 'grasa'].includes(it.group_type) &&
        typeof it.quantity === 'number' &&
        Number.isFinite(it.quantity) &&
        it.quantity > 0 &&
        it.quantity <= 5
      )
      .slice(0, 6)
      .map((it) => ({
        group_type: it.group_type,
        quantity: Math.round(it.quantity * 2) / 2, // half-step rounding
        note: it.note,
      }))

    return NextResponse.json({
      items,
      reasoning: parsed.reasoning ?? '',
      confidence: parsed.confidence ?? 'media',
    })
  } catch (err) {
    console.error('barcode-ai-estimate failed:', err)
    return NextResponse.json({ error: 'Estimation failed' }, { status: 500 })
  }
}
