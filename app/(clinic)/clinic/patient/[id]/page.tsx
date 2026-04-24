'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Scale, Utensils, Dumbbell, Target, Calendar,
  TrendingDown, TrendingUp, Minus, FileText, Edit, Printer
} from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import { getToday } from '@/lib/utils'
import type { FoodGroup, MealType, WeightLog, FoodLog, GymSession, DietConfig, ActiveMeals } from '@/types'

const TABS = [
  { key: 'overview', label: 'Resumen', icon: Target },
  { key: 'weight', label: 'Peso', icon: Scale },
  { key: 'food', label: 'Alimentación', icon: Utensils },
  { key: 'gym', label: 'Gym', icon: Dumbbell },
] as const

type TabKey = typeof TABS[number]['key']

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  snack1: 'Snack 1',
  comida: 'Comida',
  snack2: 'Snack 2',
  cena: 'Cena',
  snack3: 'Snack 3',
}

const GROUP_COLORS: Record<FoodGroup, string> = {
  verdura: 'bg-leaf-soft text-leaf',
  fruta: 'bg-signal-soft text-signal',
  carb: 'bg-honey-soft text-honey',
  proteina: 'bg-berry-soft text-berry',
  grasa: 'bg-paper-3 text-ink-3',
  leguminosa: 'bg-sky-soft text-sky',
}

