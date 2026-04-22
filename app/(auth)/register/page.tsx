'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PulseLine } from '@/components/ui/PulseLine'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col px-6 md:px-12 lg:px-16 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 md:mb-20">
          <div className="flex items-center gap-1">
            <span className="font-serif text-xl italic tracking-tight">fitkis</span>
            <PulseLine w={24} h={10} color="var(--signal)" strokeWidth={2} active />
          </div>
          <div className="text-sm text-ink-4">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-ink font-medium underline underline-offset-4">
              Entra
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center max-w-md">
          <div className="fk-eyebrow mb-4">02 · REGISTRO</div>

          <h1 className="font-serif text-[42px] md:text-[56px] font-light leading-[1.05] tracking-tight mb-6">
            Empieza tu<br />
            <span className="italic text-signal">ritmo</span> hoy.
          </h1>

          <p className="text-ink-4 text-[15px] leading-relaxed mb-10 max-w-sm">
            Crea tu cuenta en 2 minutos. Sin tarjeta, sin compromisos.
          </p>

          {success ? (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-leaf-soft border border-leaf/20 text-center">
                <CheckCircle className="w-12 h-12 text-leaf mx-auto mb-4" />
                <p className="font-serif text-xl mb-2">¡Cuenta creada!</p>
                <p className="text-sm text-ink-4">
                  Revisa tu email para confirmar tu cuenta, luego puedes iniciar sesión.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full py-3.5 rounded-full bg-ink text-paper font-medium text-sm flex items-center justify-center gap-3 hover:bg-ink-2 transition-colors"
              >
                Ir a iniciar sesión
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="fk-eyebrow mb-2 block">EMAIL</label>
                <input
                  type="email"
                  className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="fk-eyebrow mb-2 block">CONTRASEÑA</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors pr-12"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="fk-eyebrow mb-2 block">CONFIRMAR CONTRASEÑA</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-berry-soft border border-berry/20 text-berry text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-ink text-paper font-medium text-sm flex items-center justify-center gap-3 hover:bg-ink-2 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creando cuenta...
                  </span>
                ) : (
                  <>
                    <span>Crear cuenta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Terms */}
          {!success && (
            <p className="text-[11px] text-ink-5 mt-6">
              Al registrarte aceptas los{' '}
              <span className="underline">Términos</span> y la{' '}
              <span className="underline">Política de Privacidad</span>.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-ink-7">
          <div className="flex items-center gap-3 text-[10px] fk-mono text-ink-5 tracking-wider">
            <span>V5 · PAPER & PULSE</span>
            <span className="text-ink-6">✦</span>
            <span>HECHO EN CDMX</span>
            <span className="text-ink-6">✦</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Visual Showcase (Desktop only) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-paper-2">
        {/* Signal orange accent */}
        <div className="absolute top-0 right-0 w-[45%] h-[65%] bg-signal rounded-bl-[200px]" />

        {/* Navigation labels */}
        <div className="absolute top-8 right-8 flex gap-4 text-[10px] fk-mono tracking-widest text-paper/80">
          <span>RITMO</span>
          <span className="text-paper/40">·</span>
          <span>COMIDA</span>
          <span className="text-paper/40">·</span>
          <span>MOVIMIENTO</span>
          <span className="text-paper/40">·</span>
          <span>SUEÑO</span>
          <span className="text-paper/40">·</span>
          <span>MENTE</span>
        </div>

        {/* Feature Cards */}
        <div className="absolute top-24 left-16 bg-white rounded-2xl p-5 shadow-card w-[220px]">
          <div className="fk-eyebrow text-ink-4 mb-3">INCLUYE</div>
          <ul className="space-y-2.5">
            {['Tracker de gym', 'Plato SMAE', 'Hábitos diarios', 'Coach IA', 'Journal'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-signal" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats Card */}
        <div className="absolute top-44 right-24 bg-ink text-paper rounded-2xl p-4 w-[160px]">
          <div className="fk-eyebrow text-ink-5 mb-2">USUARIOS</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[36px] font-light tracking-tight leading-none">1.2k</span>
          </div>
          <div className="text-[11px] text-ink-5 mt-2">activos esta semana</div>
        </div>

        {/* Large EKG Line */}
        <svg className="absolute top-[45%] left-8 right-8 w-[90%] h-[120px]" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path
            d="M0,30 L80,30 L100,30 L120,30 L140,10 L150,50 L160,20 L170,40 L180,30 L250,30 L270,30 L290,30 L310,5 L320,55 L330,15 L340,45 L350,30 L400,30"
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="350" cy="30" r="4" fill="var(--signal)" />
        </svg>

        {/* Testimonial Card */}
        <div className="absolute bottom-36 left-20 bg-white rounded-2xl p-5 shadow-card w-[260px]">
          <div className="fk-eyebrow text-ink-4 mb-2">TESTIMONIO</div>
          <p className="font-serif text-[15px] leading-snug italic">
            "Bajé 6 kg en 3 meses sin dietas locas. Solo consistencia."
          </p>
          <div className="mt-3 text-xs text-ink-4">— Usuario desde enero 2026</div>
        </div>

        {/* Quote */}
        <div className="absolute bottom-12 right-12 text-right">
          <p className="font-serif text-lg italic leading-snug text-ink-3">
            "Tu cuerpo es tu<br />
            mejor proyecto."
          </p>
        </div>
      </div>
    </div>
  )
}
