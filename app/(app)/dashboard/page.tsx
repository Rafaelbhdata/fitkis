'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, getToday } from '@/lib/utils'
import { DAILY_BUDGET, FOOD_GROUP_LABELS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import {
  Dumbbell,
  ChevronRight,
  Droplets,
  Scale,
  Flame,
  Target,
  TrendingDown,
  Apple,
  Zap,
  Calendar
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import type { FoodGroup, FoodLog, WeightLog, Habit, HabitLog, GymSession } from '@/types'

const FOOD_COLORS: Record<FoodGroup, string> = {
  verdura: '#22c55e',
  fruta: '#f97316',
  carb: '#eab308',
  leguminosa: '#a855f7',
  proteina: '#ef4444',
  grasa: '#3b82f6',
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function DashboardPage() {
  const today = new Date()
  const todayStr = getToday()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const { user } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [gymSessions, setGymSessions] = useState<GymSession[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [foodRes, weightRes, habitsRes, habitLogsRes, gymRes] = await Promise.all([
        supabase.from('food_logs').select('*').eq('date', todayStr),
        supabase.from('weight_logs').select('*').order('date', { ascending: false }).limit(14),
        supabase.from('habits').select('*').eq('active', true),
        supabase.from('habit_logs').select('*').eq('date', todayStr),
        supabase.from('gym_sessions').select('*').order('date', { ascending: false }).limit(7),
      ])
      if (foodRes.data) setFoodLogs(foodRes.data as FoodLog[])
      if (weightRes.data) setWeightLogs(weightRes.data as WeightLog[])
      if (habitsRes.data) setHabits(habitsRes.data as Habit[])
      if (habitLogsRes.data) setHabitLogs(habitLogsRes.data as HabitLog[])
      if (gymRes.data) setGymSessions(gymRes.data as GymSession[])
    } catch (err) {
      setError('Error al cargar datos')
    }
    setLoading(false)
  }

  // Calcular consumido por grupo
  const consumed: Record<FoodGroup, number> = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  // Calcular totales
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(DAILY_BUDGET).reduce((a, b) => a + b, 0)
  const nutritionPercentage = Math.round((totalConsumed / totalBudget) * 100)

  // Hábitos con estado
  const habitsWithState = habits.map(h => {
    const log = habitLogs.find(l => l.habit_id === h.id)
    return { ...h, completed: log?.completed || false, value: log?.value || 0 }
  })

  const completedHabits = habitsWithState.filter(h =>
    h.type === 'quantity' ? h.value >= (h.target_value || 0) : h.completed
  ).length

  // Weight data for chart
  const latestWeight = weightLogs[0]?.weight_kg
  const weightChange = weightLogs.length >= 2
    ? (weightLogs[0].weight_kg - weightLogs[weightLogs.length - 1].weight_kg).toFixed(1)
    : null

  const weightChartData = [...weightLogs].reverse().map(w => ({
    date: new Date(w.date).getDate(),
    weight: w.weight_kg
  }))

  // Week calendar data
  const getWeekDays = () => {
    const days = []
    const todayIndex = today.getDay()

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - todayIndex + i)
      const dateStr = date.toISOString().split('T')[0]
      const hasGym = gymSessions.some(s => s.date === dateStr)

      days.push({
        day: WEEKDAYS[i],
        date: date.getDate(),
        isToday: i === todayIndex,
        hasActivity: hasGym,
        isPast: i < todayIndex
      })
    }
    return days
  }

  const weekDays = getWeekDays()

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
    <div className="space-y-5 pb-4 animate-fade-in">
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          {error}
        </div>
      )}

      {/* Week Calendar Strip */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Esta semana</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {gymSessions.filter(s => {
              const d = new Date(s.date)
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() - today.getDay())
              return d >= weekStart
            }).length} entrenamientos
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                day.isToday
                  ? 'bg-accent text-background'
                  : day.isPast && day.hasActivity
                    ? 'bg-accent/10'
                    : ''
              }`}
            >
              <span className={`text-[10px] font-medium ${day.isToday ? 'text-background/70' : 'text-muted-foreground'}`}>
                {day.day}
              </span>
              <span className={`text-sm font-semibold ${day.isToday ? '' : ''}`}>
                {day.date}
              </span>
              {day.hasActivity && !day.isToday && (
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Today's Workout - Hero Card */}
      <Link href="/gym" className="block group">
        <div className={`relative overflow-hidden rounded-2xl p-5 ${
          routineType
            ? 'bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/20'
            : 'bg-surface-elevated border border-border'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              routineType
                ? 'bg-accent text-background'
                : 'bg-surface text-muted'
            }`}>
              <Dumbbell className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Hoy toca
              </p>
              {routineType ? (
                <p className="font-display text-display-md text-foreground">
                  {getRoutineName(routineType)}
                </p>
              ) : (
                <p className="font-display text-display-md text-muted">
                  Día de descanso
                </p>
              )}
            </div>
            {routineType && (
              <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </div>
          {routineType && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          )}
        </div>
      </Link>

      {/* Stats Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight Card with Chart */}
        <Link href="/weight" className="card-interactive !p-4 col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Scale className="w-4 h-4 text-purple-400" />
            </div>
            {weightChange && parseFloat(weightChange) < 0 && (
              <div className="flex items-center gap-1 text-xs text-success">
                <TrendingDown className="w-3 h-3" />
                <span>{weightChange} kg</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Peso actual</p>
          <p className="font-display text-display-md">
            {latestWeight ? `${latestWeight} kg` : '--'}
          </p>
          {weightChartData.length > 1 && (
            <div className="h-12 mt-2 -mx-2 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#weightGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Link>

        {/* Habits Card */}
        <Link href="/habits" className="card-interactive !p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-xs text-muted-foreground">{habits.length} total</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Hábitos</p>
          <p className="font-display text-display-md">
            {completedHabits}/{habits.length}
          </p>
          {/* Mini habit dots */}
          <div className="flex gap-1.5 mt-3">
            {habitsWithState.slice(0, 5).map((h, i) => {
              const isComplete = h.type === 'quantity' ? h.value >= (h.target_value || 0) : h.completed
              return (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${isComplete ? 'bg-accent' : 'bg-border'}`}
                />
              )
            })}
          </div>
        </Link>

        {/* Nutrition Card - Full Width */}
        <Link href="/food" className="card-interactive !p-4 col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Apple className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">Nutrición del día</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-display-lg">{totalConsumed}</span>
                <span className="text-muted-foreground">/ {totalBudget} equiv.</span>
              </div>
            </div>
            {/* Circular progress */}
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="15"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-surface-elevated"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round"
                  className="text-accent transition-all duration-500"
                  strokeDasharray={`${Math.min(nutritionPercentage, 100) * 0.94} 94`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-semibold">
                {nutritionPercentage}%
              </span>
            </div>
          </div>

          {/* Food group bars */}
          <div className="space-y-2">
            {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => {
              const percentage = Math.min((consumed[group] / DAILY_BUDGET[group]) * 100, 100)
              return (
                <div key={group} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-12 truncate">
                    {FOOD_GROUP_LABELS[group].slice(0, 6)}
                  </span>
                  <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: FOOD_COLORS[group]
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {consumed[group]}/{DAILY_BUDGET[group]}
                  </span>
                </div>
              )
            })}
          </div>
        </Link>
      </div>

      {/* Quick Habits */}
      {habits.length > 0 && (
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Hábitos de hoy</span>
            </div>
            <Link href="/habits" className="text-xs text-accent hover:underline">
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {habitsWithState.map((habit) => {
              const isComplete = habit.type === 'quantity'
                ? habit.value >= (habit.target_value || 0)
                : habit.completed

              return (
                <div key={habit.id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isComplete
                      ? 'bg-accent text-background'
                      : 'bg-surface-elevated text-muted'
                  }`}>
                    {habit.name.toLowerCase().includes('agua') && <Droplets className="w-5 h-5" />}
                    {habit.name.toLowerCase().includes('creatina') && <Flame className="w-5 h-5" />}
                    {!habit.name.toLowerCase().includes('agua') &&
                     !habit.name.toLowerCase().includes('creatina') && (
                      <Target className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{habit.name}</p>
                    {habit.type === 'quantity' && (
                      <p className="text-xs text-muted-foreground">
                        {habit.value} / {habit.target_value} {habit.unit}
                      </p>
                    )}
                  </div>
                  {habit.type === 'daily_check' && (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isComplete
                        ? 'bg-accent border-accent'
                        : 'border-border'
                    }`}>
                      {isComplete && (
                        <svg className="w-3.5 h-3.5 text-background" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                  {habit.type === 'quantity' && (
                    <div className="w-16">
                      <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${Math.min((habit.value / (habit.target_value || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
