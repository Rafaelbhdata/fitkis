'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Scale, Calendar, ChevronRight, Mail, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import type { PatientStatus, UserProfile, WeightLog, DietConfig } from '@/types'

interface PatientData {
  id: string
  patient_id: string
  status: PatientStatus
  invited_at: string
  accepted_at?: string
  patient_email?: string
  patient_profile?: {
    height_cm?: number
    goal_weight_kg?: number
  }
  latest_weight?: {
    weight_kg: number
    date: string
  }
  latest_diet?: {
    effective_date: string
    version: number
  }
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

      // Get all patients for this practitioner
      const { data: patientRelations } = await (supabase as any)
        .from('practitioner_patients')
        .select('*')
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false })

      if (patientRelations && patientRelations.length > 0) {
        // Fetch additional data for each patient
        const enrichedPatients = await Promise.all(
          patientRelations.map(async (rel: any) => {
            // Get patient email from auth (if accessible) or user_profiles
            const { data: profile } = await (supabase as any)
              .from('user_profiles')
              .select('height_cm, goal_weight_kg')
              .eq('user_id', rel.patient_id)
              .single()

            // Get latest weight
            const { data: weight } = await (supabase as any)
              .from('weight_logs')
              .select('weight_kg, date')
              .eq('user_id', rel.patient_id)
              .order('date', { ascending: false })
              .limit(1)
              .single()

            // Get latest diet config
            const { data: diet } = await (supabase as any)
              .from('diet_configs')
              .select('effective_date, version')
              .eq('user_id', rel.patient_id)
              .eq('active', true)
              .order('effective_date', { ascending: false })
              .limit(1)
              .single()

            return {
              ...rel,
              patient_profile: profile || undefined,
              latest_weight: weight || undefined,
              latest_diet: diet || undefined,
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

  const filteredPatients = patients.filter(p =>
    p.patient_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = patients.filter(p => p.status === 'active').length
  const pendingCount = patients.filter(p => p.status === 'pending').length

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
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-sky-soft flex items-center justify-center">
                      <span className="font-serif text-lg text-sky">
                        {patient.patient_email?.charAt(0).toUpperCase() || 'P'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {patient.patient_email || `Paciente ${patient.patient_id.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-ink-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {patient.latest_weight && (
                          <span className="flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5" />
                            {patient.latest_weight.weight_kg} kg
                          </span>
                        )}
                        {patient.latest_diet && (
                          <span>Plan v{patient.latest_diet.version}</span>
                        )}
                      </div>
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
