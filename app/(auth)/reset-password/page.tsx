'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PulseLine } from '@/components/ui/PulseLine'
import { InlinePulse } from '@/components/ui/LoadingState'

// Llega aquí después de que /auth/callback intercambia el code del email
// por una sesión activa. Si el usuario abre la ruta sin sesión válida, lo
// devolvemos a /forgot-password — el link probablemente expiró.
export default function ResetPasswordPage() {
	const router = useRouter()
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [sessionReady, setSessionReady] = useState(false)
	const [sessionError, setSessionError] = useState(false)

	useEffect(() => {
		const supabase = createClient()
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) setSessionReady(true)
			else setSessionError(true)
		})
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (password.length < 8) {
			setError('La contraseña debe tener al menos 8 caracteres.')
			return
		}
		if (password !== confirm) {
			setError('Las contraseñas no coinciden.')
			return
		}
		setLoading(true)
		setError(null)

		const supabase = createClient()
		const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password })

		if (updateError) {
			setError(updateError.message)
			setLoading(false)
			return
		}

		// Mismo branching que /login: si es nutrióloga → portal, si no → /download.
		let destination = '/download'
		if (user) {
			const { data: practitioner } = await supabase
				.from('practitioners')
				.select('id')
				.eq('user_id', user.id)
				.maybeSingle()
			if (practitioner) destination = '/clinic/reportes'
		}
		router.push(destination)
		router.refresh()
	}

	return (
		<div className="min-h-screen flex bg-paper">
			<div className="flex-1 flex flex-col px-6 md:px-12 lg:px-16 py-8 max-w-2xl">
				<div className="flex items-center justify-between mb-12 md:mb-20">
					<div className="flex items-center gap-1">
						<span className="font-serif text-xl italic tracking-tight">fitkis</span>
						<PulseLine w={24} h={10} color="var(--signal)" strokeWidth={2} active />
					</div>
				</div>

				<div className="flex-1 flex flex-col justify-center max-w-md">
					<div className="fk-eyebrow mb-4">00 · NUEVA CONTRASEÑA</div>

					<h1 className="font-serif text-[42px] md:text-[56px] font-light leading-[1.05] tracking-tight mb-6">
						Define tu nueva
						<br />
						<span className="italic text-signal">contraseña.</span>
					</h1>

					{sessionError ? (
						<div className="space-y-4">
							<div className="p-4 rounded-xl bg-berry-soft border border-berry/20 text-berry text-sm">
								El enlace expiró o no es válido. Solicita uno nuevo para continuar.
							</div>
							<Link
								href="/forgot-password"
								className="inline-flex items-center gap-2 text-sm text-ink underline underline-offset-4"
							>
								Pedir un nuevo enlace →
							</Link>
						</div>
					) : !sessionReady ? (
						<div className="flex items-center gap-2 text-ink-4 text-sm">
							<InlinePulse /> Verificando enlace...
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label className="fk-eyebrow mb-2 block">NUEVA CONTRASEÑA</label>
								<div className="relative">
									<input
										type={showPassword ? 'text' : 'password'}
										className="w-full px-4 py-3.5 rounded-xl border border-ink-6 bg-white text-sm placeholder:text-ink-5 focus:outline-none focus:border-ink-4 transition-colors pr-12"
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										autoComplete="new-password"
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
									placeholder="••••••••"
									value={confirm}
									onChange={(e) => setConfirm(e.target.value)}
									required
									autoComplete="new-password"
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
								disabled={loading || !password || !confirm}
							>
								{loading ? (
									<span className="flex items-center gap-2">
										<InlinePulse />
										Guardando...
									</span>
								) : (
									<>
										<span>Actualizar contraseña</span>
										<ArrowRight className="w-4 h-4" />
									</>
								)}
							</button>
						</form>
					)}
				</div>

				<div className="mt-12 pt-6 border-t border-ink-7">
					<div className="flex items-center gap-3 text-[10px] fk-mono text-ink-5 tracking-wider">
						<span>FITKIS®</span>
						<span className="text-ink-6">✦</span>
						<span className="flex items-center gap-1.5">
							<span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
							ONLINE
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
