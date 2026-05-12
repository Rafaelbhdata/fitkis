'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser } from '@/lib/hooks'
import { loadPractitionerByUser } from '@/lib/clinic/queries'
import { PulseLine } from '@/components/ui/PulseLine'
import { FkWord } from '@/components/ui/Fk'

type Step = 'checking' | 'form' | 'saving' | 'done'

const ESPECIALIDADES = [
  'Nutrición clínica · SMAE',
  'Nutrición deportiva',
  'Nutrición pediátrica',
  'Nutrición oncológica',
  'Nutrición bariátrica',
  'Nutriología general',
  'Otra',
]

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [step, setStep]   = useState<Step>('checking')
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [nombre,      setNombre]      = useState('')
  const [cedula,      setCedula]      = useState('')
  const [especialidad, setEspecialidad] = useState(ESPECIALIDADES[0])
  const [consultorio, setConsultorio] = useState('')

  // Si ya tiene registro de practitioner → directo al portal
  useEffect(() => {
    if (userLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    ;(async () => {
      const existing = await loadPractitionerByUser(supabase, user.id)
      if (existing) {
        router.replace('/clinic')
      } else {
        setStep('form')
      }
    })()
  }, [user, userLoading, supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setStep('saving')
    setError(null)

    // Cast a `never` para evitar que TS resuelva el shape del Insert como `never`
    // cuando hay columnas en BD no presentes en el tipo Practitioner (ej.: `active`
    // añadida en la migración 025). Postgres guarda `undefined` como NULL.
    const insertPayload = {
      user_id:        user.id,
      display_name:   nombre.trim(),
      license_number: cedula.trim() || undefined,
      specialty:      especialidad,
      clinic_name:    consultorio.trim() || undefined,
    }
    const { error: insertError } = await supabase
      .from('practitioners')
      .insert(insertPayload as never)

    if (insertError) {
      setError(insertError.message)
      setStep('form')
      return
    }

    // Mantener user_profiles.role sincronizado con la realidad.
    // No es bloqueante: si falla, el middleware ya usa la tabla practitioners
    // como fuente de verdad, así que el acceso funciona igual.
    await supabase
      .from('user_profiles')
      .update({ role: 'practitioner' })
      .eq('user_id', user.id)

    setStep('done')
    // Pequeña pausa para que el usuario vea el estado de éxito
    setTimeout(() => router.replace('/clinic'), 1200)
  }

  // ── Estados de carga ──────────────────────────────────────────────────────

  if (step === 'checking' || userLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <PulseLine w={100} h={24} color="var(--signal)" strokeWidth={2} active />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="fk-eyebrow text-leaf mb-3">Perfil creado</div>
          <p className="font-serif text-3xl font-light italic">Entrando al portal…</p>
          <div className="mt-6 flex justify-center">
            <PulseLine w={100} h={24} color="var(--signal)" strokeWidth={2} active />
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-7 bg-white px-8 py-4 flex items-center justify-between">
        <FkWord size={20} />
        <div className="fk-eyebrow text-ink-4">Paso único · configura tu perfil</div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {/* Title */}
          <div className="fk-eyebrow mb-4">Bienvenida al portal</div>
          <h1 className="font-serif text-[40px] font-light leading-tight tracking-tight mb-2">
            Cuéntanos <span className="italic">quién eres</span>
          </h1>
          <p className="text-ink-4 text-sm leading-relaxed mb-10">
            Esta información aparece en los reportes que generes y en la app de tus pacientes.
            Puedes editarla después desde Ajustes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="fk-eyebrow mb-2 block">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Dra. Ana Pérez Gutiérrez"
                required
                disabled={step === 'saving'}
                className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Cédula */}
            <div>
              <label className="fk-eyebrow mb-2 block">Cédula profesional</label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="12345678"
                disabled={step === 'saving'}
                className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Especialidad */}
            <div>
              <label className="fk-eyebrow mb-2 block">Especialidad</label>
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                disabled={step === 'saving'}
                className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm text-ink focus:outline-none focus:border-ink-4 transition-colors disabled:opacity-50 appearance-none"
              >
                {ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Consultorio */}
            <div>
              <label className="fk-eyebrow mb-2 block">
                Nombre del consultorio
                <span className="text-ink-5 ml-2 normal-case tracking-normal" style={{ fontSize: 10 }}>opcional</span>
              </label>
              <input
                type="text"
                value={consultorio}
                onChange={(e) => setConsultorio(e.target.value)}
                placeholder="Clínica Nutrición Norte"
                disabled={step === 'saving'}
                className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-berry-soft border border-berry/20 text-berry text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={step === 'saving' || !nombre.trim()}
              className="w-full py-3.5 rounded-full bg-ink text-paper font-medium text-sm flex items-center justify-center gap-2 hover:bg-ink-2 transition-colors disabled:opacity-40"
            >
              {step === 'saving' ? (
                <>
                  <PulseLine w={40} h={12} color="var(--paper)" strokeWidth={1.5} active />
                  Guardando…
                </>
              ) : (
                'Entrar al portal →'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
