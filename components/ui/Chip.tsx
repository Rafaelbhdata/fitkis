'use client'

import { ReactNode } from 'react'

type Tone = 'default' | 'cyan' | 'pink' | 'lime' | 'amber' | 'violet'

type ChipProps = {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
  onClick?: () => void
}

const TONE: Record<Tone, string> = {
  default: 'bg-surface-elevated border-border text-muted-foreground',
  cyan: 'bg-cyan/10 border-cyan/25 text-cyan',
  pink: 'bg-pink/10 border-pink/25 text-pink',
  lime: 'bg-lime/10 border-lime/25 text-lime',
  amber: 'bg-amber/10 border-amber/25 text-amber',
  violet: 'bg-violet/10 border-violet/25 text-violet',
}

/**
 * Tonal chip — used for status, filters, micro-labels.
 */
export default function Chip({
  tone = 'default',
  icon,
  children,
  className = '',
  onClick,
}: ChipProps) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${TONE[tone]} ${onClick ? 'hover:brightness-125' : ''} ${className}`}
    >
      {icon}
      {children}
    </Tag>
  )
}
