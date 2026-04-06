import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName } from '@/lib/utils'
import { ROUTINES } from '@/lib/constants'
import { ChevronRight, Calendar, Play, History, Dumbbell, Zap } from 'lucide-react'

export default function GymPage() {
  const today = new Date()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const exercises = routineType ? ROUTINES[routineType] : []

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

  const muscleGroups = getMuscleGroups(routineType)

  return (
    <div className="space-y-5 animate-fade-in">
      {routineType ? (
        <>
          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent border border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <Link
                href="/gym/session/new"
                className="btn-primary"
              >
                <Play className="w-4 h-4" />
                Iniciar sesión
              </Link>
            </div>

            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rutina de hoy</p>
            <h2 className="font-display text-display-lg text-foreground mb-3">
              {getRoutineName(routineType)}
            </h2>

            {/* Muscle tags */}
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((group) => (
                <span
                  key={group}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300"
                >
                  {group}
                </span>
              ))}
            </div>

            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card !p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">Ejercicios</span>
              </div>
              <p className="font-display text-display-md">{exercises.length}</p>
            </div>
            <div className="card !p-4">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">Series total</span>
              </div>
              <p className="font-display text-display-md">
                {exercises.reduce((acc, e) => acc + e.targetSets, 0)}
              </p>
            </div>
          </div>

          {/* Exercise List */}
          <div className="card !p-4">
            <p className="text-sm font-medium mb-4">Ejercicios</p>
            <div className="space-y-0">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{exercise.defaultEquipment}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-xs font-medium">
                    {exercise.targetSets}×{exercise.targetReps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Rest Day */
        <div className="card !p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-surface-elevated to-surface flex items-center justify-center">
            <Calendar className="w-9 h-9 text-muted-foreground" />
          </div>
          <h2 className="font-display text-display-md mb-2">Día de descanso</h2>
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
            Tu cuerpo necesita recuperarse. Aprovecha para descansar y volver con más fuerza.
          </p>
        </div>
      )}

      {/* History Link */}
      <Link href="/gym/history" className="card-interactive !p-4 flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-surface-elevated flex items-center justify-center">
            <History className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Historial de sesiones</p>
            <p className="text-xs text-muted-foreground">Ver progreso y sesiones anteriores</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  )
}
