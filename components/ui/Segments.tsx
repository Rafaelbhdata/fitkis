'use client';

type Props = {
  value: number;
  max: number;
  color?: string;
  h?: number;
  gap?: number;
};

/**
 * Segments v5 — Barra de progreso segmentada
 * Usala para: macros, grupos alimenticios, racha de habitos
 */
export function Segments({ value, max, color = 'var(--ink)', h = 3, gap = 2 }: Props) {
  const segs = [];
  for (let i = 0; i < max; i++) {
    segs.push(
      <div
        key={i}
        style={{
          flex: 1,
          height: h,
          borderRadius: h,
          background: i < value ? color : 'var(--ink-7)',
          transition: 'background 0.2s ease-out',
        }}
      />
    );
  }
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {segs}
    </div>
  );
}
