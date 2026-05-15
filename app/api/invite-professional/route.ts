import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Resend } from 'resend'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/clinic/queries'

/**
 * POST /api/invite-professional
 * Body: { email: string }
 *
 * Solo accesible a usuarios con role = 'admin' en user_profiles.
 *
 * Si RESEND_API_KEY está configurado:
 *   - Usa generateLink (no envía email) para obtener el magic link
 *   - Sobreescribe redirect_to para garantizar que apunte a /auth/callback?next=/onboarding
 *   - Envía email de marca vía Resend
 * Fallback (sin Resend):
 *   - Usa inviteUserByEmail de Supabase (email genérico)
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const isAdmin = await isAdminUser(supabase, user.id)
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  let email: string
  try {
    const body = await request.json()
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const callbackUrl = `${siteUrl}/auth/callback?next=/onboarding`

  if (resend) {
    // ── Resend disponible: generateLink (sin email) → email de marca ─────────
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: callbackUrl },
    })

    if (linkErr || !linkData?.user?.id) {
      console.error('invite-professional: generateLink error', linkErr)
      if (linkErr?.message?.toLowerCase().includes('already')) {
        return NextResponse.json(
          { error: 'Este email ya tiene una cuenta en Fitkis.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: linkErr?.message ?? 'Error al generar la invitación.' },
        { status: 500 }
      )
    }

    // Supabase puede ignorar redirectTo si el dominio no está en la allowlist.
    // Sobreescribimos redirect_to en el action_link para garantizar el destino correcto.
    const rawLink = linkData.properties?.action_link ?? ''
    const magicLink = rawLink
      ? rawLink.replace(
          /redirect_to=[^&]*/g,
          `redirect_to=${encodeURIComponent(callbackUrl)}`,
        )
      : callbackUrl

    resend.emails.send({
      from: 'Fitkis <info@fitkis.com>',
      to: email,
      subject: 'Estás invitada a usar Fitkis',
      html: inviteProfessionalEmailHtml({ magicLink }),
    }).catch((err) => console.error('invite-professional resend error:', err))

    return NextResponse.json({ ok: true })
  }

  // ── Fallback: Supabase envía su propio email ────────────────────────────────
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: callbackUrl,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'Este email ya tiene una cuenta en Fitkis.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// ── Template de email para invitación a nutriólogas ────────────────────────────
// Misma identidad visual que invite-patient y reschedule-appointment:
// fondo #f5f4ef, card blanca, franja signal (#ff5a1f), Georgia serif, Arial cuerpo.

function inviteProfessionalEmailHtml({ magicLink }: { magicLink: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a Fitkis</title>
</head>
<body style="margin:0;padding:0;background:#f5f4ef;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4ef;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logotipo -->
          <tr>
            <td style="padding:0 0 32px;" align="center">
              <img
                src="https://fitkis.com/icon.png"
                alt="Fitkis"
                width="56"
                height="56"
                style="display:block;border-radius:14px;border:0;margin:0 auto;"
              />
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e3db;overflow:hidden;">

              <!-- Franja signal superior -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#ff5a1f;height:4px;"></td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 40px 36px;">

                    <!-- Eyebrow -->
                    <p style="margin:0 0 10px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#ff5a1f;">
                      Invitación · Fitkis
                    </p>

                    <!-- Titular editorial -->
                    <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:300;line-height:1.1;letter-spacing:-0.02em;color:#0a0a0a;">
                      Bienvenida al<br/><em>portal clínico</em>.
                    </h1>

                    <!-- Cuerpo -->
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#404040;font-family:Arial,Helvetica,sans-serif;">
                      Has sido invitada a <strong>Fitkis</strong>, el portal para nutriólogas donde podrás gestionar
                      tus pacientes, agenda, notas de consulta y reportes desde un solo lugar.
                    </p>
                    <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#404040;font-family:Arial,Helvetica,sans-serif;">
                      Haz clic en el botón para configurar tu cuenta y acceder al portal.
                    </p>

                    <!-- CTA principal -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#ff5a1f;border-radius:999px;">
                          <a href="${magicLink}"
                            style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
                            Activar mi cuenta →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Nota bajo CTA -->
                    <p style="margin:20px 0 0;font-size:12px;color:#a3a3a3;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                      Este enlace es de un solo uso y expira en 24 horas.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Separador + fallback link -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f0ede6;padding:24px 40px;">
                    <p style="margin:0;font-size:12px;color:#a3a3a3;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                      Si no puedes hacer clic en el botón, copia este enlace:<br/>
                      <a href="${magicLink}" style="color:#ff5a1f;word-break:break-all;">${magicLink}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a3a3a3;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                Enviado por <strong>Fitkis</strong>.<br/>
                Si no esperabas esta invitación, puedes ignorar este correo.
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
