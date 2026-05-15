'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import { LoadingState as SharedLoadingState } from '@/components/ui/LoadingState'
import { Ic } from '@/components/clinic/Ic'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { MiniSpark, Delta } from '@/components/clinic/MiniSpark'
import { PatientFilterBar, VALID_FILTER_KEYS, type FilterKey, type SortKey } from '@/components/clinic/PatientFilterBar'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadPatientsForPractitioner,
  patientRealId,
  type PractitionerRecord,
} from '@/lib/clinic/queries'
import type { MockPatient } from '@/lib/clinic/mock-data'
import { InviteModal } from '@/components/clinic/InviteModal'
import { GoalBadge } from '@/components/clinic/GoalEditor'
import { getTodayInTimezone } from '@/lib/utils'

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--leaf-soft)', fg: 'var(--leaf)' },
  { bg: 'var(--signal-soft)', fg: 'var(--signal)' },
  { bg: 'var(--sky-soft)', fg: 'var(--sky)' },
  { bg: 'var(--berry-soft)', fg: 'var(--berry)' },
  { bg: 'var(--honey-soft)', fg: '#8a6411' },
]

function avatarColors(seed: number, status: MockPatient['status']) {
  if (status === 'pending')  return { bg: 'var(--paper-3)',    fg: 'var(--ink-4)'  }
  if (status === 'declined') return { bg: 'var(--berry-soft)', fg: 'var(--berry)'  }
  return AVATAR_PALETTE[seed % AVATAR_PALETTE.length]
}

function adherenceColor(value: number): string {
  if (value > 80) return 'var(--leaf)'
  if (value > 60) return 'var(--honey)'
  return 'var(--signal)'
}

export default function ClinicPatientsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PatientsContent />
    </Suspense>
  )
}

