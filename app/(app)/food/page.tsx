'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Star, ChevronRight, Loader2, Search, X, Trash2 } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, MEAL_BUDGETS, FOOD_GROUP_LABELS, FOOD_GROUP_COLORS, FOOD_EQUIVALENTS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import type { MealType, FoodGroup, FoodLog } from '@/types'

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

  useEffect(() => {
    if (user) {
      loadFoodLogs()
    }
  }, [user])

  const loadFoodLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('date', todayStr)
      .order('created_at')
    if (data) setFoodLogs(data as FoodLog[])
    setLoading(false)
  }

  const addFood = async (foodName: string) => {
    if (!user || !selectedGroup) return
    await supabase.from('food_logs').insert({
      user_id: user.id,
      date: todayStr,
      meal: selectedMeal,
      group_type: selectedGroup,
      quantity: 1,
      food_name: foodName,
    })
    await loadFoodLogs()
    setShowAddModal(false)
    setSelectedGroup(null)
    setSearchQuery('')
  }

  const deleteFood = async (id: string) => {
    await supabase.from('food_logs').delete().eq('id', id)
    setFoodLogs(foodLogs.filter(f => f.id !== id))
  }

  // Calcular consumido por grupo
  const consumed: Record<FoodGroup, number> = {
    verdura: 0,
    fruta: 0,
    carb: 0,
    leguminosa: 0,
    proteina: 0,
    grasa: 0,
  }
  foodLogs.forEach(log => {
    consumed[log.group_type] += log.quantity
  })

  const filteredFoods = selectedGroup
    ? FOOD_EQUIVALENTS[selectedGroup].filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  const mealLogs = (meal: MealType) => foodLogs.filter(f => f.meal === meal)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Alimentación</h1>
          <p className="text-muted capitalize">{formatDate(new Date())}</p>
        </div>
        <Link href="/food/favorites" className="p-2">
          <Star className="w-6 h-6" />
        </Link>
      </header>

      {/* Resumen del día */}
      <section className="card">
        <h2 className="text-sm font-medium text-muted mb-3">Resumen del día</h2>
        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => {
            const total = DAILY_BUDGET[group]
            const current = consumed[group]
            const percentage = Math.min((current / total) * 100, 100)

            return (
              <div key={group} className="text-center">
                <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: FOOD_GROUP_COLORS[group],
                    }}
                  />
                </div>
                <p className="text-xs text-muted">{FOOD_GROUP_LABELS[group]}</p>
                <p className="text-sm font-medium">{current}/{total}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Comidas del día */}
      <section className="space-y-3">
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
                <h3 className="font-display text-lg font-semibold">{meal.label}</h3>
                <div className="flex items-center gap-2">
                  {logs.length > 0 && (
                    <span className="text-xs text-muted">{logs.length} items</span>
                  )}
                  <ChevronRight
                    className={`w-5 h-5 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Presupuesto de la comida */}
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
                          className="px-2 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: `${FOOD_GROUP_COLORS[group]}20`,
                            color: FOOD_GROUP_COLORS[group],
                          }}
                        >
                          + {FOOD_GROUP_LABELS[group]}: {budget[group]}
                        </button>
                      ))}
                  </div>

                  {/* Lista de alimentos agregados */}
                  <div className="border-t border-border pt-4 space-y-2">
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: FOOD_GROUP_COLORS[log.group_type] }}
                            />
                            <span className="text-sm">{log.food_name || FOOD_GROUP_LABELS[log.group_type]}</span>
                          </div>
                          <button onClick={() => deleteFood(log.id)} className="p-1 text-muted hover:text-danger">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted text-center py-2">
                        Toca un grupo para agregar alimentos
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Modal de agregar alimento */}
      {showAddModal && selectedGroup && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-end">
          <div className="w-full bg-surface rounded-t-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">
                Agregar {FOOD_GROUP_LABELS[selectedGroup]}
              </h2>
              <button onClick={() => { setShowAddModal(false); setSelectedGroup(null); setSearchQuery(''); }}>
                <X className="w-6 h-6 text-muted" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                className="input pl-10"
                placeholder="Buscar alimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredFoods.map((food) => (
                <button
                  key={food.name}
                  onClick={() => addFood(food.name)}
                  className="w-full text-left p-3 rounded-lg bg-background hover:bg-card-hover transition-colors"
                >
                  <p className="font-medium">{food.name}</p>
                  <p className="text-sm text-muted">{food.portion}</p>
                  {food.note && <p className="text-xs text-accent mt-1">{food.note}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
