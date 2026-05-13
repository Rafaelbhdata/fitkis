'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser } from '@/lib/hooks'
import { isAdminUser, loadAllProfessionals, type ProfessionalRow } from '@/lib/clinic/queries'
import { PulseLine } from '@/components/ui/PulseLine'
import { LoadingState } from '@/components/ui/LoadingState'
import { FkWord } from '@/components/ui/Fk'
import { Btn } from '@/components/ui/Btn'

type ActionState = { id: string; action: 'deactivate' | 'reactivate' } | null

export default function AdminPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [authorized, setAuthorized]     = useState<boolean | null>(null)
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [actionState, setActionState]   = useState<ActionState>(null)
  const [confirmId, setConfirmId]       = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!user) { setLoading(false); return }

    ;(async () => {
      const admin = await isAdminUser(supabase, user.id)
      setAuthorized(admin)
      if (!admin) { setLoading(false); return }

      const list = await loadAllProfessionals(supabase)
      setProfessionals(list)
      setLoading(false)
    })()
  }, [user, userLoading, supabase])

  async function handleAction(id: string, action: 'deactivate' | 'reactivate') {
    setActionState({ id, action })
    setError(null)
    try {
      const res = await fetch('/api/admin/professional', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error desconocido'); return }

      // Actualizar lista localmente
      setProfessionals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: action === 'reactivate' } : p))
      )
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setActionState(null)
      setConfirmId(null)
    }
  }

  if (loading || userLoading || authorized === null) {
    return <LoadingState label="Cargando admin" />
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-center px-6">
        <div>
          <div className="fk-eyebrow text-berry mb-3">Acceso restringido</div>
          <p className="font-serif text-2xl font-light italic">Esta sección es solo para administradores.</p>
          <Link href="/clinic">
            <button className="mt-6 px-5 py-2.5 rounded-full bg-ink text-paper text-sm font-medium">
              Volver al portal
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const active   = professionals.filter((p) => p.active)
  const inactive = professionals.filter((p) => !p.active)

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-7 bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <FkWord size={20} />
          <span className="fk-eyebrow text-signal">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/invite">
            <Btn variant="signal">+ Invitar nutriólogo</Btn>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
        {/* Title */}
        <div className="fk-eyebrow mb-2">Panel de administración</div>
        <h1 className="font-serif text-[38px] font-light leading-tight tracking-tight mb-8">
          <span className="italic">Nutriólogos</span> registrados
        </h1>

        {/* Stat strip */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--ink-7)' }}
          className="rounded-xl overflow-hidden mb-8 border border-ink-7"
        >
          {[
            { label: 'Total registrados', n: professionals.length, col: 'var(--ink)' },
            { label: 'Activos',           n: active.length,        col: 'var(--leaf)' },
            { label: 'Desactivados',      n: inactive.length,      col: 'var(--berry)' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--paper)', padding: '18px 24px' }}>
              <div className="fk-eyebrow">{s.label}</div>
              <span
                className="font-serif"
                style={{ fontSize: 38, fontWeight: 300, lineHeight: 1, color: s.col, letterSpacing: '-0.03em' }}
              >
                {s.n}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-berry-soft border border-berry/20 text-berry text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {professionals.length === 0 ? (
          <div className="text-center py-20 text-ink-4 text-sm">
            Aún no hay nutriólogos registrados.{' '}
            <Link href="/admin/invite" className="underline text-signal">Invita el primero.</Link>
          </div>
        ) : (
          <div className="bg-white border border-ink-7 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 60px 120px', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--ink-7)', alignItems: 'center' }}
            >
              <div className="fk-eyebrow">Nutriólogo</div>
              <div className="fk-eyebrow">Especialidad</div>
              <div className="fk-eyebrow">Consultorio</div>
              <div className="fk-eyebrow">Pacientes</div>
              <div className="fk-eyebrow">Estado</div>
              <div></div>
            </div>

            {professionals.map((p) => {
              const isPending = actionState?.id === p.id
              const isConfirming = confirmId === p.id

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 80px 60px 120px',
                    gap: 16,
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--ink-7)',
                    alignItems: 'center',
                    background: p.active ? 'transparent' : 'var(--paper-2)',
                    opacity: p.active ? 1 : 0.7,
                  }}
                >
                  {/* Nombre */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 999,
                          background: p.active ? 'var(--ink)' : 'var(--ink-6)',
                          color: 'var(--paper)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, flexShrink: 0,
                        }}
                      >
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-serif text-[15px] font-normal">{p.display_name}</span>
                    </div>
                    {p.license_number && (
                      <div className="fk-mono text-[10px] text-ink-4 mt-0.5 ml-9">CED {p.license_number}</div>
                    )}
                  </div>

                  {/* Especialidad */}
                  <div className="text-[13px] text-ink-3">{p.specialty ?? '—'}</div>

                  {/* Consultorio */}
                  <div className="text-[13px] text-ink-3">{p.clinic_name ?? '—'}</div>

                  {/* Pacientes */}
                  <div className="font-serif text-[22px] font-light" style={{ color: 'var(--ink)' }}>
                    {p.patient_count}
                  </div>

                  {/* Estado */}
                  <div>
                    {p.active ? (
                      <span className="fk-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'var(--leaf-soft)', color: 'var(--leaf)' }}>
                        activo
                      </span>
                    ) : (
                      <span className="fk-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'var(--berry-soft)', color: 'var(--berry)' }}>
                        inactivo
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-2">
                    {isPending ? (
                      <PulseLine w={40} h={10} color="var(--signal)" strokeWidth={1.2} active />
                    ) : isConfirming ? (
                      <>
                        <button
                          onClick={() => handleAction(p.id, 'deactivate')}
                          className="text-[11px] px-2 py-1 rounded-lg font-medium"
                          style={{ background: 'var(--berry-soft)', color: 'var(--berry)' }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[11px] px-2 py-1 rounded-lg text-ink-4"
                          style={{ background: 'var(--paper-2)' }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : p.active ? (
                      <button
                        onClick={() => setConfirmId(p.id)}
                        className="text-[11px] px-3 py-1.5 rounded-lg border border-ink-7 text-ink-3 hover:border-berry hover:text-berry transition-colors"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(p.id, 'reactivate')}
                        className="text-[11px] px-3 py-1.5 rounded-lg border border-ink-7 text-ink-3 hover:border-leaf hover:text-leaf transition-colors"
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
