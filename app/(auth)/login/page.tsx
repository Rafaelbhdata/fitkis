'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { PulseLine } from '@/components/ui/PulseLine';
import { InlinePulse } from '@/components/ui/LoadingState';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const supabase = createClient();
		const { data: signInData, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(
				error.message === 'Invalid login credentials'
					? 'Email o contraseña incorrectos'
					: error.message,
			);
			setLoading(false);
			return;
		}

		const userId = signInData.user?.id;
		let destination = '/download';
		if (userId) {
			const { data: practitioner } = await supabase
				.from('practitioners')
				.select('id')
				.eq('user_id', userId)
				.maybeSingle();
			if (practitioner) destination = '/clinic';
		}

		router.push(destination);
		router.refresh();
	};

	return (
		<div className="min-h-screen flex bg-paper">
			{/* Left Side - Form */}
			<div className="flex-1 flex flex-col px-6 md:px-12 lg:px-16 py-8 max-w-2xl">
				{/* Header */}
				<div className="flex items-center justify-between mb-12 md:mb-20">
					<div className="flex items-center gap-1">
						<span className="font-serif text-xl italic tracking-tight">
							fitkis
						</span>
						<PulseLine
							w={24}
							h={10}
							color="var(--signal)"
							strokeWidth={2}
							active
						/>
					</div>
					<div className="text-sm text-ink-4">
						¿Necesitas acceso?{' '}
						<a
							href="mailto:info@fitkis.com"
							className="text-ink font-medium underline underline-offset-4"
						>
							Contacta soporte
						</a>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex-1 flex flex-col justify-center max-w-md">
					<div className="fk-eyebrow mb-4">01 · PORTAL CLÍNICO</div>

					<h1 className="font-serif text-[42px] md:text-[56px] font-light leading-[1.05] tracking-tight mb-6">
						Tu consulta,
						<br />
						en su propio <span className="italic text-signal">ritmo.</span>
					</h1>

					<p className="text-ink-4 text-[15px] leading-relaxed mb-10 max-w-sm">
						Agenda, seguimiento y reportes en un solo lugar — para que te
						concentres en lo que importa.
					</p>

					{/* Form */}
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
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink transition-colors"
								>
									{showPassword ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
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
									<InlinePulse />
									Iniciando...
								</span>
							) : (
								<>
									<span>Continuar</span>
									<ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</form>

					{/* Terms */}
					<p className="text-[11px] text-ink-5 mt-6">
						Al continuar aceptas los{' '}
						<Link href="/terms" className="underline hover:text-ink-3 transition-colors">
							Términos
						</Link>{' '}
						y la{' '}
						<Link href="/privacy" className="underline hover:text-ink-3 transition-colors">
							Política de Privacidad
						</Link>
						.
					</p>
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
					<span className="font-bold">PACIENTES</span>
					<span className="text-paper/40 font-bold">·</span>
					<span className="font-bold">AGENDA</span>
					<span className="text-paper/40 font-bold">·</span>
					<span className="font-bold">SEGUIMIENTO</span>
					<span className="text-paper/40 font-bold">·</span>
					<span className="font-bold">REPORTES</span>
				</div>

				{/* Pacientes Card */}
				<div className="absolute top-24 left-16 bg-white rounded-2xl p-5 shadow-card w-[200px]">
					<div className="flex justify-between items-start mb-3">
						<div className="fk-eyebrow text-ink-4">PACIENTES · ACTIVOS</div>
					</div>
					<div className="flex items-baseline gap-2">
						<span className="font-serif text-[48px] font-light tracking-tight leading-none">
							18
						</span>
						<span className="fk-mono text-xs text-ink-4">/ 24</span>
						<span className="fk-mono text-xs text-signal ml-auto">+2</span>
					</div>
					<div className="mt-3">
						<PulseLine
							w={160}
							h={32}
							color="var(--signal)"
							strokeWidth={1.5}
							active
						/>
					</div>
				</div>

				{/* Citas Card */}
				<div className="absolute top-44 right-24 bg-ink text-paper rounded-2xl p-4 w-[160px]">
					<div className="fk-eyebrow text-ink-5 mb-2">AGENDA · HOY</div>
					<div className="flex items-baseline gap-1">
						<span className="font-serif text-[36px] font-light tracking-tight leading-none">
							5
						</span>
						<span className="fk-mono text-[10px] text-ink-5">consultas</span>
					</div>
					<div className="text-[11px] text-ink-5 mt-2">próxima · 10:30 am</div>
				</div>

				{/* Large EKG Line */}
				<svg
					className="absolute top-[45%] left-8 right-8 w-[90%] h-[120px]"
					viewBox="0 0 400 60"
					preserveAspectRatio="none"
				>
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

				{/* Adherencia Card */}
				<div className="absolute bottom-36 left-20 bg-white rounded-2xl p-5 shadow-card w-[240px]">
					<div className="fk-eyebrow text-ink-4 mb-2">ADHERENCIA · SEMANA</div>
					<div className="font-serif text-lg leading-tight">
						Media del grupo <span className="italic text-leaf">82 %</span>
					</div>
					<div className="flex gap-1.5 mt-3">
						<div className="flex-1 h-1.5 rounded-full bg-leaf" />
						<div className="flex-1 h-1.5 rounded-full bg-leaf" />
						<div className="flex-1 h-1.5 rounded-full bg-honey" />
						<div className="flex-1 h-1.5 rounded-full bg-honey" />
						<div className="flex-1 h-1.5 rounded-full bg-ink-6" />
					</div>
					<div className="fk-mono text-[9px] text-ink-5 mt-2 tracking-wide">
						3 SIN REGISTRO · ÚLTIMA SEMANA
					</div>
				</div>

				{/* Quote */}
				<div className="absolute bottom-12 right-12 text-right">
					<div className="fk-eyebrow text-ink-4 mb-2">FITKIS CLINIC</div>
					<p className="font-serif text-lg italic leading-snug text-ink-3">
						"La constancia
						<br />
						de tu paciente
						<br />
						empieza contigo."
					</p>
				</div>
			</div>
		</div>
	);
}
