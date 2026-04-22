'use client';

import { PulseLine } from './PulseLine';

/**
 * FkMark — Icono cuadrado de Fitkis
 * "f" en italic serif sobre fondo ink, con PulseLine mandarina abajo
 */
export function FkMark({ size = 48 }: { size?: number }) {
  return (
    <div
      className="bg-ink text-paper flex items-center justify-center relative font-serif italic"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        fontSize: size * 0.48,
      }}
    >
      <span>f</span>
      <div
        style={{
          position: 'absolute',
          bottom: size * 0.18,
          left: size * 0.15,
          right: size * 0.15,
        }}
      >
        <PulseLine w={size * 0.7} h={size * 0.18} color="#ff5a1f" strokeWidth={1.5} />
      </div>
    </div>
  );
}

/**
 * FkWord — Wordmark horizontal "fitkis" + PulseLine
 */
export function FkWord({ size = 32, color = 'var(--ink)' }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: size * 0.12,
        color,
        fontFamily: 'var(--f-serif)',
        fontSize: size,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: '-0.02em',
      }}
    >
      <span style={{ fontStyle: 'italic' }}>fitkis</span>
      <span style={{ display: 'inline-block', transform: 'translateY(-0.15em)' }}>
        <PulseLine w={size * 0.9} h={size * 0.32} color="var(--signal)" strokeWidth={1.8} />
      </span>
    </span>
  );
}
