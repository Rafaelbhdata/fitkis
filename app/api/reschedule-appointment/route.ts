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
			html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0a0a0a;">
          <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 8px;">Hola, ${firstName}</h1>
          <p style="font-size: 15px; color: #737373; margin: 0 0 28px; font-family: system-ui, sans-serif; line-height: 1.6;">
            ${bodyParagraph}
          </p>
          <a href="${bookingLink}"
            style="display: inline-block; background: #ff5a1f; color: #fff; text-decoration: none;
                   padding: 14px 28px; border-radius: 999px; font-family: system-ui, sans-serif;
                   font-size: 14px; font-weight: 600; margin-bottom: 32px;">
            Elegir nuevo horario →
          </a>
          <p style="font-size: 13px; color: #a3a3a3; font-family: system-ui, sans-serif; margin: 0;">
            Si no puedes hacer clic en el botón, copia este enlace:<br/>
            <a href="${bookingLink}" style="color: #ff5a1f;">${bookingLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #a3a3a3; font-family: system-ui, sans-serif; margin: 0;">
            Enviado desde el portal Fitkis en nombre de ${practitionerName}.
          </p>
        </div>
      `,
		});
	}

	return NextResponse.json({ ok: true, bookingLink });
}
