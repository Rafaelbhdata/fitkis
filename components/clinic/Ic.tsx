'use client'

import type { SVGProps } from 'react'

/**
 * Ic — Set de iconos de Fitkis v5 (estilo Lucide, stroke 1.8).
 *
 * Espejo del prototipo `kit.jsx`. Cada icono acepta props SVG estándar
 * (width, height, color via stroke, className, etc).
 *
 * Para iconos no listados aquí, importa directo de `lucide-react`.
 */

type IcProps = Omit<SVGProps<SVGSVGElement>, 'children'>

const base = (size: number = 14): IcProps => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export const Ic = {
  plus: (p: IcProps = {}) => (
    <svg {...base()} strokeWidth={2} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: (p: IcProps = {}) => (
    <svg {...base()} strokeWidth={2.5} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrow: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  chevR: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  chevL: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevD: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  apple: (p: IcProps = {}) => (
    <svg {...base(16)} {...p}>
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <path d="M10 2c1 .5 2 2 2 5" />
    </svg>
  ),
  book: (p: IcProps = {}) => (
    <svg {...base(16)} {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  spark: (p: IcProps = {}) => (
    <svg {...base(14)} fill="currentColor" stroke="none" {...p}>
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
    </svg>
  ),
  settings: (p: IcProps = {}) => (
    <svg {...base(16)} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8L7 17M17 7l2.8-2.8" />
    </svg>
  ),
  grid: (p: IcProps = {}) => (
    <svg {...base(16)} strokeLinejoin="miter" {...p}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  share: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  ),
  flame: (p: IcProps = {}) => (
    <svg {...base(14)} fill="currentColor" stroke="none" {...p}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  search: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  cal: (p: IcProps = {}) => (
    <svg {...base(16)} {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
}
