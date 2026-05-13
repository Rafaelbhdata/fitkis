'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/hooks'
import {
  loadConsultationNotes,
  loadAppointmentNotesForPatient,
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
  updateAppointmentNotes,
  type ConsultationNote,
  type ConsultationNoteTag,
  type AppointmentNote,
} from '@/lib/clinic/queries'

/** Entrada unificada para el feed: nota manual del nutriólogo o nota tomada en una cita. */
type FeedEntry =
  | { kind: 'manual';      data: ConsultationNote }
  | { kind: 'appointment'; data: AppointmentNote }

function entryDate(e: FeedEntry): string {
  return e.kind === 'manual' ? e.data.note_date : e.data.starts_at.slice(0, 10)
}
function entrySortKey(e: FeedEntry): string {
  return e.kind === 'manual' ? e.data.note_date + 'T00:00:00' : e.data.starts_at
}

const TAG_OPTIONS: { k: ConsultationNoteTag; n: string; c: string; bg: string }[] = [
  { k: 'ajuste_plan',  n: 'Ajuste de plan',  c: 'var(--leaf)',   bg: 'var(--leaf-soft)'  },
  { k: 'recordatorio', n: 'Recordatorio',    c: 'var(--honey)',  bg: 'var(--honey-soft)' },
  { k: 'reagenda',     n: 'Reagenda',        c: 'var(--berry)',  bg: 'var(--berry-soft)' },
  { k: 'objetivo',     n: 'Objetivo',        c: 'var(--sky)',    bg: 'var(--sky-soft)'   },
  { k: 'observacion',  n: 'Observación',     c: 'var(--ink-3)',  bg: 'var(--paper-3)'    },
]

