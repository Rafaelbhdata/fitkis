'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Printer, Calendar } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import type { FoodGroup, MealType, WeightLog, FoodLog, GymSession, DietConfig } from '@/types'

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  snack1: 'Snack 1',
  comida: 'Comida',
  snack2: 'Snack 2',
  cena: 'Cena',
  snack3: 'Snack 3',
}

export default function PatientReportPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string
  const { user } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  // Data
  const [practitionerName, setPractitionerName] = useState('')
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [gymSessions, setGymSessions] = useState<GymSession[]>([])
  const [dietConfig, setDietConfig] = useState<DietConfig | null>(null)

  useEffect(() => {
    if (user && patientId) {
      loadReportData()
    }
  }, [user, patientId, dateRange])

  const loadReportData = async () => {
    setLoading(true)

    try {
      // Get practitioner name
      const { data: practitioner } = await (supabase as any)
        .from('practitioners')
        .select('display_name')
        .eq('user_id', user?.id)
        .single()
      if (practitioner) setPractitionerName(practitioner.display_name)

      // Load weight logs in date range
      const { data: weights } = await (supabase as any)
        .from('weight_logs')
        .select('*')
        .eq('user_id', patientId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
      if (weights) setWeightLogs(weights)

      // Load food logs in date range
      const { data: foods } = await (supabase as any)
        .from('food_logs')
        .select('*')
        .eq('user_id', patientId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date')
        .order('created_at')
      if (foods) setFoodLogs(foods)

      // Load gym sessions in date range
      const { data: sessions } = await (supabase as any)
        .from('gym_sessions')
        .select('*')
        .eq('user_id', patientId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
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

    } catch (err) {
      console.error('Error loading report data:', err)
    }

    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate summary stats
  const weightChange = weightLogs.length >= 2
    ? weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg
    : null

  // Group food logs by date
  const foodByDate = foodLogs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {} as Record<string, FoodLog[]>)

  // Calculate daily averages
  const dailyTotals = Object.entries(foodByDate).map(([date, logs]) => {
    const totals: Record<FoodGroup, number> = {
      verdura: 0, fruta: 0, carb: 0, proteina: 0, grasa: 0, leguminosa: 0
    }
    logs.forEach(log => {
      totals[log.group_type] += log.quantity
    })
    return { date, totals }
  })

  const avgByGroup: Record<FoodGroup, number> = {
    verdura: 0, fruta: 0, carb: 0, proteina: 0, grasa: 0, leguminosa: 0
  }

  if (dailyTotals.length > 0) {
    dailyTotals.forEach(day => {
      Object.keys(avgByGroup).forEach(g => {
        avgByGroup[g as FoodGroup] += day.totals[g as FoodGroup]
      })
    })
    Object.keys(avgByGroup).forEach(g => {
      avgByGroup[g as FoodGroup] = Math.round((avgByGroup[g as FoodGroup] / dailyTotals.length) * 10) / 10
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Generando reporte...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Screen Header (hidden in print) */}
      <div className="print:hidden p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-2xl">Reporte de paciente</h1>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-signal text-white font-medium hover:bg-signal/90"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-4" />
            <span className="text-sm text-ink-4">Rango:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="bg-white rounded-xl px-3 py-2 border border-ink-7 text-sm"
          />
          <span className="text-ink-4">a</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="bg-white rounded-xl px-3 py-2 border border-ink-7 text-sm"
          />
        </div>
      </div>

      {/* Printable Report */}
      <div className="p-4 md:p-8 print:p-8 max-w-4xl mx-auto">
        {/* Report Header */}
        <div className="border-b-2 border-ink pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">FitKis - Reporte de Seguimiento</h1>
              <p className="text-ink-4">Nutricionista: {practitionerName}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">Paciente ID: {patientId.slice(0, 8)}</p>
              <p className="text-sm text-ink-4">
                {new Date(dateRange.start).toLocaleDateString('es-MX')} - {new Date(dateRange.end).toLocaleDateString('es-MX')}
              </p>
            </div>
          </div>
        </div>

        {/* Weight Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-ink-6 pb-2 mb-4">Peso Corporal</h2>
          {weightLogs.length > 0 ? (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-paper-2 rounded-lg p-3">
                  <div className="text-sm text-ink-4">Inicial</div>
                  <div className="text-xl font-bold">{weightLogs[0].weight_kg} kg</div>
                  <div className="text-xs text-ink-4">{new Date(weightLogs[0].date).toLocaleDateString('es-MX')}</div>
                </div>
                <div className="bg-paper-2 rounded-lg p-3">
                  <div className="text-sm text-ink-4">Actual</div>
                  <div className="text-xl font-bold">{weightLogs[weightLogs.length - 1].weight_kg} kg</div>
                  <div className="text-xs text-ink-4">{new Date(weightLogs[weightLogs.length - 1].date).toLocaleDateString('es-MX')}</div>
                </div>
                <div className="bg-paper-2 rounded-lg p-3">
                  <div className="text-sm text-ink-4">Cambio</div>
                  <div className={`text-xl font-bold ${weightChange && weightChange < 0 ? 'text-leaf' : ''}`}>
                    {weightChange ? (weightChange > 0 ? '+' : '') + weightChange.toFixed(1) : '--'} kg
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-6">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-right py-2">Peso (kg)</th>
                    <th className="text-left py-2 pl-4">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {weightLogs.map(log => (
                    <tr key={log.id} className="border-b border-ink-7">
                      <td className="py-2">{new Date(log.date).toLocaleDateString('es-MX')}</td>
                      <td className="text-right py-2">{log.weight_kg}</td>
                      <td className="py-2 pl-4 text-ink-4">{log.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-ink-4">Sin registros de peso en este período</p>
          )}
        </section>

        {/* Nutrition Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-ink-6 pb-2 mb-4">Alimentación</h2>

          {dietConfig && (
            <div className="bg-paper-2 rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-2">Plan actual (v{dietConfig.version})</h3>
              <div className="grid grid-cols-6 gap-2 text-center text-sm">
                {(['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa'] as FoodGroup[]).map(g => (
                  <div key={g}>
                    <div className="font-bold">{dietConfig[g]}</div>
                    <div className="text-xs text-ink-4">{FOOD_GROUP_LABELS[g].slice(0, 4)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dailyTotals.length > 0 ? (
            <>
              <h3 className="font-medium mb-2">Promedio diario consumido</h3>
              <div className="grid grid-cols-6 gap-2 text-center text-sm mb-4">
                {(['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa'] as FoodGroup[]).map(g => {
                  const avg = avgByGroup[g]
                  const target = dietConfig?.[g] || 0
                  const pct = target > 0 ? Math.round((avg / target) * 100) : 0
                  return (
                    <div key={g} className="bg-paper-2 rounded-lg p-2">
                      <div className="font-bold">{avg}</div>
                      <div className="text-xs text-ink-4">{FOOD_GROUP_LABELS[g].slice(0, 4)}</div>
                      {target > 0 && (
                        <div className={`text-xs ${pct >= 80 && pct <= 120 ? 'text-leaf' : pct < 80 ? 'text-honey' : 'text-berry'}`}>
                          {pct}%
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <h3 className="font-medium mb-2">Detalle por día</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink-6">
                    <th className="text-left py-1">Fecha</th>
                    {(['verdura', 'fruta', 'carb', 'prot', 'grasa', 'legum'] as string[]).map(g => (
                      <th key={g} className="text-center py-1">{g}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyTotals.map(day => (
                    <tr key={day.date} className="border-b border-ink-7">
                      <td className="py-1">{new Date(day.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}</td>
                      {(['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa'] as FoodGroup[]).map(g => (
                        <td key={g} className="text-center py-1">{day.totals[g]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-ink-4">Sin registros de alimentación en este período</p>
          )}
        </section>

        {/* Gym Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-ink-6 pb-2 mb-4">Entrenamiento</h2>
          {gymSessions.length > 0 ? (
            <>
              <p className="mb-2"><strong>{gymSessions.length}</strong> sesiones en el período</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-6">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Rutina</th>
                    <th className="text-left py-2">Cardio</th>
                    <th className="text-left py-2">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {gymSessions.map(session => (
                    <tr key={session.id} className="border-b border-ink-7">
                      <td className="py-2">{new Date(session.date).toLocaleDateString('es-MX')}</td>
                      <td className="py-2 capitalize">{session.routine_type.replace('_', ' ')}</td>
                      <td className="py-2">
                        {session.cardio_minutes
                          ? `${session.cardio_minutes} min${session.cardio_speed ? ` @ ${session.cardio_speed} km/h` : ''}`
                          : '-'}
                      </td>
                      <td className="py-2 text-ink-4">{session.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-ink-4">Sin sesiones de gimnasio en este período</p>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-ink-6 pt-4 text-sm text-ink-4">
          <p>Reporte generado el {new Date().toLocaleDateString('es-MX')} a las {new Date().toLocaleTimeString('es-MX')}</p>
          <p>FitKis - Sistema de seguimiento nutricional</p>
        </footer>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            font-size: 12pt;
            color: black !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-8 {
            padding: 2rem !important;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </>
  )
}
