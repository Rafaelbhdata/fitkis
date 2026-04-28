import Link from 'next/link'
import { PulseLine } from '@/components/ui/PulseLine'

export const metadata = {
  title: 'Descarga FitKis · iOS y Android',
  description: 'Lleva FitKis contigo. Disponible para iPhone y Android.',
}

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-1 mb-12">
        <span className="font-serif text-2xl italic tracking-tight">fitkis</span>
        <PulseLine w={28} h={12} color="var(--signal)" strokeWidth={2} active />
      </div>

      <div className="max-w-md text-center">
        <div className="fk-eyebrow mb-4">DESCARGA · MÓVIL</div>
        <h1 className="font-serif text-[42px] md:text-[56px] font-light leading-[1.05] tracking-tight mb-6">
          FitKis ahora<br />
          en tu <span className="italic text-signal">bolsillo</span>.
        </h1>
        <p className="text-ink-4 text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
          La experiencia de paciente vive ahora en una app nativa.
          Descárgala para iPhone o Android.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* App Store href: updated to https://apps.apple.com/app/id<ASC_APP_ID> in Task 31 */}
          <a
            href="#"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink-2 transition-colors"
          >
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.fitkis.app"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-ink-7 text-ink text-sm font-medium hover:bg-paper-2 transition-colors"
          >
            Google Play
          </a>
        </div>

        <p className="text-[11px] text-ink-5 mt-10">
          ¿Eres nutrióloga? Entra al panel desde{' '}
          <Link href="/login" className="underline">
            fitkis.app/login
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
