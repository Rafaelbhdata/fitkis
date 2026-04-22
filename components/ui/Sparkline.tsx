'use client';

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  dotted?: boolean;
  showEndDot?: boolean;
  strokeWidth?: number;
  className?: string;
};

/**
 * Sparkline v5 — Grafica de linea minimalista
 * Normaliza automaticamente los valores.
 */
export default function Sparkline({
  values,
  width = 120,
  height = 32,
  color = 'var(--ink)',
  fill = false,
  dotted = false,
  showEndDot = true,
  strokeWidth = 1.5,
  className = '',
}: SparklineProps) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1 || 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
    >
      {fill && <path d={area} fill={color} opacity="0.1" />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dotted ? '3 3' : '0'}
      />
      {showEndDot && lastPoint && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.5" fill={color} />
      )}
    </svg>
  );
}

// Named export
export { Sparkline };