function PatientsContent() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const searchParams = useSearchParams()
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [patients, setPatients] = useState<MockPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter]      = useState<FilterKey>(() => {
    const f = searchParams.get('filter') as FilterKey | null
    return f && (VALID_FILTER_KEYS as string[]).includes(f) ? f : 'todos'
  })
  const [sortKey, setSortKey] = useState<SortKey>('last_seen')
  const [searchQuery, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const p = await loadPractitionerByUser(supabase, user.id)
        if (cancelled) return
        if (!p) {
          setError('No tienes registro de nutriólogo en esta cuenta.')
          setLoading(false)
          return
        }
        setPractitioner(p)
        const list = await loadPatientsForPractitioner(supabase, p.id, {
          inactivityDays: p.inactivity_threshold_days,
          minAdherencePct: p.min_adherence_pct,
        })
        if (cancelled) return
        setPatients(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, userLoading, supabase])


  async function refreshPatients() {
    if (!practitioner) return
    const list = await loadPatientsForPractitioner(supabase, practitioner.id, {
      inactivityDays: practitioner.inactivity_threshold_days,
      minAdherencePct: practitioner.min_adherence_pct,
    })
    setPatients(list)
  }

  // Criterio "requiere atención" (alineado con loadPracticeKPIs):
  // paciente activo con alerta (inactividad/estancamiento) O adherencia bajo umbral.
  // Pacientes pending/inactive viven en sus propias pestañas.
  const minAdherence = practitioner?.min_adherence_pct ?? 60
  const needsAttention = (p: MockPatient) =>
    p.status === 'active' && (
      !!p.alert ||
      (p.adherence != null && p.adherence < minAdherence)
    )

  const filtered = useMemo(() => {
    // 1. Tab filter
    let list = patients.filter((p) => p.status !== 'inactive' && p.status !== 'declined')
    if (filter === 'atencion') list = list.filter(needsAttention)
    else if (filter === 'pending') list = patients.filter((p) => p.status === 'pending')
    else if (filter === 'archivo') list = patients.filter((p) => p.status === 'inactive' || p.status === 'declined')

    // 2. Search
    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )

    // 3. Sort
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'es')
      if (sortKey === 'adherence_desc') {
        const aa = a.adherence ?? -1
        const ab = b.adherence ?? -1
        return ab - aa
      }
      if (sortKey === 'adherence_asc') {
        const aa = a.adherence ?? Infinity
        const ab = b.adherence ?? Infinity
        return aa - ab
      }
      // last_seen: menor días = más reciente = primero
      const da = a.days_since_activity ?? Infinity
      const db = b.days_since_activity ?? Infinity
      return da - db
    })
  }, [filter, patients, searchQuery, sortKey, minAdherence])

  // Stats
  const attentionCount = patients.filter(needsAttention).length
  const pendingCount = patients.filter((p) => p.status === 'pending').length

  if (loading || userLoading) {
    return (
      <LoadingState />
    )
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>
      <ClinicTopbar
        sub={`Práctica · ${formatToday()}`}
        title={
          <>
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Mis </span>pacientes
          </>
        }
        right={
          <Btn variant="signal" icon={<Ic.plus />} onClick={() => setInviteOpen(true)}>
            Vincular paciente
          </Btn>
        }
      />

      {/* Empty state */}
      {patients.length === 0 ? (
        <EmptyState onInvite={() => setInviteOpen(true)} />
      ) : (
        <>
          <PatientFilterBar
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearch}
            sortKey={sortKey}
            onSortChange={setSortKey}
            counts={{
              todos:    patients.filter((p) => p.status !== 'inactive' && p.status !== 'declined').length,
              atencion: attentionCount,
              pending:  pendingCount,
              archivo:  patients.filter((p) => p.status === 'inactive' || p.status === 'declined').length,
            }}
          />

          {/* Table */}
          <div style={{ padding: '14px 40px 40px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '34px 2.2fr 1fr 1fr 1fr 0.8fr 28px',
                gap: 24,
                padding: '10px 14px',
                alignItems: 'center',
              }}
            >
              <div></div>
              <div className="fk-eyebrow">Paciente</div>
              <div className="fk-eyebrow" style={{ textAlign: 'center' }}>Objetivo</div>
              <div className="fk-eyebrow" style={{ textAlign: 'center' }}>Peso</div>
              <div className="fk-eyebrow" style={{ textAlign: 'center' }}>IMC</div>
              <div className="fk-eyebrow" style={{ textAlign: 'center' }}>
                Adherencia
              </div>
              <div></div>
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'var(--ink-4)',
                  fontSize: 13,
                  fontFamily: 'var(--f-sans)',
                }}
              >
                Sin pacientes en este filtro.
              </div>
            ) : (
              filtered.map((p, idx) => {
                const av = avatarColors(idx + 1, p.status)
                const realId = patientRealId(p) ?? String(p.id)
                const isClickable = p.status === 'active' || p.status === 'declined'

                const row = (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '34px 2.2fr 1fr 1fr 1fr 0.8fr 28px',
                      gap: 24,
                      padding: '18px 14px',
                      borderBottom: '1px solid var(--ink-7)',
                      alignItems: 'center',
                      cursor: isClickable ? 'pointer' : 'default',
                      background: p.status === 'pending' ? 'var(--paper)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        background: av.bg,
                        color: av.fg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--f-serif)',
                        fontStyle: 'italic',
                        fontSize: 15,
                      }}
                    >
                      {p.initial}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          className="fk-serif"
                          style={{ fontSize: 17, fontWeight: 400, color: 'var(--ink)' }}
                        >
                          {p.name}
                        </span>
                        {p.alert === 'estancamiento' && p.status !== 'pending' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'var(--berry-soft)',
                              color: 'var(--berry)',
                              fontFamily: 'var(--f-mono)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontWeight: 500,
                            }}
                          >
                            ● estancado
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'var(--paper-3)',
                              color: 'var(--ink-4)',
                              fontFamily: 'var(--f-mono)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontWeight: 500,
                            }}
                          >
                            pendiente
                          </span>
                        )}
                        {p.status === 'declined' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'var(--berry-soft)',
                              color: 'var(--berry)',
                              fontFamily: 'var(--f-mono)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontWeight: 500,
                            }}
                          >
                            rechazado
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-4)',
                          marginTop: 3,
                          display: 'flex',
                          gap: 10,
                          flexWrap: 'wrap',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        {p.age != null && <span>{p.age} años</span>}
                        {p.gender && (
                          <>
                            {p.age != null && <span>·</span>}
                            <span style={{ textTransform: 'capitalize' }}>{p.gender}</span>
                          </>
                        )}
                        {p.height_m != null && (
                          <>
                            {(p.age != null || p.gender) && <span>·</span>}
                            <span>{(p.height_m * 100).toFixed(0)} cm</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <GoalBadge
                        goalType={p.goal_type}
                        onEdit={() => {
                          const id = patientRealId(p)
                          if (id) window.location.href = `/clinic/pacientes/${id}`
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <MiniSpark
                        values={p.weight}
                        color="var(--ink-3)"
                        trend={
                          p.goal_type === 'ganar_musculo' ? 'up'
                          : p.goal_type === 'bajar_grasa' ? 'down'
                          : 'auto'
                        }
                      />
                      <Delta values={p.weight} invert={p.goal_type === 'ganar_musculo'} />
                      {p.weight.length > 0 && (
                        <div className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                          actual {p.weight[p.weight.length - 1].toFixed(1)} kg
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <MiniSpark values={p.bmi} color="var(--ink-3)" trend="down" />
                      <Delta values={p.bmi} />
                      {p.bmi.length > 0 && (
                        <div className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                          actual {p.bmi[p.bmi.length - 1].toFixed(1)}
                        </div>
                      )}
                    </div>


                    <div style={{ textAlign: 'center' }}>
                      {(() => {
                        const pct = p.adherence ?? 0
                        return (
                          <>
                            <div
                              className="fk-serif"
                              style={{ fontSize: 24, fontWeight: 300, color: adherenceColor(pct), letterSpacing: '-0.02em', lineHeight: 1 }}
                            >
                              {pct}
                              <span style={{ fontSize: 11, marginLeft: 2 }}>%</span>
                            </div>
                            <div className="fk-mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              {p.streak}d racha
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    <div style={{ color: 'var(--ink-5)' }}>
                      <Ic.chevR />
                    </div>
                  </div>
                )

                if (isClickable) {
                  return (
                    <Link
                      key={realId}
                      href={`/clinic/pacientes/${realId}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {row}
                    </Link>
                  )
                }
                return (
                  <div key={realId} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {row}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {practitioner && (
        <InviteModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          practitionerId={practitioner.id}
          onInvited={refreshPatients}
        />
      )}
    </div>
  )
}

// =============================================================================
// SUBSTATES
// =============================================================================

function LoadingState() {
  return <SharedLoadingState label="Cargando práctica" />
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: '60px 40px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div className="fk-eyebrow" style={{ color: 'var(--berry)', marginBottom: 10 }}>
        Error
      </div>
      <p
        className="fk-serif"
        style={{ fontSize: 26, fontStyle: 'italic', fontWeight: 300, lineHeight: 1.2 }}
      >
        {message}
      </p>
    </div>
  )
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div style={{ padding: '80px 40px' }}>
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 14,
          padding: '48px 40px',
          textAlign: 'center',
        }}
      >
        <div className="fk-eyebrow" style={{ marginBottom: 12 }}>
          Empieza aquí
        </div>
        <h2
          className="fk-serif"
          style={{ fontSize: 30, fontWeight: 300, fontStyle: 'italic', lineHeight: 1.1, margin: 0 }}
        >
          Tu primera paciente está a un email de distancia.
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--ink-4)',
            marginTop: 14,
            fontFamily: 'var(--f-sans)',
            lineHeight: 1.5,
          }}
        >
          Vincula a alguien que ya tenga cuenta en la app móvil de Fitkis. Al aceptar la
          invitación verás aquí sus registros de peso, alimentación y entrenamiento.
        </p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <Btn variant="signal" icon={<Ic.plus />} onClick={onInvite}>
            Vincular paciente
          </Btn>
        </div>
      </div>
    </div>
  )
}

function formatToday(): string {
  // "DD mes YYYY" en CDMX.
  const todayISO_CDMX = getTodayInTimezone()
  const [y, m, d] = todayISO_CDMX.split('-').map(Number)
  const months = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre',
  ]
  return `${d} ${months[m - 1]} ${y}`
}
