// app/api/practitioner/smae-overrides/route.ts
//
// CRUD para que el practitioner gestione sus overrides de SMAE desde el
// portal clinic. Las RLS policies en practitioner_smae_overrides
// garantizan que solo opere sobre overrides propios.
//
// GET    /api/practitioner/smae-overrides           → lista overrides del practitioner
// POST   /api/practitioner/smae-overrides           → crear o upsert (key: practitioner_id + food_id)
// DELETE /api/practitioner/smae-overrides?id=<uuid> → eliminar un override

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

type FoodGroupName = 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'

export type OverridePayload = {
  food_id: string | null
  name?: string | null
  portion?: string | null
  weight_g?: number | null
  category_smae?: string | null
  verdura: number
  fruta: number
  carb: number
  proteina: number
  grasa: number
  leguminosa: number
  notes?: string | null
}

const GROUPS: FoodGroupName[] = ['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa']

/** Pure validator extracted for tests. */
export function validateOverridePayload(
  body: Partial<OverridePayload>
): { ok: true } | { ok: false; error: string } {
  const hasFoodId = typeof body.food_id === 'string' && body.food_id.length > 0
  const hasName = typeof body.name === 'string' && body.name.trim().length > 0
  if (hasFoodId === hasName) {
    return {
      ok: false,
      error: hasFoodId
        ? 'No puede tener food_id y name al mismo tiempo'
        : 'Debe tener food_id (override) o name (custom)',
    }
  }
  let total = 0
  for (const g of GROUPS) {
    const v = body[g]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10) {
      return { ok: false, error: `Valor inválido para ${g}` }
    }
    total += v
  }
  if (total <= 0) {
    return { ok: false, error: 'Al menos un grupo debe tener equivalentes > 0' }
  }
  return { ok: true }
}

async function getAuthedPractitionerId(
  request: Request,
): Promise<{ practitionerId: string; supabase: any } | null> {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) return null
  const { data } = await supabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!data) return null
  return { practitionerId: (data as { id: string }).id, supabase }
}

export async function GET(request: Request) {
  const ctx = await getAuthedPractitionerId(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await ctx.supabase
    .from('practitioner_smae_overrides')
    .select(`
      id, food_id, name, portion, weight_g, category_smae, notes,
      verdura, fruta, carb, proteina, grasa, leguminosa,
      created_at, updated_at,
      food_equivalents_global ( name, portion, weight_g, category_smae )
    `)
    .eq('practitioner_id', ctx.practitionerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ overrides: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await getAuthedPractitionerId(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Partial<OverridePayload>
  const v = validateOverridePayload(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  // Upsert: si ya existe un override para este (practitioner_id, food_id),
  // actualizamos. Para customs (food_id NULL) NO usamos onConflict — siempre
  // insert (el unique index parcial sobre name maneja duplicados).
  const isOverride = body.food_id != null
  const row = {
    practitioner_id: ctx.practitionerId,
    food_id: body.food_id ?? null,
    name: isOverride ? null : body.name,
    portion: isOverride ? null : body.portion ?? null,
    weight_g: isOverride ? null : body.weight_g ?? null,
    category_smae: isOverride ? null : body.category_smae ?? null,
    verdura: body.verdura,
    fruta: body.fruta,
    carb: body.carb,
    proteina: body.proteina,
    grasa: body.grasa,
    leguminosa: body.leguminosa,
    notes: body.notes ?? null,
  }

  if (isOverride) {
    const { data, error } = await ctx.supabase
      .from('practitioner_smae_overrides')
      .upsert(row, { onConflict: 'practitioner_id,food_id' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ override: data })
  } else {
    const { data, error } = await ctx.supabase
      .from('practitioner_smae_overrides')
      .insert(row)
      .select()
      .single()
    if (error) {
      // Unique constraint violation → friendly message
      if ((error as any).code === '23505') {
        return NextResponse.json(
          { error: 'Ya tienes un alimento custom con ese nombre' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ override: data })
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAuthedPractitionerId(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await ctx.supabase
    .from('practitioner_smae_overrides')
    .delete()
    .eq('id', id)
    .eq('practitioner_id', ctx.practitionerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
