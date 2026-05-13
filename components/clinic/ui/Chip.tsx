'use client'

import type { CSSProperties } from 'react'

/**
 * Estilo inline para chips pequeños de status (uppercase mono).
 * Usado en cards de notas, lista priorizada de reportes, etc.
 */
export function chipStyle(color: string, bg: string): CSSProperties {
  return {
    padding: '3px 10px',
    borderRadius: 999,
    background: bg,
    color,
    fontSize: 10,
    fontFamily: 'var(--f-sans)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }
}
