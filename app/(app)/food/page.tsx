'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, Search, X, Trash2, Minus, Plus } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, MEAL_BUDGETS, FOOD_GROUP_LABELS, FOOD_EQUIVALENTS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import type { MealType, FoodGroup, FoodLog } from '@/types'

const FOOD_COLORS: Record<FoodGroup, string> = {
  verdura: '#22c55e',
  fruta: '#f97316',
  carb: '#eab308',
  leguminosa: '#a855f7',
  proteina: '#ef4444',
  grasa: '#3b82f6',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm text-muted-foreground mb-1 capitalize">{formatDate(new Date())}</p>
          <h1 className="font-display text-display-md text-foreground">Alimentación</h1>
        </div>
        <Link href="/food/favorites" className="btn-icon">
          <Star className="w-5 h-5" />
        </Link>
      </header>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center justify-between animate-scale-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daily Summary */}
      <div className="card">
        <p className="section-label">Resumen del día</p>
        <div className="grid grid-cols-6 gap-3">
          {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => {
            const total = DAILY_BUDGET[group]
            const current = consumed[group]
            const percentage = Math.min((current / total) * 100, 100)
            const isComplete = current >= total

            return (
              <div key={group} className="text-center">
                <div className="relative w-10 h-10 mx-auto mb-2">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none" stroke="currentColor" strokeWidth="3"
                      className="text-surface-elevated"
                    />
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none"
                      stroke={FOOD_COLORS[group]}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${percentage * 0.88} 88`}
                      className="transition-all duration-500"
                      style={{ opacity: isComplete ? 1 : 0.6 }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                    {current}
                  </span>
                </div>
                <p className="text-[10px] text-muted leading-tight truncate">
                  {FOOD_GROUP_LABELS[group].slice(0, 5)}
                </p>
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
            <div key={meal.key} className="card">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setExpandedMeal(isExpanded ? null : meal.key)}
              >
                <h3 className="font-display text-display-sm">{meal.label}</h3>
                <div className="flex items-center gap-2">
                  {logs.length > 0 && (
                    <span className="badge">{logs.length}</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="mt-5 space-y-4 animate-slide-up">
                  {/* Food Group Pills */}
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
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                          style={{
                            backgroundColor: `${FOOD_COLORS[group]}15`,
                            color: FOOD_COLORS[group],
                            border: `1px solid ${FOOD_COLORS[group]}30`,
                          }}
                        >
                          + {FOOD_GROUP_LABELS[group]}: {budget[group]}
                        </button>
                      ))}
                  </div>

                  {/* Food Items */}
                  <div className="divider" />
                  <div className="space-y-1">
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
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
                            className="p-2 text-muted hover:text-danger transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted text-center py-4">
                        Toca un grupo para agregar
                      </p>
                    )}
                  </div>
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
          <div className="sheet p-6 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-6" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-display-sm">
                {selectedFood ? selectedFood.name : `Agregar ${FOOD_GROUP_LABELS[selectedGroup]}`}
              </h2>
              <button onClick={closeModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedFood ? (
              /* Quantity Selector */
              <div className="space-y-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-6">Porción: {selectedFood.portion}</p>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                      className="w-14 h-14 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-xl active:scale-95 transition-transform"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="font-display text-display-xl text-accent w-20 text-center tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 0.5)}
                      className="w-14 h-14 rounded-xl bg-accent text-background flex items-center justify-center text-xl active:scale-95 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-3">equivalentes</p>
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
              <div className="flex flex-col" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    className="input pl-11"
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
                        className="w-full text-left p-4 rounded-xl bg-surface hover:bg-surface-hover transition-colors active:scale-[0.99]"
                      >
                        <p className="font-medium text-sm">{food.name}</p>
                        <p className="text-xs text-muted mt-0.5">{food.portion}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-muted py-12">
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
