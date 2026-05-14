// app/api/push-tokens/route.ts
//
// POST /api/push-tokens { token, platform }
//
// Mobile registra su token de Expo Push aquí después de obtener
// permiso de notificaciones. Upsert por (user_id, token) — si el
// mismo device re-registra, solo actualizamos last_used_at.

import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  let token: string
  let platform: string
  try {
    const body = await request.json()
    token = String(body?.token ?? '').trim()
    platform = String(body?.platform ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!token.startsWith('ExponentPushToken[')) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
  }
  if (platform !== 'ios' && platform !== 'android') {
    return NextResponse.json({ error: 'Platform debe ser ios o android.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('expo_push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    )

  if (error) {
    console.error('push-tokens upsert error:', error)
    return NextResponse.json({ error: 'Error guardando token.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
