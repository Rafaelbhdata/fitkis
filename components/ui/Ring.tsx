'use client'

import { ReactNode } from 'react'

type RingProps = {
  value: number
  max?: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  glow?: boolean
  children?: ReactNode
  className?: string
}

/**
 * Vital Ring — SVG circular progress.
 * Usage: <Ring value={72} max={100} color="var(--fk-cyan)">...</Ring>
 */
export default function Ring({
  value,
  max = 100,
  size = 120,
  stroke = 10,
  color = '#22e4d9',
  trackColor = '#1f2740',
  glow = true,
  children,
  className = '',
}: RingProps) {
  const pct = Math.max(0, Math.min(1, value / max))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * pct

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={glow ? { filter: `drop-shadow(0 0 8px ${color}66)` } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
