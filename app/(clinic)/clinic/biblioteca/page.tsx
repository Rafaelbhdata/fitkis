'use client'

import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/ui/LoadingState'
import { fmtShortDateTime } from '@/lib/clinic/calendar-utils'
import { useSupabase, useUser } from '@/lib/hooks'
import {
  loadPractitionerByUser,
  loadLibraryTemplates,
  createLibraryTemplate,
  updateLibraryTemplate,
  deleteLibraryTemplate,
  type LibraryTemplate,
  type LibraryTemplateKind,
  type LibraryPlanEquivs,
} from '@/lib/clinic/queries'

const KINDS: { k: LibraryTemplateKind; n: string; desc: string }[] = [
  { k: 'plan',    n: 'Planes',     desc: 'Plantillas de planes alimenticios reutilizables' },
  { k: 'mensaje', n: 'Mensajes',   desc: 'Mensajes guardados para enviar al paciente' },
  { k: 'receta',  n: 'Recetas',    desc: 'Recetas y preparaciones recomendadas' },
]

const EMPTY_EQUIVS: LibraryPlanEquivs = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }

const EQUIV_GROUPS: { k: keyof LibraryPlanEquivs; n: string; c: string; bg: string }[] = [
  { k: 'verdura',    n: 'Verdura',    c: 'var(--leaf)',   bg: 'var(--leaf-soft)'  },
  { k: 'fruta',      n: 'Fruta',      c: '#b8721d',       bg: '#f3e4cf'            },
  { k: 'carb',       n: 'Cereal',     c: 'var(--honey)',  bg: 'var(--honey-soft)' },
  { k: 'leguminosa', n: 'Legumin.',   c: 'var(--sky)',    bg: 'var(--sky-soft)'   },
  { k: 'proteina',   n: 'Proteína',   c: 'var(--berry)',  bg: 'var(--berry-soft)' },
  { k: 'grasa',      n: 'Grasa',      c: 'var(--ink-3)',  bg: 'var(--paper-3)'    },
]

