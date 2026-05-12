'use client'

import { Check } from 'lucide-react'

interface SetRowProps {
  index: number
  lbs: string
  reps: string
  completed: boolean
  targetReps: number
  disabled?: boolean
  onLbsChange: (value: string) => void
  onRepsChange: (value: string) => void
  onToggleComplete: () => void
}

export function SetRow({
  index,
  lbs,
  reps,
  completed,
  targetReps,
  disabled = false,
  onLbsChange,
  onRepsChange,
  onToggleComplete,
}: SetRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 text-accent text-xs font-semibold">
          {index + 1}
        </span>
      </div>
      <div className="col-span-4">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="2000"
          className="input text-center py-2.5 text-base"
          placeholder="--"
          value={lbs}
          onChange={(e) => onLbsChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="col-span-4">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="500"
          className="input text-center py-2.5 text-base"
          placeholder={String(targetReps)}
          value={reps}
          onChange={(e) => onRepsChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="col-span-2 flex justify-center">
        <button
          onClick={onToggleComplete}
          aria-label={completed ? 'Marcar serie incompleta' : 'Marcar serie completada'}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            completed
              ? 'bg-accent text-background'
              : 'bg-accent/10 text-accent'
          }`}
          disabled={disabled}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
