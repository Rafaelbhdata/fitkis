import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAuthedUser } from '@/lib/api-auth';

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitkis.com';

const MONTHS_ES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre',
];
const APP_TZ = 'America/Mexico_City';

function formatDate(iso: string): string {
	// Server-side (Vercel = UTC): forzamos CDMX explícito o el email mostraría hora UTC.
	const d = new Date(iso);
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: APP_TZ,
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(d);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
	const day = Number(get('day'));
	const mon = Number(get('month')) - 1;
	const time = `${get('hour')}:${get('minute')}`;
	return `${day} de ${MONTHS_ES[mon]} a las ${time}`;
}

/**
 * POST /api/reschedule-appointment
 *
 * - reason 'no_show':  marca la cita como 'no_show' + envía email de reagendamiento
 * - reason 'custom':   marca la cita como 'rescheduling' + envía email con mensaje personalizado
 */
export async function POST(req: Request) {
	// Only an authenticated practitioner can reschedule. Otherwise anyone
	// with an appointmentId guess could mark appointments as no_show or
	// trigger reschedule emails to arbitrary recipients.
	const { user } = await getAuthedUser(req);
	if (!user) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
	}

	const {
		appointmentId,
		practitionerId,
		practitionerName,
		patientName,
		patientEmail,
		originalDate,
		reason,
		customMessage,
	} = (await req.json()) as {
		appointmentId: string;
		practitionerId: string;
		practitionerName: string;
		patientName: string;
		patientEmail: string;
		originalDate: string;
		reason: 'no_show' | 'custom';
		customMessage?: string;
	};

	if (!appointmentId || !practitionerId || !patientEmail || !reason) {
		return NextResponse.json(
			{ error: 'Faltan campos requeridos.' },
			{ status: 400 },
		);
	}

	// Verify the authenticated user owns this practitioner record AND
	// this appointment. Prevents practitioner A from rescheduling
	// practitioner B's appointments.
	const { data: prac } = await supabaseAdmin
		.from('practitioners')
		.select('id, user_id')
		.eq('id', practitionerId)
		.maybeSingle();
	if (!prac || (prac as { user_id: string }).user_id !== user.id) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
	}
	const { data: appt } = await supabaseAdmin
		.from('appointments')
		.select('id, practitioner_id, patient_email')
		.eq('id', appointmentId)
		.maybeSingle();
	if (
		!appt ||
		(appt as { practitioner_id: string }).practitioner_id !== practitionerId
	) {
		return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
	}
	// Use the stored email from DB, not the one in the request body.
	const trustedPatientEmail = (appt as { patient_email: string }).patient_email;

	const newStatus = reason === 'no_show' ? 'no_show' : 'rescheduling';

	const { error: updateError } = await supabaseAdmin
		.from('appointments')
		.update({ status: newStatus } as never)
		.eq('id', appointmentId);

	if (updateError) {
		return NextResponse.json({ error: updateError.message }, { status: 500 });
	}

	const bookingLink = `${SITE_URL}/agendar/${practitionerId}?reschedule=${appointmentId}`;

	if (resend) {
		const formattedDate = formatDate(originalDate);
		const firstName = patientName.split(' ')[0];

		const bodyParagraph =
			reason === 'no_show'
				? `Notamos que no pudiste asistir a tu consulta del <strong>${formattedDate}</strong>. No te preocupes, aquí puedes elegir un nuevo horario.`
				: customMessage
					? `Tu nutrióloga <strong>${practitionerName}</strong> ha solicitado reagendar tu consulta del <strong>${formattedDate}</strong> y te dejó este mensaje:<br/><br/>
           <blockquote style="border-left:3px solid #ff5a1f;margin:0;padding:10px 16px;color:#404040;font-style:italic;">${customMessage}</blockquote>`
					: `Tu nutrióloga <strong>${practitionerName}</strong> ha solicitado reagendar tu consulta del <strong>${formattedDate}</strong>.`;

		await resend.emails.send({
			from: 'Fitkis <info@fitkis.com>',
			to: trustedPatientEmail,
			subject:
				reason === 'no_show'
					? `Agenda tu nueva consulta con ${practitionerName}`
					: `${practitionerName} quiere reagendar tu consulta`,
			html: rescheduleEmailHtml({ firstName, bodyParagraph, bookingLink, practitionerName }),
		});
	}

	return NextResponse.json({ ok: true, bookingLink });
}

function rescheduleEmailHtml({
	firstName,
	bodyParagraph,
	bookingLink,
	practitionerName,
}: {
	firstName: string;
	bodyParagraph: string;
	bookingLink: string;
	practitionerName: string;
}): string {
	return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reagendar consulta · Fitkis</title>
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
                <tr><td style="background:#ff5a1f;height:4px;"></td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 40px 36px;">

                    <!-- Eyebrow -->
                    <p style="margin:0 0 10px;font-family:Arial,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#ff5a1f;">
                      Consulta · Fitkis
                    </p>

                    <!-- Saludo -->
                    <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:300;line-height:1.1;letter-spacing:-0.02em;color:#0a0a0a;">
                      Hola, <em>${firstName}</em>.
                    </h1>

                    <!-- Cuerpo -->
                    <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#404040;font-family:Arial,Helvetica,sans-serif;">
                      ${bodyParagraph}
                    </p>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#ff5a1f;border-radius:999px;">
                          <a href="${bookingLink}"
                            style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
                            Elegir nuevo horario →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Separador + fallback link -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f0ede6;padding:24px 40px;">
                    <p style="margin:0;font-size:12px;color:#a3a3a3;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                      Si no puedes hacer clic en el botón, copia este enlace:<br/>
                      <a href="${bookingLink}" style="color:#ff5a1f;word-break:break-all;">${bookingLink}</a>
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
                Enviado por <strong>Fitkis</strong> en nombre de ${practitionerName}.
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
