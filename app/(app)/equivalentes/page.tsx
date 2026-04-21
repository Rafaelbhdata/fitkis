'use client'

import { useState, useEffect } from 'react'
import { Search, X, Info, ChevronRight, Plus, Check } from 'lucide-react'
import { useSupabase, useUser } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import type { FoodGroup, FoodEquivalent, CustomFood } from '@/types'

const FOOD_GROUPS: FoodGroup[] = ['verdura', 'fruta', 'carb', 'proteina', 'grasa']

const FOOD_COLORS: Record<FoodGroup, string> = {
  verdura: '#22c55e',
  fruta: '#f97316',
  carb: '#eab308',
  leguminosa: '#a855f7',
  proteina: '#ef4444',
  grasa: '#3b82f6',
}

const FOOD_EMOJIS: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

const GROUP_DESCRIPTIONS: Record<FoodGroup, string> = {
  verdura: 'Vegetales y hortalizas',
  fruta: 'Frutas frescas y secas',
  carb: 'Cereales, panes y tubérculos',
  leguminosa: 'Frijoles, lentejas y garbanzos',
  proteina: 'Carnes, huevos, lácteos y pescados',
  grasa: 'Aceites, nueces y aguacate',
}

export default function EquivalentesPage() {
  const supabase = useSupabase()
  const { user } = useUser()
  const { showToast } = useToast()

  // Search state
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalResults, setGlobalResults] = useState<FoodEquivalent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Group view state
  const [selectedGroup, setSelectedGroup] = useState<FoodGroup | null>(null)
  const [foods, setFoods] = useState<FoodEquivalent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodEquivalent | null>(null)
  const [groupCounts, setGroupCounts] = useState<Record<FoodGroup, number>>({
    verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0,
  })
  const [totalInGroup, setTotalInGroup] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')

  // Custom food state
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFood, setNewFood] = useState({
    name: '',
    portion: '',
    group: '' as FoodGroup | '',
    note: '',
  })
  const [saving, setSaving] = useState(false)

  // Load group counts and custom foods on mount
  useEffect(() => {
    loadGroupCounts()
    if (user) loadCustomFoods()
  }, [user])

  const loadCustomFoods = async () => {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('custom_foods')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
      if (data) setCustomFoods(data as CustomFood[])
    } catch (err) {
      console.error('Error loading custom foods:', err)
    }
  }

  const loadGroupCounts = async () => {
    try {
      const counts: Record<FoodGroup, number> = {
        verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0,
      }

      for (const group of FOOD_GROUPS) {
        const { count } = await (supabase as any)
          .from('food_equivalents')
          .select('*', { count: 'exact', head: true })
          .gt(group, 0)

        counts[group] = count || 0
      }

      setGroupCounts(counts)
    } catch (err) {
      console.error('Error loading counts:', err)
    }
  }

  // Global search
  const searchGlobal = async (query: string) => {
    if (!query.trim()) {
      setGlobalResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('food_equivalents')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(50)

      if (error) throw error
      if (data) setGlobalResults(data as FoodEquivalent[])
    } catch (err) {
      console.error('Error searching:', err)
      setGlobalResults([])
    }
    setSearchLoading(false)
  }

  // Debounced global search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGlobal(globalSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [globalSearch])

  // Search foods within a group
  const searchFoods = async (group: FoodGroup, query: string = '', append: boolean = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setFoods([])
    }

    try {
      let queryBuilder = (supabase as any)
        .from('food_equivalents')
        .select('*', { count: 'exact' })
        .gt(group, 0)

      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`)
      }

      const offset = append ? foods.length : 0
      queryBuilder = queryBuilder.order('name').range(offset, offset + 99)

      const { data, error, count } = await queryBuilder

      if (error) throw error
      if (data) {
        if (append) {
          setFoods(prev => [...prev, ...(data as FoodEquivalent[])])
        } else {
          setFoods(data as FoodEquivalent[])
          setTotalInGroup(count || 0)
        }
      }
    } catch (err) {
      console.error('Error searching foods:', err)
      if (!append) setFoods([])
    }
    setLoading(false)
    setLoadingMore(false)
  }

  const loadMore = () => {
    if (selectedGroup) {
      searchFoods(selectedGroup, groupSearch, true)
    }
  }

  // Trigger search when group or query changes
  useEffect(() => {
    if (selectedGroup) {
      const debounceTimer = setTimeout(() => {
        searchFoods(selectedGroup, groupSearch)
      }, 300)
      return () => clearTimeout(debounceTimer)
    }
  }, [selectedGroup, groupSearch])

  // Get food groups for a food item
  const getFoodGroups = (food: FoodEquivalent): { group: FoodGroup; amount: number }[] => {
    const groups: { group: FoodGroup; amount: number }[] = []
    if (food.verdura > 0) groups.push({ group: 'verdura', amount: food.verdura })
    if (food.fruta > 0) groups.push({ group: 'fruta', amount: food.fruta })
    if (food.carb > 0) groups.push({ group: 'carb', amount: food.carb })
    if (food.proteina > 0) groups.push({ group: 'proteina', amount: food.proteina })
    if (food.grasa > 0) groups.push({ group: 'grasa', amount: food.grasa })
    return groups
  }

  const handleBack = () => {
    setSelectedGroup(null)
    setGroupSearch('')
    setFoods([])
    setTotalInGroup(0)
  }

  const openCreateModal = (prefillName?: string) => {
    setNewFood({
      name: prefillName || '',
      portion: '',
      group: '',
      note: '',
    })
    setShowCreateModal(true)
  }

  const createCustomFood = async () => {
    if (!user || !newFood.name || !newFood.portion || !newFood.group) return

    setSaving(true)
    try {
      const { error } = await (supabase as any).from('custom_foods').insert({
        user_id: user.id,
        name: newFood.name,
        group_type: newFood.group,
        portion: newFood.portion,
        note: newFood.note || null,
      })

      if (error) throw error

      await loadCustomFoods()
      setShowCreateModal(false)
      setNewFood({ name: '', portion: '', group: '', note: '' })
      showToast(`"${newFood.name}" creado`)
    } catch (err) {
      console.error('Error creating food:', err)
      showToast('Error al crear alimento')
    }
    setSaving(false)
  }

  const deleteCustomFood = async (id: string, name: string) => {
    try {
      await (supabase as any).from('custom_foods').delete().eq('id', id)
      setCustomFoods(prev => prev.filter(f => f.id !== id))
      showToast(`"${name}" eliminado`)
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  // Combine global results with custom foods for search
  const combinedResults = globalSearch.trim()
    ? [
        ...customFoods
          .filter(f => f.name.toLowerCase().includes(globalSearch.toLowerCase()))
          .map(f => ({ ...f, isCustom: true })),
        ...globalResults.map(f => ({ ...f, isCustom: false })),
      ]
    : []

  const isSearching = globalSearch.trim().length > 0

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md">
            {selectedGroup ? (
              <button onClick={handleBack} className="flex items-center gap-2 hover:text-accent transition-colors">
                <span className="text-2xl">{FOOD_EMOJIS[selectedGroup]}</span>
                {FOOD_GROUP_LABELS[selectedGroup]}
              </button>
            ) : (
              'Equivalentes'
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedGroup
              ? `${foods.length} de ${totalInGroup} alimentos`
              : 'Busca o explora alimentos'
            }
          </p>
        </div>
        {!selectedGroup && (
          <button
            onClick={() => openCreateModal()}
            className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-5 h-5 text-background" />
          </button>
        )}
      </div>

      {!selectedGroup ? (
        /* Main View with Global Search */
        <div className="space-y-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Buscar cualquier alimento..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-elevated rounded"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {isSearching ? (
            /* Search Results */
            <div className="space-y-2">
              {searchLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                </div>
              ) : combinedResults.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {combinedResults.length} resultados para "{globalSearch}"
                  </p>
                  {combinedResults.map((food: any, index) => {
                    if (food.isCustom) {
                      // Custom food
                      return (
                        <div
                          key={`custom-${food.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-accent/20"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{food.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                                Tuyo
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {food.portion} • {FOOD_EMOJIS[food.group_type as FoodGroup]} {FOOD_GROUP_LABELS[food.group_type as FoodGroup]}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteCustomFood(food.id, food.name)}
                            className="p-2 text-muted-foreground hover:text-danger transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    } else {
                      // SMAE food
                      const groups = getFoodGroups(food)
                      return (
                        <button
                          key={food.id}
                          onClick={() => setSelectedFood(food)}
                          className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{food.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{food.portion}</p>
                            </div>
                            <div className="flex -space-x-1">
                              {groups.map(({ group }) => (
                                <span
                                  key={group}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-surface-elevated"
                                  style={{ backgroundColor: `${FOOD_COLORS[group]}20` }}
                                >
                                  {FOOD_EMOJIS[group]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      )
                    }
                  })}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No se encontró "{globalSearch}"
                  </p>
                  <button
                    onClick={() => openCreateModal(globalSearch)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background font-medium text-sm hover:bg-accent/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Crear "{globalSearch}"
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Group Selection */
            <div className="space-y-3">
              {/* Custom Foods Section */}
              {customFoods.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Tus alimentos ({customFoods.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {customFoods.slice(0, 6).map((food) => (
                      <span
                        key={food.id}
                        className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs font-medium text-accent"
                      >
                        {FOOD_EMOJIS[food.group_type as FoodGroup]} {food.name}
                      </span>
                    ))}
                    {customFoods.length > 6 && (
                      <span className="px-3 py-1.5 rounded-lg bg-surface-elevated text-xs text-muted-foreground">
                        +{customFoods.length - 6} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Group Cards */}
              {FOOD_GROUPS.map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className="w-full p-4 rounded-xl border border-border hover:border-transparent transition-all group"
                  style={{
                    background: `linear-gradient(135deg, ${FOOD_COLORS[group]}10 0%, ${FOOD_COLORS[group]}05 100%)`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${FOOD_COLORS[group]}20` }}
                    >
                      {FOOD_EMOJIS[group]}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-display text-lg" style={{ color: FOOD_COLORS[group] }}>
                        {FOOD_GROUP_LABELS[group]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {GROUP_DESCRIPTIONS[group]}
                      </p>
                      <p className="text-xs mt-1" style={{ color: FOOD_COLORS[group] }}>
                        {groupCounts[group].toLocaleString()} alimentos
                      </p>
                    </div>
                    <ChevronRight
                      className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform"
                      style={{ color: FOOD_COLORS[group] }}
                    />
                  </div>
                </button>
              ))}

              {/* Info Card */}
              <div className="mt-4 p-4 rounded-xl bg-surface-elevated border border-border">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">Sistema SMAE</p>
                    <p className="text-xs text-muted-foreground">
                      Base de datos del Sistema Mexicano de Alimentos Equivalentes con más de 2,500 alimentos.
                      Puedes agregar tus propios alimentos con el botón +.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Food List View (same as before) */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-lg flex items-center justify-center border border-border hover:bg-surface-elevated transition-colors"
              style={{ borderColor: `${FOOD_COLORS[selectedGroup]}30` }}
            >
              <ChevronRight className="w-5 h-5 rotate-180" style={{ color: FOOD_COLORS[selectedGroup] }} />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                className="input pl-10"
                placeholder={`Buscar en ${FOOD_GROUP_LABELS[selectedGroup].toLowerCase()}...`}
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                autoFocus
              />
              {groupSearch && (
                <button
                  onClick={() => setGroupSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-elevated rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: FOOD_COLORS[selectedGroup], borderTopColor: 'transparent' }}
              />
            </div>
          ) : foods.length > 0 ? (
            <div className="space-y-2">
              <div className="grid gap-2">
                {foods.map((food) => {
                  const groups = getFoodGroups(food)
                  const hasMultipleGroups = groups.length > 1

                  return (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-all border border-transparent hover:border-border"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{food.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{food.portion}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasMultipleGroups ? (
                            <div className="flex -space-x-1">
                              {groups.map(({ group }) => (
                                <span
                                  key={group}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-surface-elevated"
                                  style={{ backgroundColor: `${FOOD_COLORS[group]}20` }}
                                >
                                  {FOOD_EMOJIS[group]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span
                              className="px-2 py-1 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: `${FOOD_COLORS[selectedGroup]}15`,
                                color: FOOD_COLORS[selectedGroup]
                              }}
                            >
                              1 eq
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {foods.length < totalInGroup && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-lg border border-border hover:border-accent/50 text-sm font-medium text-muted-foreground hover:text-accent transition-colors flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: FOOD_COLORS[selectedGroup], borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <>Cargar más ({totalInGroup - foods.length} restantes)</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${FOOD_COLORS[selectedGroup]}15` }}
              >
                {FOOD_EMOJIS[selectedGroup]}
              </div>
              <p className="text-muted-foreground">
                {groupSearch ? 'No se encontraron alimentos' : 'Cargando...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Food Detail Modal */}
      {selectedFood && (
        <>
          <div className="overlay animate-fade-in" onClick={() => setSelectedFood(null)} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="font-display text-display-sm">{selectedFood.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedFood.category_smae}</p>
              </div>
              <button onClick={() => setSelectedFood(null)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: `${FOOD_COLORS[getFoodGroups(selectedFood)[0]?.group || 'proteina']}10`,
                  border: `1px solid ${FOOD_COLORS[getFoodGroups(selectedFood)[0]?.group || 'proteina']}30`
                }}
              >
                <p className="text-xs text-muted-foreground mb-1">Porción (1 equivalente)</p>
                <p className="font-display text-lg">{selectedFood.portion}</p>
                {selectedFood.weight_g && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Peso neto: {selectedFood.weight_g}g
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-3">Equivalentes por porción:</p>
                <div className="grid grid-cols-2 gap-2">
                  {getFoodGroups(selectedFood).map(({ group, amount }) => (
                    <div
                      key={group}
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: `${FOOD_COLORS[group]}10`,
                        border: `1px solid ${FOOD_COLORS[group]}25`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{FOOD_EMOJIS[group]}</span>
                        <div>
                          <p className="font-display text-xl" style={{ color: FOOD_COLORS[group] }}>
                            {amount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {FOOD_GROUP_LABELS[group]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {getFoodGroups(selectedFood).length > 1 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-amber-200">
                    Este alimento cuenta como múltiples equivalentes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Custom Food Modal */}
      {showCreateModal && (
        <>
          <div className="overlay animate-fade-in" onClick={() => setShowCreateModal(false)} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">Nuevo alimento</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Susalitas"
                  value={newFood.name}
                  onChange={(e) => setNewFood(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Grupo alimenticio *</label>
                <div className="grid grid-cols-3 gap-2">
                  {FOOD_GROUPS.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setNewFood(prev => ({ ...prev, group }))}
                      className={`p-3 rounded-lg text-center transition-all ${
                        newFood.group === group
                          ? 'border-2'
                          : 'bg-surface-elevated border border-border'
                      }`}
                      style={{
                        backgroundColor: newFood.group === group ? `${FOOD_COLORS[group]}15` : undefined,
                        borderColor: newFood.group === group ? FOOD_COLORS[group] : undefined,
                        boxShadow: newFood.group === group ? `0 0 0 2px ${FOOD_COLORS[group]}40` : undefined,
                      }}
                    >
                      <span className="text-xl">{FOOD_EMOJIS[group]}</span>
                      <p className="text-[10px] mt-1 text-muted-foreground">
                        {FOOD_GROUP_LABELS[group]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Porción (1 equivalente) *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: 1 bolsa chica (45g)"
                  value={newFood.portion}
                  onChange={(e) => setNewFood(prev => ({ ...prev, portion: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Nota (opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Las de chile limón"
                  value={newFood.note}
                  onChange={(e) => setNewFood(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>

              <button
                onClick={createCustomFood}
                disabled={saving || !newFood.name || !newFood.portion || !newFood.group}
                className="w-full btn-primary"
              >
                {saving ? (
                  <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Crear alimento
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
