'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, Search, X, Trash2, Minus, Plus, Zap } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, MEAL_BUDGETS, FOOD_GROUP_LABELS, FOOD_EQUIVALENTS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import type { MealType, FoodGroup, FoodLog } from '@/types'

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

  useEffect(() => {
    if (user) {
      loadFoodLogs()
    }
  }, [user])

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
  }

  const deleteFood = async (id: string) => {
    try {
      await (supabase.from('food_logs') as any).delete().eq('id', id)
      setFoodLogs(foodLogs.filter(f => f.id !== id))
    } catch (err) {
      setError('Error al eliminar alimento')
    }
  }

  // Calcular consumido por grupo
  const consumed: Record<FoodGroup, number> = {
    verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0,
  }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  const filteredFoods = selectedGroup
    ? FOOD_EQUIVALENTS[selectedGroup].filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const mealLogs = (meal: MealType) => foodLogs.filter(f => f.meal === meal)

  // Calculate totals
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(DAILY_BUDGET).reduce((a, b) => a + b, 0)
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
          {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => {
            const total = DAILY_BUDGET[group]
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

      {/* Meals */}
      <div className="space-y-3">
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
                  {/* Food Group Chips */}
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(budget) as FoodGroup[])
                      .filter((g) => budget[g] > 0)
                      .map((group) => (
                        <button
                          key={group}
                          onClick={() => {
                            setSelectedMeal(meal.key)
                            setSelectedGroup(group)
                            setShowAddModal(true)
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] bg-surface-elevated border border-border hover:border-border-subtle"
                        >
                          <span className="mr-1">{FOOD_EMOJIS[group]}</span>
                          {FOOD_GROUP_LABELS[group]} ×{budget[group]}
                        </button>
                      ))}
                  </div>

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
      {showAddModal && selectedGroup && (
        <>
          <div className="overlay animate-fade-in" onClick={closeModal} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">
                {selectedFood ? selectedFood.name : `Agregar ${FOOD_GROUP_LABELS[selectedGroup]}`}
              </h2>
              <button onClick={closeModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedFood ? (
              /* Quantity Selector */
              <div className="space-y-6">
                <div className="text-center">
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
              /* Food Search */
              <div className="flex flex-col" style={{ maxHeight: 'calc(80vh - 160px)' }}>
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

                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                  {filteredFoods.length > 0 ? (
                    filteredFoods.map((food) => (
                      <button
                        key={food.name}
                        onClick={() => selectFood(food)}
                        className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors active:scale-[0.99]"
                      >
                        <p className="font-medium text-sm">{food.name}</p>
                        <p className="text-xs text-muted-foreground">{food.portion}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No se encontraron alimentos' : 'Escribe para buscar'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
