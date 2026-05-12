// app/api/exercises/gif/route.ts
//
// Proxies an ExerciseDB GIF through our server so the browser doesn't need
// the X-RapidAPI-Key (which we can't safely set on an <img> request anyway).
//
// Usage from the client:
//   <img src={`/api/exercises/gif?url=${encodeURIComponent(ex.gifUrl)}`} />
//
// We accept the full source URL (signed via the listing endpoint) but only
// allow it if it's hosted on the known ExerciseDB domains, to prevent open-
// redirect / SSRF abuse.

import { NextResponse } from 'next/server'

const ALLOWED_HOSTS = [
  'exercisedb.p.rapidapi.com',
  'api.exercisedb.io',
  'v2.exercisedb.io',
  'd205bpvrqc9yn1.cloudfront.net',
]

// NOTE: Public on purpose. The mobile <Image> can't pass our bearer
// token, and gating this endpoint blocks the GIF from rendering. We
// keep the search endpoint authed (so the catalog isn't browsable
// anonymously) and trust the host allowlist + the fact that the worst
// outcome is bandwidth from someone hotlinking known exercise IDs.
export async function GET(request: Request) {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY missing' }, { status: 500 })
  }

  const target = new URL(request.url).searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (!ALLOWED_HOSTS.includes(parsed.host)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
      // Cache hard — these GIFs never change.
      next: { revalidate: 86400 },
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: `Upstream ${upstream.status}`, detail: text.slice(0, 300) },
        { status: upstream.status }
      )
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/gif'
    const buffer = await upstream.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Proxy fetch failed', detail }, { status: 500 })
  }
}
