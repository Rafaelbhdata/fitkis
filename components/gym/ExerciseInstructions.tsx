'use client'

import { Lightbulb, Scale } from 'lucide-react'
import type { Exercise } from '@/types'

interface ExerciseInstructionsProps {
  exercise: Exercise
}

export function ExerciseInstructions({ exercise }: ExerciseInstructionsProps) {
  return (
    <div className="mb-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 animate-slide-up">
      {/* Instructions */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Pasos</p>
        <ol className="space-y-2">
          {exercise.instructions.map((instruction, index) => (
            <li key={index} className="flex gap-3 text-sm text-muted-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold flex items-center justify-center">
                {index + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Tip */}
      {exercise.tip && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">{exercise.tip}</p>
          </div>
        </div>
      )}

      {/* Weight Note */}
      {exercise.weightNote && (
        <div className="p-3 rounded-lg bg-surface-elevated border border-border">
          <div className="flex items-start gap-2">
            <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{exercise.weightNote}</p>
          </div>
        </div>
      )}
    </div>
  )
}
