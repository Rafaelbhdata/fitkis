'use client';

import { PulseLine } from './PulseLine';

type LogoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * LogoMark v5 — Icono cuadrado de Fitkis
 * "f" en italic serif sobre fondo ink, con PulseLine mandarina abajo
 */
export default function LogoMark({ size = 48, className = '' }: LogoMarkProps) {
  return (
    <div
      className={`bg-ink text-paper flex items-center justify-center relative font-serif italic ${className}`}
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
