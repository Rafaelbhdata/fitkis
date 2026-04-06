'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, X, HelpCircle, Timer } from 'lucide-react'
import { RestTimer, ExerciseInstructions, ProgressionBanner, SetRow } from '@/components/gym'
import { ROUTINES, FEELING_OPTIONS } from '@/lib/constants'
import { getRoutineName, formatDuration } from '@/lib/utils'
import { useUser, useSupabase } from '@/lib/hooks'
import type { RoutineType, Feeling, GymSession, SessionSet } from '@/types'

interface SetData {
  lbs: string
  reps: string
  completed: boolean
}

interface ExerciseData {
  sets: SetData[]
  feeling: Feeling | null
  equipment: string
}

interface ProgressionSuggestion {
  exerciseId: string
  suggestedLbs: number
  reason: string
}

// Helper to parse reps string like '8–10' or '10 por pierna' to get a number
function parseTargetReps(repsStr: string): number {
  const match = repsStr.match(/\d+/)
  return match ? parseInt(match[0]) : 10
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = params.id === 'new'
  const sessionId = isNew ? null : params.id as string

  // Get routine from URL params for new sessions
  const routineFromUrl = searchParams.get('routine') as RoutineType | null

  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()

  // Use routine from URL if available, otherwise default to upper_a
  const routineType = routineFromUrl || 'upper_a' as RoutineType
  const routine = ROUTINES[routineType]
  const exercises = routine?.exercises || []

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseData, setExerciseData] = useState<Record<string, ExerciseData>>({})
  const [cardioMinutes, setCardioMinutes] = useState('')
  const [cardioSpeed, setCardioSpeed] = useState('')
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [progressionSuggestions, setProgressionSuggestions] = useState<ProgressionSuggestion[]>([])
  const [viewMode, setViewMode] = useState(false)
  const [sessionRoutineType, setSessionRoutineType] = useState<RoutineType>(routineType)

  // Timer state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Rest timer state
  const [restSeconds, setRestSeconds] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [restPreset, setRestPreset] = useState(90) // Default 90 seconds
  const restTimerRef = useRef<NodeJS.Timeout | null>(null)
  const REST_PRESETS = [60, 90, 120, 180]

  // Instructions state
  const [showInstructions, setShowInstructions] = useState(false)

  // Dismissed progression suggestions
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  const displayExercises = viewMode ? ROUTINES[sessionRoutineType]?.exercises || [] : exercises
  const currentExercise = displayExercises[currentExerciseIndex]
  const currentData = exerciseData[currentExercise?.id] || {
    sets: Array(currentExercise?.sets || 3).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
    feeling: null,
    equipment: currentExercise?.equipment || '',
  }

  // Start timer when session begins
  useEffect(() => {
    if (isNew && !viewMode && !sessionStartTime) {
      setSessionStartTime(new Date())
    }
  }, [isNew, viewMode])

  // Timer interval
  useEffect(() => {
    if (sessionStartTime && !viewMode) {
      timerRef.current = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        setElapsedSeconds(elapsed)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [sessionStartTime, viewMode])

  // Rest timer countdown
  useEffect(() => {
    if (isResting && !isPaused && restSeconds > 0) {
      restTimerRef.current = setInterval(() => {
        setRestSeconds(prev => {
          if (prev <= 1) {
            // Timer finished - vibrate and show notification
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200])
            }
            setIsResting(false)
            setIsPaused(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current)
      }
    }
  }, [isResting, isPaused, restSeconds])

  // Start rest timer function
  const startRestTimer = (seconds?: number) => {
    const time = seconds || restPreset
    setRestSeconds(time)
    setRestPreset(time)
    setIsResting(true)
    setIsPaused(false)
  }

  // Skip/dismiss rest timer
  const skipRestTimer = () => {
    setIsResting(false)
    setRestSeconds(0)
    setIsPaused(false)
  }

  // Reset rest timer
  const resetRestTimer = () => {
    setRestSeconds(restPreset)
    setIsPaused(false)
  }

  // Toggle pause rest timer
  const togglePauseRest = () => {
    setIsPaused(prev => !prev)
  }

  useEffect(() => {
    if (user && isNew) {
      initializeSession()
    } else if (user && sessionId) {
      loadSession()
    }
  }, [user])

  const initializeSession = async () => {
    const initialData: Record<string, ExerciseData> = {}
    exercises.forEach(ex => {
      initialData[ex.id] = {
        sets: Array(ex.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
        feeling: null,
        equipment: ex.equipment,
      }
    })
    setExerciseData(initialData)
    await checkProgression()
    setLoading(false)
  }

  const loadSession = async () => {
    if (!sessionId) {
      router.push('/gym/history')
      return
    }

    setLoading(true)
    setViewMode(true)

    const { data: session } = await supabase
      .from('gym_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    const typedSession = session as GymSession | null

    if (!typedSession) {
      router.push('/gym/history')
      return
    }

    setSessionRoutineType(typedSession.routine_type as RoutineType)
    if (typedSession.cardio_minutes) setCardioMinutes(String(typedSession.cardio_minutes))
    if (typedSession.cardio_speed) setCardioSpeed(String(typedSession.cardio_speed))
    if (typedSession.duration_seconds) setElapsedSeconds(typedSession.duration_seconds)

    const { data: sets } = await supabase
      .from('session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number')

    const typedSets = sets as SessionSet[] | null
    const loadedData: Record<string, ExerciseData> = {}
    const routineExercises = ROUTINES[typedSession.routine_type as RoutineType]?.exercises || []

    routineExercises.forEach(ex => {
      const exerciseSets = typedSets?.filter(s => s.exercise_id === ex.id) || []
      const feeling = exerciseSets[0]?.feeling as Feeling | null

      loadedData[ex.id] = {
        sets: exerciseSets.length > 0
          ? exerciseSets.map(s => ({
              lbs: s.lbs ? String(s.lbs) : '',
              reps: s.reps ? String(s.reps) : '',
              completed: true,
            }))
          : Array(ex.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
        feeling,
        equipment: ex.equipment,
      }
    })

    setExerciseData(loadedData)
    setLoading(false)
  }

  const checkProgression = async () => {
    if (!user) return

    const { data: pastSessions } = await supabase
      .from('gym_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('routine_type', routineType)
      .order('date', { ascending: false })
      .limit(2)

    const typedPastSessions = pastSessions as { id: string }[] | null
    if (!typedPastSessions || typedPastSessions.length < 2) return

    const sessionIds = typedPastSessions.map(s => s.id)
    const { data: pastSets } = await supabase
      .from('session_sets')
      .select('*')
      .in('session_id', sessionIds)

    const typedPastSets = pastSets as SessionSet[] | null
    if (!typedPastSets) return

    const suggestions: ProgressionSuggestion[] = []

    exercises.forEach(exercise => {
      const exerciseSets = typedPastSets.filter(s => s.exercise_id === exercise.id)
      const session1Sets = exerciseSets.filter(s => s.session_id === typedPastSessions[0].id)
      const session2Sets = exerciseSets.filter(s => s.session_id === typedPastSessions[1].id)

      if (session1Sets.length === 0 || session2Sets.length === 0) return

      const targetReps = parseTargetReps(exercise.reps)
      const session1Complete = session1Sets.every(s => s.reps && s.reps >= targetReps)
      const session2Complete = session2Sets.every(s => s.reps && s.reps >= targetReps)

      if (session1Complete && session2Complete) {
        const lastWeight = Math.max(...session1Sets.map(s => s.lbs || 0))
        if (lastWeight > 0) {
          suggestions.push({
            exerciseId: exercise.id,
            suggestedLbs: lastWeight + 5,
            reason: `Completaste todas las reps en las últimas 2 sesiones`,
          })
        }
      }
    })

    setProgressionSuggestions(suggestions)
  }

  const updateSet = (setIndex: number, field: 'lbs' | 'reps', value: string) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.equipment,
    }
    const newSets = [...current.sets]
    newSets[setIndex] = { ...newSets[setIndex], [field]: value }
    newData[currentExercise.id] = { ...current, sets: newSets }
    setExerciseData(newData)
  }

  const toggleSetComplete = (setIndex: number) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.equipment,
    }
    const newSets = [...current.sets]
    const wasCompleted = newSets[setIndex].completed
    newSets[setIndex] = { ...newSets[setIndex], completed: !wasCompleted }
    newData[currentExercise.id] = { ...current, sets: newSets }
    setExerciseData(newData)

    // Start rest timer when marking a set as complete (not when unchecking)
    if (!wasCompleted && !viewMode) {
      // Check if this is not the last set of the exercise
      const isLastSet = setIndex === newSets.length - 1
      const allSetsComplete = newSets.every(s => s.completed)
      if (!isLastSet || !allSetsComplete) {
        startRestTimer()
      }
    }
  }

  const setFeeling = (feeling: Feeling) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.equipment,
    }
    newData[currentExercise.id] = { ...current, feeling }
    setExerciseData(newData)
  }

  const selectEquipment = (equipment: string) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.equipment,
    }
    newData[currentExercise.id] = { ...current, equipment }
    setExerciseData(newData)
    setShowEquipmentModal(false)
  }

  const saveSession = async () => {
    if (!user) return
    setSaving(true)

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    try {
      let sessionIdToUse = currentSessionId

      if (!sessionIdToUse) {
        const today = new Date().toISOString().split('T')[0]
        const { data: newSession, error: sessionError } = await (supabase
          .from('gym_sessions') as any)
          .insert({
            user_id: user.id,
            date: today,
            routine_type: routineType,
            duration_seconds: elapsedSeconds,
            cardio_minutes: cardioMinutes ? parseInt(cardioMinutes) : null,
            cardio_speed: cardioSpeed ? parseFloat(cardioSpeed) : null,
          })
          .select()
          .single()

        if (sessionError) throw sessionError
        sessionIdToUse = newSession.id
        setCurrentSessionId(sessionIdToUse)
      } else {
        await (supabase
          .from('gym_sessions') as any)
          .update({
            duration_seconds: elapsedSeconds,
            cardio_minutes: cardioMinutes ? parseInt(cardioMinutes) : null,
            cardio_speed: cardioSpeed ? parseFloat(cardioSpeed) : null,
          })
          .eq('id', sessionIdToUse)
      }

      await (supabase.from('session_sets') as any).delete().eq('session_id', sessionIdToUse)

      const setsToInsert: Array<{
        session_id: string
        exercise_id: string
        set_number: number
        lbs: number | null
        reps: number | null
        feeling: Feeling | null
      }> = []

      Object.entries(exerciseData).forEach(([exerciseId, data]) => {
        data.sets.forEach((set, index) => {
          if (set.lbs || set.reps) {
            setsToInsert.push({
              session_id: sessionIdToUse!,
              exercise_id: exerciseId,
              set_number: index + 1,
              lbs: set.lbs ? parseFloat(set.lbs) : null,
              reps: set.reps ? parseInt(set.reps) : null,
              feeling: data.feeling,
            })
          }
        })
      })

      if (setsToInsert.length > 0) {
        const { error: setsError } = await (supabase
          .from('session_sets') as any)
          .insert(setsToInsert)

        if (setsError) throw setsError
      }

      router.push('/gym')
    } catch (error) {
      console.error('Error saving session:', error)
      alert('Error guardando la sesión')
    } finally {
      setSaving(false)
    }
  }

  const currentSuggestion = progressionSuggestions.find(s => s.exerciseId === currentExercise?.id)

  // Accept progression suggestion - pre-fill weight in all sets
  const acceptSuggestion = (suggestion: ProgressionSuggestion) => {
    const newData = { ...exerciseData }
    const current = newData[suggestion.exerciseId] || {
      sets: Array(currentExercise.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.equipment,
    }
    const newSets = current.sets.map(set => ({
      ...set,
      lbs: String(suggestion.suggestedLbs),
    }))
    newData[suggestion.exerciseId] = { ...current, sets: newSets }
    setExerciseData(newData)
    setDismissedSuggestions(prev => new Set([...Array.from(prev), suggestion.exerciseId]))
  }

  // Dismiss progression suggestion
  const dismissSuggestion = (exerciseId: string) => {
    setDismissedSuggestions(prev => new Set([...Array.from(prev), exerciseId]))
  }

  // Check if current suggestion should show
  const shouldShowSuggestion = currentSuggestion && !dismissedSuggestions.has(currentSuggestion.exerciseId)

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with Timer */}
      <header className="flex items-center gap-4 pt-2">
        <Link href={viewMode ? '/gym/history' : '/gym'} className="btn-icon -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-display-sm">
            {getRoutineName(viewMode ? sessionRoutineType : routineType)}
          </h1>
          <p className="text-xs text-muted">
            Ejercicio {currentExerciseIndex + 1} de {displayExercises.length}
          </p>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-elevated border border-border">
          <Timer className="w-4 h-4 text-accent" />
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>
      </header>

      {/* Progression Suggestion */}
      {shouldShowSuggestion && !viewMode && currentSuggestion && (
        <ProgressionBanner
          suggestion={currentSuggestion}
          onAccept={() => acceptSuggestion(currentSuggestion)}
          onDismiss={() => dismissSuggestion(currentSuggestion.exerciseId)}
        />
      )}

      {/* Exercise Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-display-sm">{currentExercise?.name}</h2>
          <div className="flex items-center gap-2">
            {/* Instructions Toggle */}
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                showInstructions
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-surface-elevated text-muted-foreground hover:text-foreground'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instrucciones</span>
            </button>

            {/* Equipment Selector */}
            <button
              onClick={() => !viewMode && setShowEquipmentModal(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-surface-elevated transition-colors"
              disabled={viewMode}
            >
              {currentData.equipment}
              {!viewMode && <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Instructions Panel */}
        {showInstructions && currentExercise && (
          <ExerciseInstructions exercise={currentExercise} />
        )}

        {/* Target Info */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span>{currentExercise?.sets} series</span>
          <span>×</span>
          <span>{currentExercise?.reps} reps</span>
          {currentExercise?.lastWeight > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-400">Último: {currentExercise?.lastWeight} {currentExercise?.weightUnit}</span>
            </>
          )}
        </div>

        {/* Sets Grid */}
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted mb-3">
            <div className="col-span-2">Serie</div>
            <div className="col-span-4 text-center">Peso (lbs)</div>
            <div className="col-span-4 text-center">Reps</div>
            <div className="col-span-2"></div>
          </div>

          {currentData.sets.map((set, index) => (
            <SetRow
              key={index}
              index={index}
              lbs={set.lbs}
              reps={set.reps}
              completed={set.completed}
              targetReps={parseTargetReps(currentExercise?.reps || '10')}
              disabled={viewMode}
              onLbsChange={(value) => updateSet(index, 'lbs', value)}
              onRepsChange={(value) => updateSet(index, 'reps', value)}
              onToggleComplete={() => !viewMode && toggleSetComplete(index)}
            />
          ))}
        </div>

        {/* Manual Rest Timer Button */}
        {!viewMode && (
          <button
            onClick={() => startRestTimer()}
            className="w-full mt-4 py-3 rounded-xl bg-surface-elevated border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/50 transition-all flex items-center justify-center gap-2"
          >
            <Timer className="w-4 h-4" />
            Iniciar descanso ({Math.floor(restPreset / 60)}:{(restPreset % 60).toString().padStart(2, '0')})
          </button>
        )}

        {/* Feeling */}
        <div className="mt-6 pt-5 border-t border-border">
          <p className="section-label">¿Cómo se sintió?</p>
          <div className="flex flex-wrap gap-2">
            {FEELING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => !viewMode && setFeeling(option.value as Feeling)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  currentData.feeling === option.value
                    ? 'bg-accent text-background'
                    : 'bg-surface-elevated border border-border hover:border-accent/50'
                }`}
                disabled={viewMode}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cardio */}
      {(currentExerciseIndex === displayExercises.length - 1 || viewMode) && (
        <div className="card">
          <p className="section-label">Cardio (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Minutos</label>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                placeholder="15"
                value={cardioMinutes}
                onChange={(e) => setCardioMinutes(e.target.value)}
                disabled={viewMode}
              />
            </div>
            <div>
              <label className="label">Velocidad (km/h)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                className="input"
                placeholder="5.5"
                value={cardioSpeed}
                onChange={(e) => setCardioSpeed(e.target.value)}
                disabled={viewMode}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {!viewMode && (
        <div className="flex gap-3">
          <button
            className="btn-secondary flex-1"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
          >
            Anterior
          </button>
          <button
            className="btn-primary flex-1"
            disabled={saving}
            onClick={() => {
              if (currentExerciseIndex < exercises.length - 1) {
                setCurrentExerciseIndex(currentExerciseIndex + 1)
              } else {
                saveSession()
              }
            }}
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
            ) : currentExerciseIndex < exercises.length - 1 ? (
              'Siguiente'
            ) : (
              'Finalizar'
            )}
          </button>
        </div>
      )}

      {/* Exercise Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {displayExercises.map((ex, index) => {
          const hasData = exerciseData[ex.id]?.sets.some(s => s.lbs || s.reps)
          return (
            <button
              key={ex.id}
              onClick={() => {
                setCurrentExerciseIndex(index)
                setShowInstructions(false)
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                index === currentExerciseIndex
                  ? 'bg-accent text-background'
                  : hasData
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-surface-elevated text-muted border border-border'
              }`}
            >
              {index + 1}. {ex.name.split(' ')[0]}
            </button>
          )
        })}
      </div>

      {/* Rest Timer Modal */}
      {isResting && !viewMode && (
        <RestTimer
          restSeconds={restSeconds}
          restPreset={restPreset}
          isPaused={isPaused}
          onReset={resetRestTimer}
          onTogglePause={togglePauseRest}
          onSkip={skipRestTimer}
          onPresetSelect={(seconds) => startRestTimer(seconds)}
        />
      )}

      {/* Equipment Modal */}
      {showEquipmentModal && currentExercise && (
        <>
          <div className="overlay animate-fade-in" onClick={() => setShowEquipmentModal(false)} />
          <div className="sheet p-6 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-6" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">Seleccionar equipo</h2>
              <button onClick={() => setShowEquipmentModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => selectEquipment(currentExercise.equipment)}
                className="w-full text-left p-4 rounded-xl bg-surface hover:bg-surface-hover transition-colors active:scale-[0.99]"
              >
                <p className="font-medium text-sm">{currentExercise.equipment}</p>
                <p className="text-xs text-muted mt-0.5">Predeterminado</p>
              </button>
              {currentExercise.substitutions.map((sub) => (
                <button
                  key={sub}
                  onClick={() => selectEquipment(sub)}
                  className="w-full text-left p-4 rounded-xl bg-surface hover:bg-surface-hover transition-colors active:scale-[0.99]"
                >
                  <p className="font-medium text-sm">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
