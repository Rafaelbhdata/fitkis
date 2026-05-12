// app/api/exercises/sync/route.ts
//
// Admin-only one-shot sync from ExerciseDB into our local `exercises`
// table. Idempotent — re-running just upserts. Designed to be hit
// occasionally (when ExerciseDB releases new content) rather than on
// any user action.
//
// Auth: requires the SYNC_SECRET env var to be passed as ?secret=...
// (or as the X-Sync-Secret header). The user-level Supabase auth is
// bypassed because this needs to run as service-role to write to a
// catalog table that's read-only to normal users.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const HOST = 'exercisedb.p.rapidapi.com'
export const maxDuration = 60

type RawExercise = {
  id?: string
  name?: string
  gifUrl?: string
  bodyPart?: string
  target?: string
  equipment?: string
  secondaryMuscles?: string[]
  instructions?: string[]
  description?: string
  difficulty?: string
  category?: string
}

function buildGifUrl(id: string): string {
  return `https://exercisedb.p.rapidapi.com/image?exerciseId=${id}&resolution=1080`
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const secretParam = url.searchParams.get('secret')
  const secretHeader = request.headers.get('x-sync-secret')
  const expected = process.env.SYNC_SECRET

  if (!expected) {
    return NextResponse.json(
      { error: 'SYNC_SECRET no configurada en el server' },
      { status: 500 }
    )
  }
  if (secretParam !== expected && secretHeader !== expected) {
    return NextResponse.json({ error: 'Bad secret' }, { status: 403 })
  }

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY missing' }, { status: 500 })
  }

  // Pull the full catalog. ExerciseDB's free/paid tiers cap `limit`,
  // so we ask for a large but bounded page. Currently the catalog is
  // ~1300 exercises so 1500 covers it; adjust if upstream grows.
  const upstreamUrl = `https://${HOST}/exercises?limit=1500&offset=0`

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': HOST,
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Fetch upstream failed', detail },
      { status: 502 }
    )
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '')
    return NextResponse.json(
      {
        error: `Upstream ${upstream.status}`,
        detail: text.slice(0, 500),
      },
      { status: upstream.status }
    )
  }

  const raw = (await upstream.json()) as RawExercise[]
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: 'Upstream returned non-array' },
      { status: 502 }
    )
  }

  // Build the upsert rows. Skip records with missing required fields.
  const rows = raw
    .filter((e) => typeof e.id === 'string' && typeof e.name === 'string')
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      gif_url: e.gifUrl && e.gifUrl.length > 0 ? e.gifUrl : buildGifUrl(e.id as string),
      body_part: e.bodyPart ?? null,
      target: e.target ?? null,
      equipment: e.equipment ?? null,
      secondary_muscles: e.secondaryMuscles ?? [],
      instructions: e.instructions ?? [],
      description: e.description ?? null,
      difficulty: e.difficulty ?? null,
      category: e.category ?? null,
      last_synced_at: new Date().toISOString(),
    }))

  // Use the service-role client so the write succeeds against the RLS-
  // protected table. Service role is only available server-side.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Chunk the upsert — Supabase has a default payload limit and 1500
  // rows in one go can be borderline. 200/batch is safe.
  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const { error } = await admin.from('exercises').upsert(slice, { onConflict: 'id' })
    if (error) {
      return NextResponse.json(
        {
          error: 'Upsert failed',
          detail: error.message,
          inserted_so_far: inserted,
        },
        { status: 500 }
      )
    }
    inserted += slice.length
  }

  return NextResponse.json({
    ok: true,
    fetched_from_upstream: raw.length,
    inserted_or_updated: inserted,
  })
}
