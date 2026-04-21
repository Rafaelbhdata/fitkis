'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, X, Info } from 'lucide-react'
import { useSupabase } from '@/lib/hooks'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import type { FoodGroup, FoodEquivalent } from '@/types'

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

const SMAE_CATEGORIES = [
  'Verduras',
  'Frutas',
  'Cereales S/G',
  'Cereales C/G',
  'Leguminosas',
  'AOA MBAG',
  'AOA BAG',
  'AOA MAG',
  'AOA AAG',
  'Leche descremada',
  'Leche semidescremada',
  'Leche entera',
  'Leche con azúcar',
  'Grasas sin proteínas',
  'Grasas con proteínas',
  'Azucares sin grasa',
  'Azucares con grasa',
  'Alcohol',
]

export default function EquivalentesPage() {
  const supabase = useSupabase()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [foods, setFoods] = useState<FoodEquivalent[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedFood, setSelectedFood] = useState<FoodEquivalent | null>(null)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  // Search foods from database
  const searchFoods = async () => {
    setLoading(true)
    try {
      let queryBuilder = (supabase as any)
        .from('food_equivalents')
        .select('*', { count: 'exact' })

      if (searchQuery.trim()) {
        queryBuilder = queryBuilder.ilike('name', `%${searchQuery}%`)
      }

      if (selectedCategory) {
        queryBuilder = queryBuilder.eq('category_smae', selectedCategory)
      }

      queryBuilder = queryBuilder.order('name').limit(100)

      const { data, error, count } = await queryBuilder

      if (error) throw error
      if (data) {
        setFoods(data as FoodEquivalent[])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error searching foods:', err)
      setFoods([])
    }
    setLoading(false)
  }

  // Trigger search when query or category changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchFoods()
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, selectedCategory])

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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-md">Equivalentes SMAE</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} alimentos del Sistema Mexicano de Alimentos Equivalentes
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border hover:border-accent/50 transition-colors"
          >
            <span className="text-sm">
              {selectedCategory || 'Todas las categorías'}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} />
          </button>

          {showCategoryFilter && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setShowCategoryFilter(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors ${
                  !selectedCategory ? 'text-accent font-medium' : ''
                }`}
              >
                Todas las categorías
              </button>
              {SMAE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat)
                    setShowCategoryFilter(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors ${
                    selectedCategory === cat ? 'text-accent font-medium' : ''
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : foods.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Mostrando {foods.length} de {totalCount.toLocaleString()} resultados
            </p>
            {foods.map((food) => {
              const groups = getFoodGroups(food)
              return (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className="w-full text-left p-4 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors border border-border hover:border-accent/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{food.portion}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{food.category_smae}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {groups.map(({ group, amount }) => (
                        <span
                          key={group}
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${FOOD_COLORS[group]}20`,
                            color: FOOD_COLORS[group]
                          }}
                        >
                          {FOOD_EMOJIS[group]} {amount}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory
                ? 'No se encontraron alimentos'
                : 'Escribe para buscar o selecciona una categoría'}
            </p>
          </div>
        )}
      </div>

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
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-xs text-accent mb-1">Porción (1 equivalente)</p>
                <p className="font-medium">{selectedFood.portion}</p>
                {selectedFood.weight_g && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Peso neto: {selectedFood.weight_g}g
                  </p>
                )}
              </div>

              {/* Equivalents */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Equivalentes por porción:</p>
                <div className="grid grid-cols-2 gap-2">
                  {getFoodGroups(selectedFood).map(({ group, amount }) => (
                    <div
                      key={group}
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: `${FOOD_COLORS[group]}10`,
                        borderColor: `${FOOD_COLORS[group]}30`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{FOOD_EMOJIS[group]}</span>
                        <div>
                          <p className="font-display text-lg" style={{ color: FOOD_COLORS[group] }}>
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

              {/* Info Note */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-elevated text-xs text-muted-foreground">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Los equivalentes indican cuántas porciones de cada grupo alimenticio
                  representa este alimento en tu dieta diaria.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
