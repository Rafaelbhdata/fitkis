import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revokeCalendarConnection } from '@/lib/clinic/google-calendar'

export async function DELETE() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

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

  if (!prac) return NextResponse.json({ error: 'Nutrióloga no encontrada' }, { status: 404 })

  await revokeCalendarConnection(prac.id)
  return NextResponse.json({ ok: true })
}
