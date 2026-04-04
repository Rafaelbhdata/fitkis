import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, formatDate } from '@/lib/utils'
import { ROUTINES } from '@/lib/constants'
import { ChevronRight, Calendar, Dumbbell } from 'lucide-react'

export default function GymPage() {
  const today = new Date()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const exercises = routineType ? ROUTINES[routineType] : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Gym</h1>
        <p className="text-muted capitalize">{formatDate(today)}</p>
      </header>

      {routineType ? (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted">Rutina de hoy</p>
                <h2 className="font-display text-xl font-semibold">{getRoutineName(routineType)}</h2>
              </div>
              <Link
                href={`/gym/session/new`}
                className="btn-primary flex items-center gap-2"
              >
                <Dumbbell className="w-5 h-5" />
                Iniciar
              </Link>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-sm text-muted">{exercise.defaultEquipment}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted">
                    {exercise.targetSets}×{exercise.targetReps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
            <Calendar className="w-8 h-8 text-muted" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">Día de descanso</h2>
          <p className="text-muted">Recupera energía para la próxima sesión</p>
        </div>
      )}

      <Link
        href="/gym/history"
        className="card flex items-center justify-between"
      >
        <span className="font-medium">Ver historial de sesiones</span>
        <ChevronRight className="w-5 h-5 text-muted" />
      </Link>
    </div>
  )
}
