// app/privacy/page.tsx
//
// Privacy Policy for FitKis. Required by Google OAuth verification,
// App Store, and Play Store. Covers calendar.freebusy scope explicitly.

import Link from 'next/link'

export const metadata = {
  title: 'Política de privacidad · FitKis',
  description: 'Cómo FitKis maneja tus datos.',
}

const LAST_UPDATED = '18 de mayo de 2026'

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
                <span><strong>Conexión con Google Calendar (nutriólogas):</strong> si conectas una o más cuentas de Google a tu perfil de Fitkis, guardamos (a) la dirección de correo de cada cuenta — únicamente como etiqueta para que puedas distinguir tus conexiones — y (b) tokens de acceso cifrados para consultar disponibilidad y crear eventos de citas. No leemos el título, descripción ni asistentes de eventos que tú ya tengas en tu calendario.</span>
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
              Esta sección describe en detalle los permisos que FitKis solicita a Google y cómo
              usa los datos del Calendario, de acuerdo con la <strong>Política de datos de
              usuario de Google API Services</strong>, incluidos los requisitos de uso limitado
              para scopes restringidos.
            </p>

            <h3 className="text-base font-medium text-ink mb-2">4.1 · Quién puede conectar</h3>
            <p className="leading-relaxed mb-4">
              Solo las nutriólogas que usan el portal web de Fitkis pueden conectar Google
              Calendar. Los pacientes no tienen este acceso. Cada nutrióloga puede conectar
              <strong> una o varias cuentas de Google</strong> (por ejemplo, una personal y una
              de su consultorio) y elegir cuál se usa para crear eventos al agendar citas.
            </p>

            <h3 className="text-base font-medium text-ink mb-2">4.2 · Permisos solicitados (scopes) y para qué se usan</h3>
            <ul className="space-y-3 list-none pl-0 mb-4">
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>
                  <strong><code>openid</code> y <code>userinfo.email</code>:</strong> obtenemos
                  la dirección de correo electrónico de la cuenta que la nutrióloga acaba de
                  conectar. La usamos exclusivamente como <strong>etiqueta visible en su panel
                  de Ajustes</strong>, para que pueda distinguir entre varias cuentas
                  conectadas. No se utiliza para enviar correos, marketing, ni se comparte
                  con terceros.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>
                  <strong><code>calendar.freebusy</code>:</strong> consultamos los bloques de
                  libre/ocupado del calendario primario de cada cuenta conectada para que el
                  link público de reservas (<code>fitkis.com/agendar/[id]</code>) no le ofrezca
                  a los pacientes horarios donde la nutrióloga ya tiene compromisos.{' '}
                  <strong>No</strong> leemos el título, descripción, ubicación, participantes
                  ni ningún otro contenido de los eventos existentes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-signal">·</span>
                <span>
                  <strong><code>calendar.events</code> (restringido):</strong> cuando un
                  paciente confirma una cita, Fitkis crea un evento en el calendario primario
                  de la cuenta que la nutrióloga eligió como "destino de eventos". El evento
                  contiene el nombre del paciente, fecha/hora, duración, el correo del paciente
                  como invitado (para que reciba la invitación estándar de Google Calendar) y
                  las notas opcionales que dejó al reservar. También usamos este permiso para{' '}
                  <strong>actualizar</strong> el evento si la cita se reagenda y{' '}
                  <strong>borrarlo</strong> si se marca como cancelada o no-show. Solo
                  manejamos eventos que Fitkis creó: nunca leemos, modificamos ni borramos
                  eventos ajenos al portal.
                </span>
              </li>
            </ul>

            <h3 className="text-base font-medium text-ink mb-2">4.3 · Almacenamiento y seguridad</h3>
            <p className="leading-relaxed mb-4">
              Los tokens de OAuth (access token, refresh token) se almacenan en nuestra base
              de datos (Supabase) protegidos por <em>row-level security</em>: solo procesos del
              backend autorizados con la clave de servicio pueden leerlos, nunca el navegador
              ni terceros. Guardamos también el correo de la cuenta conectada, una etiqueta
              opcional que tú escojas, y el identificador del evento que creamos en Google al
              agendar (para poder actualizarlo o borrarlo después). No almacenamos el contenido
              de eventos ajenos al portal.
            </p>

            <h3 className="text-base font-medium text-ink mb-2">4.4 · No compartimos, no vendemos, no entrenamos IA</h3>
            <p className="leading-relaxed mb-4">
              Los datos obtenidos vía Google Calendar nunca se comparten con anunciantes ni
              terceros, no se usan para publicidad, no se transfieren fuera del servicio de
              Fitkis, y <strong>no se utilizan para entrenar modelos de inteligencia
              artificial</strong> — ni propios ni de terceros.
            </p>

            <h3 className="text-base font-medium text-ink mb-2">4.5 · Cómo revocar el acceso y borrar los datos</h3>
            <p className="leading-relaxed mb-4">
              Puedes desconectar cualquiera de tus cuentas conectadas en cualquier momento
              desde <strong>Ajustes → Agenda → Calendarios externos → Desconectar</strong>. Al
              hacerlo: (1) revocamos el token con Google, (2) borramos inmediatamente los
              tokens y metadata de esa conexión de nuestra base de datos, y (3) los eventos
              que ya hayamos creado en tu calendario permanecen ahí, pero Fitkis deja de poder
              modificarlos o borrarlos. También puedes revocar el acceso directamente desde{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-signal underline">
                myaccount.google.com/permissions
              </a>.
            </p>

            <p className="leading-relaxed text-sm text-ink-4">
              El uso de FitKis de los datos obtenidos mediante las APIs de Google se rige por
              la{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Política de datos de usuario de Google API Services
              </a>
              , incluidos los requisitos de uso limitado para scopes restringidos.
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
                <span><strong>Google (Calendar API)</strong> — consulta de disponibilidad y creación/actualización de eventos de citas cuando la nutrióloga conecta su(s) cuenta(s) de Google. Ver sección 4 para detalle completo.</span>
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
              permanente en un máximo de 30 días. Los tokens de Google Calendar, el correo
              de la cuenta conectada y el identificador de cada evento creado se eliminan
              inmediatamente al desconectar la cuenta o al borrar la cuenta de Fitkis.
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
