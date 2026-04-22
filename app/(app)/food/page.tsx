'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Star, Search, X, Trash2, Minus, Mic, Droplet } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, MEAL_BUDGETS, FOOD_GROUP_LABELS, DEFAULT_DAILY_BUDGET } from '@/lib/constants'
import type { DailyBudget, FoodEquivalent } from '@/types'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { PulseLine } from '@/components/ui/PulseLine'
import type { MealType, FoodGroup, FoodLog, FavoriteMeal, CustomFood } from '@/types'

// v5 Paper & Pulse food colors
const FOOD_COLORS: Record<FoodGroup, { bg: string; text: string; fill: string; label: string }> = {
  verdura: { bg: 'var(--leaf-soft)', text: 'var(--leaf)', fill: '#4a7c3a', label: 'Verduras' },
  fruta: { bg: 'var(--signal-soft)', text: 'var(--signal)', fill: '#ff5a1f', label: 'Frutas' },
  carb: { bg: 'var(--honey-soft)', text: '#8a6411', fill: '#d4a017', label: 'Cereales' },
  leguminosa: { bg: 'var(--sky-soft)', text: 'var(--sky)', fill: '#3a6b8c', label: 'Leguminosas' },
  proteina: { bg: 'var(--berry-soft)', text: 'var(--berry)', fill: '#c13b5a', label: 'Origen Animal' },
  grasa: { bg: 'var(--paper-3)', text: 'var(--ink-3)', fill: '#737373', label: 'Grasas' },
}

const meals: { key: MealType; label: string; time: string }[] = [
  { key: 'desayuno', label: 'Desayuno', time: '07:20' },
  { key: 'snack', label: 'Snack', time: '11:00' },
  { key: 'comida', label: 'Comida', time: '13:45' },
  { key: 'cena', label: 'Cena', time: '19:30' },
]

