'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Search, X, Minus, Mic, Droplet, Star } from 'lucide-react'
import { getToday } from '@/lib/utils'
import { FOOD_GROUP_LABELS, DEFAULT_DAILY_BUDGET } from '@/lib/constants'
import type { DailyBudget, FoodEquivalent } from '@/types'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { PulseLine } from '@/components/ui/PulseLine'
import type { MealType, FoodGroup, FoodLog, FavoriteMeal, CustomFood } from '@/types'

// v5 Paper & Pulse food colors
const FOOD_COLORS: Record<FoodGroup, { bg: string; fill: string; label: string; emoji: string }> = {
  verdura: { bg: 'bg-leaf-soft', fill: '#4a7c3a', label: 'Verduras', emoji: '🥬' },
  fruta: { bg: 'bg-signal-soft', fill: '#ff5a1f', label: 'Frutas', emoji: '🍎' },
  carb: { bg: 'bg-honey-soft', fill: '#d4a017', label: 'Cereales', emoji: '🍞' },
  leguminosa: { bg: 'bg-sky-soft', fill: '#3a6b8c', label: 'Leguminosas', emoji: '🫘' },
  proteina: { bg: 'bg-berry-soft', fill: '#c13b5a', label: 'Proteína', emoji: '🥩' },
  grasa: { bg: 'bg-paper-3', fill: '#737373', label: 'Grasas', emoji: '🥑' },
}

