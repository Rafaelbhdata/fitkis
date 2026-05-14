'use client'

import { useRef, useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>
import { ModalShell, ModalClose, ModalBtn } from './ui/Modal'
import type { WeightLog } from '@/types'
import {
  insertWeightLogForPatient,
  updateWeightLogForPatient,
  deleteWeightLogForPatient,
} from '@/lib/clinic/queries'

// ─── tipos ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  supabase: SB
  patientId: string
  existing?: WeightLog
}

type Phase = 'idle' | 'analyzing' | 'saving' | 'deleting'

interface Fields {
  date: string
  weight_kg: string
  muscle_mass_kg: string
  body_fat_mass_kg: string
  body_fat_percentage: string
  notes: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : n
}

function fromNum(v: number | null | undefined): string {
  return v != null ? String(v) : ''
}

function todayISO(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' })
}

// ─── componente ───────────────────────────────────────────────────────────────

export function InBodyModal({ open, onClose, onSaved, supabase, patientId, existing }: Props) {
  const isEdit = !!existing
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase]         = useState<Phase>('idle')
  const [file, setFile]           = useState<File | null>(null)
  const [previewUrl, setPreview]  = useState<string | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [keepPhoto, setKeepPhoto] = useState(true)
  const [confidence, setConfidence] = useState<string | null>(null)
  const [aiNotes, setAiNotes]     = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [fields, setFields] = useState<Fields>({
    date:               todayISO(),
    weight_kg:          '',
    muscle_mass_kg:     '',
    body_fat_mass_kg:   '',
    body_fat_percentage:'',
    notes:              '',
  })

  // Pre-llenar al abrir en modo edición
  useEffect(() => {
    if (!open) return
    if (existing) {
      setFields({
        date:               existing.date,
        weight_kg:          fromNum(existing.weight_kg),
        muscle_mass_kg:     fromNum(existing.muscle_mass_kg),
        body_fat_mass_kg:   fromNum(existing.body_fat_mass_kg),
        body_fat_percentage:fromNum(existing.body_fat_percentage),
        notes:              existing.notes ?? '',
      })
      setKeepPhoto(true)
      // Generar signed URL para mostrar la foto existente
      if (existing.inbody_photo_url) {
        supabase.storage
          .from('inbody-scans')
          .createSignedUrl(existing.inbody_photo_url, 3600)
          .then(({ data }) => setExistingPhotoUrl(data?.signedUrl ?? null))
      } else {
        setExistingPhotoUrl(null)
      }
    } else {
      setFields({ date: todayISO(), weight_kg: '', muscle_mass_kg: '', body_fat_mass_kg: '', body_fat_percentage: '', notes: '' })
      setExistingPhotoUrl(null)
    }
    setFile(null)
    setPreview(null)
    setConfidence(null)
    setAiNotes(null)
    setError(null)
    setDeleteConfirm(false)
    setPhase('idle')
  }, [open, existing]) // eslint-disable-line react-hooks/exhaustive-deps

  function field(k: keyof Fields) {
    return {
      value: fields[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields(f => ({ ...f, [k]: e.target.value })),
    }
  }

  // ── selección de archivo → análisis IA (solo imágenes) ──────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    const url = URL.createObjectURL(f)
    setPreview(url)

    // PDFs no pueden analizarse con la API de visión — el usuario llena manualmente
    if (f.type === 'application/pdf') return

    setPhase('analyzing')
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(f)
      })
      const resp = await fetch('/api/inbody-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (resp.ok) {
        const d = await resp.json()
        setFields(prev => ({
          ...prev,
          weight_kg:          d.weight_kg          != null ? String(d.weight_kg)          : prev.weight_kg,
          muscle_mass_kg:     d.muscle_mass_kg      != null ? String(d.muscle_mass_kg)      : prev.muscle_mass_kg,
          body_fat_mass_kg:   d.body_fat_mass_kg    != null ? String(d.body_fat_mass_kg)    : prev.body_fat_mass_kg,
          body_fat_percentage:d.body_fat_percentage != null ? String(d.body_fat_percentage) : prev.body_fat_percentage,
        }))
        setConfidence(d.confidence ?? null)
        setAiNotes(d.notes ?? null)
      }
    } catch {
      // Análisis falló — el usuario llena manualmente
    } finally {
      setPhase('idle')
    }
  }

  // ── guardar ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!fields.date || !fields.weight_kg) {
      setError('Fecha y peso son obligatorios.')
      return
    }
    setError(null)
    setPhase('saving')

    try {
      let photoPath: string | null = null

      // Subir nueva foto si hay archivo nuevo
      if (file) {
        const ext  = file.name.split('.').pop() ?? 'jpg'
        const path = `${patientId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('inbody-scans')
          .upload(path, file, { upsert: false })
        if (upErr) { setError('Error al subir la foto.'); setPhase('idle'); return }
        photoPath = path

        // Borrar foto anterior si existía y el usuario no la conserva o hay una nueva
        if (existing?.inbody_photo_url) {
          await supabase.storage.from('inbody-scans').remove([existing.inbody_photo_url])
        }
      } else if (isEdit && !keepPhoto && existing?.inbody_photo_url) {
        // Usuario pidió quitar la foto sin reemplazar
        await supabase.storage.from('inbody-scans').remove([existing.inbody_photo_url])
        photoPath = null
      } else if (isEdit && keepPhoto && existing?.inbody_photo_url) {
        photoPath = existing.inbody_photo_url
      }

      const payload = {
        user_id:            patientId,
        date:               fields.date,
        weight_kg:          toNum(fields.weight_kg)!,
        muscle_mass_kg:     toNum(fields.muscle_mass_kg),
        body_fat_mass_kg:   toNum(fields.body_fat_mass_kg),
        body_fat_percentage:toNum(fields.body_fat_percentage),
        notes:              fields.notes || null,
        inbody_photo_url:   photoPath,
      }

      let ok: boolean
      if (isEdit && existing) {
        ok = await updateWeightLogForPatient(supabase, existing.id, payload)
      } else {
        ok = !!(await insertWeightLogForPatient(supabase, payload))
      }

      if (!ok) { setError('No se pudo guardar. Intenta de nuevo.'); setPhase('idle'); return }
      onSaved()
      onClose()
    } catch {
      setError('Error inesperado.')
      setPhase('idle')
    }
  }

  // ── borrar ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!existing) return
    setPhase('deleting')
    if (existing.inbody_photo_url) {
      await supabase.storage.from('inbody-scans').remove([existing.inbody_photo_url])
    }
    const ok = await deleteWeightLogForPatient(supabase, existing.id)
    if (!ok) { setError('No se pudo borrar.'); setPhase('idle'); return }
    onSaved()
    onClose()
  }

  if (!open) return null

  const busy = phase !== 'idle'

  // ── foto a mostrar (nueva > existente) ──────────────────────────────────────
  const displayPhoto = previewUrl ?? existingPhotoUrl

  return (
    <ModalShell onClose={onClose} maxWidth={560}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--ink-7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            {isEdit ? 'Editar medición' : 'Registrar medición'}
          </div>
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 20, fontWeight: 300, color: 'var(--ink)', fontStyle: 'italic' }}>
            InBody / Peso
          </div>
        </div>
        <ModalClose onClick={onClose} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ink-7)' }}>

        {/* foto */}
        <div
          onClick={() => !busy && fileRef.current?.click()}
          style={{
            marginBottom: 20, borderRadius: 10, border: '1.5px dashed var(--ink-6)',
            background: 'var(--paper)', cursor: busy ? 'default' : 'pointer',
            minHeight: displayPhoto ? 'auto' : 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}
        >
          {displayPhoto ? (
            file?.type === 'application/pdf' || (!file && existing?.inbody_photo_url?.endsWith('.pdf')) ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {file ? file.name : 'PDF adjunto'}
                </div>
              </div>
            ) : (
              <img src={displayPhoto} alt="InBody scan" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }} />
            )
          ) : (
            <div style={{ padding: '18px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4, color: 'var(--ink-5)' }}>+</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {phase === 'analyzing' ? 'Analizando…' : 'Adjuntar foto o PDF del InBody (opcional)'}
              </div>
            </div>
          )}
          {phase === 'analyzing' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--signal)' }}>Leyendo InBody…</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />

        {/* IA confidence badge */}
        {confidence && (
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', marginBottom: 12, textAlign: 'right', letterSpacing: '0.04em' }}>
            Confianza IA: {confidence}{aiNotes ? ` · ${aiNotes}` : ''}
          </div>
        )}

        {/* aviso sin extracción IA para PDFs */}
        {file?.type === 'application/pdf' && (
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', marginBottom: 12, letterSpacing: '0.04em' }}>
            PDF adjunto · llena los campos manualmente (la extracción IA solo aplica para fotos)
          </div>
        )}

        {/* opciones de foto en edición */}
        {isEdit && existingPhotoUrl && !file && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Foto actual</span>
            <button
              onClick={() => setKeepPhoto(k => !k)}
              style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: keepPhoto ? 'var(--leaf)' : 'var(--berry)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {keepPhoto ? 'Conservar' : 'Quitar foto'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--ink-5)', fontFamily: 'var(--f-mono)' }}>·</span>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Reemplazar
            </button>
          </div>
        )}

        {/* campos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Fecha *</FieldLabel>
            <input type="date" {...field('date')} style={inputStyle} />
          </div>
          <NumField label="Peso (kg) *" {...field('weight_kg')} />
          <NumField label="% Grasa"     {...field('body_fat_percentage')} />
          <NumField label="Masa grasa (kg)"  {...field('body_fat_mass_kg')} />
          <NumField label="Músculo (kg)"     {...field('muscle_mass_kg')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Notas</FieldLabel>
            <textarea
              {...field('notes')}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,90,31,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--signal)', fontFamily: 'var(--f-sans)' }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Footer / Acciones ──────────────────────────────────────────────── */}
      <div style={{ padding: '14px 24px 20px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div>
          {isEdit && (
            deleteConfirm ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, color: 'var(--berry)', fontFamily: 'var(--f-sans)' }}>¿Confirmar borrado?</span>
                <ModalBtn variant="danger-solid" onClick={handleDelete} disabled={busy}>
                  {phase === 'deleting' ? 'Borrando…' : 'Sí, borrar'}
                </ModalBtn>
              </div>
            ) : (
              <ModalBtn variant="danger-soft" onClick={() => setDeleteConfirm(true)} disabled={busy}>
                Borrar registro
              </ModalBtn>
            )
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ModalBtn variant="secondary" onClick={deleteConfirm ? () => setDeleteConfirm(false) : onClose} disabled={busy}>Cancelar</ModalBtn>
          <ModalBtn variant="signal" onClick={handleSave} disabled={busy}>
            {phase === 'saving' ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar'}
          </ModalBtn>
        </div>
      </div>

    </ModalShell>
  )
}

// ─── subcomponentes ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
      {children}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={onChange}
        style={inputStyle}
      />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--ink-7)',
  background: 'var(--paper)',
  fontSize: 13,
  fontFamily: 'var(--f-sans)',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
}
