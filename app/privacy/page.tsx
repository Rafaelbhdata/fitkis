// app/privacy/page.tsx
//
// Privacy Policy for FitKis. Required by Google OAuth verification,
// App Store, and Play Store. Covers calendar.freebusy scope explicitly.

import Link from 'next/link'

export const metadata = {
  title: 'Política de privacidad · FitKis',
  description: 'Cómo FitKis maneja tus datos.',
}

const LAST_UPDATED = '13 de mayo de 2026'

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
              FitKis es una plataforma de salud que conecta a nutriólogas con sus pacientes.
              Incluye un portal web para profesionales de nutrición y una app móvil para
              pacientes. Esta política describe cómo recolectamos, usamos y protegemos tu
              información cuando usas cualquiera de los dos productos.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">2 · QUÉ DATOS RECOLECTAMOS</h2>
            <p className="leading-relaxed mb-3">
              Guardamos lo siguiente vinculado a tu cuenta:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Identidad básica:</strong> correo electrónico (para login) y el nombre que elijas mostrar.</span>
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
                <span><strong>Fotos:</strong> fotos de comida (análisis con IA), fotos de progreso corporal y reportes InBody subidos voluntariamente.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Conversaciones con Coach Fit:</strong> mensajes procesados por IA para generar respuestas personalizadas.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Disponibilidad en Google Calendar (nutriólogas):</strong> si conectas tu cuenta de Google, leemos únicamente los periodos de libre/ocupado de tu calendario para evitar conflictos al agendar citas. No leemos el título, descripción ni asistentes de ningún evento.</span>
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
                <span>Generar recomendaciones personalizadas (rutinas, mensajes del coach, equivalentes nutricionales).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Procesar fotos con IA (Anthropic Claude) cuando subes una foto de comida o de tu InBody.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Verificar disponibilidad en Google Calendar para evitar citas en horarios ya ocupados.</span>
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
            <h2 className="fk-eyebrow text-ink-4 mb-3">4 · GOOGLE CALENDAR — ACCESO Y USO</h2>
            <p className="leading-relaxed mb-4">
              Esta sección describe en detalle el acceso que FitKis solicita a Google Calendar,
              de acuerdo con las políticas de datos de usuario de Google API Services.
            </p>
            <ul className="space-y-3 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Qué accedemos:</strong> únicamente la información de libre/ocupado (<code>calendar.freebusy</code>). Esto significa que sabemos si tienes un evento en un horario, pero no su nombre, descripción, ubicación ni participantes.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Por qué lo usamos:</strong> para que el sistema de agendamiento de Fitkis bloquee automáticamente los horarios donde ya tienes compromisos, evitando citas dobles sin que tengas que gestionar dos calendarios.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Quién puede conectar su calendario:</strong> solo las nutriólogas que usan el portal web de Fitkis. Los pacientes no tienen este acceso.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Almacenamiento:</strong> guardamos el token de acceso de Google de forma segura en nuestra base de datos (Supabase) para consultas futuras de disponibilidad. Nunca almacenamos el contenido de los eventos.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>No compartimos:</strong> los datos de disponibilidad de Google Calendar no se comparten con ningún tercero, no se usan para publicidad y no se transfieren fuera del servicio de Fitkis.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Cómo revocar el acceso:</strong> puedes desconectar tu Google Calendar en cualquier momento desde Configuración → Integraciones → Google Calendar → Desconectar. También puedes revocar el acceso directamente desde <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-signal underline">myaccount.google.com/permissions</a>.</span>
              </li>
            </ul>
            <p className="leading-relaxed mt-4 text-sm text-ink-4">
              El uso de FitKis de los datos obtenidos mediante las APIs de Google se rige
              por la{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Política de datos de usuario de Google API Services
              </a>
              , incluidos los requisitos de uso limitado.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">5 · CON QUIÉN COMPARTIMOS TUS DATOS</h2>
            <p className="leading-relaxed mb-3">
              Para hacer funcionar la app necesitamos algunos servicios de infraestructura:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Supabase</strong> — base de datos y autenticación.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Anthropic (Claude)</strong> — procesamiento de IA para análisis de fotos y chat con Coach Fit.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Vercel</strong> — hosting del backend y portal web.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span><strong>Google (Calendar API)</strong> — consulta de disponibilidad cuando la nutrióloga conecta su cuenta de Google. Ver sección 4 para detalle completo.</span>
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
            <h2 className="fk-eyebrow text-ink-4 mb-3">6 · CUÁNTO TIEMPO GUARDAMOS TUS DATOS</h2>
            <p className="leading-relaxed">
              Mantenemos tus datos mientras tu cuenta esté activa. Si decides eliminar tu
              cuenta desde Ajustes → Borrar cuenta, todos tus datos se borran de forma
              permanente en un máximo de 30 días. Los tokens de Google Calendar se eliminan
              inmediatamente al desconectar la integración o al borrar la cuenta.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">7 · TUS DERECHOS</h2>
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
                <span>Revocar el acceso a Google Calendar en cualquier momento sin eliminar tu cuenta (ver sección 4).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>Pedir aclaración sobre cualquier punto de esta política.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">8 · MENORES DE EDAD</h2>
            <p className="leading-relaxed">
              FitKis no está dirigida a menores de 13 años. No recolectamos datos de
              forma intencionada de menores de esa edad.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">9 · CAMBIOS EN ESTA POLÍTICA</h2>
            <p className="leading-relaxed">
              Si cambia algo importante, te avisamos en la app antes de que entren en
              vigor los cambios. La fecha de última actualización está al inicio de
              esta página.
            </p>
          </section>

          <section>
            <h2 className="fk-eyebrow text-ink-4 mb-3">10 · CONTACTO</h2>
            <p className="leading-relaxed">
              Cualquier duda sobre esta política o sobre tus datos:{' '}
              <a href="mailto:info@fitkis.com" className="text-signal underline">
                info@fitkis.com
              </a>.
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
