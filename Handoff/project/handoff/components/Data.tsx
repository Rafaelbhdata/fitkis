export function Spark({
  values,
  w = 120,
  h = 32,
  color = 'currentColor',
  fill = false,
  dotted = false,
}: {
  values: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
  dotted?: boolean;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const r = max - min || 1;
  const pts = values.map(
    (v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / r) * (h - 4) - 2] as [number, number]
  );
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className="block">
      {fill && <path d={d + ` L${w} ${h} L0 ${h} Z`} fill={color} opacity={0.1} />}
      <path
        d={d}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dotted ? '3 3' : '0'}
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

export function BigNum({ n, unit, size = 72 }: { n: string | number; unit?: string; size?: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="font-serif font-light"
        style={{ fontSize: size, letterSpacing: '-0.04em', lineHeight: 0.9 }}
      >
        {n}
      </span>
      {unit && (
        <span
          className="font-mono text-ink-4 uppercase"
          style={{ fontSize: Math.max(10, size * 0.14), letterSpacing: '0.08em' }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

export function Segments({
  value,
  max,
  color = '#0a0a0a',
  h = 3,
  gap = 2,
}: {
  value: number;
  max: number;
  color?: string;
  h?: number;
  gap?: number;
}) {
  return (
    <div className="flex items-center" style={{ gap }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{ height: h, background: i < value ? color : '#e5e5e5' }}
        />
      ))}
    </div>
  );
}
