'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, Search, X, Trash2, Minus, Plus, Zap, PlusCircle } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, MEAL_BUDGETS, FOOD_GROUP_LABELS, DEFAULT_DAILY_BUDGET } from '@/lib/constants'
import type { DailyBudget, FoodEquivalent } from '@/types'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import type { MealType, FoodGroup, FoodLog, FavoriteMeal, CustomFood } from '@/types'

// New Atlético Vital food colors
const FOOD_COLORS: Record<FoodGroup, string> = {
  verdura: '#7ed957',
  fruta: '#ff8a5c',
  carb: '#ffce4a',
  leguminosa: '#22e4d9',
  proteina: '#ff5277',
  grasa: '#9f7bff',
}

const FOOD_EMOJIS: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

const meals: { key: MealType; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'snack', label: 'Snack' },
  { key: 'comida', label: 'Comida' },
  { key: 'cena', label: 'Cena' },
]

export default function FoodPage() {
  const todayStr = getToday()
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('desayuno')
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealType>('desayuno')
  const [selectedGroup, setSelectedGroup] = useState<FoodGroup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<{ name: string; portion: string; note?: string } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const [applyingFavorite, setApplyingFavorite] = useState(false)
  const [userBudget, setUserBudget] = useState<DailyBudget>(DEFAULT_DAILY_BUDGET)
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [showCreateCustom, setShowCreateCustom] = useState(false)
  const [newCustomFood, setNewCustomFood] = useState({ name: '', portion: '', note: '' })
  const [dbFoods, setDbFoods] = useState<FoodEquivalent[]>([])
  const [searchingFoods, setSearchingFoods] = useState(false)

  useEffect(() => {
    if (user) {
      loadFoodLogs()
      loadFavorites()
      loadUserDietConfig()
      loadCustomFoods()
    }
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
      // Table might not exist yet
    }
  }

  // Search foods from database based on selected group and search query
  const searchFoodsFromDB = async (group: FoodGroup, query: string) => {
    setSearchingFoods(true)
    try {
      // Map our food groups to SMAE equivalent columns
      let queryBuilder = (supabase as any)
        .from('food_equivalents')
        .select('*')

      // Filter by the food group (column value > 0)
      switch (group) {
        case 'verdura':
          queryBuilder = queryBuilder.gt('verdura', 0)
          break
        case 'fruta':
          queryBuilder = queryBuilder.gt('fruta', 0)
          break
        case 'carb':
          queryBuilder = queryBuilder.gt('carb', 0)
          break
        case 'proteina':
          queryBuilder = queryBuilder.gt('proteina', 0)
          break
        case 'grasa':
          queryBuilder = queryBuilder.gt('grasa', 0)
          break
        case 'leguminosa':
          // Leguminosa is mapped to carb, but we can still filter by category
          queryBuilder = queryBuilder.eq('category_smae', 'Leguminosas')
          break
      }

      // Search by name if query provided
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`)
      }

      // Limit results for performance
      queryBuilder = queryBuilder.order('name').limit(50)

      const { data, error } = await queryBuilder

      if (error) throw error
      if (data) setDbFoods(data as FoodEquivalent[])
    } catch (err) {
      console.error('Error searching foods:', err)
      setDbFoods([])
    }
    setSearchingFoods(false)
  }

  // Trigger search when group or query changes
  useEffect(() => {
    if (selectedGroup && showAddModal) {
      const debounceTimer = setTimeout(() => {
        searchFoodsFromDB(selectedGroup, searchQuery)
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else {
      setDbFoods([])
    }
  }, [selectedGroup, searchQuery, showAddModal])

  const createCustomFood = async () => {
    if (!user || !selectedGroup || !newCustomFood.name || !newCustomFood.portion) return
    try {
      await (supabase as any).from('custom_foods').insert({
        user_id: user.id,
        name: newCustomFood.name,
        group_type: selectedGroup,
        portion: newCustomFood.portion,
        note: newCustomFood.note || null,
      })
      await loadCustomFoods()
      setShowCreateCustom(false)
      setNewCustomFood({ name: '', portion: '', note: '' })
      // Auto-select the newly created food
      setSelectedFood({ name: newCustomFood.name, portion: newCustomFood.portion, note: newCustomFood.note })
      setQuantity(1)
      showToast(`"${newCustomFood.name}" creado`)
    } catch (err) {
      setError('Error al crear alimento')
    }
  }

  const loadUserDietConfig = async () => {
    try {
      // Get the most recent diet config that's effective for today or earlier
      const { data } = await (supabase as any)
        .from('diet_configs')
        .select('*')
        .eq('user_id', user?.id)
        .lte('effective_date', todayStr)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setUserBudget({
          verdura: data.verdura,
          fruta: data.fruta,
          carb: data.carb,
          leguminosa: data.leguminosa,
          proteina: data.proteina,
          grasa: data.grasa,
        })
      }
    } catch (err) {
      // No config found, use defaults (already set)
    }
  }

  const loadFavorites = async () => {
    try {
      const { data } = await supabase
        .from('favorite_meals')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setFavorites(data as FavoriteMeal[])
    } catch (err) {
      // Silent fail for favorites
    }
  }

  const loadFoodLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('food_logs')
        .select('*')
        .eq('date', todayStr)
        .order('created_at')
      if (fetchError) throw fetchError
      if (data) setFoodLogs(data as FoodLog[])
    } catch (err) {
      setError('Error al cargar alimentos')
    }
    setLoading(false)
  }

  const selectFood = (food: { name: string; portion: string; note?: string }) => {
    setSelectedFood(food)
    setQuantity(1)
  }

  const addFood = async () => {
    if (!user || !selectedGroup || !selectedFood) return
    try {
      await (supabase.from('food_logs') as any).insert({
        user_id: user.id,
        date: todayStr,
        meal: selectedMeal,
        group_type: selectedGroup,
        quantity: quantity,
        food_name: selectedFood.name,
      })
      await loadFoodLogs()
      closeModal()
      showToast(`${selectedFood.name} agregado`)
    } catch (err) {
      setError('Error al agregar alimento')
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setSelectedGroup(null)
    setSelectedFood(null)
    setSearchQuery('')
    setQuantity(1)
    setDbFoods([])
  }

  const deleteFood = async (id: string) => {
    try {
      await (supabase.from('food_logs') as any).delete().eq('id', id)
      setFoodLogs(foodLogs.filter(f => f.id !== id))
    } catch (err) {
      setError('Error al eliminar alimento')
    }
  }

  const applyFavorite = async (favorite: FavoriteMeal) => {
    if (!user) return
    setApplyingFavorite(true)
    try {
      const logsToInsert = favorite.items.map(item => ({
        user_id: user.id,
        date: todayStr,
        meal: favorite.meal,
        group_type: item.group_type,
        quantity: item.quantity,
        food_name: item.food_name,
      }))
      await (supabase.from('food_logs') as any).insert(logsToInsert)
      await loadFoodLogs()
      setShowFavoritesModal(false)
      showToast(`"${favorite.name}" agregado`)
    } catch (err) {
      setError('Error al agregar favorito')
    }
    setApplyingFavorite(false)
  }

  const mealFavorites = (meal: MealType) => favorites.filter(f => f.meal === meal)

  // Calcular consumido por grupo
  const consumed: Record<FoodGroup, number> = {
    verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0,
  }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  // Combine custom foods with database foods
  const filteredFoods = selectedGroup
    ? [
        // Custom foods first (marked as custom)
        ...customFoods
          .filter(f => f.group_type === selectedGroup && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(f => ({ name: f.name, portion: f.portion, note: f.note, isCustom: true, isDb: false })),
        // Database foods from SMAE
        ...dbFoods.map(f => ({
          name: f.name,
          portion: f.portion,
          note: f.category_smae,
          isCustom: false,
          isDb: true
        }))
      ]
    : []

  const mealLogs = (meal: MealType) => foodLogs.filter(f => f.meal === meal)

  // Calculate totals
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(userBudget).reduce((a, b) => a + b, 0)
  const nutritionPercentage = Math.round((totalConsumed / totalBudget) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button onClick={loadFoodLogs} className="text-xs font-medium underline hover:no-underline">
              Reintentar
            </button>
            <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md">Alimentación</h1>
          <p className="text-sm text-muted-foreground">
            {totalConsumed} / {totalBudget} equivalentes
          </p>
        </div>
        <Link
          href="/food/favorites"
          className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-hover transition-colors"
        >
          <Star className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Progress Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Progreso del día</span>
          </div>
          <span className="font-display text-display-xs text-accent">{nutritionPercentage}%</span>
        </div>

        {/* Large progress bars */}
        <div className="space-y-3">
          {(Object.keys(userBudget) as FoodGroup[]).map((group) => {
            const total = userBudget[group]
            const current = consumed[group]
            const percentage = Math.min((current / total) * 100, 100)
            const isComplete = current >= total
            const isOver = current > total

            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: isOver ? '#ef4444' : FOOD_COLORS[group] }}
                    />
                    <span className="text-sm font-medium">{FOOD_GROUP_LABELS[group]}</span>
                    {isOver && (
                      <span className="text-[10px] font-semibold text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                        +{current - total}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${isOver ? 'text-danger' : isComplete ? 'text-accent' : ''}`}>
                    {current}/{total}
                  </span>
                </div>
                <div className={`progress-track-lg ${isOver ? 'bg-danger/20' : ''}`}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isOver ? '#ef4444' : isComplete ? '#10b981' : FOOD_COLORS[group],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Meals - 2 columns on tablet+ */}
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {meals.map((meal) => {
          const budget = MEAL_BUDGETS[meal.key]
          const isExpanded = expandedMeal === meal.key
          const logs = mealLogs(meal.key)

          return (
            <div key={meal.key} className="card !p-0 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4"
                onClick={() => setExpandedMeal(isExpanded ? null : meal.key)}
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-display-xs">{meal.label}</h3>
                  {logs.length > 0 && (
                    <span className="badge-accent">{logs.length}</span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-slide-up">
                  {/* Quick Add Favorites */}
                  {mealFavorites(meal.key).length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {mealFavorites(meal.key).map((fav) => (
                        <button
                          key={fav.id}
                          onClick={() => applyFavorite(fav)}
                          disabled={applyingFavorite}
                          className="flex-shrink-0 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-all active:scale-[0.98] flex items-center gap-1.5"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {fav.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recommended Groups (for reference) */}
                  {Object.values(budget).some(v => v > 0) && (
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground mb-1.5">Recomendado:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(budget) as FoodGroup[])
                          .filter((g) => budget[g] > 0)
                          .map((group) => (
                            <span
                              key={group}
                              className="px-2 py-1 rounded-md text-[10px] font-medium bg-surface-elevated/50 text-muted-foreground"
                            >
                              {FOOD_EMOJIS[group]} {budget[group]}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Add Any Food Group Button */}
                  <button
                    onClick={() => {
                      setSelectedMeal(meal.key)
                      setSelectedGroup(null)
                      setShowAddModal(true)
                    }}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
                  >
                    + Agregar alimento
                  </button>

                  {/* Food Items */}
                  {logs.length > 0 ? (
                    <div className="space-y-1 pt-2 border-t border-border">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: FOOD_COLORS[log.group_type] }}
                            />
                            <span className="text-sm">
                              {log.quantity !== 1 && (
                                <span className="text-accent font-medium">{log.quantity}× </span>
                              )}
                              {log.food_name || FOOD_GROUP_LABELS[log.group_type]}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteFood(log.id)}
                            className="p-1.5 text-muted-foreground hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3 border-t border-border">
                      Toca un grupo para agregar
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Food Modal */}
      {showAddModal && (
        <>
          <div className="overlay animate-fade-in" onClick={closeModal} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">
                {selectedFood
                  ? selectedFood.name
                  : selectedGroup
                    ? `Agregar ${FOOD_GROUP_LABELS[selectedGroup]}`
                    : 'Agregar alimento'}
              </h2>
              <button onClick={closeModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedGroup ? (
              /* Step 1: Select Food Group */
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">Selecciona el grupo alimenticio:</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(userBudget) as FoodGroup[]).map((group) => {
                    const current = consumed[group]
                    const total = userBudget[group]
                    const isOver = current >= total

                    return (
                      <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        className={`p-3 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          isOver
                            ? 'bg-danger/10 border border-danger/20'
                            : 'bg-surface-elevated border border-border hover:border-accent/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{FOOD_EMOJIS[group]}</span>
                          <span className="text-sm font-medium">{FOOD_GROUP_LABELS[group]}</span>
                        </div>
                        <p className={`text-xs ${isOver ? 'text-danger' : 'text-muted-foreground'}`}>
                          {current}/{total} equivalentes
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* Quick add generic equivalents */}
                <div className="pt-3 border-t border-border mt-4">
                  <p className="text-xs text-muted-foreground mb-2">O agrega equivalentes genéricos:</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(userBudget) as FoodGroup[]).map((group) => (
                      <button
                        key={`quick-${group}`}
                        onClick={() => {
                          setSelectedGroup(group)
                          setSelectedFood({ name: `1 ${FOOD_GROUP_LABELS[group].toLowerCase()}`, portion: '1 equivalente' })
                          setQuantity(1)
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                      >
                        +1 {FOOD_EMOJIS[group]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedFood ? (
              /* Step 3: Quantity Selector */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-2xl">{FOOD_EMOJIS[selectedGroup]}</span>
                    <span className="text-sm text-muted-foreground">{FOOD_GROUP_LABELS[selectedGroup]}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">Porción: {selectedFood.portion}</p>
                  <div className="flex items-center justify-center gap-5">
                    <button
                      onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                      className="w-12 h-12 rounded-lg bg-surface-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="font-display text-display-lg text-accent w-16 text-center tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 0.5)}
                      className="w-12 h-12 rounded-lg bg-accent text-background flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">equivalentes</p>
                </div>
                {selectedFood.note && (
                  <p className="text-xs text-accent text-center bg-accent/10 rounded-lg py-2 px-3">
                    {selectedFood.note}
                  </p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setSelectedFood(null)} className="flex-1 btn-secondary">
                    Cambiar
                  </button>
                  <button onClick={addFood} className="flex-1 btn-primary">
                    Agregar
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Food Search */
              <div className="flex flex-col" style={{ maxHeight: 'calc(80vh - 160px)' }}>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-xs text-accent mb-3 text-left hover:underline"
                >
                  ← Cambiar grupo ({FOOD_GROUP_LABELS[selectedGroup]})
                </button>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Buscar alimento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Quick add generic for this group */}
                <button
                  onClick={() => {
                    setSelectedFood({ name: `1 ${FOOD_GROUP_LABELS[selectedGroup].toLowerCase()}`, portion: '1 equivalente' })
                    setQuantity(1)
                  }}
                  className="mb-3 p-3 rounded-lg bg-accent/10 border border-accent/20 text-sm font-medium text-accent hover:bg-accent/20 transition-colors text-left"
                >
                  <span className="text-lg mr-2">{FOOD_EMOJIS[selectedGroup]}</span>
                  Agregar equivalente genérico
                </button>

                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                  {searchingFoods ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    </div>
                  ) : filteredFoods.length > 0 ? (
                    filteredFoods.map((food, index) => (
                      <button
                        key={`${food.name}-${index}`}
                        onClick={() => selectFood(food)}
                        className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{food.name}</p>
                          {food.isCustom && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">Tuyo</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{food.portion}</p>
                        {food.note && !food.isCustom && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{food.note}</p>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground text-sm mb-3">
                        {searchQuery ? 'No se encontró' : 'Escribe para buscar'}
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setShowCreateCustom(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Crear "{searchQuery}"
                        </button>
                      )}
                    </div>
                  )}

                  {/* Always show create custom option at the bottom */}
                  {filteredFoods.length > 0 && (
                    <button
                      onClick={() => setShowCreateCustom(true)}
                      className="w-full p-3 rounded-lg border border-dashed border-border hover:border-accent/50 text-sm text-muted-foreground hover:text-accent transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Crear alimento nuevo
                    </button>
                  )}
                </div>

                {/* Create Custom Food Modal */}
                {showCreateCustom && (
                  <div className="absolute inset-0 bg-background rounded-b-2xl p-5 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg">Nuevo alimento</h3>
                      <button
                        onClick={() => {
                          setShowCreateCustom(false)
                          setNewCustomFood({ name: '', portion: '', note: '' })
                        }}
                        className="btn-icon"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="label">Nombre *</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ej: Proteína en polvo"
                          value={newCustomFood.name || searchQuery}
                          onChange={(e) => setNewCustomFood(prev => ({ ...prev, name: e.target.value }))}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="label">Porción (1 equivalente) *</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ej: 1 scoop (30g)"
                          value={newCustomFood.portion}
                          onChange={(e) => setNewCustomFood(prev => ({ ...prev, portion: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">Nota (opcional)</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ej: Marca X, sabor chocolate"
                          value={newCustomFood.note}
                          onChange={(e) => setNewCustomFood(prev => ({ ...prev, note: e.target.value }))}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShowCreateCustom(false)
                            setNewCustomFood({ name: '', portion: '', note: '' })
                          }}
                          className="flex-1 btn-secondary"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={createCustomFood}
                          disabled={!newCustomFood.name && !searchQuery || !newCustomFood.portion}
                          className="flex-1 btn-primary disabled:opacity-50"
                        >
                          Crear y agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
