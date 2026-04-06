'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName } from '@/lib/utils'
import { ROUTINES } from '@/lib/constants'
import { ChevronRight, ChevronDown, Play, History, Dumbbell, Zap, Clock } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import type { GymSession, SessionSet, RoutineType } from '@/types'

interface LastSessionData {
  session: GymSession
  sets: SessionSet[]
}

export default function GymPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const exercises = routineType ? ROUTINES[routineType] : []

  const [lastSession, setLastSession] = useState<LastSessionData | null>(null)
  const [showLastSession, setShowLastSession] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && routineType) {
      loadLastSession()
    } else {
      setLoading(false)
    }
  }, [user, routineType])

  const loadLastSession = async () => {
    if (!user || !routineType) return
    setLoading(true)
    try {
      // Get the most recent session of this routine type
      const { data: sessionData } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('routine_type', routineType)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (sessionData) {
        const session = sessionData as GymSession
        // Get the sets for this session
        const { data: setsData } = await supabase
          .from('session_sets')
          .select('*')
          .eq('session_id', session.id)
          .order('exercise_id')
          .order('set_number')

        setLastSession({
          session,
          sets: (setsData || []) as SessionSet[]
        })
      }
    } catch (err) {
      // No previous session found, that's ok
    }
    setLoading(false)
  }

  // Get muscle groups being worked
  const getMuscleGroups = (type: string | null) => {
    if (!type) return []
    const groups: Record<string, string[]> = {
      'upper_a': ['Pecho', 'Hombros', 'Tríceps'],
      'upper_b': ['Espalda', 'Bíceps'],
      'lower_a': ['Cuádriceps', 'Glúteos'],
      'lower_b': ['Isquiotibiales', 'Glúteos', 'Core'],
    }
    return groups[type] || []
  }

  // Get the weight used for an exercise in the last session
  const getLastWeight = (exerciseId: string): { lbs: number; reps: number } | null => {
    if (!lastSession) return null
    const exerciseSets = lastSession.sets.filter(s => s.exercise_id === exerciseId && s.lbs)
    if (exerciseSets.length === 0) return null
    // Return the weight from the first set (typically the working weight)
    const firstSet = exerciseSets[0]
    return firstSet.lbs ? { lbs: firstSet.lbs, reps: firstSet.reps || 0 } : null
  }

  const muscleGroups = getMuscleGroups(routineType)
  const totalSets = exercises.reduce((acc, e) => acc + e.targetSets, 0)

  return (
    <div className="space-y-4 animate-fade-in">
      {routineType ? (
        <>
          {/* Hero Card */}
          <div className="card bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <Link href="/gym/session/new" className="btn-primary">
                <Play className="w-4 h-4" />
                Iniciar
              </Link>
            </div>

            <p className="stat-label mb-1">Rutina de hoy</p>
            <h1 className="font-display text-display-md mb-3">
              {getRoutineName(routineType)}
            </h1>

            {/* Muscle tags */}
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((group) => (
                <span
                  key={group}
                  className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300"
                >
                  {group}
                </span>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ejercicios</span>
              </div>
              <p className="font-display text-display-sm">{exercises.length}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Series</span>
              </div>
              <p className="font-display text-display-sm">{totalSets}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprox.</span>
              </div>
              <p className="font-display text-display-sm">~{Math.round(totalSets * 2.5)}m</p>
            </div>
          </div>

          {/* Last Session (Collapsible) */}
          {lastSession && (
            <div className="card !p-0 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4"
                onClick={() => setShowLastSession(!showLastSession)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <History className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Última sesión</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lastSession.session.date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showLastSession ? 'rotate-180' : ''}`} />
              </button>

              {showLastSession && (
                <div className="px-4 pb-4 space-y-2 border-t border-border pt-3 animate-slide-up">
                  <p className="text-xs text-muted-foreground mb-3">Pesos utilizados:</p>
                  {exercises.map((exercise) => {
                    const lastWeight = getLastWeight(exercise.id)
                    return (
                      <div key={exercise.id} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-muted-foreground truncate flex-1 mr-3">{exercise.name}</span>
                        {lastWeight ? (
                          <span className="text-sm font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                            {lastWeight.lbs} lbs
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Exercise List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Ejercicios</p>
              <span className="text-xs text-muted-foreground">{exercises.length} total</span>
            </div>
            <div className="space-y-0">
              {exercises.map((exercise, index) => {
                const lastWeight = getLastWeight(exercise.id)
                return (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-elevated text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{exercise.defaultEquipment}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{exercise.targetSets}×{exercise.targetReps}</p>
                      {lastWeight && (
                        <p className="text-[10px] text-amber-400 font-medium">→ {lastWeight.lbs} lbs</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        /* Rest Day */
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-surface-elevated flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-display-md mb-2">Día de descanso</h1>
          <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
            Tu cuerpo necesita recuperarse. Aprovecha para descansar y volver con más fuerza.
          </p>
        </div>
      )}

      {/* History Link */}
      <Link href="/gym/history" className="card-interactive flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
            <History className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Historial</p>
            <p className="text-xs text-muted-foreground">Ver sesiones anteriores</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}
