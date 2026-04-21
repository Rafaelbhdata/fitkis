'use client'

type SparklineProps = {
  values: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
  glow?: boolean
  strokeWidth?: number
  className?: string
}

/**
 * Minimal glowing sparkline. Pass raw numbers; normalization is automatic.
 */
export default function Sparkline({
  values,
  width = 140,
  height = 40,
  color = '#22e4d9',
  fill = true,
  glow = true,
  strokeWidth = 1.75,
  className = '',
}: SparklineProps) {
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1 || 1)

  const points = values.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / span) * (height - 4) - 2
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  const id = `spark-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={glow ? { filter: `drop-shadow(0 0 6px ${color}80)` } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
