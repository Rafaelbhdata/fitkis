'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'signal' | 'ghost' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

type BtnProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: 'var(--ink)', fg: 'var(--paper)', border: 'var(--ink)' },
  signal: { bg: 'var(--signal)', fg: '#fff', border: 'var(--signal)' },
  ghost: { bg: 'transparent', fg: 'var(--ink-2)', border: 'var(--ink-7)' },
  secondary: { bg: '#fff', fg: 'var(--ink)', border: 'var(--ink-7)' },
};

const sizeStyles: Record<Size, { fontSize: number; py: number; px: number }> = {
  sm: { fontSize: 11, py: 6, px: 10 },
  md: { fontSize: 13, py: 10, px: 14 },
  lg: { fontSize: 14, py: 13, px: 18 },
};

/**
 * Btn v5 — Boton con variantes de estilo
 */
export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...rest
}: BtnProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-sans font-medium tracking-tight transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        padding: `${s.py}px ${s.px}px`,
        fontSize: s.fontSize,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