export default function BibliotecaPage() {
  const supabase = useSupabase()
  const { user, loading: userLoading } = useUser()
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [activeKind, setActiveKind] = useState<LibraryTemplateKind>('plan')
  const [items, setItems] = useState<LibraryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<LibraryTemplate | 'new' | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const pract = await loadPractitionerByUser(supabase, user.id)
      if (cancelled) return
      if (!pract) { setError('No tienes registro de nutriólogo en esta cuenta.'); setLoading(false); return }
      setPractitionerId(pract.id)
    })()
    return () => { cancelled = true }
  }, [user, userLoading, supabase])

  useEffect(() => {
    if (!practitionerId) return
    let cancelled = false
    setLoading(true)
    loadLibraryTemplates(supabase, practitionerId, activeKind)
      .then((rows) => { if (!cancelled) { setItems(rows); setError(null) } })
      .catch((e) => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [practitionerId, activeKind, supabase])

  async function handleSave(draft: { id?: string; title: string; body: string; plan_equivs: LibraryPlanEquivs | null }) {
    if (!practitionerId) return
    if (draft.id) {
      const { error } = await updateLibraryTemplate(supabase, draft.id, {
        title: draft.title,
        body: draft.body,
        plan_equivs: draft.plan_equivs,
      })
      if (error) { setError(error); return }
      setItems((prev) => prev.map((it) => it.id === draft.id
        ? { ...it, title: draft.title.trim(), body: draft.body.trim(), plan_equivs: draft.plan_equivs, updated_at: new Date().toISOString() }
        : it
      ))
    } else {
      const { data, error } = await createLibraryTemplate(supabase, {
        practitioner_id: practitionerId,
        kind: activeKind,
        title: draft.title,
        body: draft.body,
        plan_equivs: draft.plan_equivs,
      })
      if (error) { setError(error); return }
      if (data) setItems((prev) => [data, ...prev])
    }
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta plantilla? No se puede deshacer.')) return
    const { error } = await deleteLibraryTemplate(supabase, id)
    if (error) { setError(error); return }
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const activeMeta = KINDS.find(k => k.k === activeKind)!

  return (
    <div style={{ flex: 1, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '24px 40px 0' }}>
        <div className="fk-eyebrow">Práctica · contenido reutilizable</div>
        <h1 className="fk-serif" style={{ fontSize: 42, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, margin: '8px 0 12px' }}>
          <span style={{ fontStyle: 'italic' }}>Biblioteca</span> de la consulta
        </h1>

        {/* Kind tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--ink-7)', marginTop: 14 }}>
          {KINDS.map((k) => {
            const active = activeKind === k.k
            return (
              <button
                key={k.k}
                onClick={() => { setActiveKind(k.k); setEditing(null) }}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-4)',
                  fontFamily: 'var(--f-sans)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {k.n}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '24px 40px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-sans)', margin: 0, maxWidth: 480 }}>
            {activeMeta.desc}
          </p>
          {editing == null && (
            <button
              onClick={() => setEditing('new')}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontFamily: 'var(--f-sans)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Nueva {activeMeta.n.toLowerCase().slice(0, -1)}
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: 12, marginBottom: 14, background: 'var(--berry-soft)', color: 'var(--berry)', borderRadius: 8, fontSize: 12 }}>
            {error}
          </div>
        )}

        {editing != null && (
          <TemplateEditor
            template={editing === 'new' ? null : editing}
            kind={activeKind}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        )}

        {loading ? (
          <LoadingState label="Cargando biblioteca" compact />
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
            <p className="fk-serif" style={{ fontSize: 18, fontWeight: 300, fontStyle: 'italic', margin: 0 }}>
              Aún sin {activeMeta.n.toLowerCase()} guardad{activeKind === 'mensaje' ? 'os' : activeKind === 'plan' ? 'os' : 'as'}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {items.map((it) => (
              <TemplateCard key={it.id} item={it} onEdit={() => setEditing(it)} onDelete={() => handleDelete(it.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateCard({ item, onEdit, onDelete }: { item: LibraryTemplate; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div className="fk-serif" style={{ fontSize: 18, fontWeight: 300, fontStyle: 'italic', lineHeight: 1.2, marginBottom: 4 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {fmtShortDateTime(item.updated_at)}
        </div>
      </div>
      {item.body && (
        <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--f-sans)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {item.body}
        </p>
      )}
      {item.plan_equivs && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {EQUIV_GROUPS.map((g) => (
            <span key={g.k} style={{ padding: '2px 8px', borderRadius: 6, background: g.bg, color: g.c, fontSize: 10, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>
              {g.n} {item.plan_equivs![g.k]}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button onClick={onEdit} style={{ flex: 1, padding: '6px 10px', borderRadius: 999, border: '1px solid var(--ink-7)', background: '#fff', fontSize: 11, fontFamily: 'var(--f-sans)', fontWeight: 500, cursor: 'pointer' }}>
          Editar
        </button>
        <button onClick={onDelete} style={{ padding: '6px 12px', borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--berry)', fontSize: 11, fontFamily: 'var(--f-sans)', cursor: 'pointer' }}>
          Eliminar
        </button>
      </div>
    </div>
  )
}

function TemplateEditor({
  template, kind, onCancel, onSave,
}: {
  template: LibraryTemplate | null
  kind: LibraryTemplateKind
  onCancel: () => void
  onSave: (draft: { id?: string; title: string; body: string; plan_equivs: LibraryPlanEquivs | null }) => void
}) {
  const [title, setTitle]   = useState(template?.title ?? '')
  const [body, setBody]     = useState(template?.body ?? '')
  const [equivs, setEquivs] = useState<LibraryPlanEquivs>(template?.plan_equivs ?? EMPTY_EQUIVS)
  const [saving, setSaving] = useState(false)

  const showEquivs = kind === 'plan'

  async function submit() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({
      id: template?.id,
      title,
      body,
      plan_equivs: showEquivs ? equivs : null,
    })
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: 20, padding: 18, background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--ink-7)' }}>
      <div className="fk-eyebrow" style={{ marginBottom: 10 }}>
        {template ? 'Editar plantilla' : 'Nueva plantilla'}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la plantilla"
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ink-7)',
          background: '#fff', fontFamily: 'var(--f-sans)', fontSize: 14, marginBottom: 10,
        }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === 'mensaje' ? 'Texto del mensaje…' : kind === 'receta' ? 'Ingredientes, preparación, porciones…' : 'Notas, instrucciones, contexto…'}
        rows={5}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ink-7)',
          background: '#fff', fontFamily: 'var(--f-sans)', fontSize: 14, lineHeight: 1.5, resize: 'vertical',
        }}
      />
      {showEquivs && (
        <div style={{ marginTop: 12 }}>
          <div className="fk-eyebrow" style={{ marginBottom: 8 }}>Equivalentes del plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {EQUIV_GROUPS.map((g) => (
              <label key={g.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', background: '#fff', border: '1px solid var(--ink-7)', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: g.c, fontFamily: 'var(--f-sans)', fontWeight: 500 }}>{g.n}</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={equivs[g.k]}
                  onChange={(e) => setEquivs((prev) => ({ ...prev, [g.k]: Math.max(0, Number(e.target.value) || 0) }))}
                  style={{ width: 50, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--ink-7)', fontFamily: 'var(--f-mono)', fontSize: 13, textAlign: 'right' }}
                />
              </label>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink-4)', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!title.trim() || saving}
          style={{
            padding: '8px 16px', borderRadius: 999, border: 'none',
            background: 'var(--ink)', color: 'var(--paper)', fontSize: 12, fontWeight: 500,
            cursor: !title.trim() || saving ? 'not-allowed' : 'pointer',
            opacity: !title.trim() || saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </div>
    </div>
  )
}

