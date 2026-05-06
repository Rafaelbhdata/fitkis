// app/api/exercises/search/route.ts
//
// Thin proxy to the ExerciseDB RapidAPI endpoint. Hides the RapidAPI key
// server-side and adds auth so random callers can't burn the quota.
//
// Query params (all optional):
//   bodyPart   — e.g. "back", "chest", "upper arms"
//   target     — e.g. "lats", "biceps", "quads"
//   equipment  — e.g. "barbell", "dumbbell", "body weight"
//   limit      — default 10 (max 50)
//
// If multiple filters are provided we prefer bodyPart > target > equipment.
// If none, returns the first `limit` from the global list.

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

const HOST = 'exercisedb.p.rapidapi.com'

export async function GET(request: Request) {
  const { user } = await getAuthedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY no configurada en el server' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const bodyPart = searchParams.get('bodyPart')?.trim().toLowerCase()
  const target = searchParams.get('target')?.trim().toLowerCase()
  const equipment = searchParams.get('equipment')?.trim().toLowerCase()
  const limitRaw = parseInt(searchParams.get('limit') ?? '10', 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10

  let path = '/exercises'
  if (bodyPart) path = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}`
  else if (target) path = `/exercises/target/${encodeURIComponent(target)}`
  else if (equipment) path = `/exercises/equipment/${encodeURIComponent(equipment)}`

  const url = `https://${HOST}${path}?limit=${limit}&offset=0`

  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': HOST,
      },
      // Cache the listing for an hour — exercise definitions never change.
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        {
          error: `RapidAPI ${res.status}`,
          status: res.status,
          detail: text.slice(0, 500),
        },
        { status: res.status }
      )
    }

    const data = (await res.json()) as Array<Record<string, unknown>>

    // ExerciseDB has changed field names over the years and across the
    // free vs paid tiers — accept several common shapes for the GIF URL
    // and the id, and log the raw keys when nothing matches so we can see
    // what the API is actually returning.
    if (data.length > 0) {
      console.log('ExerciseDB sample item keys:', Object.keys(data[0]))
      console.log('ExerciseDB sample item:', JSON.stringify(data[0]).slice(0, 600))
    }

    const trimmed = data.slice(0, limit).map((e) => {
      const id = (e.id as string) || (e.exerciseId as string) || ''
      // Build the GIF URL from the dedicated /image endpoint that RapidAPI
      // exposes. Resolution 360 is a good default for cards (180 looks
      // pixelated on retina, 720+ is overkill for a list view).
      const gifUrl = id
        ? `https://exercisedb.p.rapidapi.com/image?exerciseId=${id}&resolution=1080`
        : ''
      return {
        id,
        name: e.name as string,
        gifUrl,
        target: (e.target as string) || (e.targetMuscle as string) || '',
        bodyPart: e.bodyPart as string,
        equipment: e.equipment as string,
        secondaryMuscles: (e.secondaryMuscles as string[]) ?? [],
        instructions: (e.instructions as string[]) ?? [],
      }
    })

    return NextResponse.json({ exercises: trimmed, count: trimmed.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Error contactando ExerciseDB', detail: message },
      { status: 500 }
    )
  }
}
