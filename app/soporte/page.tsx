// app/soporte/page.tsx
//
// Página pública de soporte para FitKis. Requerida por App Store Connect
// como Support URL. El copy está orientado a presentar FitKis como una
// herramienta B2B para nutriólogas: la app móvil es un acompañamiento
// gratuito que la nutrióloga ofrece a las personas que ya son parte de
// su consulta. No se ofrecen compras, suscripciones ni servicios
// directamente al usuario final desde la app.

import Link from 'next/link'

export const metadata = {
  title: 'Soporte · FitKis',
  description: 'Centro de ayuda de FitKis para nutriólogas y sus pacientes.',
}

const LAST_UPDATED = '18 de mayo de 2026'
const SUPPORT_EMAIL = 'info@fitkis.com'

type Faq = { q: string; a: React.ReactNode }

const FAQS: Faq[] = [
  {
    q: '¿Qué es FitKis?',
    a: (
      <>
        FitKis es una herramienta profesional diseñada para nutriólogas que quieren dar
        seguimiento más cercano a las personas de su consulta. La nutrióloga utiliza un
        portal web para gestionar su práctica y, como parte de su servicio, puede invitar
        a las personas que atiende a usar la aplicación móvil para registrar sus avances
        y mantenerse en contacto.
      </>
    ),
  },
  {
    q: '¿Para quién es la aplicación móvil?',
    a: (
      <>
        La aplicación móvil está pensada para personas que ya forman parte de la consulta
        de una nutrióloga que utiliza FitKis. Es una herramienta de acompañamiento que tu
        nutrióloga te invita a usar como complemento de tus sesiones presenciales.
      </>
    ),
  },
  {
    q: '¿Cómo recibo una invitación?',
    a: (
      <>
        Tu nutrióloga te enviará una invitación al correo que ella tenga registrado para
        ti. Al aceptarla, podrás abrir la aplicación móvil y comenzar a registrar tus
        avances. Si no recibes la invitación, comunícate directamente con tu nutrióloga
        para confirmar que cuenta con el correo correcto.
      </>
    ),
  },
  {
    q: '¿La aplicación tiene algún costo dentro del app?',
    a: (
      <>
        No. La aplicación móvil no incluye compras, suscripciones ni pagos de ningún tipo.
        Es una herramienta de uso interno entre la nutrióloga y las personas que ella
        invita a su consulta.
      </>
    ),
  },
  {
    q: '¿Qué puedo hacer dentro de la aplicación?',
    a: (
      <>
        Llevar tu bitácora personal: registrar tu peso, anotar lo que vas comiendo,
        marcar hábitos diarios y dejar notas para tu nutrióloga. La información que
        registras la comparte únicamente contigo y con la nutrióloga que te invitó.
      </>
    ),
  },
  {
    q: '¿Cómo cambio mi contraseña?',
    a: (
      <>
        Desde la aplicación: <strong>Ajustes → Cuenta → Cambiar contraseña</strong>. Si
        olvidaste tu contraseña, en la pantalla de inicio de sesión presiona{' '}
        <em>¿Olvidaste tu contraseña?</em> y recibirás un correo para restablecerla.
      </>
    ),
  },
  {
    q: '¿Cómo borro mi cuenta y mis datos?',
    a: (
      <>
        Desde la aplicación: <strong>Ajustes → Cuenta → Borrar cuenta</strong>. Al
        confirmar, todos tus datos se eliminan de forma permanente en un máximo de 30
        días. También puedes solicitar la baja escribiendo a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal underline">
          {SUPPORT_EMAIL}
        </a>{' '}
        desde el correo con el que te registraste.
      </>
    ),
  },
  {
    q: '¿FitKis comparte o vende mi información?',
    a: (
      <>
        No. La información que registras se utiliza únicamente para mostrar tus propios
        avances y para que la nutrióloga que te invitó pueda darte seguimiento. No la
        compartimos con anunciantes ni con terceros. El detalle completo está en nuestra{' '}
        <Link href="/privacy" className="text-signal underline">
          política de privacidad
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Soy nutrióloga, ¿cómo empiezo a usar FitKis?',
    a: (
      <>
        Escríbenos a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal underline">
          {SUPPORT_EMAIL}
        </a>{' '}
        contándonos sobre tu consulta y con gusto te orientamos sobre cómo habilitar tu
        cuenta en el portal profesional. La gestión de la práctica se realiza desde el
        portal web, no desde la aplicación móvil.
      </>
    ),
  },
  {
    q: 'La aplicación no abre o se queda en pantalla blanca, ¿qué hago?',
    a: (
      <>
        Cierra la aplicación por completo, verifica tu conexión a internet y vuelve a
        abrirla. Si persiste, cierra sesión, reinstala la aplicación y vuelve a iniciar
        sesión. Si el problema continúa, escríbenos a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal underline">
          {SUPPORT_EMAIL}
        </a>{' '}
        indicando el modelo de tu dispositivo y la versión del sistema operativo.
      </>
    ),
  },
  {
    q: 'No recibo el correo de verificación o de invitación, ¿qué hago?',
    a: (
      <>
        Revisa la carpeta de <strong>spam o promociones</strong> de tu bandeja. Si en 10
        minutos no llega, vuelve a solicitarlo desde la aplicación. Si sigue sin llegar,
        escríbenos a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </>
    ),
  },
  {
    q: '¿Cómo reporto un problema o propongo una mejora?',
    a: (
      <>
        Envíanos un correo a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal underline">
          {SUPPORT_EMAIL}
        </a>{' '}
        con el detalle: la pantalla donde ocurrió, los pasos para reproducirlo y, si es
        posible, una captura. Respondemos en un máximo de 48 horas hábiles.
      </>
    ),
  },
]

export default function SoportePage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <Link href="/" className="fk-eyebrow text-ink-4 hover:text-ink">
          ← FITKIS
        </Link>

        <div className="mt-12 mb-12">
          <div className="fk-eyebrow mb-4">CENTRO DE SOPORTE</div>
          <h1 className="font-serif text-[42px] md:text-[52px] font-light leading-[1.05] tracking-tight mb-4">
            Aquí para <span className="italic">acompañarte</span>.
          </h1>
          <p className="text-ink-4 text-sm">Última actualización · {LAST_UPDATED}</p>
        </div>

        {/* Contacto destacado */}
        <section className="mb-12 p-6 border border-ink-7 rounded-xl bg-white">
          <h2 className="fk-eyebrow text-ink-4 mb-3">CONTACTO DIRECTO</h2>
          <p className="leading-relaxed mb-4 text-ink-2">
            Si tu duda no aparece en esta página, escríbenos. Respondemos en un máximo de{' '}
            <strong>48 horas hábiles</strong> (lunes a viernes, zona horaria de la Ciudad
            de México).
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-signal text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Escribir a {SUPPORT_EMAIL}
          </a>
        </section>

        {/* Sobre FitKis */}
        <section className="mb-12">
          <h2 className="fk-eyebrow text-ink-4 mb-4">SOBRE FITKIS</h2>
          <div className="space-y-4 text-ink-2">
            <p className="leading-relaxed">
              FitKis es una <strong>herramienta profesional para nutriólogas</strong>. La
              nutrióloga gestiona su consulta desde un portal web (notas, biblioteca de
              recursos, agenda y seguimiento) y, como parte de su servicio, invita a las
              personas que atiende a usar una aplicación móvil de acompañamiento.
            </p>
            <p className="leading-relaxed">
              La aplicación móvil es una bitácora personal donde la persona puede
              registrar sus avances y mantener un canal de comunicación con la nutrióloga
              que la invitó. No es un producto de venta directa al usuario final: el
              acceso siempre se origina en la invitación de una nutrióloga.
            </p>
            <p className="leading-relaxed">
              La aplicación no realiza diagnósticos, no prescribe tratamientos y no
              sustituye la consulta presencial. Todo el criterio profesional corresponde
              a la nutrióloga que utiliza el portal.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="fk-eyebrow text-ink-4 mb-6">PREGUNTAS FRECUENTES</h2>
          <div className="space-y-6">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group border-b border-ink-7 pb-5"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-medium text-ink hover:text-signal transition-colors">
                  <span className="leading-snug">{faq.q}</span>
                  <span
                    aria-hidden
                    className="text-ink-4 group-open:rotate-45 transition-transform text-xl leading-none flex-shrink-0 mt-0.5"
                  >
                    +
                  </span>
                </summary>
                <div className="mt-3 leading-relaxed text-ink-2 text-[15px]">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Recursos relacionados */}
        <section className="mb-12">
          <h2 className="fk-eyebrow text-ink-4 mb-4">RECURSOS RELACIONADOS</h2>
          <ul className="space-y-3 text-ink-2 text-[15px]">
            <li>
              <Link href="/privacy" className="text-signal underline">
                Política de privacidad
              </Link>{' '}
              <span className="text-ink-4">— cómo tratamos tu información.</span>
            </li>
            <li>
              <Link href="/terms" className="text-signal underline">
                Términos de uso
              </Link>{' '}
              <span className="text-ink-4">— condiciones del servicio.</span>
            </li>
          </ul>
        </section>

        {/* Información de contacto */}
        <section className="mb-12">
          <h2 className="fk-eyebrow text-ink-4 mb-4">INFORMACIÓN DE CONTACTO</h2>
          <div className="space-y-2 text-ink-2 text-[15px] leading-relaxed">
            <p><strong>Producto:</strong> FitKis</p>
            <p><strong>Sitio web:</strong>{' '}
              <a href="https://fitkis.com" className="text-signal underline">
                https://fitkis.com
              </a>
            </p>
            <p><strong>Correo de soporte:</strong>{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p><strong>Idioma de atención:</strong> español.</p>
            <p><strong>Horario de respuesta:</strong> lunes a viernes, hasta 48 horas hábiles.</p>
          </div>
        </section>

        <div className="mt-16 pt-8 border-t border-ink-7 flex flex-col sm:flex-row gap-4 sm:gap-8">
          <Link href="/privacy" className="fk-eyebrow text-ink-4 hover:text-ink">
            POLÍTICA DE PRIVACIDAD →
          </Link>
          <Link href="/terms" className="fk-eyebrow text-ink-4 hover:text-ink">
            TÉRMINOS DE USO →
          </Link>
        </div>
      </div>
    </div>
  )
}
