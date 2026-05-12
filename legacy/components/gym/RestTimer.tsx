'use client'

import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'

interface RestTimerProps {
  restSeconds: number
  restPreset: number
  isPaused: boolean
  onReset: () => void
  onTogglePause: () => void
  onSkip: () => void
  onPresetSelect: (seconds: number) => void
}

const REST_PRESETS = [60, 90, 120, 180]

export function RestTimer({
  restSeconds,
  restPreset,
  isPaused,
  onReset,
  onTogglePause,
  onSkip,
  onPresetSelect,
}: RestTimerProps) {
  return (
    <>
      <div className="overlay animate-fade-in" onClick={onSkip} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 animate-scale-in">
        <div className="card !p-6 text-center">
          {/* Timer Display */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tiempo de descanso</p>
            <div className="relative">
              {/* Circular Progress */}
              <svg className="w-40 h-40 mx-auto transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-surface-elevated"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-accent transition-all duration-1000"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - restSeconds / restPreset)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-display-xl tabular-nums">
                  {Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={onReset}
              className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-hover transition-colors"
              aria-label="Reiniciar timer"
            >
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={onTogglePause}
              className="w-16 h-16 rounded-full bg-accent text-background flex items-center justify-center hover:bg-accent/90 transition-colors"
              aria-label={isPaused ? 'Continuar' : 'Pausar'}
            >
              {isPaused ? <Play className="w-7 h-7 ml-1" /> : <Pause className="w-7 h-7" />}
            </button>
            <button
              onClick={onSkip}
              className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-hover transition-colors"
              aria-label="Saltar descanso"
            >
              <SkipForward className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex justify-center gap-2">
            {REST_PRESETS.map((seconds) => (
              <button
                key={seconds}
                onClick={() => onPresetSelect(seconds)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  restPreset === seconds && !isPaused
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-surface-elevated border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {seconds >= 60 ? `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}` : `${seconds}s`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
