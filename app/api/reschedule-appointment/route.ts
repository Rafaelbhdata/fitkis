import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitkis.app'

/**
 * POST /api/reschedule-appointment
 *
 * 1. Marca la cita como 'rescheduling'
 * 2. Envía email al paciente con el link para reagendar
 *
 * Body: { appointmentId, practitionerId, practitionerName, patientName, patientEmail, originalDate }
 */
export async function POST(req: Request) {
  const {
    appointmentId,
    practitionerId,
    practitionerName,
    patientName,
    patientEmail,
    originalDate,
  } = await req.json() as {
    appointmentId:    string
    practitionerId:   string
    practitionerName: string
    patientName:      string
    patientEmail:     string
    originalDate:     string
  }

  if (!appointmentId || !practitionerId || !patientEmail) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  }

  // 1. Actualizar status → rescheduling
  const { error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'rescheduling' } as never)
    .eq('id', appointmentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 2. Enviar email al paciente (si Resend está configurado)
  const bookingLink = `${SITE_URL}/agendar/${practitionerId}?reschedule=${appointmentId}`

  if (resend) {
    const formattedDate = new Date(originalDate).toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })

    await resend.emails.send({
      from: 'Fitkis <noreply@fitkis.app>',
      to: patientEmail,
      subject: `${practitionerName} quiere reagendar tu consulta`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0a0a0a;">
          <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 8px;">Hola, ${patientName}</h1>
          <p style="font-size: 15px; color: #737373; margin: 0 0 32px; font-family: system-ui, sans-serif;">
            Tu nutrióloga <strong style="color: #0a0a0a;">${practitionerName}</strong>
            ha solicitado reagendar tu consulta del <strong>${formattedDate}</strong>.
          </p>
          <a href="${bookingLink}"
            style="display: inline-block; background: #ff5a1f; color: #fff; text-decoration: none;
                   padding: 14px 28px; border-radius: 999px; font-family: system-ui, sans-serif;
                   font-size: 14px; font-weight: 600; margin-bottom: 32px;">
            Elegir nuevo horario →
          </a>
          <p style="font-size: 13px; color: #a3a3a3; font-family: system-ui, sans-serif; margin: 0;">
            Si no puedes hacer clic en el botón, copia este enlace en tu navegador:<br/>
            <a href="${bookingLink}" style="color: #ff5a1f;">${bookingLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #a3a3a3; font-family: system-ui, sans-serif; margin: 0;">
            Este mensaje fue enviado desde el portal Fitkis en nombre de tu nutrióloga.
          </p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true, bookingLink })
}
