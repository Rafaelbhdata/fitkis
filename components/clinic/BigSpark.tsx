'use client'

/**
 * Sparkline grande con área degradada y dots. Cada instancia necesita un `label`
 * único para el id del gradient (evita colisiones cuando hay varias en la página).
 */
export function BigSpark({
  values,
  color,
  h = 180,
  label,
  emptyText = 'sin historial aún',
}: {
  values: number[]
  color: string
  h?: number
  label: string
  emptyText?: string
}) {
  if (!values || values.length < 2) {
    return (
      <div
        style={{
          height: h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-5)',
          fontSize: 13,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {emptyText}
      </div>
    )
  }
  const w = 760
  const min = Math.min(...values)
  const max = Math.max(...values)
  const r = max - min || 1
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 20) + 10,
    h - ((v - min) / r) * (h - 30) - 16,
  ])
  const d = pts
    .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const area = `${d} L${last[0]} ${h - 4} L${first[0]} ${h - 4} Z`

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${label})`} />
      <path
        d={d}
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {pts.map((pt, i) => (
        <circle
          key={i}
          cx={pt[0]}
          cy={pt[1]}
          r={i === pts.length - 1 ? 3.5 : 2}
          fill={i === pts.length - 1 ? color : '#fff'}
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}
