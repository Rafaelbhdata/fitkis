'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from '@/components/clinic/Ic'
import { BigSpark } from '@/components/clinic/BigSpark'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadPracticeKPIs,
  type PracticeKPIs,
  type PractitionerRecord,
} from '@/lib/clinic/queries'

const ALERT_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  inactividad: { text: 'Inactividad', color: 'var(--berry)', bg: 'var(--berry-soft)' },
  estancamiento: { text: 'Peso estancado', color: 'var(--honey)', bg: 'var(--honey-soft)' },
}

function KPICard({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '22px 24px' }}>
      <div className="fk-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <span className="fk-serif" style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 14, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{sub}</div>}
    </div>
  )
}

export default function ReportesPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [kpis, setKpis] = useState<PracticeKPIs | null>(null)
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const pract = await loadPractitionerByUser(supabase, user.id)
        if (cancelled) return
        if (!pract) { setError('No tienes registro de nutriólogo en esta cuenta.'); setLoading(false); return }
        setPractitioner(pract)
        const data = await loadPracticeKPIs(supabase, pract.id, {
          inactivityDays: pract.inactivity_threshold_days,
          minAdherencePct: pract.min_adherence_pct,
        })
        if (cancelled) return
        setKpis(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, userLoading, supabase])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <PulseLine />
      </div>
    )
  }

  if (error || !kpis) {
    return (
      <div style={{ padding: '60px 40px' }}>
        <div className="fk-eyebrow" style={{ color: 'var(--berry)' }}>Error</div>
        <p className="fk-serif" style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 300, marginTop: 8 }}>
          {error ?? 'No se pudieron cargar los reportes.'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '24px 40px 0' }}>
        <div className="fk-eyebrow">Práctica · KPIs</div>
        <h1 className="fk-serif" style={{ fontSize: 42, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, margin: '8px 0 6px' }}>
          <span style={{ fontStyle: 'italic' }}>Reportes</span> de práctica
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)', maxWidth: 560 }}>
          Visión global de tu práctica. Umbrales configurables en{' '}
          <Link href="/clinic/ajustes" style={{ color: 'var(--signal)', textDecoration: 'none' }}>Ajustes</Link>.
        </p>
      </div>

      <div style={{ padding: '24px 40px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <KPICard
            label="Pacientes activos"
            value={String(kpis.active_patients)}
            sub={kpis.pending_invites > 0 ? `${kpis.pending_invites} invitación${kpis.pending_invites === 1 ? '' : 'es'} pendiente${kpis.pending_invites === 1 ? '' : 's'}` : 'todos vinculados'}
          />
          <KPICard
            label="Adherencia media"
            value={kpis.avg_adherence != null ? String(kpis.avg_adherence) : '—'}
            unit="%"
            sub={practitioner ? `umbral mínimo ${practitioner.min_adherence_pct}%` : undefined}
          />
          <KPICard
            label="Citas · próximos 7d"
            value={String(kpis.appointments_next_7d)}
            sub={kpis.appointments_next_7d === 0 ? 'agenda libre' : 'ver agenda'}
          />
          <KPICard
            label="Requieren atención"
            value={String(kpis.patients_needing_attention.length)}
            sub={kpis.patients_needing_attention.length === 0 ? 'sin alertas' : 'ver lista abajo'}
          />
        </div>

        {/* Tendencia de peso del grupo */}
        <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div>
              <div className="fk-eyebrow">Tendencia · peso del grupo</div>
              <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}>
                Promedio diario de tus pacientes · últimos 60 días
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              {kpis.weight_trend.length} día{kpis.weight_trend.length === 1 ? '' : 's'} con registro
            </span>
          </div>
          <BigSpark
            values={kpis.weight_trend.map(p => p.avg_weight)}
            color="var(--leaf)"
            label="practice-weight-trend"
            h={200}
            emptyText="sin datos suficientes para tendencia"
          />
        </div>

        {/* Pacientes que requieren atención */}
        <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div>
              <div className="fk-eyebrow">Lista priorizada</div>
              <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}>
                Pacientes que requieren atención
              </div>
            </div>
          </div>
          {kpis.patients_needing_attention.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)', fontStyle: 'italic', margin: 0 }}>
              Ningún paciente con alertas activas. Buen trabajo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kpis.patients_needing_attention.map((p) => {
                const alertMeta = p.alert ? ALERT_LABEL[p.alert] : null
                return (
                  <Link
                    key={p.patient_id}
                    href={`/clinic/pacientes/${p.patient_id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--ink-7)',
                      background: '#fff',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontFamily: 'var(--f-sans)', fontWeight: 500, color: 'var(--ink)' }}>
                        {p.name}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                        {p.days_since_activity != null ? `hace ${p.days_since_activity}d sin registros` : 'sin registros'}
                        {p.adherence != null && ` · ${p.adherence}% adherencia`}
                      </div>
                    </div>
                    {alertMeta && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: alertMeta.bg,
                        color: alertMeta.color,
                        fontSize: 10,
                        fontFamily: 'var(--f-sans)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {alertMeta.text}
                      </span>
                    )}
                    <Ic.chevR />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
