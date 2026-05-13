'use client'

/**
 * PatientReportPDF — Genera y descarga un reporte PDF resumen del paciente.
 *
 * Por qué dynamic import:
 *  @react-pdf/renderer pesa ~200kb y tiene fricciones con SSR en Next.js
 *  App Router. Lo cargamos solo cuando el usuario hace click en el botón.
 *
 * Contenido del PDF: header con datos del paciente, métricas clave,
 * tendencia de peso (texto), plan vigente y últimas notas de consulta.
 */

import type { PatientDetail, PractitionerRecord, ConsultationNote, AppointmentNote } from '@/lib/clinic/queries'
import { fmtShortDate, fmtShortDateTime, MONTHS_LONG } from '@/lib/clinic/calendar-utils'
import { slugify } from '@/lib/utils'

type FeedItem =
  | { kind: 'manual'; date: string; body: string; tags: string[] }
  | { kind: 'appointment'; date: string; body: string }

export async function generatePatientReport(args: {
  patient: PatientDetail
  practitioner: PractitionerRecord
  notes: ConsultationNote[]
  appointmentNotes: AppointmentNote[]
}): Promise<void> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer')

  const styles = StyleSheet.create({
    page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
    eyebrow: { fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    h1: { fontSize: 24, marginBottom: 4, color: '#1a1a1a' },
    h2: { fontSize: 14, marginBottom: 6, color: '#1a1a1a' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 12, marginBottom: 16 },
    headerRight: { textAlign: 'right' },
    meta: { fontSize: 9, color: '#555', marginTop: 2 },
    section: { marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    statCard: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, padding: 10 },
    statLabel: { fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    statValue: { fontSize: 20, color: '#1a1a1a' },
    statUnit: { fontSize: 10, color: '#666' },
    planRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    planChip: { backgroundColor: '#f5f5f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 9 },
    note: { borderLeftWidth: 2, borderLeftColor: '#1a1a1a', paddingLeft: 10, marginBottom: 10 },
    noteDate: { fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
    noteBody: { fontSize: 10, color: '#1a1a1a', lineHeight: 1.4 },
    noteTags: { fontSize: 8, color: '#666', marginTop: 4 },
    footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#999', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  })

  const { patient, practitioner, notes, appointmentNotes } = args

  const feed: FeedItem[] = [
    ...notes.map((n): FeedItem => ({ kind: 'manual', date: n.note_date, body: n.body, tags: n.tags })),
    ...appointmentNotes.map((a): FeedItem => ({
      kind: 'appointment',
      date: a.starts_at,
      body: a.body,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))
  const today = new Date()
  const fechaReporte = `${today.getDate()} de ${MONTHS_LONG[today.getMonth()]} de ${today.getFullYear()}`

  const ws = patient.weight_history.map(r => r.weight_kg).filter((v): v is number => v != null)
  const pesoActual = ws.length ? ws[ws.length - 1] : null
  const pesoInicial = ws.length ? ws[0] : null
  const delta = pesoActual != null && pesoInicial != null ? pesoActual - pesoInicial : null

  const fatArr = patient.weight_history.map(r => r.body_fat_percentage).filter((v): v is number => v != null)
  const grasaActual = fatArr.length ? fatArr[fatArr.length - 1] : null

  const ad = patient.adherence
  const plan = patient.active_diet

  const Doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Reporte clínico · paciente</Text>
            <Text style={styles.h1}>{patient.name}</Text>
            <Text style={styles.meta}>{patient.email}</Text>
            {patient.height_m != null && (
              <Text style={styles.meta}>Estatura {patient.height_m.toFixed(2)} m · objetivo {patient.goal}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.eyebrow}>{fechaReporte}</Text>
            <Text style={styles.meta}>{practitioner.display_name}</Text>
            {practitioner.license_number && <Text style={styles.meta}>Cédula {practitioner.license_number}</Text>}
            {practitioner.clinic_name && <Text style={styles.meta}>{practitioner.clinic_name}</Text>}
          </View>
        </View>

        {/* Métricas clave */}
        <View style={styles.section}>
          <Text style={styles.h2}>Métricas clave</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Peso actual</Text>
              <Text style={styles.statValue}>
                {pesoActual != null ? `${pesoActual.toFixed(1)}` : '—'}
                <Text style={styles.statUnit}> kg</Text>
              </Text>
              {delta != null && Math.abs(delta) >= 0.1 && (
                <Text style={styles.meta}>{delta < 0 ? `↓ ${Math.abs(delta).toFixed(1)} kg` : `↑ ${delta.toFixed(1)} kg`} en {patient.weight_history.length} mediciones</Text>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>% Grasa</Text>
              <Text style={styles.statValue}>
                {grasaActual != null ? `${grasaActual.toFixed(1)}` : '—'}
                <Text style={styles.statUnit}> %</Text>
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Adherencia · {patient.adherence_window.days}d</Text>
              <Text style={styles.statValue}>
                {ad != null ? `${ad}` : '—'}
                <Text style={styles.statUnit}> %</Text>
              </Text>
              {patient.streak > 0 && <Text style={styles.meta}>racha {patient.streak}d</Text>}
            </View>
          </View>
        </View>

        {/* Plan vigente */}
        <View style={styles.section}>
          <Text style={styles.h2}>Plan vigente {plan ? `· v${plan.version}` : ''}</Text>
          {plan ? (
            <View style={styles.planRow}>
              <Text style={styles.planChip}>Verdura {plan.verdura}</Text>
              <Text style={styles.planChip}>Fruta {plan.fruta}</Text>
              <Text style={styles.planChip}>Cereal {plan.carb}</Text>
              <Text style={styles.planChip}>Leguminosa {plan.leguminosa}</Text>
              <Text style={styles.planChip}>Proteína {plan.proteina}</Text>
              <Text style={styles.planChip}>Grasa {plan.grasa}</Text>
            </View>
          ) : (
            <Text style={styles.meta}>Sin plan activo.</Text>
          )}
          {plan?.notes && <Text style={[styles.meta, { marginTop: 8 }]}>{plan.notes}</Text>}
        </View>

        {/* Notas */}
        <View style={styles.section}>
          <Text style={styles.h2}>Notas de consulta {feed.length > 0 ? `· últimas ${Math.min(feed.length, 10)}` : ''}</Text>
          {feed.length === 0 ? (
            <Text style={styles.meta}>Aún sin notas registradas.</Text>
          ) : (
            feed.slice(0, 10).map((item, idx) => (
              <View key={idx} style={styles.note}>
                <Text style={styles.noteDate}>
                  {item.kind === 'appointment'
                    ? `Cita · ${fmtShortDateTime(item.date)}`
                    : fmtShortDate(item.date)}
                </Text>
                <Text style={styles.noteBody}>{item.body}</Text>
                {item.kind === 'manual' && item.tags.length > 0 && (
                  <Text style={styles.noteTags}>{item.tags.map(formatTag).join(' · ')}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Fitkis · reporte generado {fechaReporte}</Text>
          <Text>{practitioner.display_name}</Text>
        </View>
      </Page>
    </Document>
  )

  const blob = await pdf(Doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-${slugify(patient.name)}-${today.toISOString().split('T')[0]}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatTag(t: string): string {
  switch (t) {
    case 'ajuste_plan':  return 'Ajuste de plan'
    case 'recordatorio': return 'Recordatorio'
    case 'reagenda':     return 'Reagenda'
    case 'objetivo':     return 'Objetivo'
    case 'observacion':  return 'Observación'
    default:             return t
  }
}

