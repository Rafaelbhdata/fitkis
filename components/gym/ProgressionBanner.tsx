'use client'

import { TrendingUp, Check } from 'lucide-react'

interface ProgressionSuggestion {
  exerciseId: string
  suggestedLbs: number
  reason: string
}

interface ProgressionBannerProps {
  suggestion: ProgressionSuggestion
  onAccept: () => void
  onDismiss: () => void
}

export function ProgressionBanner({ suggestion, onAccept, onDismiss }: ProgressionBannerProps) {
  return (
    <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 animate-scale-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-accent text-sm">¡Hora de subir peso!</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {suggestion.reason}
          </p>
          <p className="text-sm font-semibold text-accent mt-1">
            Nuevo peso sugerido: {suggestion.suggestedLbs} lbs
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onAccept}
          className="flex-1 btn-primary text-sm py-2"
        >
          <Check className="w-4 h-4 mr-1" />
          Aplicar
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 btn-secondary text-sm py-2"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
