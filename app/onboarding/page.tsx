'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser } from '@/lib/hooks'
import { loadPractitionerByUser } from '@/lib/clinic/queries'
import { PulseLine } from '@/components/ui/PulseLine'
import { FkWord } from '@/components/ui/Fk'
import {
  DURATIONS, TIME_OPTIONS, DAY_ORDER, DAY_LABELS, DEFAULT_WEEK_SCHEDULE,
  type DayKey, type Break, type WeekSchedule,
} from '@/lib/clinic/calendar-utils'

const TOTAL_STEPS = 4

const ESPECIALIDADES = [
  'Nutrición clínica · SMAE',
  'Nutrición deportiva',
  'Nutrición pediátrica',
  'Nutrición oncológica',
  'Nutrición bariátrica',
  'Nutriología general',
  'Otra',
]

const STEP_META = [
  {
    eyebrow: 'Paso 1 de 4 · Seguridad',
    title:   'Crea tu contraseña',
    sub:     'Para entrar al portal con email y contraseña en el futuro.',
  },
  {
    eyebrow: 'Paso 2 de 4 · Perfil',
    title:   'Tu perfil profesional',
    sub:     'Información visible para tus pacientes en la plataforma.',
  },
  {
    eyebrow: 'Paso 3 de 4 · Consultorio',
    title:   'Datos del consultorio',
    sub:     'Puedes omitir esto y configurarlo después en Ajustes.',
  },
  {
    eyebrow: 'Paso 4 de 4 · Agenda',
    title:   'Configura tu agenda',
    sub:     'Duración de citas y horario semanal para el link de reservas.',
  },
]

