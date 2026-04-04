'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, Loader2, TrendingUp } from 'lucide-react'
import { ROUTINES, FEELING_OPTIONS } from '@/lib/constants'
import { getRoutineName, getDayOfWeek, getRoutineForDay, getToday } from '@/lib/utils'
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

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'new'
  const sessionId = isNew ? null : params.id as string

  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()

  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek) || 'upper_a'
  const exercises = ROUTINES[routineType]

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
  const [sessionRoutineType, setSessionRoutineType] = useState<RoutineType>(routineType || 'upper_a')

  const currentExercise = exercises[currentExerciseIndex]
  const currentData = exerciseData[currentExercise?.id] || {
    sets: Array(currentExercise?.targetSets || 3).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
    feeling: null,
    equipment: currentExercise?.defaultEquipment || '',
  }

  useEffect(() => {
    if (user && isNew) {
      initializeSession()
    } else if (user && sessionId) {
      loadSession()
    }
  }, [user])

  const initializeSession = async () => {
    // Initialize exercise data with empty sets
    const initialData: Record<string, ExerciseData> = {}
    exercises.forEach(ex => {
      initialData[ex.id] = {
        sets: Array(ex.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
        feeling: null,
        equipment: ex.defaultEquipment,
      }
    })
    setExerciseData(initialData)

    // Check for progression suggestions based on last 2 sessions
    await checkProgression()
    setLoading(false)
  }

  const loadSession = async () => {
    setLoading(true)
    setViewMode(true)

    // Load session
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

    // Load sets
    const { data: sets } = await supabase
      .from('session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number')

    const typedSets = sets as SessionSet[] | null

    // Organize sets by exercise
    const loadedData: Record<string, ExerciseData> = {}
    const routineExercises = ROUTINES[typedSession.routine_type as RoutineType]

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
          : Array(ex.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
        feeling,
        equipment: ex.defaultEquipment,
      }
    })

    setExerciseData(loadedData)
    setLoading(false)
  }

  const checkProgression = async () => {
    if (!user) return

    // Get last 2 sessions of same routine type
    const { data: pastSessions } = await supabase
      .from('gym_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('routine_type', routineType)
      .order('date', { ascending: false })
      .limit(2)

    const typedPastSessions = pastSessions as { id: string }[] | null

    if (!typedPastSessions || typedPastSessions.length < 2) return

    // Get sets from these sessions
    const sessionIds = typedPastSessions.map(s => s.id)
    const { data: pastSets } = await supabase
      .from('session_sets')
      .select('*')
      .in('session_id', sessionIds)

    const typedPastSets = pastSets as SessionSet[] | null

    if (!typedPastSets) return

    // Check each exercise for progression
    const suggestions: ProgressionSuggestion[] = []

    exercises.forEach(exercise => {
      const exerciseSets = typedPastSets.filter(s => s.exercise_id === exercise.id)

      // Group by session
      const session1Sets = exerciseSets.filter(s => s.session_id === typedPastSessions[0].id)
      const session2Sets = exerciseSets.filter(s => s.session_id === typedPastSessions[1].id)

      if (session1Sets.length === 0 || session2Sets.length === 0) return

      // Check if all sets completed target reps in both sessions
      const session1Complete = session1Sets.every(s => s.reps && s.reps >= exercise.targetReps)
      const session2Complete = session2Sets.every(s => s.reps && s.reps >= exercise.targetReps)

      if (session1Complete && session2Complete) {
        // Get the weight used (use max from last session)
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
      sets: Array(currentExercise.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.defaultEquipment,
    }
    const newSets = [...current.sets]
    newSets[setIndex] = { ...newSets[setIndex], [field]: value }
    newData[currentExercise.id] = { ...current, sets: newSets }
    setExerciseData(newData)
  }

  const toggleSetComplete = (setIndex: number) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.defaultEquipment,
    }
    const newSets = [...current.sets]
    newSets[setIndex] = { ...newSets[setIndex], completed: !newSets[setIndex].completed }
    newData[currentExercise.id] = { ...current, sets: newSets }
    setExerciseData(newData)
  }

  const setFeeling = (feeling: Feeling) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.defaultEquipment,
    }
    newData[currentExercise.id] = { ...current, feeling }
    setExerciseData(newData)
  }

  const selectEquipment = (equipment: string) => {
    const newData = { ...exerciseData }
    const current = newData[currentExercise.id] || {
      sets: Array(currentExercise.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
      feeling: null,
      equipment: currentExercise.defaultEquipment,
    }
    newData[currentExercise.id] = { ...current, equipment }
    setExerciseData(newData)
    setShowEquipmentModal(false)
  }

  const saveSession = async () => {
    if (!user) return
    setSaving(true)

    try {
      // Create or get session
      let sessionIdToUse = currentSessionId

      if (!sessionIdToUse) {
        const { data: newSession, error: sessionError } = await (supabase
          .from('gym_sessions') as any)
          .insert({
            user_id: user.id,
            date: getToday(),
            routine_type: routineType,
            cardio_minutes: cardioMinutes ? parseInt(cardioMinutes) : null,
            cardio_speed: cardioSpeed ? parseFloat(cardioSpeed) : null,
          })
          .select()
          .single()

        if (sessionError) throw sessionError
        sessionIdToUse = newSession.id
        setCurrentSessionId(sessionIdToUse)
      } else {
        // Update cardio if editing
        await (supabase
          .from('gym_sessions') as any)
          .update({
            cardio_minutes: cardioMinutes ? parseInt(cardioMinutes) : null,
            cardio_speed: cardioSpeed ? parseFloat(cardioSpeed) : null,
          })
          .eq('id', sessionIdToUse)
      }

      // Delete existing sets and insert new ones
      await (supabase.from('session_sets') as any).delete().eq('session_id', sessionIdToUse)

      // Prepare sets to insert
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
  const displayExercises = viewMode ? ROUTINES[sessionRoutineType] : exercises

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href={viewMode ? '/gym/history' : '/gym'} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold">
            {getRoutineName(viewMode ? sessionRoutineType : routineType)}
          </h1>
          <p className="text-sm text-muted">
            Ejercicio {currentExerciseIndex + 1} de {displayExercises.length}
          </p>
        </div>
      </header>

      {currentSuggestion && !viewMode && (
        <div className="card bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-accent flex-shrink-0" />
            <div>
              <p className="font-medium text-accent">¡Sube el peso!</p>
              <p className="text-sm text-muted">{currentSuggestion.reason}. Prueba con {currentSuggestion.suggestedLbs} lbs</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">{displayExercises[currentExerciseIndex]?.name}</h2>
          <button
            onClick={() => !viewMode && setShowEquipmentModal(true)}
            className="flex items-center gap-1 text-sm text-muted"
            disabled={viewMode}
          >
            {currentData.equipment}
            {!viewMode && <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-sm text-muted mb-2">
            <div className="col-span-2">Serie</div>
            <div className="col-span-4 text-center">Peso (lbs)</div>
            <div className="col-span-4 text-center">Reps</div>
            <div className="col-span-2"></div>
          </div>

          {currentData.sets.map((set, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2">
                <span className="w-8 h-8 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center font-medium">
                  {index + 1}
                </span>
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="decimal"
                  className="input text-center py-2"
                  placeholder="--"
                  value={set.lbs}
                  onChange={(e) => updateSet(index, 'lbs', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="numeric"
                  className="input text-center py-2"
                  placeholder={String(displayExercises[currentExerciseIndex]?.targetReps)}
                  value={set.reps}
                  onChange={(e) => updateSet(index, 'reps', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => !viewMode && toggleSetComplete(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    set.completed ? 'bg-accent' : 'bg-accent/20'
                  }`}
                  disabled={viewMode}
                >
                  <Check className={`w-4 h-4 ${set.completed ? 'text-background' : 'text-accent'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted mb-2">¿Cómo se sintió?</p>
          <div className="flex flex-wrap gap-2">
            {FEELING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => !viewMode && setFeeling(option.value as Feeling)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  currentData.feeling === option.value
                    ? 'bg-accent text-background'
                    : 'bg-surface border border-border hover:border-accent'
                }`}
                disabled={viewMode}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cardio section - show on last exercise or in view mode */}
      {(currentExerciseIndex === displayExercises.length - 1 || viewMode) && (
        <div className="card">
          <h3 className="font-display text-lg font-semibold mb-4">Cardio (opcional)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Minutos</label>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                placeholder="Ej: 15"
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
                placeholder="Ej: 5.5"
                value={cardioSpeed}
                onChange={(e) => setCardioSpeed(e.target.value)}
                disabled={viewMode}
              />
            </div>
          </div>
        </div>
      )}

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
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : currentExerciseIndex < exercises.length - 1 ? (
              'Siguiente'
            ) : (
              'Finalizar'
            )}
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {displayExercises.map((ex, index) => (
          <button
            key={ex.id}
            onClick={() => setCurrentExerciseIndex(index)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
              index === currentExerciseIndex
                ? 'bg-accent text-background'
                : exerciseData[ex.id]?.sets.some(s => s.lbs || s.reps)
                ? 'bg-accent/20 text-accent'
                : 'bg-surface text-muted'
            }`}
          >
            {index + 1}. {ex.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Equipment selection modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-end">
          <div className="w-full bg-surface rounded-t-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Seleccionar equipo</h2>
            <div className="space-y-2">
              <button
                onClick={() => selectEquipment(currentExercise.defaultEquipment)}
                className="w-full text-left p-3 rounded-lg bg-background hover:bg-card-hover transition-colors"
              >
                {currentExercise.defaultEquipment} (predeterminado)
              </button>
              {currentExercise.substitutions.map((sub) => (
                <button
                  key={sub}
                  onClick={() => selectEquipment(sub)}
                  className="w-full text-left p-3 rounded-lg bg-background hover:bg-card-hover transition-colors"
                >
                  {sub}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEquipmentModal(false)}
              className="w-full btn-secondary mt-4"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