// Mini sparkline component with hover
function MetricCard({
  label,
  value,
  unit,
  history,
  color,
  large = false
}: {
  label: string
  value?: number
  unit: string
  history: { value?: number; date: string }[]
  color: string
  large?: boolean
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; date: string; x: number } | null>(null)

  const data = [...history].reverse().slice(-15)
  const hasChart = data.length >= 2

  const width = large ? 200 : 120
  const height = large ? 60 : 40
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
    <div className="relative flex flex-col">
      <div className="text-xs text-ink-4 uppercase tracking-wide mb-1">{label}</div>
      <div className={`font-serif leading-none ${large ? 'text-4xl' : 'text-2xl'}`}>
        {value != null ? value : <span className="text-ink-5">--</span>}
        <span className={`text-ink-4 ml-1 ${large ? 'text-lg' : 'text-sm'}`}>{unit}</span>
      </div>
      {hasChart ? (
        <svg
          width={width}
          height={height}
          className="mt-2"
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
        <div className={`${large ? 'h-[60px]' : 'h-[40px]'} mt-2 flex items-center`}>
          <span className="text-xs text-ink-5">Sin historial</span>
        </div>
      )}
      {hoveredPoint && (
        <div
          className="absolute -top-6 bg-ink text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {hoveredPoint.value} {unit} · {new Date(hoveredPoint.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  )
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string
  const { user } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [patientName, setPatientName] = useState<string>('')
  const [patientEmail, setPatientEmail] = useState<string>('')
  const [relationStatus, setRelationStatus] = useState<string>('')

  // Data states
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [gymSessions, setGymSessions] = useState<GymSession[]>([])
  const [dietConfig, setDietConfig] = useState<DietConfig | null>(null)
  const [selectedDate, setSelectedDate] = useState(getToday())

  useEffect(() => {
    if (user && patientId) {
      loadPatientData()
    }
  }, [user, patientId])

  useEffect(() => {
    if (patientId && activeTab === 'food') {
      loadFoodLogs()
    }
  }, [patientId, selectedDate, activeTab])

  const loadPatientData = async () => {
    setLoading(true)

    try {
      // Load weight logs (last 30)
      const { data: weights } = await (supabase as any)
        .from('weight_logs')
        .select('*')
        .eq('user_id', patientId)
        .order('date', { ascending: false })
        .limit(30)
      if (weights) setWeightLogs(weights)

      // Load gym sessions (last 10)
      const { data: sessions } = await (supabase as any)
        .from('gym_sessions')
        .select('*')
        .eq('user_id', patientId)
        .order('date', { ascending: false })
        .limit(10)
      if (sessions) setGymSessions(sessions)

      // Load current diet config
      const { data: diet } = await (supabase as any)
        .from('diet_configs')
        .select('*')
        .eq('user_id', patientId)
        .eq('active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()
      if (diet) setDietConfig(diet)

      // Load patient profile (name)
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', patientId)
        .single()

      if (profile?.display_name) {
        setPatientName(profile.display_name)
      }

      // Load patient relationship info
      const { data: practitioner } = await (supabase as any)
        .from('practitioners')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (practitioner) {
        // Get patient email using RPC
        const { data: patients } = await (supabase as any)
          .rpc('get_practitioner_patients', { practitioner_uuid: practitioner.id })

        const patientInfo = patients?.find((p: any) => p.patient_id === patientId)
        if (patientInfo) {
          setRelationStatus(patientInfo.status)
          if (patientInfo.patient_email) {
            setPatientEmail(patientInfo.patient_email)
          }
        }
      }

    } catch (err) {
      console.error('Error loading patient data:', err)
    }

    setLoading(false)
  }

  const loadFoodLogs = async () => {
    try {
      const { data } = await (supabase as any)
        .from('food_logs')
        .select('*')
        .eq('user_id', patientId)
        .eq('date', selectedDate)
        .order('created_at')
      if (data) setFoodLogs(data)
    } catch (err) {
      console.error('Error loading food logs:', err)
    }
  }

  // Calculate stats
  const latestWeight = weightLogs[0]
  const previousWeight = weightLogs[1]
  const weightChange = latestWeight && previousWeight
    ? latestWeight.weight_kg - previousWeight.weight_kg
    : null

  const sessionsThisWeek = gymSessions.filter(s => {
    const sessionDate = new Date(s.date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return sessionDate >= weekAgo
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Cargando paciente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl md:text-3xl font-light tracking-tight">
            {patientName || patientEmail || `Paciente`}
          </h1>
          <p className="text-ink-4 text-sm">
            {patientName && patientEmail && <span>{patientEmail} · </span>}
            <span className={relationStatus === 'active' ? 'text-leaf' : 'text-honey'}>
              {relationStatus === 'active' ? 'Activo' : 'Pendiente'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/clinic/patient/${patientId}/report`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ink-7 text-sm font-medium hover:bg-paper-2"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Reporte</span>
          </Link>
          <Link
            href={`/clinic/patient/${patientId}/plan`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-signal text-white text-sm font-medium hover:bg-signal/90"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden md:inline">Editar plan</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-paper-2 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-4 hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Body Composition Card */}
          <div className="bg-white rounded-2xl border border-ink-7 p-5">
            <div className="flex items-center gap-2 mb-6">
              <Scale className="w-5 h-5 text-signal" />
              <span className="font-medium">Composición corporal</span>
              {latestWeight && (
                <span className="text-xs text-ink-4 ml-auto">
                  Última medición: {new Date(latestWeight.date).toLocaleDateString('es-MX')}
                </span>
              )}
            </div>
            {latestWeight ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MetricCard
                  label="Peso"
                  value={latestWeight.weight_kg}
                  unit="kg"
                  history={weightLogs.map(w => ({ value: w.weight_kg, date: w.date }))}
                  color="#2563eb"
                  large
                />
                <MetricCard
                  label="Grasa corporal"
                  value={latestWeight.body_fat_percentage}
                  unit="%"
                  history={weightLogs.map(w => ({ value: w.body_fat_percentage, date: w.date })).filter(w => w.value != null)}
                  color="#ef4444"
                  large
                />
                <MetricCard
                  label="Masa muscular"
                  value={latestWeight.muscle_mass_kg}
                  unit="kg"
                  history={weightLogs.map(w => ({ value: w.muscle_mass_kg, date: w.date })).filter(w => w.value != null)}
                  color="#22c55e"
                  large
                />
                <MetricCard
                  label="Grasa (kg)"
                  value={latestWeight.body_fat_mass_kg}
                  unit="kg"
                  history={weightLogs.map(w => ({ value: w.body_fat_mass_kg, date: w.date })).filter(w => w.value != null)}
                  color="#f97316"
                  large
                />
              </div>
            ) : (
              <p className="text-ink-4">Sin registros de composición corporal</p>
            )}
            {weightChange !== null && (
              <div className={`flex items-center gap-1 text-sm mt-4 pt-4 border-t border-ink-7 ${
                weightChange < 0 ? 'text-leaf' : weightChange > 0 ? 'text-berry' : 'text-ink-4'
              }`}>
                {weightChange < 0 ? <TrendingDown className="w-4 h-4" /> :
                 weightChange > 0 ? <TrendingUp className="w-4 h-4" /> :
                 <Minus className="w-4 h-4" />}
                {Math.abs(weightChange).toFixed(1)} kg desde última medición
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diet Plan Card */}
            <div className="bg-white rounded-2xl border border-ink-7 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Utensils className="w-5 h-5 text-signal" />
                <span className="font-medium">Plan alimenticio</span>
              </div>
              {dietConfig ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {(['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa'] as FoodGroup[]).map(group => (
                      <div key={group} className={`rounded-lg p-2 text-center ${GROUP_COLORS[group]}`}>
                        <div className="font-serif text-lg">{dietConfig[group]}</div>
                        <div className="text-[10px] uppercase">{FOOD_GROUP_LABELS[group].slice(0, 4)}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-ink-4">
                    Versión {dietConfig.version} · Desde {new Date(dietConfig.effective_date).toLocaleDateString('es-MX')}
                  </p>
                </>
              ) : (
                <p className="text-ink-4">Sin plan asignado</p>
              )}
            </div>

            {/* Gym Card */}
            <div className="bg-white rounded-2xl border border-ink-7 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="w-5 h-5 text-signal" />
                <span className="font-medium">Entrenamiento</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-serif text-4xl">{sessionsThisWeek}</span>
                <span className="text-ink-4">esta semana</span>
              </div>
              <p className="text-sm text-ink-4">
                {gymSessions.length} sesiones totales registradas
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'weight' && (
        <div className="space-y-4">
          {/* Charts Section */}
          {weightLogs.length > 0 && (
            <div className="bg-white rounded-2xl border border-ink-7 p-5">
              <h3 className="font-medium mb-6">Tendencias</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MetricCard
                  label="Peso"
                  value={weightLogs[0]?.weight_kg}
                  unit="kg"
                  history={weightLogs.map(w => ({ value: w.weight_kg, date: w.date }))}
                  color="#2563eb"
                  large
                />
                <MetricCard
                  label="Grasa corporal"
                  value={weightLogs[0]?.body_fat_percentage}
                  unit="%"
                  history={weightLogs.map(w => ({ value: w.body_fat_percentage, date: w.date })).filter(w => w.value != null)}
                  color="#ef4444"
                  large
                />
                <MetricCard
                  label="Masa muscular"
                  value={weightLogs[0]?.muscle_mass_kg}
                  unit="kg"
                  history={weightLogs.map(w => ({ value: w.muscle_mass_kg, date: w.date })).filter(w => w.value != null)}
                  color="#22c55e"
                  large
                />
                <MetricCard
                  label="Grasa (kg)"
                  value={weightLogs[0]?.body_fat_mass_kg}
                  unit="kg"
                  history={weightLogs.map(w => ({ value: w.body_fat_mass_kg, date: w.date })).filter(w => w.value != null)}
                  color="#f97316"
                  large
                />
              </div>
            </div>
          )}

          {/* History List */}
          <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
            <div className="p-5 border-b border-ink-7">
              <h3 className="font-medium">Historial de mediciones</h3>
            </div>
            {weightLogs.length > 0 ? (
              <div className="divide-y divide-ink-7">
                {weightLogs.map(log => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        {new Date(log.date).toLocaleDateString('es-MX', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-ink-4">Peso</div>
                        <div className="font-serif text-xl">{log.weight_kg} <span className="text-sm text-ink-4">kg</span></div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-4">Grasa %</div>
                        <div className="font-serif text-xl">
                          {log.body_fat_percentage != null ? log.body_fat_percentage : '--'}
                          <span className="text-sm text-ink-4">%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-4">Músculo</div>
                        <div className="font-serif text-xl">
                          {log.muscle_mass_kg != null ? log.muscle_mass_kg : '--'}
                          <span className="text-sm text-ink-4">kg</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-4">Grasa kg</div>
                        <div className="font-serif text-xl">
                          {log.body_fat_mass_kg != null ? log.body_fat_mass_kg : '--'}
                          <span className="text-sm text-ink-4">kg</span>
                        </div>
                      </div>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-ink-4 mt-2 pt-2 border-t border-ink-7">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-ink-4">
                Sin registros de peso
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'food' && (
        <div className="space-y-4">
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white rounded-xl px-4 py-2 border border-ink-7 text-sm"
            />
            <button
              onClick={() => setSelectedDate(getToday())}
              className="px-3 py-2 rounded-xl border border-ink-7 text-sm hover:bg-paper-2"
            >
              Hoy
            </button>
          </div>

          {/* Food Logs */}
          <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
            <div className="p-5 border-b border-ink-7">
              <h3 className="font-medium">
                {new Date(selectedDate).toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </h3>
            </div>
            {foodLogs.length > 0 ? (
              <div className="divide-y divide-ink-7">
                {Object.entries(
                  foodLogs.reduce((acc, log) => {
                    if (!acc[log.meal]) acc[log.meal] = []
                    acc[log.meal].push(log)
                    return acc
                  }, {} as Record<string, typeof foodLogs>)
                ).map(([meal, logs]) => (
                  <div key={meal} className="p-4">
                    <div className="font-medium mb-2">{MEAL_LABELS[meal as MealType]}</div>
                    <div className="space-y-1">
                      {logs.map(log => (
                        <div key={log.id} className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${GROUP_COLORS[log.group_type]}`}>
                            {log.quantity}
                          </span>
                          <span>{log.food_name || FOOD_GROUP_LABELS[log.group_type]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-ink-4">
                Sin registros este día
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gym' && (
        <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
          <div className="p-5 border-b border-ink-7">
            <h3 className="font-medium">Sesiones de gimnasio</h3>
          </div>
          {gymSessions.length > 0 ? (
            <div className="divide-y divide-ink-7">
              {gymSessions.map(session => (
                <div key={session.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium capitalize">
                      {session.routine_type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-ink-4">
                      {new Date(session.date).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  {session.cardio_minutes && (
                    <p className="text-sm text-ink-4">
                      + {session.cardio_minutes} min cardio
                      {session.cardio_speed && ` @ ${session.cardio_speed} km/h`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-ink-4">
              Sin sesiones registradas
            </div>
          )}
        </div>
      )}
    </div>
  )
}
