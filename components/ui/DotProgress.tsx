'use client'

type DotProgressProps = {
  value: number
  max: number
  color?: string
  size?: number
  gap?: number
  className?: string
}

/**
 * Dots used for SMAE equivalents. 1 dot = 1 equivalente.
 * Filled dots use `color`; empty dots use neutral border surface.
 */
export default function DotProgress({
  value,
  max,
  color = '#22e4d9',
  size = 10,
  gap = 4,
  className = '',
}: DotProgressProps) {
  const safeValue = Math.max(0, Math.min(max, value))
  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < safeValue
        return (
          <span
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              background: filled ? color : 'rgba(255,255,255,0.06)',
              border: filled ? 'none' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: filled ? `0 0 8px ${color}80` : undefined,
              transition: 'all 150ms ease',
            }}
          />
        )
      })}
    </div>
  )
}
