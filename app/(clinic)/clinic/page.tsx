'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Btn } from '@/components/ui/Btn'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from '@/components/clinic/Ic'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { MiniSpark, Delta } from '@/components/clinic/MiniSpark'
import { PatientFilterBar, type FilterKey, type SortKey } from '@/components/clinic/PatientFilterBar'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadPatientsForPractitioner,
  patientRealId,
  type PractitionerRecord,
} from '@/lib/clinic/queries'
import type { MockPatient } from '@/lib/clinic/mock-data'
import { InviteModal } from '@/components/clinic/InviteModal'

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--leaf-soft)', fg: 'var(--leaf)' },
  { bg: 'var(--signal-soft)', fg: 'var(--signal)' },
  { bg: 'var(--sky-soft)', fg: 'var(--sky)' },
  { bg: 'var(--berry-soft)', fg: 'var(--berry)' },
  { bg: 'var(--honey-soft)', fg: '#8a6411' },
]

function avatarColors(seed: number, status: MockPatient['status']) {
  if (status === 'pending') return { bg: 'var(--paper-3)', fg: 'var(--ink-4)' }
  return AVATAR_PALETTE[seed % AVATAR_PALETTE.length]
}

function adherenceColor(value: number): string {
  if (value > 80) return 'var(--leaf)'
  if (value > 60) return 'var(--honey)'
  return 'var(--signal)'
}

export default function ClinicPatientsPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [patients, setPatients] = useState<MockPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter]      = useState<FilterKey>('todos')
  const [sortKey, setSortKey]    = useState<SortKey>('last_seen')
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
        const list = await loadPatientsForPractitioner(supabase, p.id)
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
    const list = await loadPatientsForPractitioner(supabase, practitioner.id)
    setPatients(list)
  }

  const filtered = useMemo(() => {
    // 1. Tab filter
    let list = patients
    if (filter === 'atencion') list = patients.filter((p) => p.alert)
    else if (filter === 'pending') list = patients.filter((p) => p.status === 'pending')
    else if (filter === 'archivo') list = patients.filter((p) => p.status === 'inactive')

    // 2. Search
    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )

    // 3. Sort
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'es')
      // last_seen: menor días = más reciente = primero
      const da = a.days_since_activity ?? Infinity
      const db = b.days_since_activity ?? Infinity
      return da - db
    })
  }, [filter, patients, searchQuery, sortKey])

  // Stats
  const attentionCount = patients.filter((p) => p.alert).length
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
              todos:    patients.length,
              atencion: attentionCount,
              pending:  pendingCount,
              archivo:  patients.filter((p) => p.status === 'inactive').length,
            }}
          />

          {/* Table */}
          <div style={{ padding: '14px 40px 40px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '34px 2.2fr 1fr 1fr 1fr 1fr 0.8fr 28px',
                gap: 24,
                padding: '10px 14px',
                borderBottom: '1px solid var(--ink-7)',
                alignItems: 'center',
              }}
            >
              <div></div>
              <div className="fk-eyebrow">Paciente</div>
              <div className="fk-eyebrow">Objetivo</div>
              <div className="fk-eyebrow">Peso · 30d</div>
              <div className="fk-eyebrow">% Grasa</div>
              <div className="fk-eyebrow">Músculo</div>
              <div className="fk-eyebrow" style={{ textAlign: 'right' }}>
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
                const isClickable = p.status === 'active'

                const row = (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '34px 2.2fr 1fr 1fr 1fr 1fr 0.8fr 28px',
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
                        {p.alert === 'inactividad' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'var(--honey-soft)',
                              color: '#8a6411',
                              fontFamily: 'var(--f-mono)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontWeight: 500,
                            }}
                          >
                            ● inactivo
                          </span>
                        )}
                        {p.alert === 'estancamiento' && (
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
                        <span>{p.email}</span>
                        <span>·</span>
                        <span>{p.lastSeen}</span>
                        {p.plan !== '—' && (
                          <>
                            <span>·</span>
                            <span>plan {p.plan}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <div
                        className="fk-serif"
                        style={{
                          fontSize: 18,
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: 'var(--ink-2)',
                        }}
                      >
                        {p.goal}
                      </div>
                      {p.weight.length > 0 && (
                        <div
                          className="fk-mono"
                          style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}
                        >
                          actual {p.weight[p.weight.length - 1].toFixed(1)} kg
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <MiniSpark
                        values={p.weight}
                        color="var(--ink-3)"
                        trend={
                          p.goal.startsWith('-') ? 'down' : p.goal.startsWith('+') ? 'up' : 'auto'
                        }
                      />
                      <Delta values={p.weight} invert={p.goal.startsWith('+')} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <MiniSpark values={p.fat} color="var(--berry)" trend="down" />
                      <Delta values={p.fat} unit="%" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <MiniSpark values={p.muscle} color="var(--leaf)" trend="up" />
                      <Delta values={p.muscle} invert />
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {p.adherence == null ? (
                        <span className="fk-mono" style={{ fontSize: 11, color: 'var(--ink-5)' }}>
                          —
                        </span>
                      ) : (
                        <>
                          <div
                            className="fk-serif"
                            style={{
                              fontSize: 24,
                              fontWeight: 300,
                              color: adherenceColor(p.adherence),
                              letterSpacing: '-0.02em',
                              lineHeight: 1,
                            }}
                          >
                            {p.adherence}
                            <span style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 2 }}>
                              %
                            </span>
                          </div>
                          <div
                            className="fk-mono"
                            style={{
                              fontSize: 9,
                              color: 'var(--ink-4)',
                              marginTop: 2,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {p.streak}d racha
                          </div>
                        </>
                      )}
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
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
      }}
    >
      <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
      <span
        className="fk-mono"
        style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
      >
        Cargando práctica
      </span>
    </div>
  )
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
  const now = new Date()
  const months = [
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
  ]
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
}
