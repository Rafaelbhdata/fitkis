import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, formatDate } from '@/lib/utils'
import { ROUTINES } from '@/lib/constants'
import { ChevronRight, Calendar, Play, History } from 'lucide-react'

export default function GymPage() {
  const today = new Date()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const exercises = routineType ? ROUTINES[routineType] : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="pt-2">
        <p className="text-sm text-muted-foreground mb-1 capitalize">{formatDate(today)}</p>
        <h1 className="font-display text-display-md text-foreground">Gym</h1>
      </header>

      {routineType ? (
        <>
          {/* Today's Routine Card */}
          <div className="card-highlight">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="section-label !mb-1">Rutina de hoy</p>
                <h2 className="font-display text-display-sm">{getRoutineName(routineType)}</h2>
              </div>
              <Link
                href="/gym/session/new"
                className="btn-primary"
              >
                <Play className="w-4 h-4" />
                Iniciar
              </Link>
            </div>

            {/* Exercise List */}
            <div className="space-y-0">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="list-item"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 text-accent text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{exercise.name}</p>
                      <p className="text-xs text-muted">{exercise.defaultEquipment}</p>
                    </div>
                  </div>
                  <span className="badge">
                    {exercise.targetSets}×{exercise.targetReps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Rest Day */
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
            <Calendar className="w-7 h-7 text-muted" />
          </div>
          <h2 className="font-display text-display-sm mb-2">Día de descanso</h2>
          <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
            Recupera energía para tu próxima sesión
          </p>
        </div>
      )}

      {/* History Link */}
      <Link href="/gym/history" className="card-interactive flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center">
            <History className="w-5 h-5 text-muted" />
          </div>
          <span className="font-medium text-sm">Historial de sesiones</span>
        </div>
        <ChevronRight className="w-5 h-5 text-muted" />
      </Link>
    </div>
  )
}
