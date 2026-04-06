'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ROUTINES, ROUTINE_SCHEDULE } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import { ChevronRight, ChevronLeft, Play, History, Dumbbell, Zap, Clock, Coffee, HelpCircle, ChevronDown, TrendingUp } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import type { GymSession, SessionSet, RoutineType, Routine } from '@/types'

// Week starts on Monday (index 0 = Monday, index 6 = Sunday)
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Convert UI index (0=Mon) to JS day (0=Sun): (uiIndex + 1) % 7
const uiIndexToJsDay = (uiIndex: number) => (uiIndex + 1) % 7
// Convert JS day (0=Sun) to UI index (0=Mon): (jsDay + 6) % 7
const jsDayToUiIndex = (jsDay: number) => (jsDay + 6) % 7

interface LastSessionData {
  session: GymSession
  sets: SessionSet[]
}

export default function GymPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState(jsDayToUiIndex(today.getDay()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [lastSession, setLastSession] = useState<LastSessionData | null>(null)
  const [showLastSession, setShowLastSession] = useState(false)
  const [showRoutineSelector, setShowRoutineSelector] = useState(false)
  const [overrideRoutine, setOverrideRoutine] = useState<string | null>(null)

  // Get the week dates based on offset (week starts on Monday)
  const getWeekDates = () => {
    const dates: Date[] = []
    const startOfWeek = new Date(today)
    // Calculate Monday of current week: subtract (jsDay + 6) % 7 days
    const jsDay = today.getDay()
    const daysFromMonday = (jsDay + 6) % 7 // 0 if Monday, 1 if Tuesday, ..., 6 if Sunday
    startOfWeek.setDate(today.getDate() - daysFromMonday + (weekOffset * 7))

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates()
  const selectedDate = weekDates[selectedDay]
  const isToday = selectedDate.toDateString() === today.toDateString()

  // Get routine for selected day (convert UI index to JS day for ROUTINE_SCHEDULE lookup)
  const selectedJsDay = uiIndexToJsDay(selectedDay)
  const routineKey = overrideRoutine || ROUTINE_SCHEDULE[selectedJsDay]
  const isRest = routineKey === 'rest' && !overrideRoutine
  const routine: Routine | null = isRest ? null : ROUTINES[routineKey]

  useEffect(() => {
    if (user && routine) {
      loadLastSession(routineKey as RoutineType)
    } else {
      setLastSession(null)
    }
  }, [user, routineKey])

  const loadLastSession = async (type: RoutineType) => {
    if (!user) return
    try {
      const { data: sessionData } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('routine_type', type)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (sessionData) {
        const session = sessionData as GymSession
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
      } else {
        setLastSession(null)
      }
    } catch (err) {
      setLastSession(null)
    }
  }

  const getLastWeight = (exerciseId: string): number | null => {
    if (!lastSession) return null
    const exerciseSets = lastSession.sets.filter(s => s.exercise_id === exerciseId && s.lbs)
    if (exerciseSets.length === 0) return null
    return exerciseSets[0].lbs || null
  }

  const totalSets = routine?.exercises.reduce((acc, e) => acc + e.sets, 0) || 0

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Week Navigation */}
      <div className="card !p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface-hover transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">
            {weekOffset === 0 ? 'Esta semana' :
             weekOffset === -1 ? 'Semana pasada' :
             weekOffset === 1 ? 'Próxima semana' :
             `${weekDates[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
            }
          </span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface-hover transition-colors"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week Calendar */}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, index) => {
            const jsDay = uiIndexToJsDay(index)
            const dayRoutine = ROUTINE_SCHEDULE[jsDay]
            const isSelected = index === selectedDay
            const isDayToday = date.toDateString() === today.toDateString()
            const hasRoutine = dayRoutine !== 'rest'

            return (
              <button
                key={index}
                onClick={() => {
                  setSelectedDay(index)
                  setOverrideRoutine(null)
                }}
                className={`flex flex-col items-center py-3 px-1 rounded-lg transition-all min-h-[52px] ${
                  isSelected
                    ? 'bg-accent text-background'
                    : isDayToday
                      ? 'bg-accent/20 text-accent'
                      : 'hover:bg-surface-elevated'
                }`}
              >
                <span className="text-[10px] font-medium mb-0.5">{DAY_NAMES[index]}</span>
                <span className={`text-sm font-semibold ${isSelected ? '' : isDayToday ? 'text-accent' : ''}`}>
                  {date.getDate()}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  hasRoutine
                    ? isSelected ? 'bg-background' : 'bg-blue-500'
                    : 'bg-transparent'
                }`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Info */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm text-muted-foreground">{DAY_NAMES_FULL[selectedDay]}</p>
          <p className="text-xs text-muted-foreground">
            {selectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        {isToday && (
          <span className="badge-accent">Hoy</span>
        )}
      </div>

      {routine ? (
        <>
          {/* Routine Hero Card */}
          <div className="card bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              {isToday && (
                <Link href={`/gym/session/new?routine=${routineKey}`} className="btn-primary">
                  <Play className="w-4 h-4" />
                  Iniciar
                </Link>
              )}
            </div>

            <p className="stat-label mb-1">{isRest ? 'Rutina seleccionada' : 'Rutina programada'}</p>
            <h1 className="font-display text-display-md mb-3">
              {routine.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-3">{routine.subtitle}</p>

            {/* Muscle tags */}
            <div className="flex flex-wrap gap-2">
              {routine.muscles.map((muscle) => (
                <span
                  key={muscle}
                  className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>

          {/* Stats Row - 3 cols on mobile, 4 on desktop when we have more stats */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ejercicios</span>
              </div>
              <p className="font-display text-display-sm">{routine.exercises.length}</p>
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
              <p className="font-display text-display-sm">~{routine.estimatedMinutes}m</p>
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
                      {lastSession.session.duration_seconds && (
                        <span> · {formatDuration(lastSession.session.duration_seconds)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showLastSession ? 'rotate-180' : ''}`} />
              </button>

              {showLastSession && (
                <div className="px-4 pb-4 space-y-2 border-t border-border pt-3 animate-slide-up">
                  <p className="text-xs text-muted-foreground mb-3">Pesos utilizados:</p>
                  {routine.exercises.map((exercise) => {
                    const lastWeight = getLastWeight(exercise.id)
                    return (
                      <div key={exercise.id} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-muted-foreground truncate flex-1 mr-3">{exercise.name}</span>
                        {lastWeight ? (
                          <span className="text-sm font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                            {lastWeight} lbs
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
              <span className="text-xs text-muted-foreground">{routine.exercises.length} total</span>
            </div>
            <div className="space-y-0">
              {routine.exercises.map((exercise, index) => {
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
                      <p className="text-xs text-muted-foreground">{exercise.equipment}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{exercise.sets}×{exercise.reps}</p>
                      {(lastWeight || exercise.lastWeight > 0) && (
                        <p className="text-[10px] text-amber-400 font-medium">
                          → {lastWeight || exercise.lastWeight} {exercise.weightUnit}
                        </p>
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
        <>
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-surface-elevated flex items-center justify-center">
              <Coffee className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-display-md mb-2">Día de descanso</h1>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-6">
              Tu cuerpo necesita recuperarse. Aprovecha para descansar, estirarte y volver con más fuerza.
            </p>
            <button
              onClick={() => setShowRoutineSelector(!showRoutineSelector)}
              className="btn-secondary mx-auto"
            >
              Ver rutinas de todos modos
            </button>
          </div>

          {/* Routine Selector for Rest Days */}
          {showRoutineSelector && (
            <div className="card animate-slide-up">
              <p className="text-sm font-medium mb-3">Selecciona una rutina</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROUTINES).map(([key, r]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setOverrideRoutine(key)
                      setShowRoutineSelector(false)
                    }}
                    className="p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors text-left"
                  >
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* History & Progress Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/gym/history" className="card-interactive flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">Historial</p>
            <p className="text-xs text-muted-foreground truncate">Sesiones anteriores</p>
          </div>
        </Link>
        <Link href="/gym/progress" className="card-interactive flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">Progresión</p>
            <p className="text-xs text-muted-foreground truncate">Gráficas de peso</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
