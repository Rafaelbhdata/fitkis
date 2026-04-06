'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, getToday } from '@/lib/utils'
import { DAILY_BUDGET, FOOD_GROUP_LABELS, ROUTINES } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import {
  Dumbbell,
  ChevronRight,
  Droplets,
  Scale,
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
  Calendar,
  Zap,
  ArrowRight
} from 'lucide-react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
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

// Week starts on Monday (index 0 = Monday, index 6 = Sunday)
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Convert JS day (0=Sun) to UI index (0=Mon): (jsDay + 6) % 7
const jsDayToUiIndex = (jsDay: number) => (jsDay + 6) % 7

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

  // Deduplicate habits by name and merge with state
  const seenNames = new Set<string>()
  const uniqueHabits = habits.filter(h => {
    if (seenNames.has(h.name)) return false
    seenNames.add(h.name)
    return true
  })

  const habitsWithState = uniqueHabits.map(h => {
    const log = habitLogs.find(l => l.habit_id === h.id)
    return { ...h, completed: log?.completed || false, value: log?.value || 0 }
  })

  const completedHabits = habitsWithState.filter(h =>
    h.type === 'quantity' ? h.value >= (h.target_value || 0) : h.completed
  ).length

  // Weight data
  const latestWeight = weightLogs[0]?.weight_kg
  const previousWeight = weightLogs[1]?.weight_kg
  const weightDiff = latestWeight && previousWeight ? (latestWeight - previousWeight) : null

  const weightChartData = [...weightLogs].reverse().slice(-7).map(w => ({
    date: new Date(w.date).getDate(),
    weight: w.weight_kg
  }))

  // Week calendar data (Monday-first)
  const getWeekDays = () => {
    const days = []
    const jsDay = today.getDay() // 0=Sun, 1=Mon, ...
    const todayUiIndex = jsDayToUiIndex(jsDay) // 0=Mon, 1=Tue, ..., 6=Sun

    // Calculate Monday of current week
    const daysFromMonday = (jsDay + 6) % 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysFromMonday)

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const hasGym = gymSessions.some(s => s.date === dateStr)

      days.push({
        day: WEEKDAYS[i],
        date: date.getDate(),
        isToday: i === todayUiIndex,
        hasActivity: hasGym,
        isPast: i < todayUiIndex
      })
    }
    return days
  }

  const weekDays = getWeekDays()
  const weekWorkouts = gymSessions.filter(s => {
    const weekStart = new Date(today)
    const daysFromMonday = (today.getDay() + 6) % 7
    weekStart.setDate(today.getDate() - daysFromMonday)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    return s.date >= weekStartStr
  }).length

  // Greeting
  const getGreeting = () => {
    const hour = today.getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

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
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{getGreeting()}</p>
          <h1 className="font-display text-display-md">
            {today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
          </h1>
        </div>
        {routineType && (
          <Link href="/gym" className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors">
            Ir al gym
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Week Calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Semana</span>
          </div>
          <span className="text-xs text-muted-foreground">{weekWorkouts} entrenamientos</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`flex flex-col items-center py-2 rounded-lg transition-colors ${
                day.isToday
                  ? 'bg-accent text-background'
                  : day.isPast && day.hasActivity
                    ? 'bg-accent/10'
                    : 'bg-surface-elevated'
              }`}
            >
              <span className={`text-[10px] font-medium ${day.isToday ? 'text-background/70' : 'text-muted-foreground'}`}>
                {day.day}
              </span>
              <span className="text-sm font-semibold">{day.date}</span>
              {day.hasActivity && !day.isToday && (
                <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Today's Workout */}
        <Link href="/gym" className="card-interactive col-span-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label flex items-center gap-2">
                <Dumbbell className={`w-4 h-4 ${routineType ? 'text-blue-400' : 'text-muted'}`} />
                Hoy toca
              </p>
              <p className="font-display text-display-xs">
                {routineType ? getRoutineName(routineType) : 'Descanso'}
              </p>
              {routineType && ROUTINES[routineType] && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ROUTINES[routineType].exercises.slice(0, 3).map(e => e.name).join(', ')}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>

        {/* Weight */}
        <Link href="/weight" className="card-interactive">
          <div className="flex items-center justify-between mb-2">
            <Scale className="w-4 h-4 text-purple-400" />
            {weightDiff !== null && (
              <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
                weightDiff <= 0 ? 'text-success' : 'text-danger'
              }`}>
                {weightDiff <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {weightDiff > 0 ? '+' : ''}{weightDiff?.toFixed(1)}
              </div>
            )}
          </div>
          <p className="stat-label">Peso</p>
          <p className="font-display text-display-sm">{latestWeight ? `${latestWeight} kg` : '--'}</p>
          {weightChartData.length > 1 && (
            <div className="h-8 mt-2 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={1.5} fill="url(#wGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Link>

        {/* Habits */}
        <Link href="/habits" className="card-interactive">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] text-muted-foreground">{uniqueHabits.length} total</span>
          </div>
          <p className="stat-label">Hábitos</p>
          <p className="font-display text-display-sm">{completedHabits}/{uniqueHabits.length}</p>
          <div className="flex gap-1 mt-2">
            {habitsWithState.slice(0, 5).map((h, i) => {
              const isComplete = h.type === 'quantity' ? h.value >= (h.target_value || 0) : h.completed
              return (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${isComplete ? 'bg-accent' : 'bg-surface-elevated'}`}
                />
              )
            })}
          </div>
        </Link>
      </div>

      {/* Nutrition Card */}
      <Link href="/food" className="card-interactive">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="stat-label flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              Nutrición hoy
            </p>
            <p className="font-display text-display-xs">{totalConsumed} / {totalBudget} equiv.</p>
          </div>
          <div className="text-right">
            <p className="font-display text-display-sm text-accent">{nutritionPercentage}%</p>
            <p className="text-[10px] text-muted-foreground">completado</p>
          </div>
        </div>

        {/* Food group bars */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => {
            const percentage = Math.min((consumed[group] / DAILY_BUDGET[group]) * 100, 100)
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{FOOD_GROUP_LABELS[group].slice(0, 4)}</span>
                  <span className="text-[10px] font-medium">{consumed[group]}/{DAILY_BUDGET[group]}</span>
                </div>
                <div className="progress-track-sm">
                  <div
                    className="progress-fill"
                    style={{ width: `${percentage}%`, backgroundColor: FOOD_COLORS[group] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Link>

      {/* Quick Habits */}
      {uniqueHabits.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Hábitos de hoy</p>
            <Link href="/habits" className="text-xs text-accent">Ver todos</Link>
          </div>

          <div className="space-y-2">
            {habitsWithState.map((habit) => {
              const isComplete = habit.type === 'quantity'
                ? habit.value >= (habit.target_value || 0)
                : habit.completed

              return (
                <div key={habit.id} className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isComplete ? 'bg-accent text-background' : 'bg-surface-elevated text-muted-foreground'
                  }`}>
                    {habit.name.toLowerCase().includes('agua') && <Droplets className="w-4 h-4" />}
                    {habit.name.toLowerCase().includes('creatina') && <Flame className="w-4 h-4" />}
                    {!habit.name.toLowerCase().includes('agua') &&
                     !habit.name.toLowerCase().includes('creatina') && (
                      <Target className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{habit.name}</p>
                    {habit.type === 'quantity' && (
                      <p className="text-[10px] text-muted-foreground">
                        {habit.value} / {habit.target_value} {habit.unit}
                      </p>
                    )}
                  </div>
                  {habit.type === 'daily_check' && (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isComplete ? 'bg-accent border-accent' : 'border-border'
                    }`}>
                      {isComplete && (
                        <svg className="w-3 h-3 text-background" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                  {habit.type === 'quantity' && (
                    <div className="w-12">
                      <div className="progress-track-sm">
                        <div
                          className="progress-fill bg-accent"
                          style={{ width: `${Math.min((habit.value / (habit.target_value || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {habit.type === 'weekly_frequency' && (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      habit.completed ? 'bg-accent border-accent' : 'border-border'
                    }`}>
                      {habit.completed && (
                        <svg className="w-3 h-3 text-background" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
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
