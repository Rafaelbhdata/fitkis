'use client'

import { useEffect, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from './Ic'
import { useSupabase } from '@/lib/hooks'
import { invitePatientByEmail } from '@/lib/clinic/queries'

type Props = {
  open: boolean
  onClose: () => void
  practitionerId: string
  onInvited?: () => void | Promise<void>
}

/**
 * Modal de invitación — sigue la convención del prototipo (overlay + card
 * centrada), no abre como bottom sheet. Para mobile se podría redesear
 * en Fase 3.
 */
export function InviteModal({ open, onClose, practitionerId, onInvited }: Props) {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state every time the modal opens
  useEffect(() => {
    if (open) {
      setEmail('')
      setError(null)
      setSuccess(false)
      setLoading(false)
    }
  }, [open])

  if (!open) return null

  async function handleInvite() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const result = await invitePatientByEmail(supabase, practitionerId, email.trim())
    if (result.ok) {
      setSuccess(true)
      await onInvited?.()
      setTimeout(() => {
        onClose()
      }, 1400)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <>
      <div
        onClick={() => !loading && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,10,10,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(92vw, 460px)',
          background: '#fff',
          borderRadius: 18,
          padding: '28px 28px 24px',
          zIndex: 51,
          boxShadow: '0 24px 60px rgba(10,10,10,0.25)',
        }}
      >
        <div className="fk-eyebrow" style={{ color: 'var(--signal)', marginBottom: 6 }}>
          Nueva invitación
        </div>
        <h2
          className="fk-serif"
          style={{
            fontSize: 26,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Vincula</span> un paciente.
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-4)',
            marginTop: 10,
            marginBottom: 22,
            fontFamily: 'var(--f-sans)',
            lineHeight: 1.5,
          }}
        >
          Ingresa el email con el que el paciente se registró en la app móvil. Le aparecerá una
          notificación para aceptar tu invitación.
        </p>

        {success ? (
          <div
            style={{
              padding: '24px 16px',
              background: 'var(--leaf-soft)',
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div className="fk-eyebrow" style={{ color: 'var(--leaf)', marginBottom: 6 }}>
              ● Enviada
            </div>
            <p
              className="fk-serif"
              style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 300, margin: 0 }}
            >
              Listo. Aparece como "pendiente" hasta que la acepte.
            </p>
          </div>
        ) : (
          <>
            <label
              className="fk-eyebrow"
              style={{ display: 'block', marginBottom: 6 }}
              htmlFor="invite-email"
            >
              Email del paciente
            </label>
            <input
              id="invite-email"
              type="email"
              autoComplete="off"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="paciente@ejemplo.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--ink-7)',
                background: 'var(--paper)',
                fontFamily: 'var(--f-sans)',
                fontSize: 14,
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleInvite()
              }}
            />
            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: 'var(--berry-soft)',
                  border: '1px solid rgba(193,59,90,0.2)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--berry)',
                  fontFamily: 'var(--f-sans)',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 999,
                  border: '1px solid var(--ink-7)',
                  background: '#fff',
                  fontSize: 13,
                  fontFamily: 'var(--f-sans)',
                  fontWeight: 500,
                  color: 'var(--ink-3)',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Cancelar
              </button>
              <Btn
                variant="signal"
                icon={loading ? <PulseLine w={16} h={8} color="#fff" strokeWidth={1.5} active /> : <Ic.plus />}
                onClick={handleInvite}
                disabled={loading || !email.trim()}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {loading ? 'Enviando…' : 'Vincular'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </>
  )
}
