'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Star, Search, X, Trash2, Minus } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, MEAL_BUDGETS, FOOD_GROUP_LABELS, DEFAULT_DAILY_BUDGET } from '@/lib/constants'
import type { DailyBudget, FoodEquivalent } from '@/types'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { PulseLine } from '@/components/ui/PulseLine'
import type { MealType, FoodGroup, FoodLog, FavoriteMeal, CustomFood } from '@/types'

// v5 Paper & Pulse food colors
const FOOD_COLORS: Record<FoodGroup, { bg: string; text: string; fill: string }> = {
  verdura: { bg: 'var(--leaf-soft)', text: 'var(--leaf)', fill: '#4a7c3a' },
  fruta: { bg: 'var(--signal-soft)', text: 'var(--signal)', fill: '#ff5a1f' },
  carb: { bg: 'var(--honey-soft)', text: '#8a6411', fill: '#d4a017' },
  leguminosa: { bg: 'var(--sky-soft)', text: 'var(--sky)', fill: '#3a6b8c' },
  proteina: { bg: 'var(--berry-soft)', text: 'var(--berry)', fill: '#c13b5a' },
  grasa: { bg: 'var(--paper-3)', text: 'var(--ink-3)', fill: '#737373' },
}

const meals: { key: MealType; label: string; time?: string }[] = [
  { key: 'desayuno', label: 'Desayuno', time: '07:20' },
  { key: 'snack', label: 'Snack', time: '11:00' },
  { key: 'comida', label: 'Comida', time: '13:45' },
  { key: 'cena', label: 'Cena', time: '19:30' },
]

