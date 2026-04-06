'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronDown, TrendingUp, X } from 'lucide-react'
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
  const routineType = (getRoutineForDay(dayOfWeek) || 'upper_a') as RoutineType
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
  const [sessionRoutineType, setSessionRoutineType] = useState<RoutineType>(routineType)

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
    const initialData: Record<string, ExerciseData> = {}
    exercises.forEach(ex => {
      initialData[ex.id] = {
        sets: Array(ex.targetSets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
        feeling: null,
        equipment: ex.defaultEquipment,
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

    const { data: sets } = await supabase
      .from('session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number')

    const typedSets = sets as SessionSet[] | null
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

      const session1Complete = session1Sets.every(s => s.reps && s.reps >= exercise.targetReps)
      const session2Complete = session2Sets.every(s => s.reps && s.reps >= exercise.targetReps)

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
        await (supabase
          .from('gym_sessions') as any)
          .update({
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
  const displayExercises = viewMode ? ROUTINES[sessionRoutineType] : exercises

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
      {/* Header */}
      <header className="flex items-center gap-4 pt-2">
        <Link href={viewMode ? '/gym/history' : '/gym'} className="btn-icon -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-display-sm">
            {getRoutineName(viewMode ? sessionRoutineType : routineType)}
          </h1>
          <p className="text-xs text-muted">
            Ejercicio {currentExerciseIndex + 1} de {displayExercises.length}
          </p>
        </div>
      </header>

      {/* Progression Suggestion */}
      {currentSuggestion && !viewMode && (
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 animate-scale-in">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-accent text-sm">¡Sube el peso!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentSuggestion.reason}. Prueba con {currentSuggestion.suggestedLbs} lbs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-display-sm">{displayExercises[currentExerciseIndex]?.name}</h2>
          <button
            onClick={() => !viewMode && setShowEquipmentModal(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-surface-elevated transition-colors"
            disabled={viewMode}
          >
            {currentData.equipment}
            {!viewMode && <ChevronDown className="w-3 h-3" />}
          </button>
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
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 text-accent text-xs font-semibold">
                  {index + 1}
                </span>
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="decimal"
                  className="input text-center py-2.5 text-sm"
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
                  className="input text-center py-2.5 text-sm"
                  placeholder={String(displayExercises[currentExerciseIndex]?.targetReps)}
                  value={set.reps}
                  onChange={(e) => updateSet(index, 'reps', e.target.value)}
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => !viewMode && toggleSetComplete(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                    set.completed
                      ? 'bg-accent text-background'
                      : 'bg-accent/10 text-accent'
                  }`}
                  disabled={viewMode}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

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
              onClick={() => setCurrentExerciseIndex(index)}
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

      {/* Equipment Modal */}
      {showEquipmentModal && (
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
                onClick={() => selectEquipment(currentExercise.defaultEquipment)}
                className="w-full text-left p-4 rounded-xl bg-surface hover:bg-surface-hover transition-colors active:scale-[0.99]"
              >
                <p className="font-medium text-sm">{currentExercise.defaultEquipment}</p>
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
