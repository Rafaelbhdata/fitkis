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
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2M12 22v-2m5-1.34-1-1.73M11 10.27 7 3.34m13.66 13.66-1.73-1M3.34 7l1.73 1M14 12h8M2 12h2m18.66-5-1.73 1M3.34 17l1.73-1m13.93-13.66-1 1.73M11 13.73l-4 6.93" />
    </svg>
  ),
  people: (p: IcProps = {}) => (
    <svg {...base(16)} {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  dashboard: (p: IcProps = {}) => (
    <svg {...base(16)} strokeLinejoin="miter" {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
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
  alert: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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
  send: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  trash: (p: IcProps = {}) => (
    <svg {...base()} {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
}
