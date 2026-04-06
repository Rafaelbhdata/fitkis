'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, FOOD_GROUP_LABELS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { Dumbbell, ChevronRight, LogOut, Droplets, Scale, Flame, Moon } from 'lucide-react'
import type { FoodGroup, FoodLog, WeightLog, Habit, HabitLog } from '@/types'

const FOOD_COLORS: Record<FoodGroup, string> = {
  verdura: '#22c55e',
  fruta: '#f97316',
  carb: '#eab308',
  leguminosa: '#a855f7',
  proteina: '#ef4444',
  grasa: '#3b82f6',
}

export default function DashboardPage() {
  const router = useRouter()
  const today = new Date()
  const todayStr = getToday()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const { user } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [foodRes, weightRes, habitsRes, habitLogsRes] = await Promise.all([
        supabase.from('food_logs').select('*').eq('date', todayStr),
        supabase.from('weight_logs').select('*').order('date', { ascending: false }).limit(1),
        supabase.from('habits').select('*').eq('active', true),
        supabase.from('habit_logs').select('*').eq('date', todayStr),
      ])
      if (foodRes.data) setFoodLogs(foodRes.data as FoodLog[])
      if (weightRes.data?.[0]) setLatestWeight((weightRes.data[0] as WeightLog).weight_kg)
      if (habitsRes.data) setHabits(habitsRes.data as Habit[])
      if (habitLogsRes.data) setHabitLogs(habitLogsRes.data as HabitLog[])
    } catch (err) {
      setError('Error al cargar datos')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Calcular consumido por grupo
  const consumed: Record<FoodGroup, number> = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  // Calcular totales
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(DAILY_BUDGET).reduce((a, b) => a + b, 0)

  // Hábitos con estado
  const habitsWithState = habits.map(h => {
    const log = habitLogs.find(l => l.habit_id === h.id)
    return { ...h, completed: log?.completed || false, value: log?.value || 0 }
  })

  const completedHabits = habitsWithState.filter(h =>
    h.type === 'quantity' ? h.value >= (h.target_value || 0) : h.completed
  ).length

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
    <div className="space-y-6 pb-4 animate-fade-in">
      {/* Header */}
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm text-muted-foreground mb-1 capitalize">{formatDate(today)}</p>
          <h1 className="font-display text-display-md text-foreground">
            Hola de nuevo
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="btn-icon"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          {error}
        </div>
      )}

      {/* Today's Workout - Hero Card */}
      <Link href="/gym" className="block group">
        <div className={`card-interactive ${routineType ? 'card-highlight' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                routineType
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface-elevated text-muted'
              }`}>
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <p className="section-label !mb-0">Hoy toca</p>
                {routineType ? (
                  <p className="font-display text-display-sm text-foreground">
                    {getRoutineName(routineType)}
                  </p>
                ) : (
                  <p className="font-display text-display-sm text-muted">
                    Día de descanso
                  </p>
                )}
              </div>
            </div>
            {routineType && (
              <ChevronRight className="w-5 h-5 text-muted transition-transform group-hover:translate-x-1" />
            )}
          </div>
        </div>
      </Link>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Weight */}
        <Link href="/weight" className="card-interactive text-center py-4">
          <Scale className="w-5 h-5 mx-auto text-muted mb-2" />
          {latestWeight ? (
            <p className="font-display text-lg font-semibold">{latestWeight}</p>
          ) : (
            <p className="font-display text-lg font-semibold text-muted">--</p>
          )}
          <p className="text-xs text-muted mt-0.5">kg</p>
        </Link>

        {/* Nutrition Progress */}
        <Link href="/food" className="card-interactive text-center py-4">
          <Flame className="w-5 h-5 mx-auto text-muted mb-2" />
          <p className="font-display text-lg font-semibold">{totalConsumed}/{totalBudget}</p>
          <p className="text-xs text-muted mt-0.5">equiv.</p>
        </Link>

        {/* Habits */}
        <Link href="/habits" className="card-interactive text-center py-4">
          <Moon className="w-5 h-5 mx-auto text-muted mb-2" />
          <p className="font-display text-lg font-semibold">{completedHabits}/{habits.length}</p>
          <p className="text-xs text-muted mt-0.5">hábitos</p>
        </Link>
      </div>

      {/* Food Progress Detail */}
      <Link href="/food" className="block">
        <div className="card-interactive">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label !mb-0">Nutrición del día</p>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>

          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => {
              const percentage = Math.min((consumed[group] / DAILY_BUDGET[group]) * 100, 100)
              const isComplete = consumed[group] >= DAILY_BUDGET[group]

              return (
                <div key={group} className="text-center">
                  {/* Circular progress indicator */}
                  <div className="relative w-10 h-10 mx-auto mb-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-surface-elevated"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={FOOD_COLORS[group]}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${percentage * 0.88} 88`}
                        className="transition-all duration-500"
                        style={{ opacity: isComplete ? 1 : 0.7 }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {consumed[group]}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted leading-tight">
                    {FOOD_GROUP_LABELS[group].slice(0, 4)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </Link>

      {/* Habits List */}
      {habits.length > 0 && (
        <Link href="/habits" className="block">
          <div className="card-interactive">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label !mb-0">Hábitos de hoy</p>
              <ChevronRight className="w-4 h-4 text-muted" />
            </div>

            <div className="space-y-3">
              {habitsWithState.slice(0, 3).map((habit) => {
                const isComplete = habit.type === 'quantity'
                  ? habit.value >= (habit.target_value || 0)
                  : habit.completed

                return (
                  <div key={habit.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isComplete
                          ? 'bg-accent/10 text-accent'
                          : 'bg-surface-elevated text-muted'
                      }`}>
                        {habit.name.toLowerCase().includes('agua') && <Droplets className="w-4 h-4" />}
                        {habit.name.toLowerCase().includes('creatina') && <Flame className="w-4 h-4" />}
                        {habit.name.toLowerCase().includes('lectura') && <Moon className="w-4 h-4" />}
                        {!habit.name.toLowerCase().includes('agua') &&
                         !habit.name.toLowerCase().includes('creatina') &&
                         !habit.name.toLowerCase().includes('lectura') && (
                          <span className="text-xs font-medium">{habit.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-sm">{habit.name}</span>
                    </div>

                    {habit.type === 'quantity' ? (
                      <span className={`text-sm font-medium ${isComplete ? 'text-accent' : 'text-muted'}`}>
                        {habit.value}/{habit.target_value} {habit.unit}
                      </span>
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isComplete
                          ? 'bg-accent border-accent'
                          : 'border-border'
                      }`}>
                        {isComplete && (
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
        </Link>
      )}
    </div>
  )
}