const meals: { key: MealType; label: string; emoji: string }[] = [
  { key: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { key: 'snack', label: 'Snack', emoji: '🍌' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
]

export default function FoodPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const todayStr = selectedDate.toISOString().split('T')[0]
  const isToday = todayStr === getToday()

  const dateStr = selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealType>('desayuno')
  const [selectedGroup, setSelectedGroup] = useState<FoodGroup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<{ name: string; portion: string; note?: string } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [userBudget, setUserBudget] = useState<DailyBudget>(DEFAULT_DAILY_BUDGET)
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [dbFoods, setDbFoods] = useState<FoodEquivalent[]>([])
  const [searchingFoods, setSearchingFoods] = useState(false)

  // Date navigation
  const goToPrevDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    setSelectedDate(prev)
  }
  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    setSelectedDate(next)
  }
  const goToToday = () => setSelectedDate(new Date())

  useEffect(() => {
    if (user) {
      loadFoodLogs()
      loadFavorites()
      loadUserDietConfig()
      loadCustomFoods()
    }
  }, [user, todayStr])

  const loadCustomFoods = async () => {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('custom_foods')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
      if (data) setCustomFoods(data as CustomFood[])
    } catch (err) { /* ignore */ }
  }

  const searchFoodsFromDB = async (group: FoodGroup, query: string) => {
    setSearchingFoods(true)
    try {
      let queryBuilder = (supabase as any).from('food_equivalents').select('*')
      switch (group) {
        case 'verdura': queryBuilder = queryBuilder.gt('verdura', 0); break
        case 'fruta': queryBuilder = queryBuilder.gt('fruta', 0); break
        case 'carb': queryBuilder = queryBuilder.gt('carb', 0); break
        case 'proteina': queryBuilder = queryBuilder.gt('proteina', 0); break
        case 'grasa': queryBuilder = queryBuilder.gt('grasa', 0); break
        case 'leguminosa': queryBuilder = queryBuilder.eq('category_smae', 'Leguminosas'); break
      }
      if (query.trim()) queryBuilder = queryBuilder.ilike('name', `%${query}%`)
      queryBuilder = queryBuilder.order('name').limit(50)
      const { data, error } = await queryBuilder
      if (error) throw error
      if (data) setDbFoods(data as FoodEquivalent[])
    } catch (err) { setDbFoods([]) }
    setSearchingFoods(false)
  }

  useEffect(() => {
    if (selectedGroup && showAddModal) {
      const timer = setTimeout(() => searchFoodsFromDB(selectedGroup, searchQuery), 300)
      return () => clearTimeout(timer)
    } else { setDbFoods([]) }
  }, [selectedGroup, searchQuery, showAddModal])

  const loadUserDietConfig = async () => {
    try {
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
          verdura: data.verdura, fruta: data.fruta, carb: data.carb,
          leguminosa: data.leguminosa, proteina: data.proteina, grasa: data.grasa,
        })
      }
    } catch (err) { /* use defaults */ }
  }

  const loadFavorites = async () => {
    try {
      const { data } = await supabase.from('favorite_meals').select('*').order('created_at', { ascending: false })
      if (data) setFavorites(data as FavoriteMeal[])
    } catch (err) { /* ignore */ }
  }

  const loadFoodLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('food_logs').select('*').eq('date', todayStr).order('created_at')
      if (fetchError) throw fetchError
      if (data) setFoodLogs(data as FoodLog[])
    } catch (err) { setError('Error al cargar alimentos') }
    setLoading(false)
  }

  const addFood = async () => {
    if (!user || !selectedGroup || !selectedFood) return
    try {
      await (supabase.from('food_logs') as any).insert({
        user_id: user.id, date: todayStr, meal: selectedMeal,
        group_type: selectedGroup, quantity, food_name: selectedFood.name,
      })
      await loadFoodLogs()
      closeModal()
      showToast(`${selectedFood.name} agregado`)
    } catch (err) { setError('Error al agregar alimento') }
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
    } catch (err) { setError('Error al eliminar alimento') }
  }

  // Calculate consumed per group
  const consumed: Record<FoodGroup, number> = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  // Calculate totals
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(userBudget).reduce((a, b) => a + b, 0)
  const percentage = totalBudget > 0 ? Math.round((totalConsumed / totalBudget) * 100) : 0

  // Filter foods
  const filteredFoods = selectedGroup
    ? [
        ...customFoods.filter(f => f.group_type === selectedGroup && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(f => ({ name: f.name, portion: f.portion, note: f.note, isCustom: true })),
        ...dbFoods.map(f => ({ name: f.name, portion: f.portion, note: f.category_smae, isCustom: false }))
      ]
    : []

  const mealLogs = (meal: MealType) => foodLogs.filter(f => f.meal === meal)

  // Current meal based on time
  const getCurrentMeal = (): MealType => {
    const hour = new Date().getHours()
    if (hour < 10) return 'desayuno'
    if (hour < 13) return 'snack'
    if (hour < 17) return 'comida'
    return 'cena'
  }
  const currentMeal = getCurrentMeal()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 md:pb-8">
      {error && (
        <div className="mx-4 mb-4 p-3 bg-berry-soft border border-berry/20 rounded-xl text-berry text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-berry"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-2 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevDay}
              className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isToday ? 'bg-ink text-paper' : 'border border-ink-7 hover:bg-paper-2'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={goToNextDay}
              className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => { setSelectedMeal(currentMeal); setShowAddModal(true) }}
            className="px-5 py-2.5 rounded-full bg-signal text-white text-sm font-medium flex items-center gap-2 hover:bg-signal/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar
          </button>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl font-light tracking-tight">
          {capitalizedDate}
        </h1>
      </div>

      {/* Main Grid */}
      <div className="px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Progress Summary Card */}
          <div className="bg-cream rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="fk-eyebrow mb-1">Progreso del día</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl text-signal">{percentage}</span>
                  <span className="text-2xl text-ink-4">%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="fk-mono text-xs text-ink-4 mb-1">EQUIVALENTES</div>
                <div className="font-serif text-2xl">
                  <span className="text-signal">{totalConsumed}</span>
                  <span className="text-ink-4"> / {totalBudget}</span>
                </div>
              </div>
            </div>

            {/* Food Groups Grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {(['verdura', 'fruta', 'carb', 'proteina', 'leguminosa', 'grasa'] as FoodGroup[]).map(group => {
                const current = consumed[group]
                const total = userBudget[group]
                const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0
                const isOver = current > total

                return (
                  <div
                    key={group}
                    className={`rounded-xl p-3 ${FOOD_COLORS[group].bg} ${isOver ? 'ring-2 ring-berry' : ''}`}
                  >
                    <div className="text-lg mb-1">{FOOD_COLORS[group].emoji}</div>
                    <div className="text-xs font-medium text-ink-3 mb-2 truncate">{FOOD_COLORS[group].label}</div>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`font-serif text-xl ${isOver ? 'text-berry' : 'text-ink'}`}>{current}</span>
                      <span className="text-xs text-ink-4">/{total}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1.5 bg-white/50 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: isOver ? '#c13b5a' : FOOD_COLORS[group].fill
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Meals Section */}
          <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden">
            <div className="p-5 border-b border-ink-7">
              <h2 className="font-serif text-xl">Comidas del día</h2>
            </div>

            <div className="divide-y divide-ink-7">
              {meals.map((meal) => {
                const logs = mealLogs(meal.key)
                const isCurrent = meal.key === currentMeal && isToday
                const hasLogs = logs.length > 0

                return (
                  <div key={meal.key} className={`p-5 ${isCurrent ? 'bg-signal-soft/30' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meal.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-lg">{meal.label}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-signal text-white text-[10px] fk-mono font-medium">
                                AHORA
                              </span>
                            )}
                            {hasLogs && !isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-leaf-soft text-leaf text-[10px] fk-mono font-medium">
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedMeal(meal.key); setShowAddModal(true) }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors ${
                          isCurrent
                            ? 'bg-signal text-white hover:bg-signal/90'
                            : 'border border-ink-7 hover:bg-paper-2'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>

                    {hasLogs ? (
                      <div className="space-y-2 ml-11">
                        {logs.map(log => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-paper-2 group"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                style={{ backgroundColor: `${FOOD_COLORS[log.group_type].fill}20` }}
                              >
                                {FOOD_COLORS[log.group_type].emoji}
                              </span>
                              <div>
                                <div className="text-sm font-medium">
                                  {log.food_name || FOOD_GROUP_LABELS[log.group_type]}
                                </div>
                                <div className="text-xs text-ink-4">
                                  {log.quantity} {log.quantity === 1 ? 'equivalente' : 'equivalentes'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteFood(log.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-4 hover:text-berry hover:bg-berry-soft opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-4 ml-11">Sin registros</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">

          {/* Coach Card */}
          <div className="bg-ink rounded-2xl p-5 text-paper">
            <div className="flex items-center gap-2 mb-3">
              <PulseLine w={20} h={10} color="var(--signal)" strokeWidth={1.5} />
              <span className="fk-mono text-[10px] text-ink-4 uppercase tracking-wider">Coach</span>
            </div>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Te faltan <span className="text-signal italic">{userBudget.verdura - consumed.verdura} verduras</span>.
              Una ensalada grande en la comida te ayuda a completarlas.
            </p>
            <Link
              href="/coach"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-signal/90 transition-colors"
            >
              Hablar con Coach
            </Link>
          </div>

          {/* Quick Add Favorites */}
          {favorites.length > 0 && (
            <div className="bg-white rounded-2xl border border-ink-7 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-honey" />
                  Favoritos
                </h3>
                <Link href="/food/favorites" className="text-xs text-signal hover:underline">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-2">
                {favorites.slice(0, 4).map(fav => (
                  <button
                    key={fav.id}
                    onClick={async () => {
                      for (const item of fav.items) {
                        await (supabase.from('food_logs') as any).insert({
                          user_id: user?.id, date: todayStr, meal: fav.meal,
                          group_type: item.group_type, quantity: item.quantity, food_name: item.food_name,
                        })
                      }
                      await loadFoodLogs()
                      showToast(`${fav.name} agregado`)
                    }}
                    className="w-full text-left p-3 rounded-xl border border-ink-7 hover:bg-paper-2 transition-colors"
                  >
                    <div className="font-medium text-sm">{fav.name}</div>
                    <div className="text-xs text-ink-4 capitalize">{fav.meal} · {fav.items.length} items</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Link to Equivalents */}
          <Link
            href="/equivalentes"
            className="block bg-white rounded-2xl border border-ink-7 p-5 hover:bg-paper-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-honey-soft flex items-center justify-center text-xl">
                📋
              </div>
              <div>
                <div className="font-medium">Explorar equivalentes</div>
                <div className="text-xs text-ink-4">2,500+ alimentos SMAE</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Add Food Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50" onClick={closeModal} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-paper rounded-t-3xl border-t border-ink-7 shadow-2xl max-h-[85vh] overflow-hidden">
            <div className="p-5">
              <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="fk-eyebrow mb-1">Agregar a {meals.find(m => m.key === selectedMeal)?.label}</div>
                  <h2 className="font-serif text-2xl font-light">
                    ¿Qué comiste?
                  </h2>
                </div>
                <button onClick={closeModal} className="w-10 h-10 rounded-full bg-paper-3 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!selectedGroup ? (
                /* Step 1: Select Food Group */
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(userBudget) as FoodGroup[]).map((group) => {
                    const current = consumed[group]
                    const total = userBudget[group]
                    return (
                      <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        className="bg-white border border-ink-7 rounded-2xl p-4 text-left hover:bg-paper-2 transition-colors"
                      >
                        <div className="text-2xl mb-2">{FOOD_COLORS[group].emoji}</div>
                        <div className="font-medium mb-1">{FOOD_COLORS[group].label}</div>
                        <div className="text-sm text-ink-4">
                          {current} / {total} equiv.
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : selectedFood ? (
                /* Step 3: Quantity */
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div className="text-4xl mb-3">{FOOD_COLORS[selectedGroup].emoji}</div>
                    <p className="font-medium text-lg">{selectedFood.name}</p>
                    <p className="text-sm text-ink-4">{selectedFood.portion}</p>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                      className="w-14 h-14 rounded-2xl bg-paper-3 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="font-serif text-6xl font-light w-20 text-center tabular-nums text-signal">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 0.5)}
                      className="w-14 h-14 rounded-2xl bg-signal text-white flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setSelectedFood(null)} className="flex-1 py-4 rounded-2xl border border-ink-7 text-sm font-medium hover:bg-paper-2 transition-colors">
                      Cambiar
                    </button>
                    <button onClick={addFood} className="flex-1 py-4 rounded-2xl bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors">
                      Agregar
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Search Foods */
                <div className="flex flex-col" style={{ maxHeight: 'calc(70vh - 200px)' }}>
                  <button onClick={() => setSelectedGroup(null)} className="text-sm text-signal mb-4 text-left hover:underline flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    Cambiar grupo
                  </button>

                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4" />
                    <input
                      type="text"
                      className="w-full bg-white rounded-xl pl-12 pr-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
                      placeholder={`Buscar ${FOOD_COLORS[selectedGroup].label.toLowerCase()}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <button
                    onClick={() => { setSelectedFood({ name: `1 ${FOOD_COLORS[selectedGroup].label.toLowerCase()}`, portion: '1 equivalente' }); setQuantity(1) }}
                    className="mb-4 p-4 rounded-xl border-2 border-dashed border-signal/30 text-sm font-medium text-signal text-center hover:bg-signal-soft/30 transition-colors"
                  >
                    + Agregar equivalente genérico
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
                    {searchingFoods ? (
                      <div className="flex items-center justify-center py-10">
                        <PulseLine w={60} h={18} color="var(--signal)" strokeWidth={1.5} active />
                      </div>
                    ) : filteredFoods.length > 0 ? (
                      filteredFoods.map((food, i) => (
                        <button
                          key={`${food.name}-${i}`}
                          onClick={() => { setSelectedFood(food); setQuantity(1) }}
                          className="w-full text-left p-4 rounded-xl bg-white border border-ink-7 hover:bg-paper-2 transition-colors"
                        >
                          <p className="font-medium">{food.name}</p>
                          <p className="text-sm text-ink-4">{food.portion}</p>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-ink-4 py-10">
                        {searchQuery ? 'No se encontraron resultados' : 'Escribe para buscar alimentos'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
