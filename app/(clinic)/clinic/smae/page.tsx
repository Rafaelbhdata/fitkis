'use client'

// app/(clinic)/clinic/smae/page.tsx
//
// Editor de SMAE per-practitioner. Lista los 2,637 alimentos del SMAE
// global con un toggle para "mis ajustes" (solo overrides). Click en
// una fila abre el modal de edición. Botón "+ Crear alimento custom"
// abre el modal en modo creación.

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Search, Plus, BookOpen } from 'lucide-react'
import { SmaeEditorModal } from '@/components/clinic/SmaeEditorModal'

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
  food_equivalents_global?: {
    name: string
    portion: string | null
    category_smae: string | null
  } | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export default function SmaeEditorPage() {
  const [search, setSearch] = useState('')
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(false)
  const [globalFoods, setGlobalFoods] = useState<FoodRow[]>([])
  const [overrides, setOverrides] = useState<OverrideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState<
    | { mode: 'edit-existing'; food: FoodRow; existingOverride: OverrideRow | null }
    | { mode: 'create-custom'; existingOverride: OverrideRow | null }
    | null
  >(null)

  const loadAll = async () => {
    setLoading(true)
    const [globalRes, overridesRes] = await Promise.all([
      // Page through food_equivalents_global (2,637 rows; PostgREST caps at 1000/page)
      (async () => {
        const all: FoodRow[] = []
        const pageSize = 1000
        for (let from = 0; from < 5000; from += pageSize) {
          const { data } = await supabase
            .from('food_equivalents_global')
            .select('id, name, portion, category_smae, verdura, fruta, carb, proteina, grasa, leguminosa')
            .range(from, from + pageSize - 1)
            .order('name')
          const chunk = (data ?? []) as FoodRow[]
          all.push(...chunk)
          if (chunk.length < pageSize) break
        }
        return all
      })(),
      fetch('/api/practitioner/smae-overrides').then((r) => r.json()),
    ])
    setGlobalFoods(globalRes)
    setOverrides((overridesRes.overrides ?? []) as OverrideRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Map food_id → override for quick lookup
  const overridesByFoodId = useMemo(() => {
    const map = new Map<string, OverrideRow>()
    for (const o of overrides) {
      if (o.food_id) map.set(o.food_id, o)
    }
    return map
  }, [overrides])

  const customs = useMemo(
    () => overrides.filter((o) => o.food_id === null),
    [overrides],
  )

  // Display list: globals (with override values applied) + customs
  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase()
    type DisplayRow = FoodRow & { isOverride: boolean; isCustom: boolean; notes?: string | null; overrideId?: string }

    const fromGlobals: DisplayRow[] = globalFoods.map((f) => {
      const o = overridesByFoodId.get(f.id)
      if (o) {
        return {
          ...f,
          verdura: o.verdura,
          fruta: o.fruta,
          carb: o.carb,
          proteina: o.proteina,
          grasa: o.grasa,
          leguminosa: o.leguminosa,
          isOverride: true,
          isCustom: false,
          notes: o.notes,
          overrideId: o.id,
        }
      }
      return { ...f, isOverride: false, isCustom: false }
    })

    const fromCustoms: DisplayRow[] = customs.map((c) => ({
      id: c.id,
      name: c.name ?? '(sin nombre)',
      portion: c.portion,
      category_smae: c.category_smae,
      verdura: c.verdura,
      fruta: c.fruta,
      carb: c.carb,
      proteina: c.proteina,
      grasa: c.grasa,
      leguminosa: c.leguminosa,
      isOverride: false,
      isCustom: true,
      notes: c.notes,
      overrideId: c.id,
    }))

    const all = [...fromCustoms, ...fromGlobals]
    return all
      .filter((row) => (showOnlyOverrides ? row.isOverride || row.isCustom : true))
      .filter((row) => (q ? row.name.toLowerCase().includes(q) : true))
      .slice(0, 200) // Cap render to keep UI snappy
  }, [globalFoods, overridesByFoodId, customs, search, showOnlyOverrides])

  const onRowClick = (row: any) => {
    if (row.isCustom) {
      const existingOverride = overrides.find((o) => o.id === row.id) ?? null
      setModalState({ mode: 'create-custom', existingOverride })
    } else {
      const existingOverride = overridesByFoodId.get(row.id) ?? null
      const food: FoodRow = globalFoods.find((g) => g.id === row.id)!
      setModalState({ mode: 'edit-existing', food, existingOverride })
    }
  }

  const onModalSaved = async () => {
    setModalState(null)
    await loadAll()
  }

  const onModalDeleted = async () => {
    setModalState(null)
    await loadAll()
  }

  return (
    <div className="px-8 py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen size={22} className="text-orange-500" />
        <h1 className="text-2xl font-serif">SMAE — Mi base de equivalentes</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Edita los equivalentes que tus pacientes ven en la app. Tus cambios solo aplican a ellos.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alimento..."
            className="pl-9 pr-3 py-2 w-full border rounded-lg text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showOnlyOverrides}
            onChange={(e) => setShowOnlyOverrides(e.target.checked)}
          />
          Solo mis ajustes
        </label>
        <button
          onClick={() => setModalState({ mode: 'create-custom', existingOverride: null })}
          className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm flex items-center gap-1"
        >
          <Plus size={14} />
          Crear custom
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}

      {!loading && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Alimento</th>
                <th className="text-left px-2 py-2">Porción</th>
                <th className="text-center px-2 py-2">V</th>
                <th className="text-center px-2 py-2">F</th>
                <th className="text-center px-2 py-2">C</th>
                <th className="text-center px-2 py-2">L</th>
                <th className="text-center px-2 py-2">P</th>
                <th className="text-center px-2 py-2">G</th>
                <th className="text-center px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className="border-t hover:bg-orange-50 cursor-pointer"
                >
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-2 py-2 text-gray-500">{row.portion ?? '—'}</td>
                  <td className="px-2 py-2 text-center">{row.verdura || ''}</td>
                  <td className="px-2 py-2 text-center">{row.fruta || ''}</td>
                  <td className="px-2 py-2 text-center">{row.carb || ''}</td>
                  <td className="px-2 py-2 text-center">{row.leguminosa || ''}</td>
                  <td className="px-2 py-2 text-center">{row.proteina || ''}</td>
                  <td className="px-2 py-2 text-center">{row.grasa || ''}</td>
                  <td className="px-2 py-2 text-center text-xs">
                    {row.isCustom ? (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">custom</span>
                    ) : row.isOverride ? (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">ajustado</span>
                    ) : (
                      <span className="text-gray-400">global</span>
                    )}
                  </td>
                </tr>
              ))}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-6">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalState && (
        <SmaeEditorModal
          state={modalState}
          onClose={() => setModalState(null)}
          onSaved={onModalSaved}
          onDeleted={onModalDeleted}
        />
      )}
    </div>
  )
}
