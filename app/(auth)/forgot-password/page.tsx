'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PulseLine } from '@/components/ui/PulseLine'
import { InlinePulse } from '@/components/ui/LoadingState'

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		const supabase = createClient()
		const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
		const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo,
		})

		if (error) {
			setError(error.message)
			setLoading(false)
			return
		}

		setSent(true)
		setLoading(false)
	}

	return (
		<div className="min-h-screen flex bg-paper">
			<div className="flex-1 flex flex-col px-6 md:px-12 lg:px-16 py-8 max-w-2xl">
				<div className="flex items-center justify-between mb-12 md:mb-20">
					<div className="flex items-center gap-1">
						<span className="font-serif text-xl italic tracking-tight">fitkis</span>
						<PulseLine w={24} h={10} color="var(--signal)" strokeWidth={2} active />
					</div>
					<div className="text-sm text-ink-4">
						<Link href="/login" className="text-ink font-medium underline underline-offset-4">
							Volver al login
						</Link>
					</div>
				</div>

				<div className="flex-1 flex flex-col justify-center max-w-md">
					<div className="fk-eyebrow mb-4">00 · RECUPERAR ACCESO</div>

					<h1 className="font-serif text-[42px] md:text-[56px] font-light leading-[1.05] tracking-tight mb-6">
						Olvidé mi
						<br />
						<span className="italic text-signal">contraseña.</span>
					</h1>

					<p className="text-ink-4 text-[15px] leading-relaxed mb-10 max-w-sm">
						Ingresa el email de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
					</p>

					{sent ? (
						<div className="p-4 rounded-xl bg-leaf-soft border border-leaf/20 text-leaf text-sm">
							Revisa tu correo. El enlace expira en 1 hora. Si no llega, revisa la carpeta de
							spam.
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

							{error && (
								<div className="p-3 rounded-xl bg-berry-soft border border-berry/20 text-berry text-sm">
									{error}
								</div>
							)}

							<button
								type="submit"
								className="w-full py-3.5 rounded-full bg-ink text-paper font-medium text-sm flex items-center justify-center gap-3 hover:bg-ink-2 transition-colors disabled:opacity-50"
								disabled={loading || !email}
							>
								{loading ? (
									<span className="flex items-center gap-2">
										<InlinePulse />
										Enviando...
									</span>
								) : (
									<>
										<span>Enviar enlace</span>
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
