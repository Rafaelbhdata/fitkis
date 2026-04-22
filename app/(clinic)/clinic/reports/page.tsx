'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Users, TrendingDown, TrendingUp, AlertTriangle,
  Clock, Scale, Activity, ChevronRight, Printer, CheckCircle,
  Calendar, Utensils
} from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import Link from 'next/link'

interface PatientData {
  id: string
  patient_id: string
  patient_name: string | null
  patient_email: string | null
  status: string
  latest_weight: number | null
  previous_weight: number | null
  weight_change: number | null
  days_since_activity: number | null
  last_activity_date: string | null
  food_logs_today: number
}

interface ActivityItem {
  type: 'weight' | 'food'
  patient_id: string
  patient_name: string | null
  patient_email: string | null
  date: string
  value?: number
  description: string
}

export default function ClinicReportsPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<PatientData[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    avgWeightLoss: 0,
    totalWeightLost: 0,
    patientsLosingWeight: 0,
  })

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, supabase])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data: practitioner } = await (supabase as any)
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!practitioner) {
        setLoading(false)
        return
      }

      const { data: patientRelations } = await (supabase as any)
        .rpc('get_practitioner_patients', { practitioner_uuid: practitioner.id })

      if (!patientRelations || patientRelations.length === 0) {
        setPatients([])
        setLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const patientsData: PatientData[] = []
      const activities: ActivityItem[] = []
      let totalLost = 0
      let losingCount = 0

      for (const rel of patientRelations) {
        if (rel.status !== 'active') continue

        // Get weight logs (last 30 days)
        const { data: weightLogs } = await (supabase as any)
          .from('weight_logs')
          .select('weight_kg, date')
          .eq('user_id', rel.patient_id)
          .gte('date', thirtyDaysAgoStr)
          .order('date', { ascending: false })

        // Get today's food logs count
        const { count: foodCount } = await (supabase as any)
          .from('food_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', rel.patient_id)
          .eq('date', today)

        // Get recent food activity
        const { data: recentFood } = await (supabase as any)
          .from('food_logs')
          .select('date, meal')
          .eq('user_id', rel.patient_id)
          .gte('date', thirtyDaysAgoStr)
          .order('date', { ascending: false })
          .limit(5)

        let latestWeight = null
        let previousWeight = null
        let weightChange = null
        let lastActivityDate = null
        let daysSinceActivity = null

        if (weightLogs && weightLogs.length > 0) {
          latestWeight = weightLogs[0].weight_kg
          lastActivityDate = weightLogs[0].date

          if (weightLogs.length > 1) {
            previousWeight = weightLogs[weightLogs.length - 1].weight_kg
            weightChange = latestWeight - previousWeight

            if (weightChange < 0) {
              totalLost += Math.abs(weightChange)
              losingCount++
            }
          }

          // Calculate days since activity
          const lastDate = new Date(lastActivityDate)
          const now = new Date()
          daysSinceActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

          // Add to activity feed
          activities.push({
            type: 'weight',
            patient_id: rel.patient_id,
            patient_name: rel.patient_name,
            patient_email: rel.patient_email,
            date: weightLogs[0].date,
            value: latestWeight,
            description: `Registró ${latestWeight} kg`
          })
        }

        // Add food activity
        if (recentFood && recentFood.length > 0) {
          const uniqueDates = [...new Set(recentFood.map((f: any) => f.date))].slice(0, 2)
          uniqueDates.forEach((date: string) => {
            const mealsCount = recentFood.filter((f: any) => f.date === date).length
            activities.push({
              type: 'food',
              patient_id: rel.patient_id,
              patient_name: rel.patient_name,
              patient_email: rel.patient_email,
              date,
              description: `Registró ${mealsCount} alimentos`
            })
          })
        }

        patientsData.push({
          id: rel.relation_id,
          patient_id: rel.patient_id,
          patient_name: rel.patient_name,
          patient_email: rel.patient_email,
          status: rel.status,
          latest_weight: latestWeight,
          previous_weight: previousWeight,
          weight_change: weightChange,
          days_since_activity: daysSinceActivity,
          last_activity_date: lastActivityDate,
          food_logs_today: foodCount || 0
        })
      }

      // Sort activity by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setPatients(patientsData)
      setRecentActivity(activities.slice(0, 10))
      setStats({
        totalPatients: patientRelations.length,
        activePatients: patientsData.length,
        avgWeightLoss: losingCount > 0 ? totalLost / losingCount : 0,
        totalWeightLost: totalLost,
        patientsLosingWeight: losingCount,
      })

    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) return 'Hoy'
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Ayer'

    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  // Patients needing attention
  const needsAttention = patients.filter(p =>
    (p.days_since_activity !== null && p.days_since_activity >= 7) ||
    (p.weight_change !== null && p.weight_change > 0)
  ).sort((a, b) => {
    // Prioritize: no activity > weight gain
    if (a.days_since_activity && a.days_since_activity >= 7) return -1
    if (b.days_since_activity && b.days_since_activity >= 7) return 1
    return (b.weight_change || 0) - (a.weight_change || 0)
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

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-light tracking-tight">
          Reportes
        </h1>
        <p className="text-ink-4 mt-1">
          Vista general de tu práctica
        </p>
      </div>

      {/* Practice Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-soft flex items-center justify-center">
              <Users className="w-5 h-5 text-sky" />
            </div>
          </div>
          <div className="font-serif text-2xl">{stats.activePatients}</div>
          <div className="text-xs text-ink-4">Pacientes activos</div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-leaf-soft flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-leaf" />
            </div>
          </div>
          <div className="font-serif text-2xl text-leaf">
            -{stats.totalWeightLost.toFixed(1)} kg
          </div>
          <div className="text-xs text-ink-4">Pérdida total (30d)</div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-honey-soft flex items-center justify-center">
              <Scale className="w-5 h-5 text-honey" />
            </div>
          </div>
          <div className="font-serif text-2xl">
            {stats.avgWeightLoss > 0 ? `-${stats.avgWeightLoss.toFixed(1)}` : '0'} kg
          </div>
          <div className="text-xs text-ink-4">Promedio por paciente</div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-7 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-signal-soft flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-signal" />
            </div>
          </div>
          <div className="font-serif text-2xl">
            {stats.activePatients > 0
              ? Math.round((stats.patientsLosingWeight / stats.activePatients) * 100)
              : 0}%
          </div>
          <div className="text-xs text-ink-4">Bajando de peso</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-honey" />
            <h2 className="font-medium">Requieren atención</h2>
          </div>

          {needsAttention.length === 0 ? (
            <div className="bg-leaf-soft rounded-2xl p-6 text-center">
              <CheckCircle className="w-8 h-8 text-leaf mx-auto mb-2" />
              <p className="text-leaf font-medium">Todo en orden</p>
              <p className="text-xs text-leaf/70 mt-1">Todos tus pacientes están activos</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
              <div className="divide-y divide-ink-7">
                {needsAttention.slice(0, 5).map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/clinic/patient/${patient.patient_id}`}
                    className="flex items-center justify-between p-4 hover:bg-paper-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        patient.days_since_activity && patient.days_since_activity >= 7
                          ? 'bg-honey-soft'
                          : 'bg-berry-soft'
                      }`}>
                        {patient.days_since_activity && patient.days_since_activity >= 7 ? (
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
                          {patient.days_since_activity && patient.days_since_activity >= 7
                            ? `Sin actividad hace ${patient.days_since_activity} días`
                            : patient.weight_change
                              ? `Subió ${patient.weight_change.toFixed(1)} kg`
                              : ''
                          }
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-4" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-sky" />
            <h2 className="font-medium">Actividad reciente</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="bg-paper-2 rounded-2xl p-6 text-center">
              <Activity className="w-8 h-8 text-ink-4 mx-auto mb-2" />
              <p className="text-ink-4">Sin actividad reciente</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
              <div className="divide-y divide-ink-7">
                {recentActivity.map((activity, idx) => (
                  <Link
                    key={idx}
                    href={`/clinic/patient/${activity.patient_id}`}
                    className="flex items-center gap-3 p-4 hover:bg-paper-2 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'weight' ? 'bg-sky-soft' : 'bg-leaf-soft'
                    }`}>
                      {activity.type === 'weight' ? (
                        <Scale className="w-4 h-4 text-sky" />
                      ) : (
                        <Utensils className="w-4 h-4 text-leaf" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">
                          {activity.patient_name || activity.patient_email?.split('@')[0]}
                        </span>
                        <span className="text-ink-4"> · {activity.description}</span>
                      </div>
                    </div>
                    <div className="text-xs text-ink-4 flex-shrink-0">
                      {formatDate(activity.date)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Reports Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Printer className="w-4 h-4 text-signal" />
          <h2 className="font-medium">Generar reportes</h2>
        </div>

        <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
          <div className="divide-y divide-ink-7">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center">
                    <span className="font-serif text-sky">
                      {patient.patient_name?.charAt(0).toUpperCase() || patient.patient_email?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {patient.patient_name || patient.patient_email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-ink-4">
                      {patient.latest_weight ? `${patient.latest_weight} kg` : 'Sin registros'}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/clinic/patient/${patient.patient_id}/report`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-paper-2 hover:bg-paper-3 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Ver reporte
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
