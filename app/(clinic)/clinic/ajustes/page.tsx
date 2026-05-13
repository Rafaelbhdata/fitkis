'use client'

import { useEffect, useRef, useState } from 'react'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { PulseLine } from '@/components/ui/PulseLine'
import { Ic } from '@/components/clinic/Ic'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  updatePractitioner,
  type PractitionerRecord,
} from '@/lib/clinic/queries'
import {
  DURATIONS, TIME_OPTIONS, DAY_ORDER, DAY_LABELS, timeToMin,
  DEFAULT_WEEK_SCHEDULE,
  type DayKey, type Break, type DaySchedule, type WeekSchedule,
} from '@/lib/clinic/calendar-utils'


// ─── Nav sections ─────────────────────────────────────────────────────────────
type SectionKey = 'perfil' | 'consultorio' | 'agenda' | 'umbrales'

function IcUser(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IcBuilding(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

const NAV: { key: SectionKey; label: string; icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
  { key: 'perfil',      label: 'Perfil',        icon: IcUser      },
  { key: 'consultorio', label: 'Consultorio',    icon: IcBuilding  },
  { key: 'agenda',      label: 'Agenda',         icon: Ic.cal      },
  { key: 'umbrales',    label: 'Alertas',        icon: Ic.alert    },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly,
  hint,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  readOnly?: boolean
  hint?: string
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: readOnly ? 'var(--paper-2)' : '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 10,
          padding: '11px 14px',
          fontSize: 14,
          fontFamily: 'var(--f-sans)',
          color: readOnly ? 'var(--ink-4)' : 'var(--ink)',
          cursor: readOnly ? 'default' : 'text',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          if (!readOnly) {
            e.currentTarget.style.borderColor = 'var(--ink-3)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,10,0.06)'
          }
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--ink-7)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {hint && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--ink-5)',
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

// ─── Autosave hook + inline status pill ───────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Autosave debounced. Salta el primer render (no guarda los valores iniciales).
 * Si `validate` devuelve un string, no guarda y muestra el error.
 */
function useAutoSave(
  deps: unknown[],
  save: () => Promise<{ ok: true } | { ok: false; error: string }>,
  validate?: () => string | null,
  delayMs = 700,
) {
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const isFirst = useRef(true)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    const err = validate?.() ?? null
    if (err) { setError(err); setState('error'); return }
    setError(null)
    setState('saving')
    const t = setTimeout(async () => {
      const res = await save()
      if (res.ok) {
        setState('saved')
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = setTimeout(() => setState('idle'), 1800)
      } else {
        setError(res.error); setState('error')
      }
    }, delayMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { state, error }
}

function SaveStatus({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'idle') return null
  const color = state === 'error' ? 'var(--signal)'
              : state === 'saved' ? 'var(--leaf)'
              : 'var(--ink-5)'
  const label = state === 'saving' ? 'Guardando…'
              : state === 'saved'  ? '✓ Guardado'
              : (error ?? 'Error al guardar')
  return (
    <div
      style={{
        marginTop: 24,
        paddingTop: 14,
        borderTop: '1px solid var(--paper-3)',
        fontFamily: 'var(--f-mono)',
        fontSize: 11,
        color,
        letterSpacing: '0.04em',
        transition: 'color 0.2s',
      }}
    >
      {label}
    </div>
  )
}

function PanelHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {eyebrow}
      </div>
      <h2
        className="fk-serif"
        style={{
          fontSize: 26,
          fontWeight: 300,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          marginTop: 6,
          fontFamily: 'var(--f-sans)',
          fontSize: 13,
          color: 'var(--ink-4)',
          lineHeight: 1.5,
          margin: '6px 0 0',
        }}
      >
        {sub}
      </p>
    </div>
  )
}

// ─── Stepper (para umbrales) ──────────────────────────────────────────────────

function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  hint?: string
}) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))
  const pct = ((value - min) / (max - min)) * 100

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--ink-7)',
    background: disabled ? 'var(--paper-2)' : '#fff',
    color: disabled ? 'var(--ink-6)' : 'var(--ink-3)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--f-mono)',
    fontSize: 16,
    fontWeight: 500,
    transition: 'background 0.12s, color 0.12s',
    flexShrink: 0,
    lineHeight: 1,
  })

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          marginBottom: 10,
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#fff',
          border: '1px solid var(--ink-7)',
          borderRadius: 12,
          padding: '12px 16px',
        }}
      >
        <button style={btnStyle(value <= min)} onClick={dec} type="button">−</button>

        <div style={{ flex: 1 }}>
          {/* Valor + unidad */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
            <span
              className="fk-mono"
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                letterSpacing: '0.06em',
              }}
            >
              {unit}
            </span>
          </div>
          {/* Track */}
          <div style={{ height: 3, background: 'var(--paper-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: 'var(--signal)',
                borderRadius: 99,
                transition: 'width 0.15s ease-out',
              }}
            />
          </div>
        </div>

        <button style={btnStyle(value >= max)} onClick={inc} type="button">+</button>
      </div>

      {hint && (
        <div style={{ marginTop: 6, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

// ─── Panel: Perfil profesional ────────────────────────────────────────────────

function PanelPerfil({ practitioner }: { practitioner: PractitionerRecord }) {
  const supabase = useSupabase()
  const [name,    setName]    = useState(practitioner.display_name)
  const [cedula,  setCedula]  = useState(practitioner.license_number ?? '')
  const [esp,     setEsp]     = useState(practitioner.specialty ?? '')

  const initial = (name || '?').trim().charAt(0).toUpperCase()

  const { state, error } = useAutoSave(
    [name, cedula, esp],
    () => updatePractitioner(supabase, practitioner.id, {
      display_name:   name.trim(),
      license_number: cedula.trim() || null,
      specialty:      esp.trim() || null,
    }),
    () => name.trim() ? null : 'El nombre no puede estar vacío.',
  )

  return (
    <div>
      <PanelHeader
        eyebrow="Ajustes · Perfil"
        title="Perfil profesional"
        sub="Información visible para tus pacientes en la plataforma."
      />

      {/* Avatar preview */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 28,
          padding: '16px 20px',
          background: 'var(--paper)',
          borderRadius: 12,
          border: '1px solid var(--ink-7)',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            background: 'var(--signal)',
            color: 'var(--paper)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 300,
            flexShrink: 0,
            letterSpacing: '-0.02em',
            transition: 'transform 0.15s',
          }}
        >
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>
            {name || 'Tu nombre aquí'}
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}>
            {esp ? esp.toUpperCase() : 'ESPECIALIDAD'} · CED {cedula || '—'}
          </div>
        </div>
      </div>

      <Field label="Nombre completo" value={name} onChange={setName} placeholder="Dra. María García" />
      <Field label="Cédula profesional" value={cedula} onChange={setCedula} placeholder="12345678" />
      <Field label="Especialidad" value={esp} onChange={setEsp} placeholder="Nutrición clínica" />

      <SaveStatus state={state} error={error} />
    </div>
  )
}

// ─── Panel: Consultorio ───────────────────────────────────────────────────────

function PanelConsultorio({ practitioner }: { practitioner: PractitionerRecord }) {
  const supabase = useSupabase()

  const [clinicName, setClinicName] = useState(practitioner.clinic_name ?? '')
  const [address,    setAddress]    = useState(practitioner.address ?? '')

  const { state, error } = useAutoSave(
    [clinicName, address],
    () => updatePractitioner(supabase, practitioner.id, {
      clinic_name: clinicName.trim() || null,
      address:     address.trim() || null,
    }),
  )

  return (
    <div>
      <PanelHeader
        eyebrow="Ajustes · Consultorio"
        title="Datos del consultorio"
        sub="Nombre y dirección del consultorio."
      />

      <Field
        label="Nombre del consultorio"
        value={clinicName}
        onChange={setClinicName}
        placeholder="Consultorio Nutrición Integral"
      />
      <Field
        label="Dirección"
        value={address}
        onChange={setAddress}
        placeholder="Av. Insurgentes Sur 1234, Col. Del Valle, CDMX"
      />

      <SaveStatus state={state} error={error} />
    </div>
  )
}

// ─── Booking share card ───────────────────────────────────────────────────────

function BookingShareCard({ practitionerId }: { practitionerId: string }) {
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitkis.app'
  const bookingUrl = `${siteUrl}/agendar/${practitionerId}`
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          marginBottom: 10,
        }}
      >
        Página pública de reservas
      </div>

      <div
        style={{
          background: 'var(--cream)',
          borderRadius: 12,
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative signal dot */}
        <div
          style={{
            position: 'absolute',
            top: -16,
            right: -16,
            width: 80,
            height: 80,
            borderRadius: 999,
            background: 'var(--signal)',
            opacity: 0.08,
          }}
        />

        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          {bookingUrl}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              background: copied ? 'var(--leaf)' : 'var(--signal)',
              color: '#fff',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copiado
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copiar link
              </>
            )}
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid rgba(10,10,10,0.15)',
              background: 'transparent',
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(10,10,10,0.06)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Abrir
          </a>
        </div>

        <div style={{ marginTop: 10, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)' }}>
          Comparte este link para que tus pacientes puedan agendar una cita.
        </div>
      </div>
    </div>
  )
}