export default function FoodPage() {
  const todayStr = getToday()
  const today = new Date()
  const dateStr = today.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
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

  // Calculate missing for message
  const missingVerduras = Math.max(0, userBudget.verdura - consumed.verdura)
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(userBudget).reduce((a, b) => a + b, 0)

  // Get motivational message
  const getMessage = () => {
    if (missingVerduras > 0) return `te faltan ${missingVerduras === 1 ? 'una verdura' : `${missingVerduras} verduras`}.`
    if (totalConsumed >= totalBudget) return 'completaste tu plato de hoy.'
    return 'buen camino.'
  }

  // Filter foods
  const filteredFoods = selectedGroup
    ? [
        ...customFoods.filter(f => f.group_type === selectedGroup && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(f => ({ name: f.name, portion: f.portion, note: f.note, isCustom: true })),
        ...dbFoods.map(f => ({ name: f.name, portion: f.portion, note: f.category_smae, isCustom: false }))
      ]
    : []

  const mealLogs = (meal: MealType) => foodLogs.filter(f => f.meal === meal)

  // Group tags for meal items
  const getGroupTags = (logs: FoodLog[]) => {
    const groups: Record<FoodGroup, number> = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }
    logs.forEach(l => groups[l.group_type] += l.quantity)
    return Object.entries(groups).filter(([_, v]) => v > 0).map(([g]) => g as FoodGroup)
  }

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
    <div className="pb-4">
      {error && (
        <div className="mx-5 mb-4 p-3 bg-berry-soft border border-berry/20 rounded-lg text-berry text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-berry"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-3 flex items-center justify-between">
        <Link href="/dashboard" className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-ink" />
        </Link>
        <div className="text-center">
          <div className="fk-eyebrow">Plato del día</div>
          <div className="text-sm font-medium">{capitalizedDate}</div>
        </div>
        <Link href="/food/favorites" className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 flex items-center justify-center">
          <Star className="w-4 h-4 text-ink" />
        </Link>
      </div>

      {/* Hero Card - SMAE Plate */}
      <div className="mx-5 mt-5 bg-cream rounded-[20px] p-5 relative overflow-hidden">
        <div className="fk-eyebrow mb-1.5">SMAE · Plato del Bien Comer</div>
        <h2 className="font-serif text-[26px] font-light tracking-tight leading-tight mb-4">
          Vas por <span className="italic text-signal">{getMessage().includes('faltan') ? 'buen camino' : 'excelente'}</span>,<br/>{getMessage()}
        </h2>

        {/* Plate Visualization */}
        <div className="relative w-[190px] h-[190px] mx-auto">
          <svg width="190" height="190" viewBox="0 0 190 190" className="absolute inset-0">
            <circle cx="95" cy="95" r="88" fill="#fff" stroke="var(--ink-7)" />
            {/* Three wedges */}
            <path d="M95 95 L95 7 A88 88 0 0 1 177.5 128.5 Z" fill="var(--leaf-soft)" />
            <path d="M95 95 L177.5 128.5 A88 88 0 0 1 12.5 128.5 Z" fill="var(--honey-soft)" />
            <path d="M95 95 L12.5 128.5 A88 88 0 0 1 95 7 Z" fill="var(--berry-soft)" />
            <circle cx="95" cy="95" r="88" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            <line x1="95" y1="95" x2="95" y2="7" stroke="var(--ink-6)" />
            <line x1="95" y1="95" x2="177.5" y2="128.5" stroke="var(--ink-6)" />
            <line x1="95" y1="95" x2="12.5" y2="128.5" stroke="var(--ink-6)" />
          </svg>
          {/* Group Labels */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-center">
            <div className="fk-mono text-[9px] text-leaf uppercase tracking-wider font-semibold">Verduras</div>
            <div className="font-serif text-[22px] text-leaf">
              {consumed.verdura}<span className="text-ink-5 text-xs">/{userBudget.verdura}</span>
            </div>
          </div>
          <div className="absolute bottom-7 right-2 text-right">
            <div className="fk-mono text-[9px] text-[#8a6411] uppercase tracking-wider font-semibold">Cereales</div>
            <div className="font-serif text-[22px] text-[#8a6411]">
              {consumed.carb}<span className="text-ink-5 text-xs">/{userBudget.carb}</span>
            </div>
          </div>
          <div className="absolute bottom-7 left-2.5">
            <div className="fk-mono text-[9px] text-berry uppercase tracking-wider font-semibold">Leg / Orig.</div>
            <div className="font-serif text-[22px] text-berry">
              {consumed.proteina + consumed.leguminosa}<span className="text-ink-5 text-xs">/{userBudget.proteina + userBudget.leguminosa}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="px-5 mt-6">
        <div className="fk-eyebrow mb-2.5">Lo que comiste</div>

        {meals.map((meal) => {
          const logs = mealLogs(meal.key)
          const tags = getGroupTags(logs)
          const foodNames = logs.map(l => l.food_name || FOOD_GROUP_LABELS[l.group_type]).slice(0, 3).join(' · ')

          return (
            <div key={meal.key} className="flex gap-3 py-3 border-b border-ink-7 last:border-0">
              <div className="w-11 text-right shrink-0">
                <div className="fk-mono text-[11px] text-ink-3">{meal.time}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <button
                    onClick={() => { setSelectedMeal(meal.key); setShowAddModal(true) }}
                    className="text-sm font-medium hover:text-signal transition-colors"
                  >
                    {meal.label}
                  </button>
                  <div className="flex gap-1">
                    {tags.map(g => (
                      <span
                        key={g}
                        className="px-1.5 py-0.5 rounded-full text-[9px] fk-mono font-medium uppercase"
                        style={{ background: FOOD_COLORS[g].bg, color: FOOD_COLORS[g].text }}
                      >
                        {g.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                {logs.length > 0 ? (
                  <div className="text-xs text-ink-4 truncate">{foodNames}</div>
                ) : (
                  <button
                    onClick={() => { setSelectedMeal(meal.key); setShowAddModal(true) }}
                    className="text-xs text-signal hover:underline"
                  >
                    + Agregar
                  </button>
                )}
                {/* Show individual items for editing */}
                {logs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between text-xs py-1 px-2 -mx-2 rounded hover:bg-paper-2 group">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: FOOD_COLORS[log.group_type].fill }} />
                          <span>{log.quantity > 1 && <span className="text-signal font-medium">{log.quantity}× </span>}{log.food_name || FOOD_GROUP_LABELS[log.group_type]}</span>
                        </div>
                        <button onClick={() => deleteFood(log.id)} className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-berry transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB for quick add */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-signal rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform md:hidden"
        style={{ boxShadow: '0 4px 16px rgba(255,90,31,0.35)' }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Food Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 animate-fade-in" onClick={closeModal} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-paper rounded-t-3xl border-t border-ink-7 shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="p-5">
              <div className="w-9 h-1 rounded-full bg-ink-6 mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="fk-eyebrow mb-0.5">Registrar</div>
                  <h2 className="font-serif text-3xl font-light tracking-tight">
                    ¿Qué <span className="italic">pasó</span>?
                  </h2>
                </div>
                <button onClick={closeModal} className="w-8 h-8 rounded-full bg-paper-3 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!selectedGroup ? (
                /* Step 1: Select Food Group */
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(userBudget) as FoodGroup[]).map((group) => {
                    const current = consumed[group]
                    const total = userBudget[group]
                    return (
                      <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        className="bg-white border border-ink-7 rounded-xl p-3 text-left hover:bg-paper-2 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg mb-2 flex items-center justify-center" style={{ background: FOOD_COLORS[group].bg }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: FOOD_COLORS[group].fill }} />
                        </div>
                        <div className="text-sm font-medium">{FOOD_GROUP_LABELS[group]}</div>
                        <div className="fk-mono text-[9px] text-ink-4 uppercase tracking-wider mt-0.5">
                          {current}/{total} equiv.
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : selectedFood ? (
                /* Step 3: Quantity */
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: FOOD_COLORS[selectedGroup].bg }}>
                      <div className="w-4 h-4 rounded-full" style={{ background: FOOD_COLORS[selectedGroup].fill }} />
                    </div>
                    <p className="font-medium">{selectedFood.name}</p>
                    <p className="text-sm text-ink-4">{selectedFood.portion}</p>
                  </div>
                  <div className="flex items-center justify-center gap-5">
                    <button
                      onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                      className="w-12 h-12 rounded-lg bg-paper-3 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="font-serif text-5xl font-light w-16 text-center tabular-nums">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 0.5)}
                      className="w-12 h-12 rounded-lg bg-signal text-white flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedFood(null)} className="flex-1 py-3 rounded-full border border-ink-7 text-sm font-medium hover:bg-paper-2 transition-colors">
                      Cambiar
                    </button>
                    <button onClick={addFood} className="flex-1 py-3 rounded-full bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors">
                      Agregar
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Search Foods */
                <div className="flex flex-col" style={{ maxHeight: 'calc(70vh - 200px)' }}>
                  <button onClick={() => setSelectedGroup(null)} className="text-xs text-signal mb-3 text-left hover:underline">
                    ← Cambiar grupo
                  </button>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
                    <input
                      type="text"
                      className="w-full bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm border border-ink-7 focus:border-ink focus:ring-1 focus:ring-ink/20"
                      placeholder="Buscar alimento..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => { setSelectedFood({ name: `1 ${FOOD_GROUP_LABELS[selectedGroup].toLowerCase()}`, portion: '1 equivalente' }); setQuantity(1) }}
                    className="mb-3 p-3 rounded-xl bg-signal-soft border border-signal/20 text-sm font-medium text-signal text-left hover:bg-signal/15"
                  >
                    <div className="w-2 h-2 rounded-full inline-block mr-2" style={{ background: FOOD_COLORS[selectedGroup].fill }} />
                    Agregar equivalente genérico
                  </button>
                  <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                    {searchingFoods ? (
                      <div className="flex items-center justify-center py-8">
                        <PulseLine w={60} h={18} color="var(--signal)" strokeWidth={1.5} active />
                      </div>
                    ) : filteredFoods.length > 0 ? (
                      filteredFoods.map((food, i) => (
                        <button
                          key={`${food.name}-${i}`}
                          onClick={() => { setSelectedFood(food); setQuantity(1) }}
                          className="w-full text-left p-3 rounded-lg bg-white border border-ink-7 hover:bg-paper-2 transition-colors"
                        >
                          <p className="text-sm font-medium">{food.name}</p>
                          <p className="text-xs text-ink-4">{food.portion}</p>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-ink-4 text-sm py-6">
                        {searchQuery ? 'No se encontró' : 'Escribe para buscar'}
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
