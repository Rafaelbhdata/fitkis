'use client'

import { useState, useEffect } from 'react'
import { Plus, Droplets, BookOpen, Pill, X, Minus } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DEFAULT_HABITS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import type { Habit, HabitLog } from '@/types'

const habitIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Agua': Droplets,
  'Lectura': BookOpen,
  'Creatina': Pill,
}

interface HabitWithLog extends Habit {
  logId?: string
  completed: boolean
  currentValue: number
}

export default function HabitsPage() {
  const today = getToday()
  const { user } = useUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadHabits()
  }, [user])

  const loadHabits = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      let { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('active', true)
        .order('created_at')

      if (habitsError) throw habitsError

      let typedHabitsData = habitsData as Habit[] | null

      if (!typedHabitsData || typedHabitsData.length === 0) {
        const defaultHabits = DEFAULT_HABITS.map(h => ({
          user_id: user.id,
          name: h.name,
          type: h.type,
          target_value: h.target_value,
          unit: h.unit,
        }))
        await (supabase.from('habits') as any).insert(defaultHabits)
        const { data } = await supabase.from('habits').select('*').eq('active', true).order('created_at')
        typedHabitsData = data as Habit[] | null
      }

      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', today)

      if (logsError) throw logsError

      const typedLogsData = logsData as HabitLog[] | null

      const habitsWithLogs: HabitWithLog[] = (typedHabitsData || []).map(habit => {
        const log = typedLogsData?.find(l => l.habit_id === habit.id)
        return {
          ...habit,
          logId: log?.id,
          completed: log?.completed || false,
          currentValue: log?.value || 0,
        }
      })

      setHabits(habitsWithLogs)
    } catch (err) {
      setError('Error al cargar hábitos')
    }
    setLoading(false)
  }

  const toggleHabit = async (habit: HabitWithLog) => {
    if (!user) return
    const newCompleted = !habit.completed
    const previousState = habit.completed

    setHabits(habits.map(h =>
      h.id === habit.id ? { ...h, completed: newCompleted } : h
    ))

    try {
      if (habit.logId) {
        await (supabase.from('habit_logs') as any).update({ completed: newCompleted }).eq('id', habit.logId)
      } else {
        const { data } = await (supabase.from('habit_logs') as any).insert({
          habit_id: habit.id,
          user_id: user.id,
          date: today,
          completed: newCompleted,
        }).select().single()
        if (data) {
          setHabits(habits.map(h =>
            h.id === habit.id ? { ...h, logId: (data as any).id, completed: newCompleted } : h
          ))
        }
      }
    } catch (err) {
      setHabits(habits.map(h =>
        h.id === habit.id ? { ...h, completed: previousState } : h
      ))
      setError('Error al actualizar hábito')
    }
  }

  const updateValue = async (habit: HabitWithLog, newValue: number) => {
    if (!user) return
    const previousValue = habit.currentValue

    setHabits(habits.map(h =>
      h.id === habit.id ? { ...h, currentValue: newValue } : h
    ))

    try {
      if (habit.logId) {
        await (supabase.from('habit_logs') as any).update({ value: newValue }).eq('id', habit.logId)
      } else {
        const { data } = await (supabase.from('habit_logs') as any).insert({
          habit_id: habit.id,
          user_id: user.id,
          date: today,
          value: newValue,
        }).select().single()
        if (data) {
          setHabits(habits.map(h =>
            h.id === habit.id ? { ...h, logId: (data as any).id, currentValue: newValue } : h
          ))
        }
      }
    } catch (err) {
      setHabits(habits.map(h =>
        h.id === habit.id ? { ...h, currentValue: previousValue } : h
      ))
      setError('Error al actualizar hábito')
    }
  }

  const completedCount = habits.filter(h =>
    h.completed || (h.type === 'quantity' && h.currentValue >= (h.target_value || 0))
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="pt-2">
        <p className="text-sm text-muted-foreground mb-1 capitalize">{formatDate(new Date())}</p>
        <h1 className="font-display text-display-md text-foreground">Hábitos</h1>
      </header>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center justify-between animate-scale-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Ring */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label !mb-1">Completados hoy</p>
            <p className="font-display text-display-lg">
              <span className="text-accent">{completedCount}</span>
              <span className="text-muted">/{habits.length}</span>
            </p>
          </div>

          {/* Progress Ring */}
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
                strokeDasharray={`${habits.length > 0 ? (completedCount / habits.length) * 94 : 0} 94`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-semibold">
              {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {habits.map((habit) => {
          const Icon = habitIcons[habit.name] || Plus
          const isQuantity = habit.type === 'quantity'
          const isCompleted = isQuantity
            ? habit.currentValue >= (habit.target_value || 0)
            : habit.completed

          return (
            <div key={habit.id} className={`card ${isCompleted ? 'card-highlight' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-accent text-background'
                    : 'bg-accent/10 text-accent'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{habit.name}</h3>
                  {habit.type === 'quantity' && (
                    <p className="text-xs text-muted">
                      Meta: {habit.target_value} {habit.unit}
                    </p>
                  )}
                </div>

                {habit.type === 'daily_check' && (
                  <button
                    onClick={() => toggleHabit(habit)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 ${
                      habit.completed
                        ? 'bg-accent border-accent'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    {habit.completed && (
                      <svg className="w-5 h-5 text-background" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )}

                {habit.type === 'quantity' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateValue(habit, Math.max(0, habit.currentValue - 0.5))}
                      className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-display font-semibold tabular-nums">
                      {habit.currentValue}
                    </span>
                    <button
                      onClick={() => updateValue(habit, habit.currentValue + 0.5)}
                      className="w-9 h-9 rounded-xl bg-accent text-background flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {habit.type === 'quantity' && (
                <div className="mt-4">
                  <div className="progress-track">
                    <div
                      className="progress-fill bg-accent"
                      style={{
                        width: `${Math.min((habit.currentValue / (habit.target_value || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="w-full btn-secondary">
        <Plus className="w-5 h-5" />
        Agregar hábito
      </button>
    </div>
  )
}
