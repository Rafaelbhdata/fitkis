'use client'

import type {
  PatientDetail,
  PractitionerRecord,
  ConsultationNote,
  AppointmentNote,
} from '@/lib/clinic/queries'
import { fmtShortDate, fmtShortDateTime, MONTHS_LONG } from '@/lib/clinic/calendar-utils'
import { slugify, getTodayInTimezone } from '@/lib/utils'

// ─── Paleta "Paper & Pulse" para PDF (ligeramente oscurecida para impresión) ──
const C = {
  ink:        '#0a0a0a',
  ink2:       '#1a1a1a',
  ink3:       '#404040',
  ink4:       '#737373',
  ink5:       '#a3a3a3',
  ink6:       '#d4d4d4',
  paper:      '#fafaf7',
  paper2:     '#f5f4ef',
  paper3:     '#eceae2',
  white:      '#ffffff',
  signal:     '#d94615',   // naranja signal oscurecido un toque para impresión
  signalSoft: '#fff0eb',
  leaf:       '#3a6b2a',
  leafSoft:   '#e4ecd6',
  berry:      '#a8304b',
  berrySoft:  '#f6dde2',
  honey:      '#b8890f',
  honeySoft:  '#f5ead0',
}

type FeedItem =
  | { kind: 'manual'; date: string; body: string; tags: string[] }
  | { kind: 'appointment'; date: string; body: string }

function imcData(imc: number): { label: string; color: string; bg: string } {
  if (imc < 18.5) return { label: 'Bajo peso',  color: C.honey,  bg: C.honeySoft }
  if (imc < 25)   return { label: 'Normal',      color: C.leaf,   bg: C.leafSoft  }
  if (imc < 30)   return { label: 'Sobrepeso',   color: C.honey,  bg: C.honeySoft }
  return               { label: 'Obesidad',    color: C.berry,  bg: C.berrySoft }
}

