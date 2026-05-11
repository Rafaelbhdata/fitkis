'use client'

/**
 * MockBanner — Banner persistente mientras estemos en Fase 1.
 *
 * Cuando cableemos los datos reales (Fase 2), borrar este componente
 * y removerlo del layout.
 */
export function MockBanner() {
  return (
    <div
      style={{
        background: '#1a1a1a',
        color: 'var(--paper)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderBottom: '1px solid var(--signal)',
      }}
    >
      <span
        className="fk-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
          fontWeight: 600,
        }}
      >
        ● Modo demo
      </span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink-5)',
          fontFamily: 'var(--f-sans)',
        }}
      >
        Datos de muestra · no representan pacientes reales · Fase 1 del rediseño v5
      </span>
    </div>
  )
}
