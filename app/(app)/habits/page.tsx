'use client'

import { useState, useEffect } from 'react'
import { Plus, Droplets, BookOpen, Pill, X, Minus, Flame, Target, Calendar, TrendingUp } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { DEFAULT_HABITS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import type { Habit, HabitLog } from '@/types'

const habitIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Agua': Droplets,
  'Lectura': BookOpen,
  'Creatina': Pill,
}

const habitColors: Record<string, { bg: string; text: string; accent: string }> = {
  'Agua': { bg: 'bg-blue-500/10', text: 'text-blue-400', accent: '#3b82f6' },
  'Lectura': { bg: 'bg-amber-500/10', text: 'text-amber-400', accent: '#f59e0b' },
  'Creatina': { bg: 'bg-pink-500/10', text: 'text-pink-400', accent: '#ec4899' },
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
  const [weekLogs, setWeekLogs] = useState<HabitLog[]>([])
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

      // Get today's logs
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', today)

      if (logsError) throw logsError

      // Get week logs for streak calculation
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { data: weekLogsData } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (weekLogsData) setWeekLogs(weekLogsData as HabitLog[])

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

  // Calculate streak for a habit
  const getStreak = (habitId: string) => {
    const logs = weekLogs.filter(l => l.habit_id === habitId && (l.completed || (l.value && l.value > 0)))
    const dates = Array.from(new Set(logs.map(l => l.date))).sort().reverse()

    let streak = 0
    const todayDate = new Date(today)

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(todayDate)
      checkDate.setDate(todayDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]

      if (dates.includes(dateStr)) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return streak
  }

  // Get week activity for a habit
  const getWeekActivity = (habitId: string) => {
    const days = []
    const todayDate = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(todayDate.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const log = weekLogs.find(l => l.habit_id === habitId && l.date === dateStr)
      const isCompleted = log?.completed || (log?.value && log.value > 0)

      days.push({
        date: dateStr,
        day: date.toLocaleDateString('es-MX', { weekday: 'narrow' }),
        completed: isCompleted,
        isToday: i === 0
      })
    }

    return days
  }

  const completedCount = habits.filter(h =>
    h.completed || (h.type === 'quantity' && h.currentValue >= (h.target_value || 0))
  ).length

  const totalStreak = Math.max(...habits.map(h => getStreak(h.id)), 0)

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
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center justify-between animate-scale-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Progress */}
        <div className="card !p-5 col-span-1 bg-gradient-to-br from-accent/10 via-transparent to-transparent border-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Hoy</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-display-lg">
                <span className="text-accent">{completedCount}</span>
                <span className="text-muted-foreground text-lg">/{habits.length}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">completados</p>
            </div>
            {/* Mini progress ring */}
            <div className="relative w-12 h-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="14"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-surface-elevated"
                />
                <circle
                  cx="18" cy="18" r="14"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round"
                  className="text-accent transition-all duration-500"
                  strokeDasharray={`${habits.length > 0 ? (completedCount / habits.length) * 88 : 0} 88`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="card !p-5 col-span-1 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border-orange-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-muted-foreground">Racha</span>
          </div>
          <p className="font-display text-display-lg text-orange-400">
            {totalStreak}
            <span className="text-lg text-muted-foreground ml-1">días</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">mejor racha actual</p>
        </div>
      </div>

      {/* Week Overview */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Esta semana</span>
          </div>
          <span className="text-xs text-muted-foreground">últimos 7 días</span>
        </div>

        <div className="space-y-3">
          {habits.map((habit) => {
            const weekActivity = getWeekActivity(habit.id)
            const colors = habitColors[habit.name] || { bg: 'bg-accent/10', text: 'text-accent', accent: '#10b981' }

            return (
              <div key={habit.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 truncate">{habit.name}</span>
                <div className="flex-1 flex gap-1">
                  {weekActivity.map((day, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-6 rounded-md transition-colors ${
                        day.completed
                          ? ''
                          : day.isToday
                            ? 'bg-surface-elevated border border-dashed border-border'
                            : 'bg-surface-elevated'
                      }`}
                      style={{
                        backgroundColor: day.completed ? colors.accent : undefined,
                        opacity: day.completed ? (day.isToday ? 1 : 0.7) : 1
                      }}
                      title={day.date}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between mt-3 text-[10px] text-muted-foreground px-16">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        <p className="text-sm font-medium px-1">Hábitos de hoy</p>

        {habits.map((habit) => {
          const Icon = habitIcons[habit.name] || Target
          const colors = habitColors[habit.name] || { bg: 'bg-accent/10', text: 'text-accent', accent: '#10b981' }
          const isQuantity = habit.type === 'quantity'
          const isCompleted = isQuantity
            ? habit.currentValue >= (habit.target_value || 0)
            : habit.completed
          const streak = getStreak(habit.id)

          return (
            <div
              key={habit.id}
              className={`card !p-4 transition-all ${
                isCompleted ? 'border-accent/30 bg-accent/5' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-accent text-background'
                    : colors.bg + ' ' + colors.text
                }`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{habit.name}</h3>
                    {streak > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] font-medium text-orange-400">{streak}</span>
                      </div>
                    )}
                  </div>
                  {habit.type === 'quantity' && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Meta: {habit.target_value} {habit.unit}
                    </p>
                  )}
                </div>

                {habit.type === 'daily_check' && (
                  <button
                    onClick={() => toggleHabit(habit)}
                    className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all active:scale-95 ${
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
                    <span className="w-10 text-center font-display font-semibold tabular-nums">
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
                  <div className="relative h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((habit.currentValue / (habit.target_value || 1)) * 100, 100)}%`,
                        backgroundColor: isCompleted ? '#10b981' : colors.accent
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                    <span>{habit.currentValue} {habit.unit}</span>
                    <span>{habit.target_value} {habit.unit}</span>
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
