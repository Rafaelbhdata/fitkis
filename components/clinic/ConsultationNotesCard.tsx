'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/lib/hooks'
import { fmtShortDate, fmtShortDateTime } from '@/lib/clinic/calendar-utils'
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

type FeedEntry =
  | { kind: 'manual';      data: ConsultationNote }
  | { kind: 'appointment'; data: AppointmentNote }

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

/**
 * Estado de edición unificado. Solo una nota puede estar en edición a la vez,
 * sea nota manual nueva, nota manual existente o nota de cita.
 */
type Editing =
  | { mode: 'new' }
  | { mode: 'manual'; id: string }
  | { mode: 'appointment'; appointmentId: string }
  | null

export function ConsultationNotesCard({
  practitionerId,
  patientId,
}: {
  practitionerId: string
  patientId: string
}) {
  const supabase = useSupabase()
  const [notes, setNotes]         = useState<ConsultationNote[]>([])
  const [apptNotes, setApptNotes] = useState<AppointmentNote[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  const [editing, setEditing]     = useState<Editing>(null)
  const [editorBody, setEditorBody] = useState('')
  const [editorTag, setEditorTag]   = useState<ConsultationNoteTag | null>(null)

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

  const feed: FeedEntry[] = useMemo(() => [
    ...notes.map((n): FeedEntry => ({ kind: 'manual', data: n })),
    ...apptNotes.map((a): FeedEntry => ({ kind: 'appointment', data: a })),
  ].sort((a, b) => entrySortKey(b).localeCompare(entrySortKey(a))), [notes, apptNotes])

  function openNew() {
    setEditing({ mode: 'new' })
    setEditorBody('')
    setEditorTag(null)
  }
  function openEditManual(n: ConsultationNote) {
    setEditing({ mode: 'manual', id: n.id })
    setEditorBody(n.body)
    setEditorTag(n.tags[0] ?? null)
  }
  function openEditAppt(a: AppointmentNote) {
    setEditing({ mode: 'appointment', appointmentId: a.appointment_id })
    setEditorBody(a.body)
    setEditorTag(null)
  }
  function closeEditor() {
    setEditing(null)
    setEditorBody('')
    setEditorTag(null)
  }

  async function handleSave() {
    if (!editing || !editorBody.trim()) return
    setSaving(true)
    try {
      if (editing.mode === 'new') {
        const tags = editorTag ? [editorTag] : []
        const { data, error } = await createConsultationNote(supabase, {
          practitioner_id: practitionerId,
          patient_id: patientId,
          body: editorBody,
          tags,
        })
        if (error) { setError(error); return }
        if (data) setNotes(prev => [data, ...prev])
      } else if (editing.mode === 'manual') {
        const tags = editorTag ? [editorTag] : []
        const { error } = await updateConsultationNote(supabase, editing.id, { body: editorBody, tags })
        if (error) { setError(error); return }
        setNotes(prev => prev.map(n => n.id === editing.id
          ? { ...n, body: editorBody.trim(), tags, updated_at: new Date().toISOString() }
          : n
        ))
      } else {
        const { error } = await updateAppointmentNotes(supabase, editing.appointmentId, editorBody)
        if (error) { setError(error); return }
        setApptNotes(prev => prev.map(a => a.appointment_id === editing.appointmentId
          ? { ...a, body: editorBody.trim() }
          : a
        ))
      }
      closeEditor()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteManual(id: string) {
    if (!confirm('¿Eliminar esta nota? No se puede deshacer.')) return
    const { error } = await deleteConsultationNote(supabase, id)
    if (error) { setError(error); return }
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function handleDeleteAppt(apptId: string) {
    if (!confirm('¿Eliminar esta nota de la cita? Se borra de la cita también.')) return
    const { error } = await updateAppointmentNotes(supabase, apptId, '')
    if (error) { setError(error); return }
    setApptNotes(prev => prev.filter(a => a.appointment_id !== apptId))
  }

  return (
    <div
      id="consultation-notes"
      style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 14, padding: '22px 26px' }}
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
        {editing == null && (
          <button
            onClick={openNew}
            style={{
              padding: '8px 14px', borderRadius: 999, border: '1px solid var(--ink-7)',
              background: '#fff', fontSize: 12, fontFamily: 'var(--f-sans)', fontWeight: 500,
              color: 'var(--ink)', cursor: 'pointer',
            }}
          >
            + Nueva nota
          </button>
        )}
      </div>

      {editing?.mode === 'new' && (
        <NoteEditor
          body={editorBody}
          onBodyChange={setEditorBody}
          tag={editorTag}
          onTagChange={setEditorTag}
          showTags
          saving={saving}
          onSave={handleSave}
          onCancel={closeEditor}
          placeholder="Apunta lo relevante de la consulta — ajustes al plan, próximos pasos, alertas…"
          saveLabel="Guardar nota"
          wrapped
        />
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
      ) : feed.length === 0 && editing == null ? (
        <p className="fk-serif" style={{ fontSize: 15, fontWeight: 300, fontStyle: 'italic', color: 'var(--ink-4)', margin: 0, lineHeight: 1.6 }}>
          Las notas que guardes aquí solo las ves tú. Sirven para registrar ajustes al plan, recordatorios y observaciones entre consultas.
          También aparecerán aquí las notas que escribas dentro de cada cita en la agenda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feed.map((entry) => {
            if (entry.kind === 'appointment') {
              const a = entry.data
              const isEditing = editing?.mode === 'appointment' && editing.appointmentId === a.appointment_id
              return (
                <NoteCard
                  key={`appt-${a.appointment_id}`}
                  borderColor="var(--signal)"
                  isEditing={isEditing}
                  header={(
                    <span style={chipStyle('var(--signal)', 'var(--signal-soft)')}>
                      Cita · {fmtShortDateTime(a.starts_at)}
                    </span>
                  )}
                  body={a.body}
                  onEdit={() => openEditAppt(a)}
                  onDelete={() => handleDeleteAppt(a.appointment_id)}
                  editor={isEditing && (
                    <NoteEditor
                      body={editorBody}
                      onBodyChange={setEditorBody}
                      tag={null}
                      onTagChange={() => {}}
                      showTags={false}
                      saving={saving}
                      onSave={handleSave}
                      onCancel={closeEditor}
                    />
                  )}
                />
              )
            }
            const n = entry.data
            const isEditing = editing?.mode === 'manual' && editing.id === n.id
            const primaryMeta = n.tags.length > 0 ? getTagMeta(n.tags[0]) : getTagMeta('observacion')
            const headerLabel = n.tags.length > 0 ? primaryMeta.n : 'Nota'
            return (
              <NoteCard
                key={n.id}
                borderColor={primaryMeta.c}
                isEditing={isEditing}
                header={(
                  <span style={chipStyle(primaryMeta.c, primaryMeta.bg)}>
                    {headerLabel} · {fmtShortDate(n.note_date)}
                  </span>
                )}
                body={n.body}
                onEdit={() => openEditManual(n)}
                onDelete={() => handleDeleteManual(n.id)}
                editor={isEditing && (
                  <NoteEditor
                    body={editorBody}
                    onBodyChange={setEditorBody}
                    tag={editorTag}
                    onTagChange={setEditorTag}
                    showTags
                    saving={saving}
                    onSave={handleSave}
                    onCancel={closeEditor}
                  />
                )}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function chipStyle(c: string, bg: string): React.CSSProperties {
  return {
    padding: '3px 10px', borderRadius: 999, background: bg, color: c,
    fontSize: 10, fontFamily: 'var(--f-sans)', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }
}

function NoteCard({
  borderColor, isEditing, header, body, onEdit, onDelete, editor,
}: {
  borderColor: string
  isEditing: boolean
  header: React.ReactNode
  body: string
  onEdit: () => void
  onDelete: () => void
  editor: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: 14, borderRadius: 10,
        border: '1px solid var(--ink-7)',
        background: isEditing ? 'var(--paper)' : '#fff',
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
        {header}
        {!isEditing && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={onEdit}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', fontSize: 11, color: 'var(--ink-4)', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
            >
              editar
            </button>
            <button
              onClick={onDelete}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', fontSize: 11, color: 'var(--berry)', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
            >
              eliminar
            </button>
          </div>
        )}
      </div>
      {isEditing ? editor : (
        <p style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--f-sans)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
          {body}
        </p>
      )}
    </div>
  )
}

/**
 * Editor de nota reutilizable. `wrapped` agrega el card de fondo + padding
 * (usado para el composer "nueva nota"); en modo edición inline el wrapper
 * lo provee `NoteCard`.
 */
function NoteEditor({
  body, onBodyChange, tag, onTagChange, showTags, saving, onSave, onCancel,
  placeholder = '', saveLabel = 'Guardar', wrapped = false,
}: {
  body: string
  onBodyChange: (v: string) => void
  tag: ConsultationNoteTag | null
  onTagChange: (t: ConsultationNoteTag | null) => void
  showTags: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
  placeholder?: string
  saveLabel?: string
  wrapped?: boolean
}) {
  const canSave = body.trim().length > 0 && !saving
  const content = (
    <>
      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8,
          border: '1px solid var(--ink-7)', background: '#fff',
          fontFamily: 'var(--f-sans)', fontSize: 14, lineHeight: 1.5, resize: 'vertical',
        }}
      />
      {showTags && (
        <TagChips selected={tag} onChange={onTagChange} />
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: wrapped ? 12 : 10 }}>
        <button
          onClick={onCancel}
          style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink-4)', cursor: 'pointer' }}
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={!canSave}
          style={{
            padding: '6px 14px', borderRadius: 999, border: 'none',
            background: 'var(--ink)', color: 'var(--paper)', fontSize: 12, fontWeight: 500,
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.5,
          }}
        >
          {saving ? 'Guardando…' : saveLabel}
        </button>
      </div>
    </>
  )
  if (!wrapped) return content
  return (
    <div style={{ marginBottom: 18, padding: 14, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--ink-7)' }}>
      {content}
    </div>
  )
}

function TagChips({
  selected, onChange,
}: {
  selected: ConsultationNoteTag | null
  onChange: (t: ConsultationNoteTag | null) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {TAG_OPTIONS.map((t) => {
        const active = selected === t.k
        return (
          <button
            key={t.k}
            onClick={() => onChange(active ? null : t.k)}
            style={{
              padding: '5px 12px', borderRadius: 999,
              border: active ? `1px solid ${t.c}` : '1px solid var(--ink-7)',
              background: active ? t.bg : '#fff',
              color:      active ? t.c  : 'var(--ink-4)',
              fontSize: 11, fontFamily: 'var(--f-sans)', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t.n}
          </button>
        )
      })}
    </div>
  )
}
