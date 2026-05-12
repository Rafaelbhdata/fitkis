'use client'

type Props = {
  values: number[]
  w?: number
  h?: number
  color?: string
  /**
   * - 'up'   → verde si la tendencia sube (ej. músculo)
   * - 'down' → verde si la tendencia baja (ej. peso en plan de pérdida)
   * - 'auto' → usa `color`
   */
  trend?: 'up' | 'down' | 'auto'
}

/**
 * MiniSpark v5 — sparkline pequeño con baseline punteada y dos puntos.
 *
 * Versión específica para tablas (vista lista de pacientes). Para gráficas
 * grandes (vista detalle) usa el `BigSpark` de la página de detalle o el
 * `Sparkline` general en `components/ui/Sparkline.tsx`.
 */
export function MiniSpark({
  values,
  w = 92,
  h = 28,
  color = 'var(--ink)',
  trend = 'auto',
}: Props) {
  if (!values || values.length < 2) {
    return (
      <span className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-5)' }}>
        sin datos
      </span>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const r = max - min || 1
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 4) + 2,
    h - ((v - min) / r) * (h - 8) - 4,
  ])
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const first = pts[0]
  const last = pts[pts.length - 1]
  const dir = values[values.length - 1] - values[0]
  const trendCol =
    trend === 'up'
      ? dir > 0
        ? 'var(--leaf)'
        : 'var(--berry)'
      : trend === 'down'
        ? dir < 0
          ? 'var(--leaf)'
          : 'var(--berry)'
        : color

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <line x1="0" y1={h - 4} x2={w} y2={h - 4} stroke="var(--ink-7)" strokeDasharray="2 3" />
      <path
        d={d}
        stroke={trendCol}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      <circle cx={first[0]} cy={first[1]} r="1.6" fill="var(--ink-6)" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={trendCol} />
    </svg>
  )
}

/**
 * Delta — etiqueta "↑/↓ X.X{unit}" con color según la dirección.
 */
export function Delta({
  values,
  unit = 'kg',
  invert = false,
}: {
  values: number[]
  unit?: string
  invert?: boolean
}) {
  if (!values || values.length < 2)
    return <span style={{ color: 'var(--ink-5)', fontSize: 11 }}>—</span>
  const d = values[values.length - 1] - values[0]
  const good = invert ? d > 0 : d < 0
  const col = Math.abs(d) < 0.05 ? 'var(--ink-4)' : good ? 'var(--leaf)' : 'var(--berry)'
  const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '·'
  return (
    <span className="fk-mono" style={{ fontSize: 11, color: col, fontWeight: 500 }}>
      {arrow} {Math.abs(d).toFixed(1)}
      {unit}
    </span>
  )
}