// ─── TimeSelect ───────────────────────────────────────────────────────────────

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'var(--paper)',
          border: '1px solid var(--ink-7)',
          borderRadius: 7,
          padding: '5px 24px 5px 9px',
          fontFamily: 'var(--f-mono)',
          fontSize: 12,
          color: 'var(--ink)',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <svg
        viewBox="0 0 24 24" width={10} height={10} fill="none"
        stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-5)' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}

// ─── Panel: Agenda ─────────────────────────────────────────────────────────────

const agendaLabelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
  letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10,
}

function PanelAgenda({ practitioner }: { practitioner: PractitionerRecord }) {
  const supabase = useSupabase()

  const [duration, setDuration] = useState<number>(practitioner.default_duration)
  const [schedule, setSchedule] = useState<WeekSchedule>(practitioner.schedule ?? DEFAULT_WEEK_SCHEDULE)

  function updateDay(key: DayKey, patch: Partial<DaySchedule>) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function addBreak(key: DayKey) {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], breaks: [...prev[key].breaks, { start: '13:00', end: '14:00' }] },
    }))
  }

  function removeBreak(key: DayKey, idx: number) {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], breaks: prev[key].breaks.filter((_, i) => i !== idx) },
    }))
  }

  function updateBreak(key: DayKey, idx: number, field: keyof Break, value: string) {
    setSchedule(prev => {
      const breaks = [...prev[key].breaks]
      breaks[idx] = { ...breaks[idx], [field]: value }
      return { ...prev, [key]: { ...prev[key], breaks } }
    })
  }

  const { state, error } = useAutoSave(
    [duration, JSON.stringify(schedule)],
    () => updatePractitioner(supabase, practitioner.id, { schedule, default_duration: duration }),
    () => {
      for (const key of DAY_ORDER) {
        const d = schedule[key]
        if (d.enabled && timeToMin(d.start) >= timeToMin(d.end)) {
          return `${DAY_LABELS[key]}: la hora de inicio debe ser anterior a la hora de fin.`
        }
      }
      return null
    },
  )

  return (
    <div>
      <PanelHeader
        eyebrow="Ajustes · Agenda"
        title="Configuración de agenda"
        sub="Horario semanal y duración de citas para el link de reservas."
      />

      {/* Duración */}
      <div style={{ marginBottom: 28 }}>
        <label style={agendaLabelStyle}>
          Duración por defecto de citas
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DURATIONS.map(d => (
            <button
              key={d} type="button" onClick={() => setDuration(d)}
              style={{
                padding: '9px 18px', borderRadius: 999,
                border: `2px solid ${duration === d ? 'var(--signal)' : 'var(--ink-7)'}`,
                background: duration === d ? 'var(--signal-soft)' : '#fff',
                color: duration === d ? 'var(--signal)' : 'var(--ink-3)',
                fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {d} min
            </button>
          ))}
        </div>
        <div style={{ marginTop: 7, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)' }}>
          El paciente no puede elegir la duración desde el link de reservas.
        </div>
      </div>

      {/* Horario semanal */}
      <div style={{ marginBottom: 24 }}>
        <label style={agendaLabelStyle}>
          Horario semanal
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DAY_ORDER.map(key => {
            const day = schedule[key]
            return (
              <div
                key={key}
                style={{
                  background: day.enabled ? '#fff' : 'var(--paper-2)',
                  border: '1px solid var(--ink-7)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'background 0.15s',
                }}
              >
                {/* Fila principal del día */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => updateDay(key, { enabled: !day.enabled })}
                    style={{
                      width: 32, height: 18, borderRadius: 9, border: 'none',
                      background: day.enabled ? 'var(--signal)' : 'var(--ink-6)',
                      position: 'relative', cursor: 'pointer', flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3,
                      left: day.enabled ? 17 : 3,
                      width: 12, height: 12, borderRadius: 999, background: '#fff',
                      transition: 'left 0.15s',
                    }} />
                  </button>

                  {/* Nombre del día */}
                  <span style={{
                    fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 500,
                    color: day.enabled ? 'var(--ink)' : 'var(--ink-4)',
                    width: 86, flexShrink: 0, transition: 'color 0.15s',
                  }}>
                    {DAY_LABELS[key]}
                  </span>

                  {day.enabled ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <TimeSelect value={day.start} onChange={v => updateDay(key, { start: v })} />
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-5)' }}>→</span>
                        <TimeSelect value={day.end} onChange={v => updateDay(key, { end: v })} />
                      </div>
                      <button
                        type="button" onClick={() => addBreak(key)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '4px 8px', borderRadius: 6,
                          border: '1px solid var(--ink-7)', background: 'transparent',
                          color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', fontSize: 10,
                          cursor: 'pointer', flexShrink: 0, letterSpacing: '0.04em',
                        }}
                      >
                        + pausa
                      </button>
                    </>
                  ) : (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-5)', letterSpacing: '0.06em' }}>
                      Sin atención
                    </span>
                  )}
                </div>

                {/* Breaks del día */}
                {day.enabled && day.breaks.length > 0 && (
                  <div style={{ padding: '0 14px 10px 54px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {day.breaks.map((brk, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)',
                          width: 38, flexShrink: 0,
                        }}>
                          pausa
                        </span>
                        <TimeSelect value={brk.start} onChange={v => updateBreak(key, i, 'start', v)} />
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-5)' }}>→</span>
                        <TimeSelect value={brk.end} onChange={v => updateBreak(key, i, 'end', v)} />
                        <button
                          type="button" onClick={() => removeBreak(key, i)}
                          style={{
                            width: 20, height: 20, borderRadius: 999, border: 'none',
                            background: 'var(--paper-3)', color: 'var(--ink-4)',
                            cursor: 'pointer', fontSize: 13, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <BookingShareCard practitionerId={practitioner.id} />

      <SaveStatus state={state} error={error} />
    </div>
  )
}

// ─── Panel: Umbrales de alertas ───────────────────────────────────────────────

function PanelUmbrales({ practitioner }: { practitioner: PractitionerRecord }) {
  const supabase = useSupabase()

  const [inactDays,    setInactDays]    = useState(practitioner.inactivity_threshold_days)
  const [minAdherence, setMinAdherence] = useState(practitioner.min_adherence_pct)

  const { state, error } = useAutoSave(
    [inactDays, minAdherence],
    () => updatePractitioner(supabase, practitioner.id, {
      inactivity_threshold_days: inactDays,
      min_adherence_pct: minAdherence,
    }),
    () => {
      if (inactDays < 1 || inactDays > 90) return 'Días de inactividad debe estar entre 1 y 90.'
      if (minAdherence < 0 || minAdherence > 100) return 'La adherencia mínima debe estar entre 0 y 100.'
      return null
    },
  )

  return (
    <div>
      <PanelHeader
        eyebrow="Ajustes · Alertas"
        title="Umbrales de alertas"
        sub="Define cuándo se marca a un paciente como inactivo o con adherencia baja."
      />

      <Stepper
        label="Días sin registros → inactividad"
        value={inactDays}
        unit="días"
        min={1}
        max={30}
        onChange={setInactDays}
        hint="Sin ningún registro (peso, comida o gym) durante este período → alerta de inactividad."
      />
      <Stepper
        label="Adherencia mínima"
        value={minAdherence}
        unit="%"
        min={10}
        max={100}
        step={5}
        onChange={setMinAdherence}
        hint="Porcentaje de días activos en los últimos 30 días por debajo del cual se genera una alerta."
      />

      <SaveStatus state={state} error={error} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AjustesPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [active,  setActive]  = useState<SectionKey>('perfil')

  useEffect(() => {
    if (userLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    loadPractitionerByUser(supabase, user.id).then(p => {
      if (cancelled) return
      if (!p) setError('No tienes registro de nutriólogo en esta cuenta.')
      else setPractitioner(p)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user, userLoading, supabase])

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <ClinicTopbar
        sub="Práctica"
        title={
          <>
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Ajustes </span>
            de la consulta
          </>
        }
      />

      {/* Loading */}
      {loading && (
        <div style={{ padding: '60px 40px' }}>
          <PulseLine w={120} h={8} color="var(--signal)" active />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: '40px', fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--signal)' }}>
          {error}
        </div>
      )}

      {/* Content: tabs horizontales */}
      {!loading && !error && practitioner && (
        <div>
          {/* Tab bar */}
          <div style={{ padding: '18px 40px 0' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--ink-7)' }}>
              {NAV.map((item, i) => {
                const isActive = active === item.key
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      border: 'none',
                      borderRight: i < NAV.length - 1 ? '1px solid var(--ink-7)' : 'none',
                      borderBottom: isActive ? '2px solid var(--signal)' : '2px solid transparent',
                      marginBottom: -1,
                      background: 'transparent',
                      color: isActive ? 'var(--ink)' : 'var(--ink-4)',
                      fontSize: 12,
                      fontFamily: 'var(--f-sans)',
                      fontWeight: isActive ? 500 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.12s',
                    }}
                  >
                    <Icon width={12} height={12} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel content */}
          <div style={{ padding: '36px 40px', maxWidth: 580 }}>
            {active === 'perfil'      && <PanelPerfil practitioner={practitioner} />}
            {active === 'consultorio' && <PanelConsultorio practitioner={practitioner} />}
            {active === 'agenda'      && <PanelAgenda practitioner={practitioner} />}
            {active === 'umbrales'    && <PanelUmbrales practitioner={practitioner} />}
          </div>
        </div>
      )}
    </div>
  )
}