function goalTypeLabel(t: string): string {
  switch (t) {
    case 'bajar_grasa':   return 'Reducción de grasa'
    case 'ganar_musculo': return 'Ganancia muscular'
    case 'mantenimiento': return 'Mantenimiento'
    case 'rendimiento':   return 'Rendimiento'
    default:              return t
  }
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

export async function generatePatientReport(args: {
  patient: PatientDetail
  practitioner: PractitionerRecord
  notes: ConsultationNote[]
  appointmentNotes: AppointmentNote[]
}): Promise<void> {
  const { Document, Page, Text, View, StyleSheet, pdf, Font } =
    await import('@react-pdf/renderer')

  // ─── Registrar fuentes "Paper & Pulse" reales ─────────────────────────────
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  Font.register({
    family: 'Fraunces',
    fonts: [
      { src: `${origin}/fonts/fraunces-latin-300-normal.woff`, fontWeight: 300 },
      { src: `${origin}/fonts/fraunces-latin-400-normal.woff`, fontWeight: 400 },
      { src: `${origin}/fonts/fraunces-latin-700-normal.woff`, fontWeight: 700 },
    ],
  })
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${origin}/fonts/inter-latin-400-normal.woff`, fontWeight: 400 },
      { src: `${origin}/fonts/inter-latin-600-normal.woff`, fontWeight: 600 },
    ],
  })
  Font.register({
    family: 'Mono',
    fonts: [
      { src: `${origin}/fonts/jetbrains-mono-latin-400-normal.woff`, fontWeight: 400 },
    ],
  })

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    // Página
    page: { backgroundColor: C.paper, fontFamily: 'Inter', fontSize: 10, color: C.ink },

    // Header band (tira oscura superior, solo página 1)
    headerBand: {
      backgroundColor: C.ink,
      paddingTop: 26,
      paddingBottom: 22,
      paddingHorizontal: 48,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    brandName: {
      fontFamily: 'Fraunces',
      fontWeight: 700,
      fontSize: 18,
      color: C.paper,
      letterSpacing: 0.3,
    },
    headerDocType: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      letterSpacing: 0.12,
      textTransform: 'uppercase',
      color: C.ink5,
      marginTop: 5,
    },
    headerDate: {
      fontFamily: 'Mono',
      fontSize: 8,
      letterSpacing: 0.08,
      color: C.ink5,
      textAlign: 'right',
    },

    // Área de contenido
    content: { paddingHorizontal: 48, paddingTop: 26 },

    // Hero del paciente
    patientRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: C.paper3,
    },
    patientName: {
      fontFamily: 'Fraunces',
      fontWeight: 700,
      fontSize: 28,
      color: C.ink,
      marginBottom: 6,
    },
    patientMeta: { fontFamily: 'Inter', fontSize: 9, color: C.ink4, marginTop: 2 },
    pracBlock: { textAlign: 'right' },
    pracName: { fontFamily: 'Inter', fontWeight: 600, fontSize: 10, color: C.ink },
    pracMeta: { fontFamily: 'Mono', fontSize: 7.5, color: C.ink4, marginTop: 2 },

    // Divisores de sección
    sectionRule: {
      height: 1,
      backgroundColor: C.paper3,
      marginTop: 22,
      marginBottom: 12,
    },
    sectionEyebrow: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      letterSpacing: 0.14,
      textTransform: 'uppercase',
      color: C.signal,
      marginBottom: 12,
    },

    // Tarjetas de métricas
    statsRow: { flexDirection: 'row', marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: C.white,
      borderRadius: 6,
      padding: 12,
      borderWidth: 1,
      borderColor: C.paper3,
      marginRight: 8,
    },
    statCardLast: {
      flex: 1,
      backgroundColor: C.white,
      borderRadius: 6,
      padding: 12,
      borderWidth: 1,
      borderColor: C.paper3,
    },
    statLabel: {
      fontFamily: 'Mono',
      fontSize: 7,
      letterSpacing: 0.12,
      textTransform: 'uppercase',
      color: C.ink4,
      marginBottom: 6,
    },
    statValue: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 22, color: C.ink },
    statUnit: { fontFamily: 'Inter', fontSize: 10, color: C.ink4 },
    statDelta: { fontFamily: 'Mono', fontSize: 7.5, marginTop: 5 },
    statSub: { fontFamily: 'Inter', fontSize: 7.5, color: C.ink4, marginTop: 3 },

    // Badge IMC
    imcRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    imcBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
    imcBadgeText: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
    },
    imcHint: { fontFamily: 'Inter', fontSize: 8, color: C.ink4 },

    // Objetivo y progreso
    goalTypeBadge: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      textTransform: 'uppercase',
      letterSpacing: 0.1,
      color: C.signal,
      backgroundColor: C.signalSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    goalMetricLabel: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      textTransform: 'uppercase',
      letterSpacing: 0.08,
      color: C.ink4,
      width: 62,
    },
    goalBarTrack: {
      flex: 1,
      height: 6,
      backgroundColor: C.paper3,
      borderRadius: 3,
      marginRight: 10,
    },
    goalBarFill: {
      height: 6,
      backgroundColor: C.signal,
      borderRadius: 3,
    },
    goalValues: { fontFamily: 'Inter', fontSize: 8, color: C.ink3, width: 148 },

    // Tabla historial de composición
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: C.paper3,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 4,
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: C.paper3,
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: C.paper2,
      borderBottomWidth: 1,
      borderBottomColor: C.paper3,
    },
    tableHead: {
      fontFamily: 'Mono',
      fontSize: 7,
      textTransform: 'uppercase',
      letterSpacing: 0.1,
      color: C.ink4,
    },
    tableCell: { fontFamily: 'Inter', fontSize: 9, color: C.ink3 },
    tableCellBold: { fontFamily: 'Inter', fontWeight: 600, fontSize: 9, color: C.ink },
    colDate:   { width: '22%' },
    colWeight: { width: '16%' },
    colDelta:  { width: '16%' },
    colFat:    { width: '16%' },
    colMuscle: { width: '16%' },
    colImc:    { width: '14%' },

    // Plan de alimentación
    planGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    planChip: {
      backgroundColor: C.white,
      borderWidth: 1,
      borderColor: C.paper3,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      marginBottom: 8,
      minWidth: 72,
    },
    planChipLabel: {
      fontFamily: 'Mono',
      fontSize: 7,
      textTransform: 'uppercase',
      letterSpacing: 0.1,
      color: C.ink4,
    },
    planChipValue: {
      fontFamily: 'Fraunces',
      fontWeight: 700,
      fontSize: 20,
      color: C.ink,
      marginTop: 3,
    },
    planNotes: {
      fontFamily: 'Inter',
      fontSize: 9,
      color: C.ink3,
      marginTop: 10,
      lineHeight: 1.5,
    },

    // Notas de consulta
    noteItem: {
      borderLeftWidth: 2,
      borderLeftColor: C.signal,
      paddingLeft: 12,
      marginBottom: 14,
    },
    noteItemAppt: {
      borderLeftWidth: 2,
      borderLeftColor: C.ink6,
      paddingLeft: 12,
      marginBottom: 14,
    },
    noteDate: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      textTransform: 'uppercase',
      letterSpacing: 0.1,
      color: C.ink4,
      marginBottom: 4,
    },
    noteBody: { fontFamily: 'Inter', fontSize: 9.5, color: C.ink3, lineHeight: 1.5 },
    noteTags: {
      fontFamily: 'Mono',
      fontSize: 7.5,
      color: C.signal,
      marginTop: 5,
      letterSpacing: 0.06,
    },

    // Footer
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 48,
      paddingTop: 10,
      paddingBottom: 18,
      backgroundColor: C.paper,
    },
    footerLine: { height: 1, backgroundColor: C.signal, marginBottom: 8 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontFamily: 'Mono', fontSize: 7.5, color: C.ink4, letterSpacing: 0.06 },
  })

  // ─── Datos computados ─────────────────────────────────────────────────────
  const { patient, practitioner, notes, appointmentNotes } = args

  const feed: FeedItem[] = [
    ...notes.map((n): FeedItem => ({ kind: 'manual', date: n.note_date, body: n.body, tags: n.tags })),
    ...appointmentNotes.map((a): FeedItem => ({ kind: 'appointment', date: a.starts_at, body: a.body })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const todayISO = getTodayInTimezone()
  const [y, m, d] = todayISO.split('-').map(Number)
  const fechaReporte = `${d} de ${MONTHS_LONG[m - 1]} de ${y}`

  const ws = patient.weight_history
  const wArr = ws.map((r) => r.weight_kg).filter((v): v is number => v != null)
  const fArr = ws.map((r) => r.body_fat_percentage).filter((v): v is number => v != null)
  const mArr = ws.map((r) => r.muscle_mass_kg).filter((v): v is number => v != null)

  const wCur = wArr.length ? wArr[wArr.length - 1] : null
  const wIni = wArr.length ? wArr[0] : null
  const wDelta = wCur != null && wIni != null ? wCur - wIni : null

  const fCur = fArr.length ? fArr[fArr.length - 1] : null
  const fIni = fArr.length ? fArr[0] : null
  const fDelta = fCur != null && fIni != null ? fCur - fIni : null

  const mCur = mArr.length ? mArr[mArr.length - 1] : null
  const mIni = mArr.length ? mArr[0] : null
  const mDelta = mCur != null && mIni != null ? mCur - mIni : null

  const imc = wCur != null && patient.height_m ? wCur / (patient.height_m * patient.height_m) : null
  const plan = patient.active_diet
  const histTable = [...ws].reverse().slice(0, 6)

  // Porcentaje de progreso hacia la meta (0–1 clampeado)
  function goalPct(cur: number, base: number, goal: number): number {
    const range = goal - base
    if (range === 0) return 0
    return Math.max(0, Math.min(1, (cur - base) / range))
  }

  // ─── Componentes auxiliares ────────────────────────────────────────────────
  const Section = ({ title }: { title: string }) => (
    <View>
      <View style={s.sectionRule} />
      <Text style={s.sectionEyebrow}>{title}</Text>
    </View>
  )

  const StatCard = ({
    label, value, unit, delta, deltaInvert, sub, last,
  }: {
    label: string; value: string; unit: string
    delta?: number | null; deltaInvert?: boolean; sub?: string; last?: boolean
  }) => (
    <View style={last ? s.statCardLast : s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>
        {value}<Text style={s.statUnit}> {unit}</Text>
      </Text>
      {delta != null && Math.abs(delta) >= 0.05 && (
        <Text style={[s.statDelta, {
          color: (deltaInvert ? delta < 0 : delta > 0) ? C.leaf : C.berry,
        }]}>
          {delta < 0 ? `↓ ${Math.abs(delta).toFixed(1)}` : `↑ ${delta.toFixed(1)}`}{unit === 'kg' ? ' kg' : unit === '%' ? '%' : ''} desde inicio
        </Text>
      )}
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  )

  // ─── Documento ────────────────────────────────────────────────────────────
  const Doc = (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* ── Header band ───────────────────────────────────────────────── */}
        <View style={s.headerBand}>
          <View>
            <Text style={s.brandName}>Fitkis</Text>
            <Text style={s.headerDocType}>Reporte clínico · paciente</Text>
          </View>
          <Text style={s.headerDate}>{fechaReporte}</Text>
        </View>

        {/* ── Contenido ─────────────────────────────────────────────────── */}
        <View style={s.content}>

          {/* ── Hero paciente ────────────────────────────────────────── */}
          <View style={s.patientRow}>
            <View>
              <Text style={s.patientName}>{patient.name}</Text>
              <Text style={s.patientMeta}>{patient.email}</Text>
              {(patient.height_m != null || patient.age != null || patient.gender) && (
                <Text style={s.patientMeta}>
                  {[
                    patient.height_m != null ? `Estatura ${(patient.height_m * 100).toFixed(0)} cm` : null,
                    patient.age != null ? `${patient.age} años` : null,
                    patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null,
                  ].filter(Boolean).join('  ·  ')}
                </Text>
              )}
              <Text style={s.patientMeta}>{`Objetivo declarado · ${patient.goal}`}</Text>
            </View>
            <View style={s.pracBlock}>
              <Text style={s.pracName}>{practitioner.display_name}</Text>
              {practitioner.specialty && (
                <Text style={s.pracMeta}>{practitioner.specialty}</Text>
              )}
              {practitioner.license_number && (
                <Text style={s.pracMeta}>{`Cédula ${practitioner.license_number}`}</Text>
              )}
              {practitioner.clinic_name && (
                <Text style={s.pracMeta}>{practitioner.clinic_name}</Text>
              )}
              {practitioner.address && (
                <Text style={s.pracMeta}>{practitioner.address}</Text>
              )}
            </View>
          </View>

          {/* ── Métricas clave ────────────────────────────────────────── */}
          <Section title="Métricas clave" />
          <View style={s.statsRow} wrap={false}>
            <StatCard
              label="Peso actual"
              value={wCur != null ? wCur.toFixed(1) : '—'}
              unit="kg"
              delta={wDelta}
              deltaInvert
              sub={wArr.length > 0 ? `${wArr.length} mediciones` : undefined}
            />
            <StatCard
              label="Grasa corporal"
              value={fCur != null ? fCur.toFixed(1) : '—'}
              unit="%"
              delta={fDelta}
              deltaInvert
              sub={fArr.length > 0 ? `${fArr.length} mediciones` : undefined}
            />
            <StatCard
              label="Masa muscular"
              value={mCur != null ? mCur.toFixed(1) : '—'}
              unit="kg"
              delta={mDelta}
              deltaInvert={false}
              sub={mArr.length > 0 ? `${mArr.length} mediciones` : undefined}
            />
            <StatCard
              label={`Adherencia · ${patient.adherence_window.days}d`}
              value={patient.adherence != null ? `${patient.adherence}` : '—'}
              unit="%"
              sub={patient.streak > 0 ? `Racha ${patient.streak} días` : undefined}
              last
            />
          </View>

          {/* IMC badge */}
          {imc != null && (() => {
            const { label, color, bg } = imcData(imc)
            return (
              <View style={s.imcRow}>
                <View style={[s.imcBadge, { backgroundColor: bg }]}>
                  <Text style={[s.imcBadgeText, { color }]}>
                    {`IMC ${imc.toFixed(1)}  ·  ${label}`}
                  </Text>
                </View>
                <Text style={s.imcHint}>índice de masa corporal</Text>
              </View>
            )
          })()}

          {/* ── Objetivo y progreso ───────────────────────────────────── */}
          {patient.goal_type && (
            <View>
              <Section title="Objetivo y progreso" />
              <Text style={s.goalTypeBadge}>{goalTypeLabel(patient.goal_type)}</Text>

              {patient.goal_weight_kg != null &&
                patient.goal_baseline_weight_kg != null &&
                wCur != null && (() => {
                  const pct = goalPct(wCur, patient.goal_baseline_weight_kg!, patient.goal_weight_kg!)
                  return (
                    <View style={s.goalRow}>
                      <Text style={s.goalMetricLabel}>Peso</Text>
                      <View style={s.goalBarTrack}>
                        <View style={[s.goalBarFill, { width: `${pct * 100}%` }]} />
                      </View>
                      <Text style={s.goalValues}>
                        {`${patient.goal_baseline_weight_kg!.toFixed(1)} → ${wCur.toFixed(1)} → ${patient.goal_weight_kg!.toFixed(1)} kg  (${Math.round(pct * 100)}%)`}
                      </Text>
                    </View>
                  )
                })()}

              {patient.goal_body_fat_pct != null &&
                patient.goal_baseline_body_fat_pct != null &&
                fCur != null && (() => {
                  const pct = goalPct(fCur, patient.goal_baseline_body_fat_pct!, patient.goal_body_fat_pct!)
                  return (
                    <View style={s.goalRow}>
                      <Text style={s.goalMetricLabel}>% Grasa</Text>
                      <View style={s.goalBarTrack}>
                        <View style={[s.goalBarFill, { width: `${pct * 100}%` }]} />
                      </View>
                      <Text style={s.goalValues}>
                        {`${patient.goal_baseline_body_fat_pct!.toFixed(1)} → ${fCur.toFixed(1)} → ${patient.goal_body_fat_pct!.toFixed(1)} %  (${Math.round(pct * 100)}%)`}
                      </Text>
                    </View>
                  )
                })()}

              {patient.goal_muscle_kg != null &&
                patient.goal_baseline_muscle_kg != null &&
                mCur != null && (() => {
                  const pct = goalPct(mCur, patient.goal_baseline_muscle_kg!, patient.goal_muscle_kg!)
                  return (
                    <View style={s.goalRow}>
                      <Text style={s.goalMetricLabel}>Músculo</Text>
                      <View style={s.goalBarTrack}>
                        <View style={[s.goalBarFill, { width: `${pct * 100}%` }]} />
                      </View>
                      <Text style={s.goalValues}>
                        {`${patient.goal_baseline_muscle_kg!.toFixed(1)} → ${mCur.toFixed(1)} → ${patient.goal_muscle_kg!.toFixed(1)} kg  (${Math.round(pct * 100)}%)`}
                      </Text>
                    </View>
                  )
                })()}
            </View>
          )}

          {/* ── Historial de composición ──────────────────────────────── */}
          {histTable.length > 0 && (
            <View>
              <Section title={`Historial de composición · últimas ${histTable.length} mediciones`} />
              <View style={s.tableHeader}>
                <Text style={[s.tableHead, s.colDate]}>Fecha</Text>
                <Text style={[s.tableHead, s.colWeight]}>Peso</Text>
                <Text style={[s.tableHead, s.colDelta]}>Δ vs anterior</Text>
                <Text style={[s.tableHead, s.colFat]}>% Grasa</Text>
                <Text style={[s.tableHead, s.colMuscle]}>Músculo</Text>
                {patient.height_m != null && (
                  <Text style={[s.tableHead, s.colImc]}>IMC</Text>
                )}
              </View>
              {histTable.map((row, idx) => {
                const rowStyle = idx % 2 === 1 ? s.tableRowAlt : s.tableRow
                const prev = histTable[idx + 1]
                const delta = row.weight_kg != null && prev?.weight_kg != null
                  ? row.weight_kg - prev.weight_kg
                  : null
                const rowImc = row.weight_kg != null && patient.height_m
                  ? row.weight_kg / (patient.height_m * patient.height_m)
                  : null
                return (
                  <View key={`wh-${idx}`} style={rowStyle}>
                    <Text style={[s.tableCell, s.colDate]}>{fmtShortDate(row.date)}</Text>
                    <Text style={[s.tableCellBold, s.colWeight]}>
                      {row.weight_kg != null ? `${row.weight_kg.toFixed(1)} kg` : '—'}
                    </Text>
                    <Text style={[s.tableCell, s.colDelta, {
                      color: delta == null ? C.ink4 : delta < 0 ? C.leaf : delta > 0 ? C.berry : C.ink4,
                    }]}>
                      {delta == null || delta === 0 ? '—'
                        : delta < 0 ? `↓ ${Math.abs(delta).toFixed(1)}`
                        : `↑ ${delta.toFixed(1)}`}
                    </Text>
                    <Text style={[s.tableCell, s.colFat]}>
                      {row.body_fat_percentage != null ? `${row.body_fat_percentage.toFixed(1)} %` : '—'}
                    </Text>
                    <Text style={[s.tableCell, s.colMuscle]}>
                      {row.muscle_mass_kg != null ? `${row.muscle_mass_kg.toFixed(1)} kg` : '—'}
                    </Text>
                    {patient.height_m != null && (
                      <Text style={[s.tableCell, s.colImc]}>
                        {rowImc != null ? rowImc.toFixed(1) : '—'}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}

          {/* ── Plan de alimentación vigente ──────────────────────────── */}
          <Section title={`Plan de alimentación vigente${plan ? `  ·  v${plan.version}` : ''}`} />
          {plan ? (
            <View>
              <View style={s.planGrid}>
                {(
                  [
                    { label: 'Verdura',    value: plan.verdura    },
                    { label: 'Fruta',      value: plan.fruta      },
                    { label: 'Cereal',     value: plan.carb       },
                    { label: 'Leguminosa', value: plan.leguminosa },
                    { label: 'Proteína',   value: plan.proteina   },
                    { label: 'Grasa',      value: plan.grasa      },
                  ] as { label: string; value: number }[]
                ).map(({ label, value }) => (
                  <View key={label} style={s.planChip}>
                    <Text style={s.planChipLabel}>{label}</Text>
                    <Text style={s.planChipValue}>{value}</Text>
                  </View>
                ))}
              </View>
              {plan.notes && <Text style={s.planNotes}>{plan.notes}</Text>}
            </View>
          ) : (
            <Text style={{ fontFamily: 'Inter', fontSize: 9, color: C.ink4 }}>
              Sin plan activo registrado.
            </Text>
          )}

          {/* ── Notas de consulta ─────────────────────────────────────── */}
          {feed.length > 0 && (
            <View>
              <Section title={`Notas de consulta  ·  últimas ${Math.min(feed.length, 10)}`} />
              {feed.slice(0, 10).map((item, idx) => (
                <View key={`note-${idx}`} style={item.kind === 'appointment' ? s.noteItemAppt : s.noteItem}>
                  <Text style={s.noteDate}>
                    {item.kind === 'appointment'
                      ? `Cita  ·  ${fmtShortDateTime(item.date)}`
                      : fmtShortDate(item.date)}
                  </Text>
                  <Text style={s.noteBody}>{item.body}</Text>
                  {item.kind === 'manual' && item.tags.length > 0 && (
                    <Text style={s.noteTags}>{item.tags.map(formatTag).join('  ·  ')}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Espaciador para el footer */}
          <View style={{ height: 52 }} />
        </View>

        {/* ── Footer fijo ───────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <View style={s.footerLine} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>{`Fitkis  ·  reporte clínico  ·  ${fechaReporte}`}</Text>
            <Text
              style={s.footerText}
              render={({ pageNumber, totalPages }) =>
                `${practitioner.display_name}  ·  pág. ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>

      </Page>
    </Document>
  )

  const blob = await pdf(Doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-${slugify(patient.name)}-${todayISO}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
