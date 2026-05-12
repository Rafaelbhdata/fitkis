'use client'

import { useEffect, useState } from 'react'
import { ClinicTopbar } from '@/components/clinic/Topbar'
import { PulseLine } from '@/components/ui/PulseLine'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  updatePractitioner,
  type PractitionerRecord,
} from '@/lib/clinic/queries'

// ─── localStorage keys (compartidas con agenda/page.tsx) ──────────────────────
const LS_START_HOUR         = 'agenda_start_hour'
const LS_END_HOUR           = 'agenda_end_hour'
const LS_DEFAULT_DURATION   = 'agenda_default_duration'
const LS_INACTIVITY_DAYS    = 'clinic_inactivity_days'
const LS_MIN_ADHERENCE      = 'clinic_min_adherence'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lsNum(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const v = localStorage.getItem(key)
  const n = v !== null ? parseInt(v, 10) : NaN
  return isNaN(n) ? fallback : n
}

function SaveBtn({
  loading,
  saved,
  onClick,
}: {
  loading: boolean
  saved: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        marginTop: 20,
        padding: '9px 22px',
        borderRadius: 999,
        border: 'none',
        background: saved ? 'var(--leaf)' : 'var(--ink)',
        color: '#fff',
        fontFamily: 'var(--f-sans)',
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'background 0.2s',
      }}
    >
      {loading ? 'Guardando…' : saved ? 'Guardado' : 'Guardar cambios'}
    </button>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      className="fk-eyebrow"
      style={{ marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--ink-7)' }}
    >
      {children}
    </div>
  )
}

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
    <div style={{ marginBottom: 16 }}>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={readOnly ? { background: 'var(--paper-2)', color: 'var(--ink-4)', cursor: 'default' } : {}}
      />
      {hint && (
        <div
          className="fk-mono"
          style={{ fontSize: 10, color: 'var(--ink-5)', marginTop: 5 }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function NumSelect({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: number
  options: { value: number; label: string }[]
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23737373\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && (
        <div className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-5)', marginTop: 5 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

// ─── Sección: Perfil profesional ──────────────────────────────────────────────

function SeccionPerfil({ practitioner }: { practitioner: PractitionerRecord }) {
  const supabase = useSupabase()

  const [name,    setName]    = useState(practitioner.display_name)
  const [cedula,  setCedula]  = useState(practitioner.license_number ?? '')
  const [esp,     setEsp]     = useState(practitioner.specialty ?? '')
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setError('El nombre no puede estar vacío.'); return }
    setLoading(true); setError(null); setSaved(false)
    const res = await updatePractitioner(supabase, practitioner.id, {
      display_name:   name.trim(),
      license_number: cedula.trim() || null,
      specialty:      esp.trim() || null,
    })
    setLoading(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else setError(res.error)
  }

  return (
    <section style={{ marginBottom: 44 }}>
      <SectionLabel>Perfil profesional</SectionLabel>
      <div style={{ maxWidth: 480 }}>
        <Field label="Nombre completo" value={name} onChange={setName} placeholder="Dra. María García" />
        <Field label="Cédula profesional" value={cedula} onChange={setCedula} placeholder="12345678" />
        <Field label="Especialidad" value={esp} onChange={setEsp} placeholder="Nutrición clínica" />
        {error && (
          <div
            className="fk-mono"
            style={{ fontSize: 11, color: 'var(--signal)', marginTop: 4 }}
          >
            {error}
          </div>
        )}
        <SaveBtn loading={loading} saved={saved} onClick={handleSave} />
      </div>
    </section>
  )
}

// ─── Sección: Datos del consultorio ───────────────────────────────────────────

function SeccionConsultorio({ practitioner }: { practitioner: PractitionerRecord }) {
  const supabase = useSupabase()
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitkis.app'
  const bookingUrl = `${siteUrl}/agendar/${practitioner.id}`

  const [clinicName, setClinicName] = useState(practitioner.clinic_name ?? '')
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  async function handleSave() {
    setLoading(true); setError(null); setSaved(false)
    const res = await updatePractitioner(supabase, practitioner.id, {
      clinic_name: clinicName.trim() || null,
    })
    setLoading(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else setError(res.error)
  }

  function handleCopy() {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section style={{ marginBottom: 44 }}>
      <SectionLabel>Datos del consultorio</SectionLabel>
      <div style={{ maxWidth: 480 }}>
        <Field
          label="Nombre del consultorio"
          value={clinicName}
          onChange={setClinicName}
          placeholder="Consultorio Nutrición Integral"
        />

        {/* Link público de reservas */}
        <div style={{ marginBottom: 16 }}>
          <label className="label">Página pública de reservas</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              value={bookingUrl}
              readOnly
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-4)',
                cursor: 'default',
                flex: 1,
                fontSize: 12,
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                flexShrink: 0,
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--ink-7)',
                background: copied ? 'var(--leaf-soft)' : '#fff',
                color: copied ? 'var(--leaf)' : 'var(--ink-3)',
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '0.06em',
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="fk-mono" style={{ fontSize: 10, color: 'var(--ink-5)', marginTop: 5 }}>
            Comparte este link para que tus pacientes puedan agendar una cita.
          </div>
        </div>

        {error && (
          <div className="fk-mono" style={{ fontSize: 11, color: 'var(--signal)', marginTop: 4 }}>
            {error}
          </div>
        )}
        <SaveBtn loading={loading} saved={saved} onClick={handleSave} />
      </div>
    </section>
  )
}

// ─── Sección: Defaults de agenda ─────────────────────────────────────────────

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => ({
  value: i + 6,
  label: `${String(i + 6).padStart(2, '0')}:00`,
}))

const DURATION_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 50,  label: '50 min' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30 min' },
]

function SeccionAgenda() {
  const [startHour, setStartHour]   = useState(9)
  const [endHour,   setEndHour]     = useState(17)
  const [duration,  setDuration]    = useState(50)
  const [saved,     setSaved]       = useState(false)
  const [error,     setError]       = useState<string | null>(null)

  useEffect(() => {
    setStartHour(lsNum(LS_START_HOUR, 9))
    setEndHour(lsNum(LS_END_HOUR, 17))
    setDuration(lsNum(LS_DEFAULT_DURATION, 50))
  }, [])

  function handleSave() {
    if (startHour >= endHour) {
      setError('La hora de inicio debe ser menor que la hora de fin.')
      return
    }
    setError(null)
    localStorage.setItem(LS_START_HOUR, String(startHour))
    localStorage.setItem(LS_END_HOUR, String(endHour))
    localStorage.setItem(LS_DEFAULT_DURATION, String(duration))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section style={{ marginBottom: 44 }}>
      <SectionLabel>Defaults de agenda</SectionLabel>
      <div style={{ maxWidth: 480 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <NumSelect
            label="Hora de inicio"
            value={startHour}
            options={HOUR_OPTIONS}
            onChange={setStartHour}
          />
          <NumSelect
            label="Hora de fin"
            value={endHour}
            options={HOUR_OPTIONS}
            onChange={setEndHour}
          />
        </div>
        <NumSelect
          label="Duración por defecto de citas"
          value={duration}
          options={DURATION_OPTIONS}
          onChange={setDuration}
          hint="Al crear una cita nueva se usará este valor. Puedes cambiarlo por cita."
        />
        {error && (
          <div className="fk-mono" style={{ fontSize: 11, color: 'var(--signal)', marginTop: 4 }}>
            {error}
          </div>
        )}
        <SaveBtn loading={false} saved={saved} onClick={handleSave} />
      </div>
    </section>
  )
}

// ─── Sección: Umbrales de alertas ─────────────────────────────────────────────

function SeccionUmbrales() {
  const [inactDays,    setInactDays]    = useState(7)
  const [minAdherence, setMinAdherence] = useState(60)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    setInactDays(lsNum(LS_INACTIVITY_DAYS, 7))
    setMinAdherence(lsNum(LS_MIN_ADHERENCE, 60))
  }, [])

  function handleSave() {
    if (inactDays < 1 || inactDays > 90) {
      setError('Días de inactividad debe estar entre 1 y 90.')
      return
    }
    if (minAdherence < 0 || minAdherence > 100) {
      setError('La adherencia mínima debe estar entre 0 y 100.')
      return
    }
    setError(null)
    localStorage.setItem(LS_INACTIVITY_DAYS, String(inactDays))
    localStorage.setItem(LS_MIN_ADHERENCE, String(minAdherence))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section style={{ marginBottom: 44 }}>
      <SectionLabel>Umbrales de alertas</SectionLabel>
      <div style={{ maxWidth: 480 }}>
        <div
          className="fk-mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-4)',
            background: 'var(--cream)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 18,
            lineHeight: 1.6,
          }}
        >
          Estas preferencias se guardan en este navegador. La lógica de alertas en el
          servidor usará los valores por defecto hasta que se migre a la base de datos en
          Fase 3.
        </div>

        <Field
          label="Días sin registros → inactividad"
          value={String(inactDays)}
          type="number"
          onChange={v => setInactDays(parseInt(v, 10) || 7)}
          hint="Número de días sin ningún registro (peso, comida o gym) para marcar al paciente como inactivo."
        />
        <Field
          label="Adherencia mínima (%)"
          value={String(minAdherence)}
          type="number"
          onChange={v => setMinAdherence(parseInt(v, 10) || 60)}
          hint="Porcentaje de días activos en los últimos 30 días por debajo del cual se muestra alerta."
        />
        {error && (
          <div className="fk-mono" style={{ fontSize: 11, color: 'var(--signal)', marginTop: 4 }}>
            {error}
          </div>
        )}
        <SaveBtn loading={false} saved={saved} onClick={handleSave} />
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AjustesPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [practitioner, setPractitioner] = useState<PractitionerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

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

      <div style={{ padding: '36px 40px', maxWidth: 720 }}>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '48px 0' }}>
            <PulseLine w={120} h={8} color="var(--signal)" active />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="fk-mono"
            style={{
              fontSize: 13,
              color: 'var(--signal)',
              padding: '20px 0',
            }}
          >
            {error}
          </div>
        )}

        {/* Contenido */}
        {!loading && practitioner && (
          <>
            <SeccionPerfil       practitioner={practitioner} />
            <SeccionConsultorio  practitioner={practitioner} />
            <SeccionAgenda />
            <SeccionUmbrales />
          </>
        )}
      </div>
    </div>
  )
}
