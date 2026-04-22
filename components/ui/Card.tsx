'use client';

import { ReactNode, HTMLAttributes } from 'react';

type CardProps = {
  children: ReactNode;
  pad?: number;
  variant?: 'default' | 'cream' | 'ink';
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

/**
 * Card v5 — Contenedor con borde y fondo
 */
export function Card({
  children,
  pad = 16,
  variant = 'default',
  className = '',
  style,
  ...rest
}: CardProps) {
  const variantStyles = {
    default: {
      background: '#fff',
      border: '1px solid var(--ink-7)',
    },
    cream: {
      background: 'var(--cream)',
      border: 'none',
    },
    ink: {
      background: 'var(--ink)',
      border: 'none',
      color: 'var(--paper)',
    },
  };

  const v = variantStyles[variant];

  return (
    <div
      className={`rounded-[14px] overflow-hidden ${className}`}
      style={{
        ...v,
        padding: pad,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
