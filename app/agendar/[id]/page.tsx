'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PulseLine } from '@/components/ui/PulseLine'
import { Btn } from '@/components/ui/Btn'
import { AddToCalendar } from '@/components/clinic/AddToCalendar'
import { FkWord } from '@/components/ui/Fk'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PractitionerPublic = {
  id: string
  display_name: string
  specialty: string | null
  clinic_name: string | null
}

type Slot = { starts_at: string; duration_minutes: number }

type Step = 'loading' | 'select_date' | 'select_time' | 'fill_form' | 'submitting' | 'confirmed'

type BookedAppointment = {
  starts_at: string
  duration_minutes: number
  practitioner_name: string
}

// ─── Helpers de fecha ────────────────────────────────────────────────────────

const MONTHS_ES_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DAYS_ES_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sun, devuelve en base lunes (0=Mon)
  const raw = new Date(year, month, 1).getDay()
  return raw === 0 ? 6 : raw - 1
}

function formatDateLong(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return `${DAYS_ES_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_ES_LONG[d.getMonth()]} de ${d.getFullYear()}`
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Genera slots de 9:00 a 19:30 cada 30 min para un día dado
function generateSlots(dateISO: string): string[] {
  const slots: string[] = []
  for (let h = 9; h < 20; h++) {
    for (const m of [0, 30]) {
      if (h === 19 && m === 30) break
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      slots.push(`${dateISO}T${hh}:${mm}:00`)
    }
  }
  return slots
}

// Verifica si un slot está ocupado
function isSlotOccupied(slotISO: string, occupied: Slot[], durationMin = 50): boolean {
  const slotStart = new Date(slotISO).getTime()
  const slotEnd = slotStart + durationMin * 60_000
  return occupied.some((occ) => {
    const occStart = new Date(occ.starts_at).getTime()
    const occEnd = occStart + occ.duration_minutes * 60_000
    return slotStart < occEnd && slotEnd > occStart
  })
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function BookingPage({ params }: { params: { id: string } }) {
  const practitionerId = params.id

  // rescheduleId viene del query param ?reschedule=UUID (cuando la nutrióloga solicita reagendar)
  const rescheduleId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('reschedule') ?? undefined
    : undefined

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [step, setStep] = useState<Step>('loading')
  const [practitioner, setPractitioner] = useState<PractitionerPublic | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [occupiedSlots, setOccupiedSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Calendario
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // Formulario
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Confirmación
  const [booked, setBooked] = useState<BookedAppointment | null>(null)

  // Cargar practitioner al montar
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('practitioners')
        .select('id, display_name, specialty, clinic_name')
        .eq('id', practitionerId)
        .eq('active', true)
        .maybeSingle()

      if (!data) {
        setStep('select_date') // Mostrará estado vacío
        return
      }
      setPractitioner(data as PractitionerPublic)
      setStep('select_date')
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitionerId])

  // Cargar slots ocupados al seleccionar fecha
  async function handleSelectDate(dateISO: string) {
    setSelectedDate(dateISO)
    setSlotsLoading(true)
    try {
      const res = await fetch(`/api/available-slots/${practitionerId}/${dateISO}`)
      const data = await res.json()
      setOccupiedSlots(Array.isArray(data) ? data : [])
    } catch {
      setOccupiedSlots([])
    }
    setSlotsLoading(false)
    setStep('select_time')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !selectedSlot) return
    setStep('submitting')
    setFormError(null)

    const res = await fetch('/api/book-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        practitioner_id: practitionerId,
        patient_name: name.trim(),
        patient_email: email.trim(),
        starts_at: new Date(selectedSlot).toISOString(),
        duration_minutes: 50,
        notes: notes.trim() || undefined,
        reschedule_id: rescheduleId,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setFormError(json.error ?? 'Error al agendar la cita.')
      setStep('fill_form')
      return
    }

    setBooked({
      starts_at: new Date(selectedSlot).toISOString(),
      duration_minutes: 50,
      practitioner_name: practitioner?.display_name ?? '',
    })
    setStep('confirmed')
  }

  // ─── Estilos comunes ──────────────────────────────────────────────────────

  const pageStyle: CSSProperties = {
    background: '#fff',
    minHeight: '100vh',
    fontFamily: 'var(--f-sans)',
  }

  const containerStyle: CSSProperties = {
    maxWidth: 520,
    margin: '0 auto',
    padding: '32px 20px 60px',
  }

  const cardStyle: CSSProperties = {
    background: '#fff',
    border: '1px solid var(--ink-7)',
    borderRadius: 14,
    padding: '24px 28px',
    marginBottom: 20,
  }

  const inputStyle: CSSProperties = {
    background: 'var(--paper)',
    border: '1px solid var(--ink-6)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    fontFamily: 'var(--f-sans)',
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--ink-4)',
    display: 'block',
    marginBottom: 6,
  }

  // ─── Header ──────────────────────────────────────────────────────────────

  const Header = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
      <FkWord size={22} />
    </div>
  )

  // ─── PractitionerCard ─────────────────────────────────────────────────────

  const RescheduleBanner = () => {
    if (!rescheduleId) return null
    return (
      <div style={{ background: '#fff3e0', border: '1px solid #e65100', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>📅</span>
        <div>
          <div style={{ fontFamily: 'var(--f-sans)', fontSize: 13, fontWeight: 600, color: '#e65100' }}>Reagendamiento solicitado</div>
          <div style={{ fontFamily: 'var(--f-sans)', fontSize: 12, color: '#bf360c', marginTop: 2 }}>
            Tu nutrióloga quiere cambiar el horario de tu consulta. Elige un nuevo horario a continuación.
          </div>
        </div>
      </div>
    )
  }

  const PractitionerCard = () => {
    if (!practitioner) return null
    return (
      <div style={{ ...cardStyle, background: 'var(--cream)', border: '1px solid var(--honey-soft)' }}>
        <div className="fk-eyebrow" style={{ marginBottom: 6 }}>Nutrióloga</div>
        <div
          className="fk-serif"
          style={{ fontSize: 24, fontWeight: 300, fontStyle: 'italic', marginBottom: 4 }}
        >
          {practitioner.display_name}
        </div>
        {practitioner.specialty && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{practitioner.specialty}</div>
        )}
        {practitioner.clinic_name && (
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{practitioner.clinic_name}</div>
        )}
      </div>
    )
  }

  // ─── Step: loading ────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PulseLine w={120} h={28} color="var(--signal)" strokeWidth={2} active />
      </div>
    )
  }

  // ─── Step: confirmed ──────────────────────────────────────────────────────

  if (step === 'confirmed' && booked) {
    const startDt = new Date(booked.starts_at)
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <Header />
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="fk-eyebrow" style={{ marginBottom: 10, color: 'var(--leaf)' }}>
              Confirmado
            </div>
            <h1
              className="fk-serif"
              style={{ fontSize: 32, fontWeight: 300, fontStyle: 'italic', margin: '0 0 8px' }}
            >
              ¡Cita confirmada!
            </h1>
          </div>

          <div style={cardStyle}>
            <div className="fk-eyebrow" style={{ marginBottom: 12 }}>Resumen</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Nutrióloga</span>
                <div
                  className="fk-serif"
                  style={{ fontSize: 16, fontWeight: 300 }}
                >
                  {booked.practitioner_name}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Fecha</span>
                <div style={{ fontSize: 15, fontWeight: 400 }}>
                  {formatDateLong(startDt.toISOString().split('T')[0])}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Hora</span>
                <div className="fk-mono" style={{ fontSize: 18, color: 'var(--signal)' }}>
                  {formatTime(booked.starts_at)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Duración</span>
                <div style={{ fontSize: 14 }}>{booked.duration_minutes} min</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <AddToCalendar
              title={`Consulta con ${booked.practitioner_name}`}
              startISO={booked.starts_at}
              durationMinutes={booked.duration_minutes}
              description={`Consulta nutricional con ${booked.practitioner_name}`}
            />
          </div>

          {email && (
            <div className="fk-eyebrow" style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
              Recibirás confirmación en {email}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Step: select_date ────────────────────────────────────────────────────

  if (step === 'select_date') {
    const todayStr = todayISO()
    const daysInMonth = getDaysInMonth(calYear, calMonth)
    const firstDay = getFirstDayOfMonth(calYear, calMonth)

    const prevMonth = () => {
      if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11) }
      else setCalMonth((m) => m - 1)
    }
    const nextMonth = () => {
      if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0) }
      else setCalMonth((m) => m + 1)
    }

    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <Header />
          <RescheduleBanner />
          <PractitionerCard />

          <div style={cardStyle}>
            <div className="fk-eyebrow" style={{ marginBottom: 16 }}>Selecciona una fecha</div>

            {/* Nav de mes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button
                onClick={prevMonth}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                &#8592;
              </button>
              <span className="fk-serif" style={{ fontSize: 16, fontWeight: 300 }}>
                {MONTHS_ES_LONG[calMonth].charAt(0).toUpperCase() + MONTHS_ES_LONG[calMonth].slice(1)}{' '}
                {calYear}
              </span>
              <button
                onClick={nextMonth}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                &#8594;
              </button>
            </div>

            {/* Encabezados días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <div
                  key={d}
                  className="fk-eyebrow"
                  style={{ textAlign: 'center', fontSize: 9, color: 'var(--ink-4)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />

                const mm = String(calMonth + 1).padStart(2, '0')
                const dd = String(day).padStart(2, '0')
                const dateStr = `${calYear}-${mm}-${dd}`
                const isPast = dateStr < todayStr
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate

                let bg = 'transparent'
                let color = isPast ? 'var(--ink-6)' : 'var(--ink)'
                let border = 'none'
                if (isToday) { border = '1px solid var(--signal)'; color = 'var(--signal)' }
                if (isSelected) { bg = 'var(--ink)'; color = 'var(--paper)' }

                return (
                  <button
                    key={dateStr}
                    disabled={isPast}
                    onClick={() => handleSelectDate(dateStr)}
                    style={{
                      background: bg,
                      border,
                      borderRadius: 8,
                      padding: '8px 4px',
                      fontSize: 14,
                      color,
                      cursor: isPast ? 'default' : 'pointer',
                      fontFamily: 'var(--f-sans)',
                      transition: 'all 0.1s',
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step: select_time ────────────────────────────────────────────────────

  if (step === 'select_time' && selectedDate) {
    const slots = generateSlots(selectedDate)

    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <Header />

          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setStep('select_date')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--sky)',
                fontFamily: 'var(--f-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              &#8592; Cambiar fecha
            </button>
          </div>

          <div style={cardStyle}>
            <div className="fk-eyebrow" style={{ marginBottom: 6 }}>Selecciona un horario</div>
            <div
              className="fk-serif"
              style={{ fontSize: 20, fontWeight: 300, fontStyle: 'italic', marginBottom: 20 }}
            >
              {formatDateLong(selectedDate)}
            </div>

            {slotsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <PulseLine w={80} h={20} color="var(--signal)" strokeWidth={2} active />
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                }}
              >
                {slots.map((slot) => {
                  const occupied = isSlotOccupied(slot, occupiedSlots)
                  const isSelected = slot === selectedSlot

                  return (
                    <button
                      key={slot}
                      disabled={occupied}
                      onClick={() => {
                        setSelectedSlot(slot)
                        setStep('fill_form')
                      }}
                      style={{
                        background: isSelected
                          ? 'var(--ink)'
                          : occupied
                          ? 'var(--paper-3)'
                          : '#fff',
                        border: `1px solid ${occupied ? 'var(--ink-7)' : 'var(--ink-6)'}`,
                        borderRadius: 8,
                        padding: '10px 4px',
                        fontSize: 13,
                        fontFamily: 'var(--f-mono)',
                        color: isSelected
                          ? 'var(--paper)'
                          : occupied
                          ? 'var(--ink-6)'
                          : 'var(--ink)',
                        cursor: occupied ? 'not-allowed' : 'pointer',
                        textDecoration: occupied ? 'line-through' : 'none',
                        transition: 'all 0.1s',
                      }}
                    >
                      {formatTime(slot)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Step: fill_form / submitting ─────────────────────────────────────────

  if ((step === 'fill_form' || step === 'submitting') && selectedDate && selectedSlot) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <Header />

          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setStep('select_time')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--sky)',
                fontFamily: 'var(--f-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              &#8592; Cambiar horario
            </button>
          </div>

          {/* Resumen */}
          <div style={{ ...cardStyle, background: 'var(--cream)', border: '1px solid var(--honey-soft)', marginBottom: 16 }}>
            <div className="fk-eyebrow" style={{ marginBottom: 6 }}>Tu cita</div>
            <div
              className="fk-serif"
              style={{ fontSize: 18, fontWeight: 300, fontStyle: 'italic' }}
            >
              {formatDateLong(selectedDate)}
            </div>
            <div className="fk-mono" style={{ fontSize: 22, color: 'var(--signal)', marginTop: 4 }}>
              {formatTime(selectedSlot)}
            </div>
            {practitioner && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                con {practitioner.display_name}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div className="fk-eyebrow" style={{ marginBottom: 16 }}>Tus datos</div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nombre completo *</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email *</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Motivo de consulta</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cuéntanos brevemente el motivo de tu visita…"
                />
              </div>

              {formError && (
                <div
                  style={{
                    background: 'var(--signal-soft)',
                    color: '#a33a0f',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {formError}
                </div>
              )}

              <Btn
                type="submit"
                variant="primary"
                size="lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={step === 'submitting' || !name.trim() || !email.trim()}
              >
                {step === 'submitting' ? 'Confirmando…' : 'Confirmar cita'}
              </Btn>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return null
}