// ── Shared primitives ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
  border: '1px solid var(--ink-7)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 14,
  fontFamily: 'var(--f-sans)',
  color: 'var(--ink)',
  outline: 'none',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--f-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.13em',
      textTransform: 'uppercase',
      color: 'var(--ink-4)',
      marginBottom: 7,
    }}>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 5, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', lineHeight: 1.5 }}>
      {children}
    </div>
  )
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'var(--paper)',
          border: '1px solid var(--ink-7)',
          borderRadius: 7,
          padding: '5px 22px 5px 8px',
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
        viewBox="0 0 24 24" width={9} height={9} fill="none"
        stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-5)' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 8  ? 1 : 0) +
    (password.length >= 12 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0)
  const colors = ['', '#e85c41', '#e6a817', '#4a7c3a', '#2e6e22']
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= score ? colors[score] : 'var(--ink-7)', transition: 'background 0.2s' }} />
        ))}
      </div>
      {score > 0 && (
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: colors[score] }}>{labels[score]}</div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function Eye() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()

  const [checking,   setChecking]   = useState(true)
  const [step,       setStep]       = useState(0)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  // Step 1 — Seguridad
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)

  // Step 2 — Perfil
  const [nombre,       setNombre]       = useState('')
  const [cedula,       setCedula]       = useState('')
  const [especialidad, setEspecialidad] = useState(ESPECIALIDADES[0])

  // Step 3 — Consultorio
  const [clinicName, setClinicName] = useState('')
  const [address,    setAddress]    = useState('')

  // Step 4 — Agenda
  const [duration, setDuration] = useState(60)
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE)

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.replace('/login'); return }
    loadPractitionerByUser(supabase, user.id).then(existing => {
      if (existing) router.replace('/clinic')
      else setChecking(false)
    })
  }, [user, userLoading, supabase, router])

  function validateStep(): string | null {
    if (step === 0) {
      if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
      if (password !== confirm)  return 'Las contraseñas no coinciden.'
    }
    if (step === 1 && !nombre.trim()) return 'El nombre es obligatorio.'
    return null
  }

  function advance() {
    setSaveError(null)
    const err = validateStep()
    if (err) { setSaveError(err); return }
    if (step < TOTAL_STEPS - 1) { setStep(s => s + 1); return }
    doSubmit('/clinic')
  }

  function skip() {
    setSaveError(null)
    if (step < TOTAL_STEPS - 1) { setStep(s => s + 1); return }
    doSubmit('/clinic')
  }

  async function doSubmit(redirectTo: string) {
    if (!user) return
    setSaving(true)
    setSaveError(null)

    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) { setSaving(false); setSaveError(pwErr.message); return }

    const { error: insertErr } = await supabase
      .from('practitioners')
      .insert({
        user_id:          user.id,
        display_name:     nombre.trim(),
        license_number:   cedula.trim()      || null,
        specialty:        especialidad,
        clinic_name:      clinicName.trim()  || null,
        address:          address.trim()     || null,
        default_duration: duration,
        schedule,
      } as never)

    if (insertErr) { setSaving(false); setSaveError(insertErr.message); return }

    await supabase
      .from('user_profiles')
      .update({ role: 'practitioner' } as never)
      .eq('user_id', user.id)

    router.replace(redirectTo)
  }

  function toggleDay(key: DayKey) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))
  }

  function setDayTime(key: DayKey, field: 'start' | 'end', val: string) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
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

  function updateBreak(key: DayKey, idx: number, field: keyof Break, val: string) {
    setSchedule(prev => {
      const breaks = [...prev[key].breaks]
      breaks[idx] = { ...breaks[idx], [field]: val }
      return { ...prev, [key]: { ...prev[key], breaks } }
    })
  }

  if (checking || userLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PulseLine w={100} h={24} color="var(--signal)" strokeWidth={2} active />
      </div>
    )
  }

  const isLast     = step === TOTAL_STEPS - 1
  const isOptional = step >= 2
  const { eyebrow, title, sub } = STEP_META[step]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{
        padding: '18px 32px',
        borderBottom: '1px solid var(--ink-7)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <FkWord size={18} />
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.12em' }}>
          CONFIGURACIÓN INICIAL
        </div>
      </div>

      {/* Card centered */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 20,
          border: '1px solid var(--ink-7)',
          boxShadow: '0 4px 40px rgba(10,10,10,0.08)',
          overflow: 'hidden',
        }}>
          {/* Signal strip */}
          <div style={{ height: 3, background: 'var(--signal)' }} />

          <div style={{ padding: '36px 40px' }}>

            {/* Progress dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    width: i === step ? 22 : 6,
                    borderRadius: 99,
                    background: i === step ? 'var(--signal)' : i < step ? 'var(--ink-4)' : 'var(--ink-7)',
                    transition: 'all 0.25s ease-out',
                    flexShrink: 0,
                  }}
                />
              ))}
              <span style={{ marginLeft: 6, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)' }}>
                {step + 1} / {TOTAL_STEPS}
              </span>
            </div>

            {/* Step header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--signal)', marginBottom: 6,
              }}>
                {eyebrow}
              </div>
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--f-serif)', fontSize: 28, fontWeight: 300,
                fontStyle: 'italic', lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--ink)',
              }}>
                {title}
              </h1>
              <p style={{ margin: '6px 0 0', fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.5 }}>
                {sub}
              </p>
            </div>

            {/* ── Step 1: Contraseña ─────────────────────────────────────── */}
            {step === 0 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Label>Nueva contraseña</Label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      style={{ ...inputStyle, paddingRight: 44 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showPw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {password.length > 0 && <PasswordStrength password={password} />}
                </div>
                <div>
                  <Label>Confirmar contraseña</Label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite tu contraseña"
                    style={inputStyle}
                  />
                  {confirm.length > 0 && password !== confirm && (
                    <div style={{ marginTop: 5, fontFamily: 'var(--f-mono)', fontSize: 10, color: '#e85c41' }}>
                      Las contraseñas no coinciden.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Perfil ─────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                {nombre.trim() && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22,
                    padding: '13px 16px', background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--ink-7)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 999,
                      background: 'var(--signal)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 300, flexShrink: 0,
                    }}>
                      {nombre.trim().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>
                        {nombre.trim()}
                      </div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                        {especialidad.toUpperCase()}{cedula ? ` · CED ${cedula}` : ''}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <Label>Nombre completo <span style={{ color: 'var(--signal)' }}>*</span></Label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Dra. Ana Pérez Gutiérrez"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Label>
                    Cédula profesional{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-5)' }}>
                      opcional
                    </span>
                  </Label>
                  <input
                    type="text"
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="12345678"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <Label>Especialidad</Label>
                  <select
                    value={especialidad}
                    onChange={e => setEspecialidad(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
                  >
                    {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 3: Consultorio ────────────────────────────────────── */}
            {step === 2 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Label>Nombre del consultorio</Label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={e => setClinicName(e.target.value)}
                    placeholder="Clínica Nutrición Norte"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Av. Insurgentes Sur 1234, CDMX"
                    style={inputStyle}
                  />
                  <Hint>Visible en la app de tus pacientes y en los reportes PDF.</Hint>
                </div>
              </div>
            )}

            {/* ── Step 4: Agenda ─────────────────────────────────────────── */}
            {step === 3 && (
              <div>
                {/* Duración */}
                <div style={{ marginBottom: 24 }}>
                  <Label>Duración de citas</Label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 999,
                          border: `2px solid ${duration === d ? 'var(--signal)' : 'var(--ink-7)'}`,
                          background: duration === d ? 'rgba(255,90,31,0.08)' : '#fff',
                          color: duration === d ? 'var(--signal)' : 'var(--ink-3)',
                          fontFamily: 'var(--f-mono)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                        }}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horario semanal */}
                <div style={{ marginBottom: 24 }}>
                  <Label>Días de atención</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {DAY_ORDER.map(key => {
                      const day = schedule[key]
                      return (
                        <div
                          key={key}
                          style={{
                            borderRadius: 10,
                            border: '1px solid var(--ink-7)',
                            background: day.enabled ? '#fff' : 'var(--paper-2)',
                            overflow: 'hidden',
                            transition: 'background 0.15s',
                          }}
                        >
                          {/* Fila principal */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
                            <button
                              type="button"
                              onClick={() => toggleDay(key)}
                              style={{
                                width: 30, height: 17, borderRadius: 9, border: 'none',
                                background: day.enabled ? 'var(--signal)' : 'var(--ink-6)',
                                position: 'relative', cursor: 'pointer', flexShrink: 0,
                                transition: 'background 0.15s',
                              }}
                            >
                              <div style={{
                                position: 'absolute', top: 2.5,
                                left: day.enabled ? 15 : 3,
                                width: 12, height: 12, borderRadius: 999, background: '#fff',
                                transition: 'left 0.15s',
                              }} />
                            </button>
                            <span style={{
                              fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 500,
                              color: day.enabled ? 'var(--ink)' : 'var(--ink-5)',
                              width: 88, flexShrink: 0,
                            }}>
                              {DAY_LABELS[key]}
                            </span>
                            {day.enabled ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                  <TimeSelect value={day.start} onChange={v => setDayTime(key, 'start', v)} />
                                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)' }}>→</span>
                                  <TimeSelect value={day.end}   onChange={v => setDayTime(key, 'end',   v)} />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addBreak(key)}
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
                              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-5)' }}>
                                Sin atención
                              </span>
                            )}
                          </div>

                          {/* Breaks */}
                          {day.enabled && day.breaks.length > 0 && (
                            <div style={{ padding: '0 12px 9px 50px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {day.breaks.map((brk, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', width: 38, flexShrink: 0 }}>
                                    pausa
                                  </span>
                                  <TimeSelect value={brk.start} onChange={v => updateBreak(key, i, 'start', v)} />
                                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)' }}>→</span>
                                  <TimeSelect value={brk.end}   onChange={v => updateBreak(key, i, 'end',   v)} />
                                  <button
                                    type="button"
                                    onClick={() => removeBreak(key, i)}
                                    style={{
                                      width: 20, height: 20, borderRadius: 999, border: 'none',
                                      background: 'var(--paper-3)', color: 'var(--ink-4)',
                                      cursor: 'pointer', fontSize: 13, lineHeight: 1,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      flexShrink: 0,
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

                {/* Google Calendar */}
                <div style={{
                  border: '1px solid var(--ink-7)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  background: 'var(--paper)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <GoogleIcon />
                    <div style={{ fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      Google Calendar
                    </div>
                    <span style={{
                      fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--ink-4)', background: 'var(--paper-3)',
                      padding: '2px 7px', borderRadius: 99,
                    }}>
                      opcional
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5 }}>
                    Bloquea automáticamente los slots que ya tienes ocupados en tu calendario personal.
                    Solo se lee libre/ocupado — Fitkis no accede al contenido de tus eventos.
                  </p>
                  <button
                    type="button"
                    onClick={() => doSubmit('/api/auth/google-calendar/connect')}
                    disabled={saving}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', borderRadius: 8,
                      border: '1px solid var(--ink-6)', background: '#fff',
                      color: 'var(--ink)', fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 500,
                      cursor: saving ? 'default' : 'pointer',
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <GoogleIcon />
                    Guardar y conectar Google Calendar
                  </button>
                  <div style={{ marginTop: 8, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)' }}>
                    Serás redirigida a Google y de vuelta al portal. También puedes hacerlo después en Ajustes → Agenda.
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {saveError && (
              <div style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255,90,31,0.07)',
                border: '1px solid rgba(255,90,31,0.22)',
                fontFamily: 'var(--f-sans)',
                fontSize: 13,
                color: 'var(--signal)',
              }}>
                {saveError}
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSaveError(null); setStep(s => s - 1) }}
                    disabled={saving}
                    style={{
                      flexShrink: 0,
                      padding: '13px 20px',
                      borderRadius: 999,
                      border: '1px solid var(--ink-7)',
                      background: '#fff',
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-sans)',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    ← Atrás
                  </button>
                )}
                <button
                  type="button"
                  onClick={advance}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '13px 20px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    fontFamily: 'var(--f-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {saving ? (
                    <><PulseLine w={36} h={10} color="var(--paper)" strokeWidth={1.5} active /> Guardando…</>
                  ) : isLast ? 'Entrar al portal →' : 'Continuar →'}
                </button>
              </div>

              {isOptional && !saving && (
                <button
                  type="button"
                  onClick={skip}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    padding: '2px 0',
                  }}
                >
                  {isLast ? 'Omitir y entrar al portal →' : 'Omitir por ahora →'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
