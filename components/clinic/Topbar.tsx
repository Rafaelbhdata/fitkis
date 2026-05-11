'use client'

import type { ReactNode } from 'react'

type TopbarProps = {
  sub?: ReactNode
  title: ReactNode
  right?: ReactNode
}

/**
 * Topbar editorial v5 — eyebrow + título serif grande + acciones a la derecha.
 * Separador inferior con `border-bottom`.
 */
export function ClinicTopbar({ sub, title, right }: TopbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '28px 40px 20px',
        borderBottom: '1px solid var(--ink-7)',
        gap: 20,
      }}
    >
      <div>
        {sub && (
          <div className="fk-eyebrow" style={{ marginBottom: 6 }}>
            {sub}
          </div>
        )}
        <h1
          className="fk-serif"
          style={{
            fontSize: 38,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>
      {right && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {right}
        </div>
      )}
    </div>
  )
}
