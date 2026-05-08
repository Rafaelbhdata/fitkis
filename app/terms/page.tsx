// app/terms/page.tsx
//
// Terms of Service for FitKis. Required by App Store + Play Store.

import Link from 'next/link'

export const metadata = {
  title: 'Términos de uso · FitKis',
  description: 'Reglas para usar FitKis.',
}

const LAST_UPDATED = '7 de mayo de 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="fk-eyebrow text-ink-4 hover:text-ink">
          ← FITKIS
        </Link>

        <div className="mt-12 mb-12">
          <div className="fk-eyebrow mb-4">TÉRMINOS DE USO</div>
          <h1 className="font-serif text-[42px] md:text-[52px] font-light leading-[1.05] tracking-tight mb-4">
            Las reglas, <span className="italic">en corto</span>.
          </h1>
          <p className="text-ink-4 text-sm">Última actualización · {LAST_UPDATED}</p>
        </div>

        <div className="prose-fitkis space-y-8 text-ink-2">
          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">1 · ACEPTACIÓN</h2>
            <p className="leading-relaxed">
              Al crear una cuenta o usar FitKis, aceptas estos términos. Si no estás
              de acuerdo con alguna parte, no uses la app.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">2 · QUÉ ES FITKIS</h2>
            <p className="leading-relaxed">
              FitKis es una herramienta personal de seguimiento de salud — peso,
              alimentación, hábitos y entrenamiento. No es un servicio médico. La
              información que muestra no sustituye la consulta con un profesional
              de salud calificado.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">3 · TU CUENTA</h2>
            <p className="leading-relaxed mb-3">
              Eres responsable de:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Dar información verdadera al registrarte.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Mantener tu contraseña segura.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Avisarnos si crees que alguien accedió a tu cuenta sin tu permiso.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">4 · USO ACEPTABLE</h2>
            <p className="leading-relaxed mb-3">
              Está prohibido:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Subir contenido ilegal, ofensivo, o de terceros sin permiso.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Intentar romper, hackear o saturar la infraestructura del servicio.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Usar la app para acosar, dañar o engañar a otras personas.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Hacer scraping automatizado de la app o sus endpoints.</span>
              </li>
            </ul>
            <p className="leading-relaxed mt-4">
              Si rompes estos términos, podemos suspender o cerrar tu cuenta sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">5 · COACH FIT (IA)</h2>
            <p className="leading-relaxed">
              Coach Fit usa inteligencia artificial para sugerir rutinas, estimar
              equivalentes nutricionales y conversar contigo. Las respuestas son
              orientativas; usa tu propio criterio y consulta a un profesional para
              decisiones importantes (programas de entrenamiento intensos, restricciones
              alimentarias, recuperación de lesiones).
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">6 · CONTENIDO QUE SUBES</h2>
            <p className="leading-relaxed">
              Las fotos, registros y mensajes que subes siguen siendo tuyos. Nos das
              permiso de procesarlos para hacer funcionar la app (mostrarlos en tu
              propio historial, generarte recomendaciones, analizar tus fotos con IA).
              No los publicamos ni los compartimos con terceros.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">7 · DISPONIBILIDAD</h2>
            <p className="leading-relaxed">
              Hacemos lo posible por mantener la app funcionando, pero no garantizamos
              tiempo de actividad ininterrumpida. A veces puede haber mantenimientos o
              caídas no planeadas. No nos hacemos responsables por la pérdida de datos
              causada por fallas técnicas que estén fuera de nuestro control razonable.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">8 · CANCELACIÓN</h2>
            <p className="leading-relaxed">
              Puedes borrar tu cuenta en cualquier momento desde Ajustes → Borrar cuenta.
              Todos tus datos se eliminan en un máximo de 30 días. También podemos cerrar
              tu cuenta si rompes estos términos.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">9 · CAMBIOS EN ESTOS TÉRMINOS</h2>
            <p className="leading-relaxed">
              Si cambia algo importante, te avisamos en la app antes de que entren en
              vigor. Si sigues usando FitKis después del aviso, se entiende que aceptas
              los términos nuevos.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">10 · CONTACTO</h2>
            <p className="leading-relaxed">
              Cualquier duda: <a href="mailto:hola@fitkis.app" className="text-signal underline">hola@fitkis.app</a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-ink-7">
          <Link href="/privacy" className="fk-eyebrow text-ink-4 hover:text-ink">
            VER POLÍTICA DE PRIVACIDAD →
          </Link>
        </div>
      </div>
    </div>
  )
}
