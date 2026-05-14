'use client';

import type { CSSProperties } from 'react';

type Props = {
	title: string;
	startISO: string; // ISO string UTC
	durationMinutes: number;
	description?: string;
	location?: string;
};

function toCalDate(iso: string): string {
	// Formato YYYYMMDDTHHmmssZ para Google/Outlook
	return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildICS(
	title: string,
	start: string,
	end: string,
	description = '',
	location = '',
): string {
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Fitkis//Agenda//ES',
		'BEGIN:VEVENT',
		`DTSTART:${toCalDate(start)}`,
		`DTEND:${toCalDate(end)}`,
		`SUMMARY:${title}`,
		description ? `DESCRIPTION:${description}` : '',
		location ? `LOCATION:${location}` : '',
		`UID:${Date.now()}@fitkis.com`,
		'END:VEVENT',
		'END:VCALENDAR',
	]
		.filter(Boolean)
		.join('\r\n');
}

export function AddToCalendar({
	title,
	startISO,
	durationMinutes,
	description = '',
	location = '',
}: Props) {
	const startDt = new Date(startISO);
	const endDt = new Date(startDt.getTime() + durationMinutes * 60_000);
	const endISO = endDt.toISOString();

	const calTitle = encodeURIComponent(title);
	const calDesc = encodeURIComponent(description);
	const calLoc = encodeURIComponent(location);

	const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${toCalDate(startISO)}/${toCalDate(endISO)}&details=${calDesc}&location=${calLoc}`;
	const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${calTitle}&startdt=${startISO}&enddt=${endISO}&body=${calDesc}&location=${calLoc}`;

	function downloadICS() {
		const content = buildICS(title, startISO, endISO, description, location);
		const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'cita-fitkis.ics';
		a.click();
		URL.revokeObjectURL(url);
	}

	const btnStyle: CSSProperties = {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 6,
		padding: '8px 14px',
		borderRadius: 8,
		border: '1px solid var(--ink-7)',
		background: '#fff',
		fontSize: 12,
		fontFamily: 'var(--f-sans)',
		color: 'var(--ink-2)',
		cursor: 'pointer',
		textDecoration: 'none',
	};

	return (
		<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
			<span className="fk-eyebrow" style={{ width: '100%', marginBottom: 4 }}>
				Agregar a calendario
			</span>
			<a
				href={googleUrl}
				target="_blank"
				rel="noopener noreferrer"
				style={btnStyle}
			>
				Google Calendar
			</a>
			<a
				href={outlookUrl}
				target="_blank"
				rel="noopener noreferrer"
				style={btnStyle}
			>
				Outlook
			</a>
			<button onClick={downloadICS} style={btnStyle}>
				Apple / iCal
			</button>
		</div>
	);
}
