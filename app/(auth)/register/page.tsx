'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
    <div className="min-h-screen flex flex-col px-6 py-12 relative overflow-hidden">
      {/* Atlético Vital gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-pink-500/5 pointer-events-none" />

      {/* Decorative glow elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Logo & Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-cyan-500/30 mb-6 shadow-glow-cyan">
            <span className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">F</span>
          </div>
          <h1 className="font-display text-display-lg text-foreground mb-2">
            Crear cuenta
          </h1>
          <p className="text-muted-foreground">
            Comienza tu viaje fitness
          </p>
        </div>

        {success ? (
          <div className="space-y-6 animate-scale-in">
            <div className="p-6 rounded-2xl bg-success/10 border border-success/20 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <p className="font-display text-display-sm text-foreground mb-2">¡Cuenta creada!</p>
              <p className="text-sm text-muted-foreground">
                Revisa tu email para confirmar tu cuenta, luego puedes iniciar sesión.
              </p>
            </div>
            <Link href="/login" className="block w-full btn-primary text-center">
              Ir a iniciar sesión
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full btn-primary group"
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
                <span className="flex items-center gap-2">
                  Crear cuenta
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>
        )}

        {/* Login link */}
        <p className="text-center text-muted-foreground mt-8 animate-fade-in delay-300">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-accent font-medium hover:underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
