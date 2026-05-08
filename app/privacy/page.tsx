// app/privacy/page.tsx
//
// Privacy Policy for FitKis. Required by App Store + Play Store.
// Editorial typography to match the rest of the marketing site.

import Link from 'next/link'

export const metadata = {
  title: 'Política de privacidad · FitKis',
  description: 'Cómo FitKis maneja tus datos.',
}

const LAST_UPDATED = '7 de mayo de 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <Link href="/" className="fk-eyebrow text-ink-4 hover:text-ink">
          ← FITKIS
        </Link>

        <div className="mt-12 mb-12">
          <div className="fk-eyebrow mb-4">POLÍTICA DE PRIVACIDAD</div>
          <h1 className="font-serif text-[42px] md:text-[52px] font-light leading-[1.05] tracking-tight mb-4">
            Tus datos son <span className="italic">tuyos</span>.
          </h1>
          <p className="text-ink-4 text-sm">Última actualización · {LAST_UPDATED}</p>
        </div>

        <div className="prose-fitkis space-y-8 text-ink-2">
          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">1 · QUIÉNES SOMOS</h2>
            <p className="leading-relaxed">
              FitKis es una aplicación de seguimiento de salud personal — peso, alimentación,
              hábitos y entrenamiento. Esta política describe cómo recolectamos, usamos y
              protegemos tu información cuando usas la app móvil o el sitio web.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">2 · QUÉ DATOS RECOLECTAMOS</h2>
            <p className="leading-relaxed mb-3">
              Para que la app funcione, guardamos lo siguiente vinculado a tu cuenta:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Identidad básica:</strong> tu correo electrónico (para login) y el nombre que tú elijas mostrar.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Métricas corporales:</strong> peso, altura, fecha de nacimiento, sexo, peso meta, masa muscular, masa grasa, % de grasa.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Alimentación:</strong> registros de comidas, tipo de dieta, alergias, comidas favoritas.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Entrenamiento:</strong> sesiones de gym, ejercicios completados, pesos levantados, lesiones, equipo disponible.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Hábitos:</strong> los hábitos que activas y tu progreso diario.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Fotos:</strong> fotos de comida (para análisis con IA), fotos de progreso corporal y reportes InBody que tú subes voluntariamente.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Conversaciones con Coach Fit:</strong> los mensajes que envías al chat de coaching son procesados por IA para generar respuestas personalizadas.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">3 · CÓMO USAMOS TUS DATOS</h2>
            <p className="leading-relaxed mb-3">
              Solo para hacer funcionar la app y mejorar tu experiencia:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Mostrarte tu propio progreso (gráficas, historial, tendencias).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Generar recomendaciones personalizadas (rutinas de gym, mensajes del coach, equivalentes nutricionales).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Procesar fotos con IA (Anthropic Claude) cuando tú subes una foto de comida o de tu InBody.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Mantener la sesión iniciada de forma segura.</span>
              </li>
            </ul>
            <p className="leading-relaxed mt-4 font-medium text-ink">
              No vendemos tus datos. No los compartimos con anunciantes. No los usamos para
              entrenar modelos de IA de terceros más allá de la respuesta inmediata a tus
              fotos y mensajes.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">4 · CON QUIÉN LOS COMPARTIMOS</h2>
            <p className="leading-relaxed mb-3">
              Para hacer funcionar la app necesitamos algunos servicios de infraestructura:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Supabase</strong> — base de datos y autenticación (datos almacenados en su infraestructura).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Anthropic (Claude)</strong> — procesamiento de IA para análisis de fotos y chat con Coach Fit.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Vercel</strong> — hosting del backend.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Open Food Facts</strong> — base de datos pública para lookup de códigos de barras (solo enviamos el código, ningún dato personal).</span>
              </li>
            </ul>
            <p className="leading-relaxed mt-4">
              Estos proveedores actúan como procesadores: solo manejan lo necesario para
              prestar el servicio y no usan tus datos para sus propios fines.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">5 · CUÁNTO TIEMPO LOS GUARDAMOS</h2>
            <p className="leading-relaxed">
              Mantenemos tus datos mientras tu cuenta esté activa. Si decides eliminar tu
              cuenta desde Ajustes → Borrar cuenta, todos tus datos se borran de forma
              permanente en un máximo de 30 días.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">6 · TUS DERECHOS</h2>
            <p className="leading-relaxed mb-3">Tienes derecho a:</p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Ver y exportar tus datos en cualquier momento.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Editar o corregir información incorrecta directamente en la app.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Eliminar tu cuenta y todos tus datos vinculados.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Pedir aclaración sobre cualquier punto de esta política.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">7 · MENORES DE EDAD</h2>
            <p className="leading-relaxed">
              FitKis no está dirigida a menores de 13 años. No recolectamos datos de
              forma intencionada de menores de esa edad.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">8 · CAMBIOS EN ESTA POLÍTICA</h2>
            <p className="leading-relaxed">
              Si cambia algo importante, te avisamos en la app antes de que entren en
              vigor los cambios. La fecha de última actualización está al inicio de
              esta página.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">9 · CONTACTO</h2>
            <p className="leading-relaxed">
              Cualquier duda: <a href="mailto:hola@fitkis.app" className="text-signal underline">hola@fitkis.app</a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-ink-7">
          <Link href="/terms" className="fk-eyebrow text-ink-4 hover:text-ink">
            VER TÉRMINOS DE USO →
          </Link>
        </div>
      </div>
    </div>
  )
}
