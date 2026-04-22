'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Scale, Calendar, ChevronRight, Mail, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Bell } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import type { PatientStatus, UserProfile, WeightLog, DietConfig } from '@/types'

interface WeightRecord {
  weight_kg: number
  muscle_mass_kg?: number
  body_fat_mass_kg?: number
  body_fat_percentage?: number
  date: string
}

interface PatientData {
  id: string
  patient_id: string
  status: PatientStatus
  invited_at: string
  accepted_at?: string
  patient_email?: string
  patient_name?: string
  patient_profile?: {
    height_cm?: number
    goal_weight_kg?: number
  }
  weight_history: WeightRecord[]
  latest_diet?: {
    effective_date: string
    version: number
  }
  // Alert data
  days_since_activity?: number
  weight_change_30d?: number
}

// Mini sparkline component with hover
function WeightMetricCard({
  label,
  value,
  unit,
  history,
  color
}: {
  label: string
  value?: number
  unit: string
  history: { value?: number; date: string }[]
  color: string
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; date: string; x: number } | null>(null)

  // Reverse to show oldest to newest (left to right)
  const data = [...history].reverse().slice(-10)
  const hasChart = data.length >= 2

  const width = 100
  const height = 36
  const padding = 4

  let points: { x: number; y: number; value: number; date: string }[] = []
  let pathD = ''

  if (hasChart) {
    const values = data.map(d => d.value || 0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: padding + (1 - ((d.value || 0) - min) / range) * (height - padding * 2),
      value: d.value || 0,
      date: d.date
    }))

    pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }

  return (
    <div className="relative flex flex-col items-center min-w-[80px]">
      <div className="text-[10px] text-ink-4 uppercase tracking-wide">{label}</div>
      <div className="font-serif text-xl leading-none mt-0.5">
        {value != null ? value : <span className="text-ink-5">--</span>}
        <span className="text-xs text-ink-4 ml-0.5">{unit}</span>
      </div>
      {hasChart ? (
        <svg
          width={width}
          height={height}
          className="mt-1"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.x === p.x ? 5 : 3}
              fill={hoveredPoint?.x === p.x ? color : 'white'}
              stroke={color}
              strokeWidth={2}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredPoint({ value: p.value, date: p.date, x: p.x })}
            />
          ))}
        </svg>
      ) : (
        <div className="h-[36px] mt-1 flex items-center">
          <span className="text-[10px] text-ink-5">Sin historial</span>
        </div>
      )}
      {hoveredPoint && (
        <div
          className="absolute -top-8 bg-ink text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {hoveredPoint.value} {unit} · {new Date(hoveredPoint.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<PatientStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-honey', bg: 'bg-honey-soft' },
  active: { label: 'Activo', color: 'text-leaf', bg: 'bg-leaf-soft' },
  inactive: { label: 'Inactivo', color: 'text-ink-4', bg: 'bg-paper-3' },
}

export default function ClinicDashboard() {
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<PatientData[]>([])
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      loadPractitionerData()
    }
  }, [user])

  const loadPractitionerData = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Get practitioner record
      const { data: practitioner } = await (supabase as any)
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!practitioner) {
        // User is not a practitioner, redirect or show error
        setLoading(false)
        return
      }

      setPractitionerId(practitioner.id)

      // Get all patients for this practitioner using RPC
      const { data: patientRelations } = await (supabase as any)
        .rpc('get_practitioner_patients', { practitioner_uuid: practitioner.id })

      if (patientRelations && patientRelations.length > 0) {
        // Fetch additional data for each patient
        const enrichedPatients = await Promise.all(
          patientRelations.map(async (rel: any) => {
            // Get patient profile
            const { data: profile } = await (supabase as any)
              .from('user_profiles')
              .select('height_cm, goal_weight_kg')
              .eq('user_id', rel.patient_id)
              .single()

            // Get weight history (last 30 records)
            const { data: weightHistory } = await (supabase as any)
              .from('weight_logs')
              .select('weight_kg, muscle_mass_kg, body_fat_mass_kg, body_fat_percentage, date')
              .eq('user_id', rel.patient_id)
              .order('date', { ascending: false })
              .limit(30)

            // Get latest diet config
            const { data: diet } = await (supabase as any)
              .from('diet_configs')
              .select('effective_date, version')
              .eq('user_id', rel.patient_id)
              .eq('active', true)
              .order('effective_date', { ascending: false })
              .limit(1)
              .single()

            // Calculate days since last activity
            let daysSinceActivity: number | undefined
            if (weightHistory && weightHistory.length > 0) {
              const lastDate = new Date(weightHistory[0].date)
              const now = new Date()
              daysSinceActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            }

            // Calculate weight change over 30 days
            let weightChange30d: number | undefined
            if (weightHistory && weightHistory.length >= 2) {
              const latest = weightHistory[0].weight_kg
              const oldest = weightHistory[weightHistory.length - 1].weight_kg
              weightChange30d = latest - oldest
            }

            return {
              id: rel.relation_id,
              patient_id: rel.patient_id,
              patient_email: rel.patient_email,
              patient_name: rel.patient_name,
              status: rel.status,
              invited_at: rel.invited_at,
              accepted_at: rel.accepted_at,
              patient_profile: profile || undefined,
              weight_history: weightHistory || [],
              latest_diet: diet || undefined,
              days_since_activity: daysSinceActivity,
              weight_change_30d: weightChange30d,
            }
          })
        )

        setPatients(enrichedPatients)
      }
    } catch (err) {
      console.error('Error loading practitioner data:', err)
    }

    setLoading(false)
  }

  const handleInvitePatient = async () => {
    if (!inviteEmail.trim() || !practitionerId) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      // Look up user by email (this requires a function or different approach)
      // For now, we'll check if a user with this email exists
      // In production, you might want to send an actual invite email

      // Check if user exists with this email
      const { data: existingUsers, error: userError } = await (supabase as any)
        .rpc('get_user_by_email', { email_input: inviteEmail.toLowerCase() })

      if (userError || !existingUsers || existingUsers.length === 0) {
        setInviteError('No se encontró un usuario con ese email. El paciente debe crear una cuenta primero.')
        setInviteLoading(false)
        return
      }

      const patientId = existingUsers[0].id

      // Check if relationship already exists
      const { data: existing } = await (supabase as any)
        .from('practitioner_patients')
        .select('id, status')
        .eq('practitioner_id', practitionerId)
        .eq('patient_id', patientId)
        .single()

      if (existing) {
        setInviteError(`Este paciente ya está ${existing.status === 'active' ? 'vinculado' : 'invitado'}.`)
        setInviteLoading(false)
        return
      }

      // Create the relationship
      const { error: insertError } = await (supabase as any)
        .from('practitioner_patients')
        .insert({
          practitioner_id: practitionerId,
          patient_id: patientId,
          status: 'pending',
        })

      if (insertError) throw insertError

      setInviteSuccess(true)
      setInviteEmail('')
      await loadPractitionerData()

      // Reset success message after 3 seconds
      setTimeout(() => {
        setInviteSuccess(false)
        setShowInviteModal(false)
      }, 2000)

    } catch (err: any) {
      console.error('Error inviting patient:', err)
      setInviteError(err.message || 'Error al invitar paciente')
    }

    setInviteLoading(false)
  }

  const filteredPatients = searchQuery.trim()
    ? patients.filter(p =>
        p.patient_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients

  const activeCount = patients.filter(p => p.status === 'active').length
  const pendingCount = patients.filter(p => p.status === 'pending').length

  // Patients needing attention (configurable thresholds)
  const inactivityThreshold = 7 // days
  const needsAttention = patients.filter(p =>
    p.status === 'active' && (
      (p.days_since_activity !== undefined && p.days_since_activity >= inactivityThreshold) ||
      (p.weight_change_30d !== undefined && p.weight_change_30d > 0)
    )
  ).sort((a, b) => {
    // Prioritize: no activity > weight gain
    const aInactive = (a.days_since_activity ?? 0) >= inactivityThreshold
    const bInactive = (b.days_since_activity ?? 0) >= inactivityThreshold
    if (aInactive && !bInactive) return -1
    if (!aInactive && bInactive) return 1
    return (b.weight_change_30d || 0) - (a.weight_change_30d || 0)
  })

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!practitionerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-berry-soft flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-berry" />
          </div>
          <h1 className="font-serif text-2xl mb-2">Acceso no autorizado</h1>
          <p className="text-ink-4 mb-6">
            No tienes permisos de nutricionista. Si crees que esto es un error, contacta al administrador.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-signal text-white font-medium"
          >
            Ir a mi cuenta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-light tracking-tight">
            Mis Pacientes
          </h1>
          <p className="text-ink-4 mt-1">
            {activeCount} activos · {pendingCount} pendientes
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-signal text-white font-medium hover:bg-signal/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Vincular paciente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-soft flex items-center justify-center">
              <Users className="w-5 h-5 text-sky" />
            </div>
          </div>
          <div className="font-serif text-2xl">{patients.length}</div>
          <div className="text-xs text-ink-4">Total pacientes</div>
        </div>
        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-leaf-soft flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-leaf" />
            </div>
          </div>
          <div className="font-serif text-2xl">{activeCount}</div>
          <div className="text-xs text-ink-4">Activos</div>
        </div>
        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-honey-soft flex items-center justify-center">
              <Clock className="w-5 h-5 text-honey" />
            </div>
          </div>
          <div className="font-serif text-2xl">{pendingCount}</div>
          <div className="text-xs text-ink-4">Pendientes</div>
        </div>
        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-signal-soft flex items-center justify-center">
              <Calendar className="w-5 h-5 text-signal" />
            </div>
          </div>
          <div className="font-serif text-2xl">--</div>
          <div className="text-xs text-ink-4">Citas hoy</div>
        </div>
      </div>

      {/* Alerts Section */}
      {needsAttention.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-honey flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-medium">Requieren atención</h2>
            <span className="ml-auto px-2.5 py-0.5 rounded-full bg-honey-soft text-honey text-sm font-medium">
              {needsAttention.length}
            </span>
          </div>
          <div className="bg-honey-soft/30 border border-honey/20 rounded-2xl overflow-hidden">
            <div className="divide-y divide-honey/10">
              {needsAttention.slice(0, 4).map((patient) => {
                const isInactive = (patient.days_since_activity ?? 0) >= inactivityThreshold
                return (
                  <Link
                    key={patient.id}
                    href={`/clinic/patient/${patient.patient_id}`}
                    className="flex items-center justify-between p-4 hover:bg-honey-soft/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isInactive ? 'bg-honey-soft' : 'bg-berry-soft'
                      }`}>
                        {isInactive ? (
                          <Clock className="w-5 h-5 text-honey" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-berry" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {patient.patient_name || patient.patient_email?.split('@')[0]}
                        </div>
                        <div className="text-xs text-ink-4">
                          {isInactive
                            ? `Sin actividad hace ${patient.days_since_activity} días`
                            : `Subió ${patient.weight_change_30d?.toFixed(1)} kg en 30 días`
                          }
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-4" />
                  </Link>
                )
              })}
            </div>
            {needsAttention.length > 4 && (
              <Link
                href="/clinic/reports"
                className="block text-center py-3 text-sm text-honey font-medium hover:bg-honey-soft/30 transition-colors border-t border-honey/10"
              >
                Ver todos ({needsAttention.length})
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4" />
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 bg-white rounded-xl pl-12 pr-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-7 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-paper-2 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-ink-4" />
          </div>
          <h3 className="font-medium text-lg mb-2">
            {searchQuery ? 'No se encontraron pacientes' : 'Sin pacientes'}
          </h3>
          <p className="text-ink-4 mb-6">
            {searchQuery
              ? 'Intenta con otro término de búsqueda'
              : 'Vincula tu primer paciente para comenzar'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-signal text-white font-medium"
            >
              <Plus className="w-4 h-4" />
              Vincular paciente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
          <div className="divide-y divide-ink-7">
            {filteredPatients.map((patient) => {
              const statusInfo = STATUS_LABELS[patient.status]

              return (
                <Link
                  key={patient.id}
                  href={`/clinic/patient/${patient.patient_id}`}
                  className="flex items-center justify-between p-4 hover:bg-paper-2 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-sky-soft flex items-center justify-center flex-shrink-0">
                      <span className="font-serif text-lg text-sky">
                        {patient.patient_name?.charAt(0).toUpperCase() || patient.patient_email?.charAt(0).toUpperCase() || 'P'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {patient.patient_name || patient.patient_email || `Paciente ${patient.patient_id.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-ink-4">
                        {patient.patient_name && patient.patient_email && (
                          <span className="truncate">{patient.patient_email}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {patient.latest_diet && (
                          <span className="flex-shrink-0">Plan v{patient.latest_diet.version}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0 ml-auto">
                      <WeightMetricCard
                        label="Peso"
                        value={patient.weight_history[0]?.weight_kg}
                        unit="kg"
                        history={patient.weight_history.map(w => ({ value: w.weight_kg, date: w.date }))}
                        color="#2563eb"
                      />
                      <WeightMetricCard
                        label="Grasa"
                        value={patient.weight_history[0]?.body_fat_percentage}
                        unit="%"
                        history={patient.weight_history.map(w => ({ value: w.body_fat_percentage, date: w.date })).filter(w => w.value != null)}
                        color="#ef4444"
                      />
                      <WeightMetricCard
                        label="Músculo"
                        value={patient.weight_history[0]?.muscle_mass_kg}
                        unit="kg"
                        history={patient.weight_history.map(w => ({ value: w.muscle_mass_kg, date: w.date })).filter(w => w.value != null)}
                        color="#22c55e"
                      />
                      <WeightMetricCard
                        label="Grasa kg"
                        value={patient.weight_history[0]?.body_fat_mass_kg}
                        unit="kg"
                        history={patient.weight_history.map(w => ({ value: w.body_fat_mass_kg, date: w.date })).filter(w => w.value != null)}
                        color="#f97316"
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-4" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
            onClick={() => !inviteLoading && setShowInviteModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-white rounded-2xl z-50 p-6">
            <h2 className="font-serif text-2xl mb-2">Vincular paciente</h2>
            <p className="text-ink-4 text-sm mb-6">
              Ingresa el email del paciente. Debe tener una cuenta en FitKis.
            </p>

            {inviteSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-leaf-soft flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-leaf" />
                </div>
                <p className="font-medium text-leaf">Invitación enviada</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Email del paciente</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4" />
                    <input
                      type="email"
                      placeholder="paciente@ejemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-paper rounded-xl pl-12 pr-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
                      disabled={inviteLoading}
                    />
                  </div>
                </div>

                {inviteError && (
                  <div className="mb-4 p-3 bg-berry-soft border border-berry/20 rounded-xl text-berry text-sm">
                    {inviteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    disabled={inviteLoading}
                    className="flex-1 py-3 rounded-xl border border-ink-7 font-medium hover:bg-paper-2 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInvitePatient}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="flex-1 py-3 rounded-xl bg-signal text-white font-medium hover:bg-signal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <PulseLine w={24} h={12} color="#fff" strokeWidth={2} active />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Vincular
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
