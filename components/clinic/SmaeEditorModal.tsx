'use client'

// components/clinic/SmaeEditorModal.tsx
//
// Modal para editar un override existente o crear/editar un custom food.
// Tres modos:
// - edit-existing (override de un food del SMAE global)
// - create-custom (sin existingOverride: crear nuevo)
// - create-custom (con existingOverride: editar custom existente)

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'

type FoodRow = {
  id: string
  name: string
  portion: string | null
  category_smae: string | null
  verdura: number
  fruta: number
  carb: number
  proteina: number
  grasa: number
  leguminosa: number
}

type OverrideRow = {
  id: string
  food_id: string | null
  name: string | null
  portion: string | null
  category_smae: string | null
  verdura: number
  fruta: number
  carb: number
  proteina: number
  grasa: number
  leguminosa: number
  notes: string | null
}

type ModalState =
  | { mode: 'edit-existing'; food: FoodRow; existingOverride: OverrideRow | null }
  | { mode: 'create-custom'; existingOverride: OverrideRow | null }

type Props = {
  state: ModalState
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const FIELDS: Array<{ key: 'verdura' | 'fruta' | 'carb' | 'leguminosa' | 'proteina' | 'grasa'; label: string }> = [
  { key: 'verdura', label: 'Verdura' },
  { key: 'fruta', label: 'Fruta' },
  { key: 'carb', label: 'Carbohidrato' },
  { key: 'leguminosa', label: 'Leguminosa' },
  { key: 'proteina', label: 'Proteína' },
  { key: 'grasa', label: 'Grasa' },
]

export function SmaeEditorModal({ state, onClose, onSaved, onDeleted }: Props) {
  const isCustomMode = state.mode === 'create-custom'
  const isEditingExistingCustom = isCustomMode && state.existingOverride !== null

  const initial = state.existingOverride
  const baseFood = state.mode === 'edit-existing' ? state.food : null

  const [name, setName] = useState(
    initial?.name ?? baseFood?.name ?? '',
  )
  const [portion, setPortion] = useState(
    initial?.portion ?? baseFood?.portion ?? '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [values, setValues] = useState({
    verdura: initial?.verdura ?? baseFood?.verdura ?? 0,
    fruta: initial?.fruta ?? baseFood?.fruta ?? 0,
    carb: initial?.carb ?? baseFood?.carb ?? 0,
    leguminosa: initial?.leguminosa ?? baseFood?.leguminosa ?? 0,
    proteina: initial?.proteina ?? baseFood?.proteina ?? 0,
    grasa: initial?.grasa ?? baseFood?.grasa ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateValue = (key: keyof typeof values, raw: string) => {
    const n = Number(raw)
    setValues((v) => ({ ...v, [key]: Number.isFinite(n) && n >= 0 ? n : 0 }))
  }

  const save = async () => {
    setError(null)
    const total = Object.values(values).reduce((s, v) => s + v, 0)
    if (total <= 0) {
      setError('Al menos un grupo debe tener equivalentes > 0')
      return
    }
    if (isCustomMode && name.trim().length === 0) {
      setError('El nombre es requerido para alimentos custom')
      return
    }

    setSaving(true)
    const payload = {
      food_id: state.mode === 'edit-existing' ? state.food.id : null,
      name: isCustomMode ? name.trim() : null,
      portion: isCustomMode ? (portion.trim() || null) : null,
      notes: notes.trim() || null,
      ...values,
    }
    const res = await fetch('/api/practitioner/smae-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error ?? 'No se pudo guardar')
      return
    }
    onSaved()
  }

  const deleteOverride = async () => {
    if (!initial?.id) return
    if (!confirm('¿Eliminar este ajuste? Volverá al valor SMAE genérico.')) return
    setSaving(true)
    const res = await fetch(`/api/practitioner/smae-overrides?id=${initial.id}`, {
      method: 'DELETE',
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error ?? 'No se pudo eliminar')
      return
    }
    onDeleted()
  }

  const title = isCustomMode
    ? isEditingExistingCustom
      ? `Editar custom: ${name || 'nuevo'}`
      : 'Crear alimento custom'
    : `Editar: ${baseFood?.name}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-medium">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {isCustomMode && (
            <>
              <div>
                <label className="block text-xs uppercase text-gray-500 mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Whey Birdman vainilla"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-500 mb-1">Porción</label>
                <input
                  value={portion}
                  onChange={(e) => setPortion(e.target.value)}
                  placeholder="Ej: 1 scoop, 30g"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {!isCustomMode && baseFood && (
            <div className="bg-gray-50 rounded p-3 text-xs">
              <div><b>{baseFood.name}</b></div>
              <div className="text-gray-500">{baseFood.portion ?? '—'} · {baseFood.category_smae ?? '—'}</div>
              <div className="text-gray-500 mt-1">
                SMAE oficial: V{baseFood.verdura} F{baseFood.fruta} C{baseFood.carb} L{baseFood.leguminosa} P{baseFood.proteina} G{baseFood.grasa}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Equivalentes</div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={values[key]}
                    onChange={(e) => updateValue(key, e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-500 mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Para pacientes con dislipidemia"
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          {initial?.id ? (
            <button
              onClick={deleteOverride}
              disabled={saving}
              className="text-xs text-red-600 hover:underline flex items-center gap-1"
            >
              <Trash2 size={12} />
              Eliminar ajuste
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