function getTagMeta(k: ConsultationNoteTag) {
  return TAG_OPTIONS.find((o) => o.k === k) ?? TAG_OPTIONS[4]
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatAppointmentDateTime(iso: string): string {
  const d = new Date(iso)
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${h}:${m}`
}

export function ConsultationNotesCard({
  practitionerId,
  patientId,
}: {
  practitionerId: string
  patientId: string
}) {
  const supabase = useSupabase()
  const [notes, setNotes]                     = useState<ConsultationNote[]>([])
  const [apptNotes, setApptNotes]             = useState<AppointmentNote[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [draftBody, setDraftBody] = useState('')
  const [draftTags, setDraftTags] = useState<ConsultationNoteTag[]>([])
  const [saving, setSaving]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody]   = useState('')
  const [editTags, setEditTags]   = useState<ConsultationNoteTag[]>([])
  // Edición de notas de cita (appointments.notes)
  const [editingApptId, setEditingApptId] = useState<string | null>(null)
  const [editApptBody, setEditApptBody]   = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      loadConsultationNotes(supabase, practitionerId, patientId),
      loadAppointmentNotesForPatient(supabase, practitionerId, patientId),
    ])
      .then(([rows, appts]) => { if (!cancelled) { setNotes(rows); setApptNotes(appts); setError(null) } })
      .catch((e) => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [supabase, practitionerId, patientId])

  // Feed unificado ordenado por fecha descendente
  const feed: FeedEntry[] = [
    ...notes.map((n): FeedEntry => ({ kind: 'manual', data: n })),
    ...apptNotes.map((a): FeedEntry => ({ kind: 'appointment', data: a })),
  ].sort((a, b) => entrySortKey(b).localeCompare(entrySortKey(a)))

  // Comportamiento radio: solo un badge por nota. Click en el activo lo deselecciona.
  function selectDraftTag(t: ConsultationNoteTag) {
    setDraftTags((prev) => (prev[0] === t ? [] : [t]))
  }
  function selectEditTag(t: ConsultationNoteTag) {
    setEditTags((prev) => (prev[0] === t ? [] : [t]))
  }

  async function handleCreate() {
    if (!draftBody.trim()) return
    setSaving(true)
    const { data, error } = await createConsultationNote(supabase, {
      practitioner_id: practitionerId,
      patient_id: patientId,
      body: draftBody,
      tags: draftTags,
    })
    setSaving(false)
    if (error) { setError(error); return }
    if (data) setNotes((prev) => [data, ...prev])
    setDraftBody(''); setDraftTags([]); setComposing(false)
  }

  function startEdit(n: ConsultationNote) {
    setEditingId(n.id)
    setEditBody(n.body)
    setEditTags(n.tags)
  }

  async function handleSaveEdit(id: string) {
    if (!editBody.trim()) return
    setSaving(true)
    const { error } = await updateConsultationNote(supabase, id, { body: editBody, tags: editTags })
    setSaving(false)
    if (error) { setError(error); return }
    setNotes((prev) => prev.map((n) => n.id === id
      ? { ...n, body: editBody.trim(), tags: editTags, updated_at: new Date().toISOString() }
      : n
    ))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta nota? No se puede deshacer.')) return
    const { error } = await deleteConsultationNote(supabase, id)
    if (error) { setError(error); return }
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  function startEditAppt(a: AppointmentNote) {
    setEditingApptId(a.appointment_id)
    setEditApptBody(a.body)
  }

  async function handleSaveEditAppt(apptId: string) {
    if (!editApptBody.trim()) return
    setSaving(true)
    const { error } = await updateAppointmentNotes(supabase, apptId, editApptBody)
    setSaving(false)
    if (error) { setError(error); return }
    setApptNotes((prev) => prev.map((a) => a.appointment_id === apptId
      ? { ...a, body: editApptBody.trim() }
      : a
    ))
    setEditingApptId(null)
  }

  async function handleDeleteAppt(apptId: string) {
    if (!confirm('¿Eliminar esta nota de la cita? Se borra de la cita también.')) return
    const { error } = await updateAppointmentNotes(supabase, apptId, '')
    if (error) { setError(error); return }
    setApptNotes((prev) => prev.filter((a) => a.appointment_id !== apptId))
  }

  return (
    <div
      id="consultation-notes"
      style={{
        background: '#fff',
        border: '1px solid var(--ink-7)',
        borderRadius: 14,
        padding: '22px 26px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="fk-eyebrow">Notas de consulta</div>
          <div className="fk-serif" style={{ fontSize: 22, fontWeight: 300, fontStyle: 'italic', marginTop: 4 }}>
            {feed.length === 0
              ? 'Aún sin notas'
              : `${feed.length} nota${feed.length === 1 ? '' : 's'}${apptNotes.length > 0 ? ` · ${apptNotes.length} desde citas` : ''}`}
          </div>
        </div>
        {!composing && (
          <button
            onClick={() => setComposing(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid var(--ink-7)',
              background: '#fff',
              fontSize: 12,
              fontFamily: 'var(--f-sans)',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            + Nueva nota
          </button>
        )}
      </div>

      {composing && (
        <div style={{ marginBottom: 18, padding: 14, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--ink-7)' }}>
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            placeholder="Apunta lo relevante de la consulta — ajustes al plan, próximos pasos, alertas…"
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--ink-7)',
              background: '#fff',
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {TAG_OPTIONS.map((t) => {
              const active = draftTags.includes(t.k)
              return (
                <button
                  key={t.k}
                  onClick={() => selectDraftTag(t.k)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    border: active ? `1px solid ${t.c}` : '1px solid var(--ink-7)',
                    background: active ? t.bg : '#fff',
                    color: active ? t.c : 'var(--ink-4)',
                    fontSize: 11,
                    fontFamily: 'var(--f-sans)',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {t.n}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={() => { setComposing(false); setDraftBody(''); setDraftTags([]) }}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: 'none',
                background: 'transparent',
                fontSize: 12,
                fontFamily: 'var(--f-sans)',
                color: 'var(--ink-4)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!draftBody.trim() || saving}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontSize: 12,
                fontFamily: 'var(--f-sans)',
                fontWeight: 500,
                cursor: !draftBody.trim() || saving ? 'not-allowed' : 'pointer',
                opacity: !draftBody.trim() || saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 10, marginBottom: 12, background: 'var(--berry-soft)', color: 'var(--berry)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--f-sans)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '20px 0', color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--f-mono)' }}>
          cargando notas…
        </div>
      ) : feed.length === 0 && !composing ? (
        <p className="fk-serif" style={{ fontSize: 15, fontWeight: 300, fontStyle: 'italic', color: 'var(--ink-4)', margin: 0, lineHeight: 1.6 }}>
          Las notas que guardes aquí solo las ves tú. Sirven para registrar ajustes al plan, recordatorios y observaciones entre consultas.
          También aparecerán aquí las notas que escribas dentro de cada cita en la agenda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feed.map((entry) => {
            if (entry.kind === 'appointment') {
              const a = entry.data
              const isEditingAppt = editingApptId === a.appointment_id
              return (
                <div
                  key={`appt-${a.appointment_id}`}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: '1px solid var(--ink-7)',
                    background: isEditingAppt ? 'var(--paper)' : '#fff',
                    borderLeft: '3px solid var(--signal)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'var(--signal-soft)',
                      color: 'var(--signal)',
                      fontSize: 10,
                      fontFamily: 'var(--f-sans)',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Cita · {formatAppointmentDateTime(a.starts_at)}
                    </span>
                    {!isEditingAppt && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => startEditAppt(a)}
                          style={{ padding: '4px 10px', background: 'transparent', border: 'none', fontSize: 11, color: 'var(--ink-4)', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
                        >
                          editar
                        </button>
                        <button
                          onClick={() => handleDeleteAppt(a.appointment_id)}
                          style={{ padding: '4px 10px', background: 'transparent', border: 'none', fontSize: 11, color: 'var(--berry)', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
                        >
                          eliminar
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditingAppt ? (
                    <>
                      <textarea
                        value={editApptBody}
                        onChange={(e) => setEditApptBody(e.target.value)}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--ink-7)',
                          background: '#fff',
                          fontFamily: 'var(--f-sans)',
                          fontSize: 14,
                          lineHeight: 1.5,
                          resize: 'vertical',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button
                          onClick={() => setEditingApptId(null)}
                          style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink-4)', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEditAppt(a.appointment_id)}
                          disabled={!editApptBody.trim() || saving}
                          style={{
                            padding: '6px 14px', borderRadius: 999, border: 'none',
                            background: 'var(--ink)', color: 'var(--paper)', fontSize: 12, fontWeight: 500,
                            cursor: !editApptBody.trim() || saving ? 'not-allowed' : 'pointer',
                            opacity: !editApptBody.trim() || saving ? 0.5 : 1,
                          }}
                        >
                          {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--f-sans)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {a.body}
                    </p>
                  )}
                </div>
              )
            }
            const n = entry.data
            const isEditing = editingId === n.id
            // Color del borde y chip = primer tag (o neutro si no hay)
            const primaryMeta = n.tags.length > 0
              ? getTagMeta(n.tags[0])
              : { k: 'observacion' as ConsultationNoteTag, n: 'Nota', c: 'var(--ink-3)', bg: 'var(--paper-3)' }
            const headerLabel = n.tags.length > 0 ? primaryMeta.n : 'Nota'
            return (
              <div
                key={n.id}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--ink-7)',
                  background: isEditing ? 'var(--paper)' : '#fff',
                  borderLeft: `3px solid ${primaryMeta.c}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: primaryMeta.bg,
                    color: primaryMeta.c,
                    fontSize: 10,
                    fontFamily: 'var(--f-sans)',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {headerLabel} · {formatNoteDate(n.note_date)}
                  </span>
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => startEdit(n)}
                        style={{ padding: '4px 10px', background: 'transparent', border: 'none', fontSize: 11, color: 'var(--ink-4)', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
                      >
                        editar
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        style={{ padding: '4px 10px', background: 'transparent', border: 'none', fontSize: 11, color: 'var(--berry)', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
                      >
                        eliminar
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--ink-7)',
                        background: '#fff',
                        fontFamily: 'var(--f-sans)',
                        fontSize: 14,
                        lineHeight: 1.5,
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {TAG_OPTIONS.map((t) => {
                        const active = editTags.includes(t.k)
                        return (
                          <button
                            key={t.k}
                            onClick={() => selectEditTag(t.k)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 999,
                              border: active ? `1px solid ${t.c}` : '1px solid var(--ink-7)',
                              background: active ? t.bg : '#fff',
                              color: active ? t.c : 'var(--ink-4)',
                              fontSize: 11,
                              fontFamily: 'var(--f-sans)',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            {t.n}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink-4)', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(n.id)}
                        disabled={!editBody.trim() || saving}
                        style={{
                          padding: '6px 14px', borderRadius: 999, border: 'none',
                          background: 'var(--ink)', color: 'var(--paper)', fontSize: 12, fontWeight: 500,
                          cursor: !editBody.trim() || saving ? 'not-allowed' : 'pointer',
                          opacity: !editBody.trim() || saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--f-sans)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
