'use client'

import { ClinicTopbar } from './Topbar'

/**
 * ComingSoon — placeholder editorial para pantallas no implementadas en Fase 2.
 * Reemplaza el MockBanner global ahora que los datos son reales en las
 * pantallas principales.
 */
export function ComingSoon({
  sub,
  title,
  description,
}: {
  sub: string
  title: React.ReactNode
  description: string
}) {
  return (
    <div style={{ flex: 1, background: 'var(--paper)', minHeight: '100%' }}>
      <ClinicTopbar sub={sub} title={title} />
      <div style={{ padding: '60px 40px' }}>
        <div
          style={{
            background: '#fff',
            border: '1px dashed var(--ink-6)',
            borderRadius: 14,
            padding: '60px 40px',
            textAlign: 'center',
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          <div className="fk-eyebrow" style={{ marginBottom: 12, color: 'var(--signal)' }}>
            Próximamente
          </div>
          <p
            className="fk-serif"
            style={{
              fontSize: 30,
              fontStyle: 'italic',
              fontWeight: 300,
              margin: 0,
              lineHeight: 1.15,
              color: 'var(--ink)',
            }}
          >
            Esta sección llega en la siguiente iteración.
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--ink-4)',
              marginTop: 16,
              fontFamily: 'var(--f-sans)',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
