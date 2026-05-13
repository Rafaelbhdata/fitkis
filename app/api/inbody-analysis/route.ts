// app/api/inbody-analysis/route.ts
//
// Vision-extract the four weight-log fields from a photo of an InBody
// scan printout: weight_kg, muscle_mass_kg, body_fat_mass_kg,
// body_fat_percentage. The user reviews the values and confirms in
// the form before anything hits weight_logs.
//
// Uses Claude Sonnet (Haiku doesn't read scanned-receipt-style numbers
// reliably enough for body composition data).

import { NextResponse } from 'next/server'
import { getAuthedUser, requireProTier } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de fotos de reportes InBody (escala de bioimpedancia).

EXTRAE EXACTAMENTE ESTOS CUATRO CAMPOS:
- weight_kg: peso total en kg (suele aparecer cerca de "Peso" o "Weight")
- muscle_mass_kg: masa muscular esquelética en kg (etiqueta "Masa Muscular Esquelética", "Skeletal Muscle Mass", "SMM")
- body_fat_mass_kg: masa grasa corporal en kg (etiqueta "Masa Grasa", "Body Fat Mass", "BFM")
- body_fat_percentage: porcentaje de grasa corporal (etiqueta "% Grasa Corporal", "PBF", "Percent Body Fat")

REGLAS:
1. Devuelve SOLO números. Sin unidades, sin texto extra.
2. Si un campo no es legible o no aparece, usa null.
3. Pesos en kg (NO libras). Si el reporte está en libras, conviértelo: kg = lb / 2.2046
4. body_fat_percentage debe ir entre 0 y 70.
5. NO inventes valores. Si dudas, prefiere null.
6. Si la foto no es un reporte InBody, devuelve todos null.

FORMATO DE RESPUESTA (JSON, sin markdown, sin nada más):
{
  "weight_kg": 80.5,
  "muscle_mass_kg": 35.2,
  "body_fat_mass_kg": 18.4,
  "body_fat_percentage": 22.9,
  "confidence": "alta" | "media" | "baja",
  "notes": "string corta opcional con observaciones (calidad de foto, recortes, etc.)"
}`

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

  const body = await request.json().catch(() => ({}))
  const image = body?.image as string | undefined
  if (!image) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  }

  let imageData = image
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  if (image.startsWith('data:')) {
    const m = image.match(/^data:([^;]+);base64,(.+)$/)
    if (m) {
      mediaType = m[1] as typeof mediaType
      imageData = m[2]
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData },
            },
            {
              type: 'text',
              text: 'Extrae los cuatro campos de este reporte InBody. Responde solo con el JSON.',
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from model' }, { status: 502 })
    }

    const raw = textBlock.text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No JSON in response', raw }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      weight_kg: number | null
      muscle_mass_kg: number | null
      body_fat_mass_kg: number | null
      body_fat_percentage: number | null
      confidence?: string
      notes?: string
    }

    // Sanity check: clamp to plausible ranges. Reject absurd values.
    const sanitize = (v: unknown, min: number, max: number): number | null => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return null
      if (v < min || v > max) return null
      return Math.round(v * 10) / 10
    }

    return NextResponse.json({
      weight_kg: sanitize(parsed.weight_kg, 20, 300),
      muscle_mass_kg: sanitize(parsed.muscle_mass_kg, 5, 100),
      body_fat_mass_kg: sanitize(parsed.body_fat_mass_kg, 0, 100),
      body_fat_percentage: sanitize(parsed.body_fat_percentage, 0, 70),
      confidence: parsed.confidence ?? 'media',
      notes: parsed.notes ?? null,
    })
  } catch (err) {
    console.error('inbody-analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
