'use client';

import { ReactNode } from 'react';

type Tone = 'ink' | 'signal' | 'leaf' | 'berry' | 'honey' | 'sky' | 'inkSolid';

type ChipProps = {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  ink: { bg: 'var(--paper-3)', fg: 'var(--ink-2)' },
  signal: { bg: 'var(--signal-soft)', fg: '#a33a0f' },
  leaf: { bg: 'var(--leaf-soft)', fg: 'var(--leaf)' },
  berry: { bg: 'var(--berry-soft)', fg: 'var(--berry)' },
  honey: { bg: 'var(--honey-soft)', fg: '#8a6411' },
  sky: { bg: 'var(--sky-soft)', fg: 'var(--sky)' },
  inkSolid: { bg: 'var(--ink)', fg: 'var(--paper)' },
};

/**
 * Chip v5 — Etiqueta pequena con color semantico
 * Usalo para: estados, filtros, etiquetas de grupos alimenticios
 */
export default function Chip({
  tone = 'ink',
  icon,
  children,
  className = '',
  onClick,
}: ChipProps) {
  const t = toneStyles[tone];
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-mono text-[10px] font-medium uppercase tracking-[0.06em] transition-colors ${onClick ? 'hover:brightness-95 cursor-pointer' : ''} ${className}`}
      style={{
        background: t.bg,
        color: t.fg,
        padding: '3px 8px',
      }}
    >
      {icon}
      {children}
    </Tag>
  );
}

// Named export for compatibility
export { Chip };
