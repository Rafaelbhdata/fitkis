'use client'

import { useEffect, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { InlinePulse } from '@/components/ui/LoadingState'
import { Ic } from './Ic'

type Props = {
  open: boolean
  onClose: () => void
  practitionerId: string
  onInvited?: () => void | Promise<void>
}

export function InviteModal({ open, onClose, practitionerId, onInvited }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [wasNew, setWasNew] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail('')
      setError(null)
      setSuccess(false)
      setWasNew(false)
      setLoading(false)
    }
  }, [open])

  if (!open) return null

  async function handleInvite() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invite-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), practitioner_id: practitionerId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al enviar la invitación.')
      } else {
        setWasNew(!!json.wasNew)
        setSuccess(true)
        await onInvited?.()
        setTimeout(() => onClose(), 2000)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
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
          Ingresa el email del paciente. Si ya tiene cuenta en la app, recibirá una notificación
          para aceptar. Si no tiene cuenta, le enviaremos un correo de invitación para crearla.
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
              {wasNew
                ? 'Le enviamos un correo para crear su cuenta y descargar la app.'
                : 'Listo. Aparece como "pendiente" hasta que la acepte.'}
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
                icon={loading ? <InlinePulse /> : <Ic.plus />}
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
