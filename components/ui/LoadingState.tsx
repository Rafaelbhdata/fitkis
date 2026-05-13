'use client'

import { PulseLine } from './PulseLine'

type Props = {
  label?: string
  /** Versión compacta (tab / sub-sección) en lugar de pantalla completa. */
  compact?: boolean
  /** Override de altura mínima. */
  minHeight?: number | string
}

/**
 * Estado de carga estándar del portal: PulseLine naranja centrado + label opcional
 * en mono uppercase. Úsalo en TODO el portal para mantener consistencia visual.
 */
export function LoadingState({ label, compact = false, minHeight }: Props) {
  const w = compact ? 100 : 120
  const h = compact ? 24 : 28
  const mh = minHeight ?? (compact ? 200 : '60vh')
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: mh,
        gap: compact ? 12 : 16,
      }}
    >
      <PulseLine w={w} h={h} color="var(--signal)" strokeWidth={2} active />
      {label && (
        <span
          className="fk-mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/**
 * Loader inline para usar DENTRO de un botón (texto + pulse). Color blanco por
 * defecto para contraste sobre fondo signal.
 */
export function InlinePulse({ color = '#fff' }: { color?: string }) {
  return <PulseLine w={16} h={8} color={color} strokeWidth={1.5} active />
}
