// lib/push.ts
//
// Helper server-side para mandar notificaciones a un usuario via Expo
// Push API. Lee los tokens de expo_push_tokens con el service role y
// hace un fire-and-forget POST a https://exp.host/--/api/v2/push/send.
//
// Si Expo devuelve DeviceNotRegistered para un token, lo borramos
// (limpieza pasiva — el usuario lo re-registrará en su próximo login
// si la app sigue instalada).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoMessage = {
  to: string
  title?: string
  body?: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  priority?: 'default' | 'normal' | 'high'
}

type ExpoTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

// Manda una notificación a todos los tokens activos del usuario.
// No tira si falla — solo loggea. La idea es que el caller la llame
// fire-and-forget (sin await) después de la acción primaria.
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: tokens } = await admin
      .from('expo_push_tokens')
      .select('token')
      .eq('user_id', userId)

    const tokenList = (tokens ?? []).map((t: { token: string }) => t.token)
    if (tokenList.length === 0) return

    const messages: ExpoMessage[] = tokenList.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      priority: 'high',
    }))

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })
    if (!res.ok) {
      console.error('Expo push error:', res.status, await res.text().catch(() => ''))
      return
    }

    // Limpieza pasiva: si Expo dice DeviceNotRegistered, borramos el token.
    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null
    const tickets = json?.data ?? []
    const deadTokens: string[] = []
    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(tokenList[idx])
      }
    })
    if (deadTokens.length > 0) {
      await admin
        .from('expo_push_tokens')
        .delete()
        .eq('user_id', userId)
        .in('token', deadTokens)
    }
  } catch (err) {
    console.error('sendPushToUser failed:', err)
  }
}
