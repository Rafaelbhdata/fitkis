import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: prac } = await serviceSupabase
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!prac) return NextResponse.json({ connected: false })

  const { data: conn } = await serviceSupabase
    .from('practitioner_calendar_connections')
    .select('connected_at')
    .eq('practitioner_id', prac.id)
    .eq('provider', 'google')
    .maybeSingle()

  return NextResponse.json({ connected: !!conn, connected_at: conn?.connected_at ?? null })
}
