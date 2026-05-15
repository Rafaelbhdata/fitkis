'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'

// Supabase invite links usan implicit flow: el access_token llega en el hash
// (#access_token=...&refresh_token=...) en lugar de ?code= (PKCE).
// Los route handlers de servidor nunca ven el hash — este componente cliente
// lo lee, establece la sesión y redirige al destino correcto.

function ConfirmInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = useSupabase()

  useEffect(() => {
    const hash   = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const next   = searchParams.get('next') ?? '/clinic'

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=invite_expired')
      return
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        router.replace(error ? '/login?error=invite_expired' : next)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <PulseLine w={100} h={24} color="var(--signal)" strokeWidth={2} active />
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  )
}
