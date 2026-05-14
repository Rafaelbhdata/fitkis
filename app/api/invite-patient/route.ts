// app/api/invite-patient/route.ts
//
// POST { email, practitioner_id }
//
// Vincula un paciente a una nutrióloga.
// - Si el email ya existe en auth.users → inserta practitioner_patients (pending)
//   y dispara push notification.
// - Si no existe → generateLink (crea cuenta, devuelve magic link SIN enviar email)
//   → envía email de marca con Resend → inserta practitioner_patients.
//   Fallback: si RESEND_API_KEY no está configurado, usa inviteUserByEmail estándar.
//
// Requiere que el caller esté autenticado como una nutrióloga activa.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'
import { sendPushToUser } from '@/lib/push'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// SERVER_URL es server-only (sin NEXT_PUBLIC_) para evitar que el valor
// de localhost en dev se filtre a producción. Fallback a fitkis.com.
const SITE_URL = process.env.SERVER_URL ?? 'https://fitkis.com'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  // Verificar que el caller es una nutrióloga activa
  const { data: prac } = await supabase
    .from('practitioners')
    .select('id, display_name, clinic_name')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!prac) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  let email: string
  let practitionerId: string
  try {
    const body = await request.json()
    email = (body.email ?? '').trim().toLowerCase()
    practitionerId = body.practitioner_id ?? ''
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (!practitionerId || prac.id !== practitionerId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const pracName  = (prac as { display_name?: string }).display_name ?? 'Tu nutrióloga'
  const pracClinic = (prac as { clinic_name?: string }).clinic_name ?? null

  // ── Buscar si el usuario ya existe ──────────────────────────────────────────
  const { data: usersRaw } = await supabase
    .rpc('get_user_by_email' as never, { email_input: email } as never)
  const users = (usersRaw ?? []) as { id: string; email: string }[]
  const existingUserId = users[0]?.id ?? null

  let patientId: string
  let wasNew = false

  if (existingUserId) {
    // Usuario existe → verificar que no esté ya vinculado
    const { data: existing } = await supabase
      .from('practitioner_patients')
      .select('id, status')
      .eq('practitioner_id', practitionerId)
      .eq('patient_id', existingUserId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Este paciente ya está ${existing.status === 'active' ? 'vinculado' : 'invitado'}.` },
        { status: 409 }
      )
    }
    patientId = existingUserId
  } else {
    wasNew = true

    if (resend) {
      // ── Resend disponible: generateLink (no envía email) → email de marca ──
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: `${SITE_URL}/download` },
      })
      if (linkErr || !linkData?.user?.id) {
        console.error('invite-patient: generateLink error', linkErr)
        return NextResponse.json(
          { error: linkErr?.message ?? 'Error al generar la invitación.' },
          { status: 500 }
        )
      }
      patientId = linkData.user.id
      // Supabase puede embeber su Site URL configurado en el action_link
      // ignorando el redirectTo que pasamos, si ese URL no está en la
      // allowlist. Sobreescribimos redirect_to directamente para garantizar
      // que el botón siempre apunte a nuestra URL de producción.
      const rawLink = linkData.properties?.action_link ?? ''
      const magicLink = rawLink
        ? rawLink.replace(
            /redirect_to=[^&]*/g,
            `redirect_to=${encodeURIComponent(`${SITE_URL}/download`)}`,
          )
        : `${SITE_URL}/download`

      // Fire-and-forget — el insert al vínculo no depende del email
      resend.emails.send({
        from: 'Fitkis <info@fitkis.com>',
        to: email,
        subject: `${pracName} te invita a Fitkis`,
        html: inviteEmailHtml({ pracName, pracClinic, magicLink }),
      }).catch((err) => console.error('invite-patient resend error:', err))
    } else {
      // ── Fallback: Supabase envía su propio email ────────────────────────────
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${SITE_URL}/download`,
      })
      if (inviteErr || !invited?.user?.id) {
        console.error('invite-patient: inviteUserByEmail error', inviteErr)
        return NextResponse.json(
          { error: inviteErr?.message ?? 'Error al enviar la invitación.' },
          { status: 500 }
        )
      }
      patientId = invited.user.id
    }
  }

  // ── Insertar vínculo ────────────────────────────────────────────────────────
  const { error: insertErr } = await admin
    .from('practitioner_patients')
    .insert({
      practitioner_id: practitionerId,
      patient_id: patientId,
      status: 'pending',
      invited_at: new Date().toISOString(),
    })

  if (insertErr) {
    console.error('invite-patient: insert error', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // ── Push para usuarios existentes ───────────────────────────────────────────
  if (!wasNew) {
    ;(async () => {
      await sendPushToUser(patientId, {
        title: 'Te invitaron a Fitkis',
        body: pracClinic
          ? `${pracName} de ${pracClinic} quiere acompañarte.`
          : `${pracName} quiere acompañarte.`,
        data: { type: 'invitation' },
      })
    })().catch((err) => console.error('invite-patient push failed:', err))
  }

  return NextResponse.json({ ok: true, wasNew })
}

// ── Template de email de invitación ────────────────────────────────────────────
// Tipografía editorial, paleta paper/ink/signal — misma identidad que el portal.
// El email sigue estándares de cliente de correo: sin web fonts, sin variables CSS,
// todo inline. Georgia como serif system font + Arial como sans fallback.

function inviteEmailHtml({
  pracName,
  pracClinic,
  magicLink,
}: {
  pracName: string
  pracClinic: string | null
  magicLink: string
}): string {
  const from = pracClinic ? `${pracName} · ${pracClinic}` : pracName

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pracName} te invita a Fitkis</title>
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
                      <em>${pracName}</em><br/>te quiere acompañar.
                    </h1>

                    <!-- Cuerpo -->
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#404040;">
                      ${from} te ha invitado a unirte a <strong>Fitkis</strong>, la app donde llevarás
                      tu nutrición, entrenamiento y hábitos en un solo lugar.
                    </p>
                    <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#404040;">
                      Crea tu cuenta en menos de un minuto y empieza hoy.
                    </p>

                    <!-- CTA principal -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#ff5a1f;border-radius:999px;">
                          <a href="${magicLink}"
                            style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
                            Crear mi cuenta →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Nota bajo CTA -->
                    <p style="margin:20px 0 0;font-size:12px;color:#a3a3a3;line-height:1.5;">
                      Este enlace es de un solo uso y expira en 24 horas.<br/>
                      Al crearlo, descarga la app Fitkis para empezar.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Separador -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f0ede6;padding:24px 40px;">
                    <p style="margin:0;font-size:12px;color:#a3a3a3;line-height:1.6;">
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
              <p style="margin:0;font-size:11px;color:#a3a3a3;line-height:1.6;">
                Enviado por <strong>Fitkis</strong> en nombre de ${from}.<br/>
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
