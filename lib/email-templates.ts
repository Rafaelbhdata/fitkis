/**
 * Componentes HTML compartidos para emails transaccionales de Fitkis.
 *
 * Todos los emails se renderizan con HTML inline (sin web fonts, sin CSS
 * externo, sin variables) — los clientes de correo (Outlook, Gmail mobile,
 * Apple Mail) no soportan eso de forma confiable. Mismo paradigma que los
 * templates existentes en invite-patient y reschedule-appointment.
 *
 * Las URLs de las stores se leen de env vars. Mientras no estén configuradas,
 * apuntan a /download (página puente del sitio).
 *
 *   FITKIS_APP_STORE_URL   — link directo a App Store cuando esté publicada
 *   FITKIS_PLAY_STORE_URL  — link directo a Google Play cuando esté publicada
 *
 * Cambiando estas env vars en Vercel los emails apuntan al nuevo destino
 * sin redeploy de código.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitkis.com'

function appStoreUrl(): string {
  return process.env.FITKIS_APP_STORE_URL ?? `${SITE_URL}/download`
}

function playStoreUrl(): string {
  return process.env.FITKIS_PLAY_STORE_URL ?? `${SITE_URL}/download`
}

/**
 * Bloque "Descarga la app" para insertar dentro del card principal de
 * cualquier email transaccional. Asume que ya hay una sección con padding
 * 40px arriba; este bloque trae su propio separador.
 */
export function downloadAppCtaHtml(): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-top:1px solid #f0ede6;padding:24px 40px 28px;">
        <p style="margin:0 0 6px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#ff5a1f;">
          Tu app · Fitkis
        </p>
        <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:300;line-height:1.25;color:#0a0a0a;">
          Lleva tu nutrición <em>contigo</em>.
        </p>
        <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#404040;">
          Descarga la app de Fitkis para registrar tus comidas, ver tu plan,
          tener tus rutinas de gym y hablar con tu coach. Disponible en iOS y Android.
        </p>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="${appStoreUrl()}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                App Store →
              </a>
            </td>
            <td>
              <a href="${playStoreUrl()}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                Google Play →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

/**
 * Wrapper genérico para emails — header con logo, card principal con franja
 * signal arriba, CTA de descarga y footer. El llamador inyecta el contenido
 * central (eyebrow + titular + cuerpo + CTAs específicos).
 */
export function emailShell({
  previewText,
  title,
  innerHtml,
  footerNote,
}: {
  previewText: string
  title:       string
  innerHtml:   string
  footerNote:  string
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4ef;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:0;mso-hide:all;">
    ${previewText}
  </span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4ef;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logotipo -->
          <tr>
            <td style="padding:0 0 32px;" align="center">
              <img src="${SITE_URL}/icon.png" alt="Fitkis" width="56" height="56"
                style="display:block;border-radius:14px;border:0;margin:0 auto;" />
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e3db;overflow:hidden;">

              <!-- Franja signal superior -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="background:#ff5a1f;height:4px;"></td></tr>
              </table>

              ${innerHtml}

              ${downloadAppCtaHtml()}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a3a3a3;line-height:1.6;">
                ${footerNote}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
