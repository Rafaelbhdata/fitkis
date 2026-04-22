'use client';

type Props = {
  n: number | string;
  unit?: string;
  size?: number;
  color?: string;
};

/**
 * BigNum v5 — Numero grande con unidad
 * Usa fuente serif para el numero y mono para la unidad
 */
export function BigNum({ n, unit, size = 72, color = 'var(--ink)' }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color }}>
      <span
        className="fk-serif"
        style={{
          fontSize: size,
          fontWeight: 300,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
        }}
      >
        {n}
      </span>
      {unit && (
        <span
          className="fk-mono"
          style={{
            fontSize: Math.max(10, size * 0.14),
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}
