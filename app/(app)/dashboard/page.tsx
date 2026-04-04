'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, formatDate, getToday } from '@/lib/utils'
import { DAILY_BUDGET, FOOD_GROUP_COLORS, FOOD_GROUP_LABELS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { Loader2, Dumbbell, ChevronRight } from 'lucide-react'
import type { FoodGroup, FoodLog, WeightLog, Habit, HabitLog } from '@/types'

export default function DashboardPage() {
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

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    const [foodRes, weightRes, habitsRes, habitLogsRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('date', todayStr),
      supabase.from('weight_logs').select('*').order('date', { ascending: false }).limit(1),
      supabase.from('habits').select('*').eq('active', true),
      supabase.from('habit_logs').select('*').eq('date', todayStr),
    ])
    if (foodRes.data) setFoodLogs(foodRes.data)
    if (weightRes.data?.[0]) setLatestWeight(weightRes.data[0].weight_kg)
    if (habitsRes.data) setHabits(habitsRes.data)
    if (habitLogsRes.data) setHabitLogs(habitLogsRes.data)
    setLoading(false)
  }

  // Calcular consumido por grupo
  const consumed: Record<FoodGroup, number> = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  // Hábitos con estado
  const habitsWithState = habits.map(h => {
    const log = habitLogs.find(l => l.habit_id === h.id)
    return { ...h, completed: log?.completed || false, value: log?.value || 0 }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-accent">FitLife</h1>
        <p className="text-muted capitalize">{formatDate(today)}</p>
      </header>

      <Link href="/gym" className="card flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted mb-1">Hoy toca</h2>
          {routineType ? (
            <p className="font-display text-xl font-semibold">{getRoutineName(routineType)}</p>
          ) : (
            <p className="font-display text-xl font-semibold text-muted">Día de descanso</p>
          )}
        </div>
        {routineType && (
          <div className="flex items-center gap-2 text-accent">
            <Dumbbell className="w-5 h-5" />
            <ChevronRight className="w-5 h-5" />
          </div>
        )}
      </Link>

      <Link href="/food" className="card block">
        <h2 className="text-sm font-medium text-muted mb-3">Equivalentes del día</h2>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(DAILY_BUDGET) as FoodGroup[]).map((group) => (
            <div key={group} className="text-center">
              <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min((consumed[group] / DAILY_BUDGET[group]) * 100, 100)}%`,
                    backgroundColor: FOOD_GROUP_COLORS[group],
                  }}
                />
              </div>
              <p className="text-xs text-muted">{FOOD_GROUP_LABELS[group]}</p>
              <p className="text-sm font-medium">{consumed[group]}/{DAILY_BUDGET[group]}</p>
            </div>
          ))}
        </div>
      </Link>

      <Link href="/habits" className="card block">
        <h2 className="text-sm font-medium text-muted mb-3">Hábitos</h2>
        <div className="space-y-2">
          {habitsWithState.slice(0, 3).map((habit) => (
            <div key={habit.id} className="flex items-center justify-between">
              <span>{habit.name}</span>
              {habit.type === 'quantity' ? (
                <span className={habit.value >= (habit.target_value || 0) ? 'text-accent' : 'text-muted'}>
                  {habit.value} / {habit.target_value} {habit.unit}
                </span>
              ) : (
                <span className={habit.completed ? 'text-accent' : 'text-muted'}>
                  {habit.completed ? '✓' : 'Pendiente'}
                </span>
              )}
            </div>
          ))}
        </div>
      </Link>

      <Link href="/weight" className="card block">
        <h2 className="text-sm font-medium text-muted mb-2">Peso actual</h2>
        {latestWeight ? (
          <p className="font-display text-2xl font-bold">{latestWeight} kg</p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold text-muted">-- kg</p>
            <p className="text-sm text-muted">Sin registros aún</p>
          </>
        )}
      </Link>
    </div>
  )
}