// Donut Chart Component
const DonutChart = ({
  consumed,
  budget
}: {
  consumed: Record<FoodGroup, number>
  budget: DailyBudget
}) => {
  const groups: FoodGroup[] = ['verdura', 'fruta', 'carb', 'proteina', 'leguminosa']
  const totalBudget = Object.values(budget).reduce((a, b) => a + b, 0)
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const percentage = Math.round((totalConsumed / totalBudget) * 100)

  // Calculate arc segments
  const radius = 85
  const strokeWidth = 18
  const circumference = 2 * Math.PI * radius
  let currentAngle = -90 // Start at top

  const segments = groups.map((group) => {
    const groupTotal = budget[group]
    const groupConsumed = consumed[group]
    const budgetRatio = groupTotal / totalBudget
    const arcLength = budgetRatio * circumference
    const consumedRatio = Math.min(groupConsumed / groupTotal, 1)
    const filledLength = arcLength * consumedRatio

    const startAngle = currentAngle
    currentAngle += (budgetRatio * 360)

    return {
      group,
      startAngle,
      arcLength,
      filledLength,
      consumed: groupConsumed,
      total: groupTotal,
      color: FOOD_COLORS[group].fill,
    }
  })

  return (
    <div className="relative w-[220px] h-[220px]">
      <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
        {/* Background arcs */}
        {segments.map((seg, i) => {
          const dashArray = `${seg.arcLength} ${circumference - seg.arcLength}`
          const dashOffset = -segments.slice(0, i).reduce((acc, s) => acc + s.arcLength, 0)
          return (
            <circle
              key={`bg-${seg.group}`}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="#e5e5e5"
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
            />
          )
        })}
        {/* Filled arcs */}
        {segments.map((seg, i) => {
          const dashArray = `${seg.filledLength} ${circumference - seg.filledLength}`
          const dashOffset = -segments.slice(0, i).reduce((acc, s) => acc + s.arcLength, 0)
          return (
            <circle
              key={`fill-${seg.group}`}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      {/* Center percentage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest">Completo</div>
          <div className="font-serif text-[42px] font-light text-signal leading-none">{percentage}<span className="text-xl">%</span></div>
        </div>
      </div>
      {/* Group labels around the chart */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-center">
        <div className="fk-mono text-[9px] text-ink-4 uppercase">Leguminosas</div>
        <div className="font-serif text-sm"><span className="text-signal">{consumed.leguminosa}</span><span className="text-ink-5">/{budget.leguminosa}</span></div>
      </div>
      <div className="absolute top-4 -right-4 text-right">
        <div className="fk-mono text-[9px] text-leaf uppercase">Verduras</div>
        <div className="font-serif text-sm"><span className="text-signal">{consumed.verdura}</span><span className="text-ink-5">/{budget.verdura}</span></div>
      </div>
      <div className="absolute top-1/2 -right-6 -translate-y-1/2 text-right">
        <div className="fk-mono text-[9px] text-[#ff5a1f] uppercase">Frutas</div>
        <div className="font-serif text-sm"><span className="text-signal">{consumed.fruta}</span><span className="text-ink-5">/{budget.fruta}</span></div>
      </div>
      <div className="absolute bottom-4 -right-2 text-right">
        <div className="fk-mono text-[9px] text-[#8a6411] uppercase">Cereales</div>
        <div className="font-serif text-sm"><span className="text-signal">{consumed.carb}</span><span className="text-ink-5">/{budget.carb}</span></div>
      </div>
      <div className="absolute top-1/2 -left-8 -translate-y-1/2">
        <div className="fk-mono text-[9px] text-berry uppercase">Origen Animal</div>
        <div className="font-serif text-sm"><span className="text-signal">{consumed.proteina}</span><span className="text-ink-5">/{budget.proteina}</span></div>
      </div>
    </div>
  )
}

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
  const [waterGlasses, setWaterGlasses] = useState(0)

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
  const missingVerduras = Math.max(0, userBudget.verdura - consumed.verdura)

  // Get motivational message
  const getMessage = () => {
    if (missingVerduras > 0) return { prefix: 'Vas por ', highlight: 'buen camino', suffix: `, te faltan `, highlight2: `${missingVerduras} verduras`, end: '.' }
    if (totalConsumed >= totalBudget) return { prefix: '', highlight: 'Excelente', suffix: ', ', highlight2: 'completaste tu plato', end: ' de hoy.' }
    return { prefix: 'Vas por ', highlight: 'buen camino', suffix: '.', highlight2: '', end: '' }
  }
  const msg = getMessage()

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

  // Current meal based on time
  const getCurrentMeal = (): MealType => {
    const hour = new Date().getHours()
    if (hour < 10) return 'desayuno'
    if (hour < 13) return 'snack'
    if (hour < 17) return 'comida'
    return 'cena'
  }
  const currentMeal = getCurrentMeal()

  const registeredMeals = meals.filter(m => mealLogs(m.key).length > 0).length

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
      <div className="px-5 pt-3 pb-4 flex items-start justify-between">
        <div>
          <div className="fk-eyebrow mb-1">Plato del Bien Comer · SMAE</div>
          <h1 className="font-serif text-[28px] font-light tracking-tight">
            {capitalizedDate.split(' ')[0]} <span className="italic text-signal">{capitalizedDate.split(' ').slice(1).join(' ')}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToPrevDay} className="px-3 py-1.5 rounded-lg border border-ink-7 text-xs fk-mono hover:bg-paper-2 flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" />
            {new Date(selectedDate.getTime() - 86400000).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }).toUpperCase()}
          </button>
          <button
            onClick={goToToday}
            className={`px-3 py-1.5 rounded-lg text-xs fk-mono font-medium ${isToday ? 'bg-ink text-paper' : 'border border-ink-7 hover:bg-paper-2'}`}
          >
            HOY
          </button>
          <button onClick={goToNextDay} className="px-3 py-1.5 rounded-lg border border-ink-7 text-xs fk-mono hover:bg-paper-2 flex items-center gap-1">
            {new Date(selectedDate.getTime() + 86400000).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }).toUpperCase()}
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 rounded-full bg-signal text-white text-xs font-medium flex items-center gap-1.5 hover:bg-signal/90"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar comida
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="px-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Hero + Timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Hero Card */}
          <div className="bg-cream rounded-[20px] p-6 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side - Message */}
              <div className="flex-1">
                <div className="fk-eyebrow mb-2">Tu Plato · Resumen</div>
                <h2 className="font-serif text-[32px] font-light tracking-tight leading-tight mb-3">
                  {msg.prefix}<span className="italic text-signal">{msg.highlight}</span>{msg.suffix}
                  {msg.highlight2 && <span className="italic text-signal">{msg.highlight2}</span>}{msg.end}
                </h2>
                <p className="text-sm text-ink-4 mb-5 max-w-sm">
                  {missingVerduras > 0
                    ? `Come una ensalada en la comida y una taza de brócoli en la cena — terminas el día.`
                    : `Has completado tus equivalentes del día. ¡Buen trabajo!`
                  }
                </p>

                {/* Equivalents Bar */}
                <div className="bg-white rounded-xl p-4 border border-ink-7">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest">Equivalentes</div>
                    <div className="font-serif text-2xl text-signal">{totalConsumed}<span className="text-ink-4 text-sm"> / {totalBudget}</span></div>
                  </div>
                  {/* Segmented bar */}
                  <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-ink-7 mb-2">
                    {(['verdura', 'fruta', 'carb', 'proteina', 'leguminosa'] as FoodGroup[]).map(group => {
                      const ratio = userBudget[group] / totalBudget
                      const fillRatio = Math.min(consumed[group] / userBudget[group], 1)
                      return (
                        <div key={group} className="relative" style={{ width: `${ratio * 100}%` }}>
                          <div
                            className="absolute inset-y-0 left-0 transition-all"
                            style={{ width: `${fillRatio * 100}%`, background: FOOD_COLORS[group].fill }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {/* Labels */}
                  <div className="flex gap-3 text-[9px] fk-mono uppercase tracking-wider text-ink-4">
                    {(['verdura', 'fruta', 'carb', 'proteina', 'leguminosa'] as FoodGroup[]).map(group => (
                      <div key={group} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: FOOD_COLORS[group].fill }} />
                        <span>{FOOD_COLORS[group].label.split(' ')[0]}</span>
                        <span className="text-ink-5">{consumed[group]}/{userBudget[group]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side - Donut Chart */}
              <div className="flex justify-center lg:justify-end">
                <DonutChart consumed={consumed} budget={userBudget} />
              </div>
            </div>
          </div>

          {/* Meals Timeline */}
          <div className="bg-white rounded-[20px] border border-ink-7 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="fk-eyebrow mb-0.5">Lo que comiste</div>
                <div className="text-sm text-ink-4">{meals.length} momentos · {registeredMeals} registrados</div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-7 text-xs fk-mono hover:bg-paper-2">
                <Mic className="w-3.5 h-3.5" />
                Dictar
              </button>
            </div>

            <div className="space-y-0">
              {meals.map((meal, idx) => {
                const logs = mealLogs(meal.key)
                const tags = getGroupTags(logs)
                const foodNames = logs.map(l => l.food_name || FOOD_GROUP_LABELS[l.group_type]).slice(0, 3).join(' · ')
                const isCurrent = meal.key === currentMeal && isToday
                const isRegistered = logs.length > 0

                return (
                  <div key={meal.key} className="flex gap-4 py-4 border-b border-ink-7 last:border-0">
                    {/* Timeline dot and line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-signal' : isRegistered ? 'bg-leaf' : 'bg-ink-6'}`} />
                      {idx < meals.length - 1 && <div className="w-px flex-1 bg-ink-7 mt-1" />}
                    </div>

                    {/* Time */}
                    <div className="w-12 shrink-0">
                      <div className="fk-mono text-sm text-ink-3">{meal.time}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{meal.label}</span>
                        {isRegistered && (
                          <span className="px-2 py-0.5 rounded-full bg-leaf-soft text-leaf text-[10px] fk-mono font-medium flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-leaf" />
                            REGISTRADO
                          </span>
                        )}
                        {isCurrent && !isRegistered && (
                          <span className="px-2 py-0.5 rounded-full bg-signal-soft text-signal text-[10px] fk-mono font-medium">
                            AHORA
                          </span>
                        )}
                      </div>

                      {logs.length > 0 ? (
                        <>
                          <div className="text-sm text-ink-4 mb-2">{foodNames}</div>
                          <div className="flex gap-1">
                            {tags.map(g => (
                              <span
                                key={g}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] fk-mono font-bold text-white"
                                style={{ background: FOOD_COLORS[g].fill }}
                              >
                                {g.charAt(0).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => { setSelectedMeal(meal.key); setShowAddModal(true) }}
                          className="text-sm text-signal hover:underline"
                        >
                          + Agregar
                        </button>
                      )}
                    </div>

                    {/* Action button */}
                    {isCurrent && !isRegistered && (
                      <button
                        onClick={() => { setSelectedMeal(meal.key); setShowAddModal(true) }}
                        className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-medium flex items-center gap-1 self-start"
                      >
                        <Plus className="w-3 h-3" />
                        Agregar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Coach Suggestion Card */}
          <div className="bg-ink rounded-[16px] p-5 text-paper">
            <div className="fk-eyebrow text-ink-5 mb-2 flex items-center gap-2">
              <PulseLine w={16} h={8} color="var(--signal)" strokeWidth={1.5} />
              Coach · Sugerencia
            </div>
            <p className="font-serif text-[17px] leading-snug mb-4">
              Para tu comida: <span className="italic text-signal">ensalada grande</span> con pollo ya cuenta{' '}
              <span className="italic text-signal">2 verduras + 1 origen animal</span>.
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-signal text-white text-xs font-medium hover:bg-signal/90">
                Agregar al plato
              </button>
              <button className="px-4 py-2 rounded-lg border border-ink-5 text-paper text-xs font-medium hover:bg-ink-2">
                Otra idea
              </button>
            </div>
          </div>

          {/* Water Card */}
          <div className="bg-white rounded-[16px] border border-ink-7 p-4">
            <div className="fk-eyebrow text-ink-4 mb-2">Agua · Hoy</div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="font-serif text-[36px] font-light text-signal">{waterGlasses}</span>
              <span className="text-ink-4 text-sm">/ 8 vasos</span>
            </div>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-8 rounded ${i < waterGlasses ? 'bg-sky' : 'bg-ink-7'}`}
                />
              ))}
            </div>
            <button
              onClick={() => setWaterGlasses(w => Math.min(w + 1, 8))}
              className="w-full py-2 rounded-lg border border-ink-7 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-paper-2"
            >
              <Plus className="w-3 h-3" />
              +1 vaso
            </button>
          </div>

          {/* Favorites Quick Access */}
          <div className="bg-white rounded-[16px] border border-ink-7 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="fk-eyebrow text-ink-4">Favoritos</div>
              <Link href="/food/favorites" className="text-xs text-signal hover:underline">Ver todos</Link>
            </div>
            {favorites.slice(0, 3).map(fav => (
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
                className="w-full text-left p-2 -mx-1 rounded-lg hover:bg-paper-2 transition-colors"
              >
                <div className="text-sm font-medium">{fav.name}</div>
                <div className="text-xs text-ink-4">{fav.meal}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

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
                    <span className="font-serif text-5xl font-light w-16 text-center tabular-nums text-signal">{quantity}</span>
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
