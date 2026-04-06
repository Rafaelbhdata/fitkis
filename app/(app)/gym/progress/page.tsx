'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Dumbbell, Zap, Trophy, ChevronDown } from 'lucide-react'
import { ROUTINES } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine
} from 'recharts'
import type { SessionSet, Exercise } from '@/types'

// Get all unique exercises from all routines
const getAllExercises = (): Exercise[] => {
  const exerciseMap = new Map<string, Exercise>()
  Object.values(ROUTINES).forEach(routine => {
    routine.exercises.forEach(ex => {
      if (!exerciseMap.has(ex.id)) {
        exerciseMap.set(ex.id, ex)
      }
    })
  })
  return Array.from(exerciseMap.values())
}

interface ExerciseProgress {
  date: string
  maxWeight: number
  avgWeight: number
  totalVolume: number
  sets: number
}

export default function ProgressPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [allSets, setAllSets] = useState<(SessionSet & { session_date: string })[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  const exercises = getAllExercises()

  useEffect(() => {
    if (user) loadAllSets()
  }, [user])

  useEffect(() => {
    if (exercises.length > 0 && !selectedExercise) {
      setSelectedExercise(exercises[0].id)
    }
  }, [exercises])

  const loadAllSets = async () => {
    setLoading(true)

    // Get all sessions with their sets
    const { data: sessions } = await supabase
      .from('gym_sessions')
      .select('id, date')
      .order('date', { ascending: true })

    if (!sessions || sessions.length === 0) {
      setLoading(false)
      return
    }

    const sessionIds = sessions.map(s => s.id)
    const { data: sets } = await supabase
      .from('session_sets')
      .select('*')
      .in('session_id', sessionIds)

    if (sets) {
      // Map sets to include session date
      const setsWithDate = sets.map(set => {
        const session = sessions.find(s => s.id === set.session_id)
        return {
          ...set,
          session_date: session?.date || ''
        }
      }) as (SessionSet & { session_date: string })[]

      setAllSets(setsWithDate)
    }

    setLoading(false)
  }

  // Get progress data for selected exercise
  const getExerciseProgress = (exerciseId: string): ExerciseProgress[] => {
    const exerciseSets = allSets.filter(s => s.exercise_id === exerciseId && s.lbs && s.lbs > 0)

    // Group by date
    const byDate = new Map<string, typeof exerciseSets>()
    exerciseSets.forEach(set => {
      const existing = byDate.get(set.session_date) || []
      existing.push(set)
      byDate.set(set.session_date, existing)
    })

    const progress: ExerciseProgress[] = []
    byDate.forEach((sets, date) => {
      const weights = sets.map(s => s.lbs || 0)
      const reps = sets.map(s => s.reps || 0)
      const volumes = sets.map((s, i) => (s.lbs || 0) * (s.reps || 0))

      progress.push({
        date,
        maxWeight: Math.max(...weights),
        avgWeight: Math.round(weights.reduce((a, b) => a + b, 0) / weights.length),
        totalVolume: volumes.reduce((a, b) => a + b, 0),
        sets: sets.length
      })
    })

    return progress.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const progressData = selectedExercise ? getExerciseProgress(selectedExercise) : []
  const selectedExerciseData = exercises.find(e => e.id === selectedExercise)

  // Stats
  const currentMax = progressData.length > 0 ? progressData[progressData.length - 1].maxWeight : 0
  const allTimeMax = progressData.length > 0 ? Math.max(...progressData.map(p => p.maxWeight)) : 0
  const firstWeight = progressData.length > 0 ? progressData[0].maxWeight : 0
  const improvement = currentMax - firstWeight

  // Chart domain
  const weights = progressData.map(d => d.maxWeight)
  const minWeight = weights.length > 0 ? Math.min(...weights) - 5 : 0
  const maxWeight = weights.length > 0 ? Math.max(...weights) + 5 : 100

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center gap-4 pt-2">
        <Link href="/gym" className="btn-icon -ml-2" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-display-sm">Progresión</h1>
          <p className="text-xs text-muted-foreground">Evolución de tus pesos</p>
        </div>
      </header>

      {/* Exercise Picker */}
      <button
        onClick={() => setShowExercisePicker(true)}
        className="w-full card !p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{selectedExerciseData?.name || 'Seleccionar ejercicio'}</p>
            <p className="text-xs text-muted-foreground">{selectedExerciseData?.equipment}</p>
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Dumbbell className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual</span>
          </div>
          <p className="font-display text-display-sm">{currentMax}<span className="text-sm text-muted-foreground ml-1">lbs</span></p>
        </div>
        <div className="card !p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">PR</span>
          </div>
          <p className="font-display text-display-sm text-amber-400">{allTimeMax}<span className="text-sm text-muted-foreground ml-1">lbs</span></p>
        </div>
        <div className="card !p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ganancia</span>
          </div>
          <p className={`font-display text-display-sm ${improvement >= 0 ? 'text-success' : 'text-danger'}`}>
            {improvement > 0 ? '+' : ''}{improvement}<span className="text-sm text-muted-foreground ml-1">lbs</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      {progressData.length > 1 ? (
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Peso máximo por sesión</span>
            </div>
            <span className="text-xs text-muted-foreground">{progressData.length} sesiones</span>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minWeight, maxWeight]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                  formatter={(value: number, name: string) => {
                    if (name === 'maxWeight') return [`${value} lbs`, 'Peso máximo']
                    return [value, name]
                  }}
                />
                {allTimeMax > 0 && (
                  <ReferenceLine
                    y={allTimeMax}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                  activeDot={{ fill: '#10b981', strokeWidth: 2, stroke: '#fff', r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-accent rounded" />
              <span>Peso máximo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500 rounded" style={{ borderStyle: 'dashed' }} />
              <span>PR ({allTimeMax} lbs)</span>
            </div>
          </div>
        </div>
      ) : progressData.length === 1 ? (
        <div className="card !p-6 text-center">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Solo hay 1 sesión registrada. Necesitas al menos 2 para ver la tendencia.
          </p>
        </div>
      ) : (
        <div className="card !p-6 text-center">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No hay datos de este ejercicio aún.
          </p>
        </div>
      )}

      {/* History List */}
      {progressData.length > 0 && (
        <div className="card !p-4">
          <p className="text-sm font-medium mb-4">Historial de sesiones</p>
          <div className="space-y-0">
            {[...progressData].reverse().slice(0, 10).map((session, index) => {
              const prev = [...progressData].reverse()[index + 1]
              const diff = prev ? session.maxWeight - prev.maxWeight : 0

              return (
                <div key={session.date} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    {diff !== 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        diff > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff} lbs
                      </span>
                    )}
                    <span className="font-medium tabular-nums">{session.maxWeight} lbs</span>
                    <span className="text-xs text-muted-foreground">({session.sets} sets)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <>
          <div className="overlay animate-fade-in" onClick={() => setShowExercisePicker(false)} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <h2 className="font-display text-display-sm mb-4">Seleccionar ejercicio</h2>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {exercises.map((ex) => {
                const hasData = allSets.some(s => s.exercise_id === ex.id && s.lbs && s.lbs > 0)
                return (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setSelectedExercise(ex.id)
                      setShowExercisePicker(false)
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedExercise === ex.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-surface-elevated hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">{ex.equipment}</p>
                      </div>
                      {hasData && (
                        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
                          Con datos
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
