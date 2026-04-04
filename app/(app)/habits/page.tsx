'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, Droplets, BookOpen, Pill, Loader2, X } from 'lucide-react'
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
    if (user) {
      loadHabits()
    }
  }, [user])

  const loadHabits = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // Cargar hábitos del usuario
      let { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('active', true)
        .order('created_at')

      if (habitsError) throw habitsError

      let typedHabitsData = habitsData as Habit[] | null

      // Si no tiene hábitos, crear los predeterminados
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

      // Cargar logs de hoy
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', today)

      if (logsError) throw logsError

      const typedLogsData = logsData as HabitLog[] | null

      // Combinar hábitos con sus logs de hoy
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

    // Actualizar UI optimistamente
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
      // Revertir cambio optimista
      setHabits(habits.map(h =>
        h.id === habit.id ? { ...h, completed: previousState } : h
      ))
      setError('Error al actualizar hábito')
    }
  }

  const updateValue = async (habit: HabitWithLog, newValue: number) => {
    if (!user) return
    const previousValue = habit.currentValue

    // Actualizar UI optimistamente
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
      // Revertir cambio optimista
      setHabits(habits.map(h =>
        h.id === habit.id ? { ...h, currentValue: previousValue } : h
      ))
      setError('Error al actualizar hábito')
    }
  }

  const completedCount = habits.filter(h => h.completed || (h.type === 'quantity' && h.currentValue >= (h.target_value || 0))).length

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
        <h1 className="font-display text-3xl font-bold">Hábitos</h1>
        <p className="text-muted capitalize">{formatDate(new Date())}</p>
      </header>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Resumen */}
      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Completados hoy</p>
            <p className="font-display text-3xl font-bold">
              <span className="text-accent">{completedCount}</span>
              <span className="text-muted">/{habits.length}</span>
            </p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-accent flex items-center justify-center">
            <span className="font-display text-xl font-bold">
              {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </section>

      {/* Lista de hábitos */}
      <section className="space-y-3">
        {habits.map((habit) => {
          const Icon = habitIcons[habit.name] || Check
          const isQuantity = habit.type === 'quantity'
          const isCompleted = isQuantity
            ? habit.currentValue >= (habit.target_value || 0)
            : habit.completed

          return (
            <div key={habit.id} className="card">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    isCompleted ? 'bg-accent' : 'bg-accent/20'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isCompleted ? 'text-background' : 'text-accent'}`} />
                </div>

                <div className="flex-1">
                  <h3 className="font-medium">{habit.name}</h3>
                  {habit.type === 'quantity' && (
                    <p className="text-sm text-muted">
                      Meta: {habit.target_value} {habit.unit}
                    </p>
                  )}
                  {habit.type === 'weekly_frequency' && (
                    <p className="text-sm text-muted">
                      {habit.target_value} {habit.unit}
                    </p>
                  )}
                </div>

                {habit.type === 'daily_check' && (
                  <button
                    onClick={() => toggleHabit(habit)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                      habit.completed
                        ? 'bg-accent border-accent'
                        : 'border-border hover:border-accent'
                    }`}
                  >
                    {habit.completed && <Check className="w-5 h-5 text-background" />}
                  </button>
                )}

                {habit.type === 'quantity' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateValue(habit, Math.max(0, habit.currentValue - 0.5))}
                      className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">
                      {habit.currentValue}
                    </span>
                    <button
                      onClick={() => updateValue(habit, habit.currentValue + 0.5)}
                      className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {habit.type === 'quantity' && (
                <div className="mt-3">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
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
      </section>

      <button className="w-full btn-secondary flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        Agregar hábito
      </button>
    </div>
  )
}
