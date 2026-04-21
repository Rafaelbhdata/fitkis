'use client'

type LogoMarkProps = {
  size?: number
  className?: string
  /** When true, uses the light (cyan-on-transparent) variant */
  mono?: boolean
}

/**
 * Fitkis mark — an "F" whose crossbar is a heart-rate pulse (EKG).
 * fitness + vital in one shape. Squares tuck into a rounded tile.
 */
export default function LogoMark({ size = 40, className = '', mono = false }: LogoMarkProps) {
  const cyan = '#22e4d9'
  const pink = '#ff5277'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Fitkis"
    >
      {!mono && (
        <rect width="64" height="64" rx="16" fill="#0a0e1a" stroke="#1f2740" strokeWidth="1" />
      )}
      {/* Vertical stroke of the F */}
      <rect x="16" y="14" width="6" height="36" rx="3" fill={cyan} />
      {/* Top arm with pulse waveform */}
      <path
        d="M22 19 H30 L33 14 L37 26 L41 19 H48"
        stroke={cyan}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Middle arm — shorter pulse tick with pink accent */}
      <path
        d="M22 34 H30 L33 30 L37 38 L41 34 H44"
        stroke={pink}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Base dot — the "heartbeat" ending */}
      <circle cx="46.5" cy="34" r="2.5" fill={pink} />
    </svg>
  )
}
