'use client'

import { useEffect, type ReactNode, type CSSProperties } from 'react'

/**
 * Primitivos compartidos por los modales del portal clínico.
 *
 * Por qué este shape:
 * - Overlay con ESC + click-outside automáticos, evita repetir useEffect+addEventListener
 * - ModalBtn unificado con todas las variantes vistas en producción
 *   (secondary / primary-signal / danger-soft / danger-solid / warning)
 */

export function ModalShell({
  onClose,
  maxWidth = 440,
  zIndex   = 200,
  children,
}: {
  onClose: () => void
  maxWidth?: number
  zIndex?: number
  children: ReactNode
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(0,0,0,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-5)', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, padding: 0 }}
    >
      ×
    </button>
  )
}

export type ModalBtnVariant =
  | 'secondary'
  | 'primary'
  | 'danger-soft'    // texto rojo sobre bg muy ligero — "Sí, cancelar"
  | 'danger-solid'   // bg rojo + texto blanco — acción destructiva prominente
  | 'warning'        // signal/orange — para reagendar y similares

const MODAL_BTN_STYLES: Record<ModalBtnVariant, CSSProperties> = {
  secondary:     { border: '1px solid var(--ink-6)',         background: 'var(--paper)',         color: 'var(--ink-2)'  },
  primary:       { border: '1px solid var(--signal)',        background: 'var(--signal-soft)',   color: 'var(--signal)' },
  'danger-soft': { border: '1px solid rgba(180,30,30,0.28)', background: 'rgba(180,30,30,0.06)', color: 'var(--berry)'  },
  'danger-solid':{ border: '1px solid rgba(180,30,30,0.7)',  background: 'rgba(180,30,30,0.85)', color: '#fff'          },
  warning:       { border: '1px solid rgba(230,81,0,0.3)',   background: 'rgba(230,81,0,0.06)',  color: '#e65100'       },
}

export function ModalBtn({
  onClick, variant, disabled, children,
}: {
  onClick:  () => void
  variant:  ModalBtnVariant
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        ...MODAL_BTN_STYLES[variant],
        borderRadius: 8, padding: '10px 16px',
        fontSize: 13, fontFamily: 'var(--f-sans)', fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.1s',
      }}
    >
      {children}
    </button>
  )
}
