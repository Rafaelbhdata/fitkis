'use client';

type Props = {
  w?: number;
  h?: number;
  color?: string;
  strokeWidth?: number;
  active?: boolean;
};

/**
 * PulseLine — firma visual de Fitkis v5.
 * Linea EKG estilizada. Usala:
 *  - Debajo de titulos importantes
 *  - Sobre el icono activo del dock
 *  - Cruzando el hero card "Tu pulso"
 *  - En el item activo del sidebar
 */
export function PulseLine({
  w = 120,
  h = 24,
  color = 'currentColor',
  strokeWidth = 1.5,
  active = false,
}: Props) {
  const pts: [number, number][] = [
    [0, h / 2],
    [w * 0.25, h / 2],
    [w * 0.32, h * 0.2],
    [w * 0.38, h * 0.85],
    [w * 0.44, h * 0.1],
    [w * 0.5, h / 2],
    [w * 0.72, h / 2],
    [w * 0.78, h * 0.35],
    [w * 0.82, h / 2],
    [w, h / 2],
  ];
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {active && <circle cx={w * 0.82} cy={h / 2} r="2.5" fill={color} className="fk-pulse-dot" />}
    </svg>
  );
}
