'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, Droplets, BookOpen, Pill, Loader2 } from 'lucide-react'
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

  useEffect(() => {
    if (user) {
      loadHabits()
    }
  }, [user])

  const loadHabits = async () => {
    if (!user) return
    setLoading(true)

    // Cargar hábitos del usuario
    let { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at')

    // Si no tiene hábitos, crear los predeterminados
    if (!habitsData || habitsData.length === 0) {
      const defaultHabits = DEFAULT_HABITS.map(h => ({
        user_id: user.id,
        name: h.name,
        type: h.type,
        target_value: h.target_value,
        unit: h.unit,
      }))
      await supabase.from('habits').insert(defaultHabits)
      const { data } = await supabase.from('habits').select('*').eq('active', true).order('created_at')
      habitsData = data
    }

    // Cargar logs de hoy
    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('date', today)

    // Combinar hábitos con sus logs de hoy
    const habitsWithLogs: HabitWithLog[] = (habitsData || []).map(habit => {
      const log = logsData?.find(l => l.habit_id === habit.id)
      return {
        ...habit,
        logId: log?.id,
        completed: log?.completed || false,
        currentValue: log?.value || 0,
      }
    })

    setHabits(habitsWithLogs)
    setLoading(false)
  }

  const toggleHabit = async (habit: HabitWithLog) => {
    if (!user) return
    const newCompleted = !habit.completed

    // Actualizar UI optimistamente
    setHabits(habits.map(h =>
      h.id === habit.id ? { ...h, completed: newCompleted } : h
    ))

    if (habit.logId) {
      await supabase.from('habit_logs').update({ completed: newCompleted }).eq('id', habit.logId)
    } else {
      const { data } = await supabase.from('habit_logs').insert({
        habit_id: habit.id,
        user_id: user.id,
        date: today,
        completed: newCompleted,
      }).select().single()
      if (data) {
        setHabits(habits.map(h =>
          h.id === habit.id ? { ...h, logId: data.id, completed: newCompleted } : h
        ))
      }
    }
  }

  const updateValue = async (habit: HabitWithLog, newValue: number) => {
    if (!user) return

    // Actualizar UI optimistamente
    setHabits(habits.map(h =>
      h.id === habit.id ? { ...h, currentValue: newValue } : h
    ))

    if (habit.logId) {
      await supabase.from('habit_logs').update({ value: newValue }).eq('id', habit.logId)
    } else {
      const { data } = await supabase.from('habit_logs').insert({
        habit_id: habit.id,
        user_id: user.id,
        date: today,
        value: newValue,
      }).select().single()
      if (data) {
        setHabits(habits.map(h =>
          h.id === habit.id ? { ...h, logId: data.id, currentValue: newValue } : h
        ))
      }
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
