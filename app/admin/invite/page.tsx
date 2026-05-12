'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser } from '@/lib/hooks'
import { isAdminUser } from '@/lib/clinic/queries'
import { PulseLine } from '@/components/ui/PulseLine'
import { FkWord } from '@/components/ui/Fk'

type State = 'checking' | 'idle' | 'loading' | 'success' | 'error'

export default function AdminInvitePage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [state, setState]           = useState<State>('checking')
  const [email, setEmail]           = useState('')
  const [errorMsg, setErrorMsg]     = useState('')
  const [sentTo, setSentTo]         = useState('')

  useEffect(() => {
    if (userLoading) return
    if (!user) { setState('idle'); return }
    ;(async () => {
      const admin = await isAdminUser(supabase, user.id)
      setAuthorized(admin)
      setState('idle')
    })()
  }, [user, userLoading, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/invite-professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setState('error'); setErrorMsg(data.error ?? 'Error desconocido'); return }
      setSentTo(email.trim().toLowerCase())
      setEmail('')
      setState('success')
    } catch {
      setState('error')
      setErrorMsg('No se pudo conectar con el servidor.')
    }
  }

  if (state === 'checking' || userLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <PulseLine w={100} h={24} color="var(--signal)" strokeWidth={2} active />
      </div>
    )
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-center px-6">
        <div>
          <div className="fk-eyebrow text-berry mb-3">Acceso restringido</div>
          <p className="font-serif text-2xl font-light italic">Esta página es solo para administradores.</p>
          <Link href="/clinic">
            <button className="mt-6 px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-medium">
              Volver al portal
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-ink-7 bg-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FkWord size={20} />
          <span className="fk-eyebrow text-signal">Admin · invitaciones</span>
        </div>
        <Link href="/admin" className="fk-mono text-[11px] text-ink-4 hover:text-ink transition-colors">
          ← Volver al panel
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="fk-eyebrow mb-4">Nuevo nutriólogo</div>
          <h1 className="font-serif text-[38px] font-light leading-tight tracking-tight mb-2">
            Invitar a la <span className="italic">plataforma</span>
          </h1>
          <p className="text-ink-4 text-sm leading-relaxed mb-10">
            Recibirá un correo con un magic link. Al abrirlo creará su contraseña y
            completará su perfil antes de entrar al portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="fk-eyebrow mb-2 block">Email del nutriólogo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nutriologa@consultorio.mx"
                required
                disabled={state === 'loading'}
                className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors disabled:opacity-50"
              />
            </div>

            {state === 'error' && (
              <div className="p-3 rounded-xl bg-berry-soft border border-berry/20 text-berry text-sm">
                {errorMsg}
              </div>
            )}

            {state === 'success' && (
              <div className="p-3 rounded-xl border text-sm"
                style={{ background: 'var(--leaf-soft)', borderColor: 'var(--leaf)' }}>
                <span style={{ color: 'var(--leaf)', fontWeight: 500 }}>Invitación enviada</span>
                <span className="text-ink-3"> a </span>
                <span className="font-mono text-ink-2">{sentTo}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || !email}
              className="w-full py-3.5 rounded-full bg-signal text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {state === 'loading' ? (
                <><PulseLine w={40} h={12} color="white" strokeWidth={1.5} active /> Enviando…</>
              ) : (
                'Enviar invitación'
              )}
            </button>
          </form>

          <div className="mt-10 p-4 rounded-xl border border-ink-7 bg-white">
            <div className="fk-eyebrow mb-2">Qué pasa después</div>
            <ol className="text-[13px] text-ink-3 space-y-2 list-decimal list-inside leading-relaxed">
              <li>El nutriólogo recibe un email con un enlace de un solo uso.</li>
              <li>Al hacer clic queda autenticado automáticamente y llega a la pantalla de perfil.</li>
              <li>Completa nombre, cédula y especialidad.</li>
              <li>Queda activo en el portal y puede vincular pacientes.</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  )
}
