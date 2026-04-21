'use client'

import { useState, useEffect } from 'react'
import { Search, X, Info, ChevronRight } from 'lucide-react'
import { useSupabase } from '@/lib/hooks'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import type { FoodGroup, FoodEquivalent } from '@/types'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<FoodGroup | null>(null)
  const [foods, setFoods] = useState<FoodEquivalent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodEquivalent | null>(null)
  const [groupCounts, setGroupCounts] = useState<Record<FoodGroup, number>>({
    verdura: 0,
    fruta: 0,
    carb: 0,
    leguminosa: 0,
    proteina: 0,
    grasa: 0,
  })

  // Load group counts on mount
  useEffect(() => {
    loadGroupCounts()
  }, [])

  const loadGroupCounts = async () => {
    try {
      const counts: Record<FoodGroup, number> = {
        verdura: 0,
        fruta: 0,
        carb: 0,
        leguminosa: 0,
        proteina: 0,
        grasa: 0,
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

  // Search foods from database
  const searchFoods = async (group: FoodGroup, query: string = '') => {
    setLoading(true)
    try {
      let queryBuilder = (supabase as any)
        .from('food_equivalents')
        .select('*')
        .gt(group, 0)

      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`)
      }

      queryBuilder = queryBuilder.order('name').limit(100)

      const { data, error } = await queryBuilder

      if (error) throw error
      if (data) setFoods(data as FoodEquivalent[])
    } catch (err) {
      console.error('Error searching foods:', err)
      setFoods([])
    }
    setLoading(false)
  }

  // Trigger search when group or query changes
  useEffect(() => {
    if (selectedGroup) {
      const debounceTimer = setTimeout(() => {
        searchFoods(selectedGroup, searchQuery)
      }, 300)
      return () => clearTimeout(debounceTimer)
    }
  }, [selectedGroup, searchQuery])

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
    setSearchQuery('')
    setFoods([])
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
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
            ? `${foods.length} alimentos encontrados`
            : 'Explora los alimentos por grupo'
          }
        </p>
      </div>

      {!selectedGroup ? (
        /* Group Selection View */
        <div className="space-y-3">
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
          <div className="mt-6 p-4 rounded-xl bg-surface-elevated border border-border">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Sistema SMAE</p>
                <p className="text-xs text-muted-foreground">
                  Base de datos del Sistema Mexicano de Alimentos Equivalentes (4ta edición)
                  con más de 2,500 alimentos y sus porciones equivalentes.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Food List View */
        <div className="space-y-4">
          {/* Back button + Search */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-elevated rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: FOOD_COLORS[selectedGroup], borderTopColor: 'transparent' }}
              />
            </div>
          ) : foods.length > 0 ? (
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
          ) : (
            <div className="text-center py-16">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${FOOD_COLORS[selectedGroup]}15` }}
              >
                {FOOD_EMOJIS[selectedGroup]}
              </div>
              <p className="text-muted-foreground">
                {searchQuery ? 'No se encontraron alimentos' : 'Cargando...'}
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
              {/* Portion Info */}
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: selectedGroup ? `${FOOD_COLORS[selectedGroup]}10` : '#10b98110',
                  border: `1px solid ${selectedGroup ? FOOD_COLORS[selectedGroup] : '#10b981'}30`
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

              {/* Equivalents */}
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

              {/* Multiple groups note */}
              {getFoodGroups(selectedFood).length > 1 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-amber-200">
                    Este alimento cuenta como múltiples equivalentes.
                    Una porción suma a varios grupos de tu dieta.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
