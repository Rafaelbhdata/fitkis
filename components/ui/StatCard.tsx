'use client'

import { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: ReactNode
  unit?: string
  delta?: string
  deltaTone?: 'positive' | 'negative' | 'neutral'
  footer?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const DELTA_CLASS = {
  positive: 'text-lime',
  negative: 'text-pink',
  neutral: 'text-muted-foreground',
}

/**
 * Stat card with mono uppercase label + hero number + optional delta/sparkline footer.
 */
export default function StatCard({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  footer,
  className = '',
  size = 'md',
}: StatCardProps) {
  const valueSize =
    size === 'lg'
      ? 'text-[44px] leading-none'
      : size === 'sm'
        ? 'text-2xl leading-none'
        : 'text-[34px] leading-none'

  return (
    <div className={`stat-card ${size === 'lg' ? 'stat-card-lg' : ''} ${className}`}>
      <div className="stat-label mb-3">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display font-semibold tabular-nums tracking-[-0.03em] text-foreground ${valueSize}`}>
          {value}
        </span>
        {unit && <span className="font-mono text-sm text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <div className={`font-mono text-[11px] mt-1 ${DELTA_CLASS[deltaTone]}`}>
          {delta}
        </div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}
