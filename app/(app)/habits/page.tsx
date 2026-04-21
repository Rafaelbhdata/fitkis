'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Droplets, BookOpen, Pill, X, Minus, Flame, Target, Zap, ChevronRight, ChevronLeft, Trash2, Edit3, Check, TrendingUp } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { DEFAULT_HABITS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import type { Habit, HabitLog } from '@/types'

const habitIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Agua': Droplets,
  'Lectura': BookOpen,
  'Creatina': Pill,
}

// Atlético Vital habit colors
const habitColors: Record<string, { bg: string; text: string; accent: string; gradient: string }> = {
  'Agua': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', accent: '#22e4d9', gradient: 'from-cyan-500/20' },
  'Lectura': { bg: 'bg-amber-500/10', text: 'text-amber-400', accent: '#ffb547', gradient: 'from-amber-500/20' },
  'Creatina': { bg: 'bg-pink-500/10', text: 'text-pink-400', accent: '#ff5277', gradient: 'from-pink-500/20' },
}

interface HabitWithLog extends Habit {
  logId?: string
  completed: boolean
  currentValue: number
}

export default function HabitsPage() {
  const todayStr = getToday()
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [monthLogs, setMonthLogs] = useState<HabitLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr)

  // CRUD Modal state
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [habitName, setHabitName] = useState('')
  const [habitType, setHabitType] = useState<'daily_check' | 'quantity' | 'weekly_frequency'>('daily_check')
  const [habitTarget, setHabitTarget] = useState('')
  const [habitUnit, setHabitUnit] = useState('')
  const [savingHabit, setSavingHabit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const isToday = selectedDate === todayStr
  const selectedDateObj = new Date(selectedDate + 'T12:00:00') // Noon to avoid timezone issues

  useEffect(() => {
    if (user) loadHabits()
  }, [user, selectedDate])

  const navigateDate = (days: number) => {
    const date = new Date(selectedDate + 'T12:00:00')
    date.setDate(date.getDate() + days)
    const newDateStr = date.toISOString().split('T')[0]
    // Don't allow future dates
    if (newDateStr <= todayStr) {
      setSelectedDate(newDateStr)
    }
  }

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

      // Get logs for selected date
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', selectedDate)

      if (logsError) throw logsError

      // Get 30 days of logs for heatmap
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const { data: monthLogsData } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('date', monthAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (monthLogsData) setMonthLogs(monthLogsData as HabitLog[])

      const typedLogsData = logsData as HabitLog[] | null

      // Deduplicate habits by name (keep the first one created)
      const seenNames = new Set<string>()
      const uniqueHabits = (typedHabitsData || []).filter(habit => {
        if (seenNames.has(habit.name)) return false
        seenNames.add(habit.name)
        return true
      })

      const habitsWithLogs: HabitWithLog[] = uniqueHabits.map(habit => {
        const log = typedLogsData?.find(l => l.habit_id === habit.id)
        return {
          ...habit,
          logId: log?.id,
          completed: log?.completed || false,
          currentValue: log?.value || 0,
        }
      })

      setHabits(habitsWithLogs)
      if (habitsWithLogs.length > 0 && !selectedHabit) {
        setSelectedHabit(habitsWithLogs[0].id)
      }
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
          date: selectedDate,
          completed: newCompleted,
        }).select().single()
        if (data) {
          setHabits(habits.map(h =>
            h.id === habit.id ? { ...h, logId: (data as any).id, completed: newCompleted } : h
          ))
        }
      }
      if (newCompleted) {
        showToast(`${habit.name} completado`)
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
          date: selectedDate,
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

  // CRUD Functions
  const openCreateModal = () => {
    setEditingHabit(null)
    setHabitName('')
    setHabitType('daily_check')
    setHabitTarget('')
    setHabitUnit('')
    setShowHabitModal(true)
  }

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit)
    setHabitName(habit.name)
    setHabitType(habit.type as any)
    setHabitTarget(habit.target_value?.toString() || '')
    setHabitUnit(habit.unit || '')
    setShowHabitModal(true)
  }

  const closeHabitModal = () => {
    setShowHabitModal(false)
    setEditingHabit(null)
    setHabitName('')
    setHabitTarget('')
    setHabitUnit('')
  }

  const saveHabit = async () => {
    if (!user || !habitName) return
    setSavingHabit(true)

    try {
      if (editingHabit) {
        // Update existing habit
        await (supabase.from('habits') as any)
          .update({
            name: habitName,
            type: habitType,
            target_value: habitType !== 'daily_check' ? parseFloat(habitTarget) : null,
            unit: habitType === 'quantity' ? habitUnit : null,
          })
          .eq('id', editingHabit.id)
        showToast(`"${habitName}" actualizado`)
      } else {
        // Create new habit
        await (supabase.from('habits') as any).insert({
          user_id: user.id,
          name: habitName,
          type: habitType,
          target_value: habitType !== 'daily_check' ? parseFloat(habitTarget) : null,
          unit: habitType === 'quantity' ? habitUnit : null,
          active: true,
        })
        showToast(`"${habitName}" creado`)
      }
      await loadHabits()
      closeHabitModal()
    } catch (err) {
      setError('Error al guardar hábito')
    }
    setSavingHabit(false)
  }

  const deleteHabit = async (habitId: string) => {
    try {
      // Soft delete - set active to false
      await (supabase.from('habits') as any)
        .update({ active: false })
        .eq('id', habitId)
      showToast('Hábito eliminado')
      setShowDeleteConfirm(null)
      await loadHabits()
    } catch (err) {
      setError('Error al eliminar hábito')
    }
  }

  // Calculate streak for a habit (using monthLogs)
  const getStreak = (habitId: string) => {
    const logs = monthLogs.filter(l => l.habit_id === habitId && (l.completed || (l.value && l.value > 0)))
    const dates = Array.from(new Set(logs.map(l => l.date))).sort().reverse()

    let streak = 0
    const todayDate = new Date(todayStr)

    for (let i = 0; i < 30; i++) {
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

  // Get 30-day heatmap data for a habit
  const get30DayHeatmap = (habitId: string) => {
    const days = []
    const todayDate = new Date()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(todayDate.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const log = monthLogs.find(l => l.habit_id === habitId && l.date === dateStr)
      const isCompleted = log?.completed || (log?.value && log.value > 0)

      days.push({
        date: dateStr,
        dayNum: date.getDate(),
        completed: isCompleted,
        isToday: i === 0
      })
    }

    return days
  }

  // Get month completion rate
  const getCompletionRate = (habitId: string) => {
    const heatmap = get30DayHeatmap(habitId)
    const completed = heatmap.filter(d => d.completed).length
    return Math.round((completed / 30) * 100)
  }

  // Get week completions for weekly_frequency habits
  const getWeekCompletions = (habitId: string) => {
    const todayDate = new Date()
    const dayOfWeek = todayDate.getDay() // 0 = Sunday
    let count = 0

    // Check each day from Sunday to today
    for (let i = 0; i <= dayOfWeek; i++) {
      const date = new Date(todayDate)
      date.setDate(todayDate.getDate() - (dayOfWeek - i))
      const dateStr = date.toISOString().split('T')[0]
      const log = monthLogs.find(l => l.habit_id === habitId && l.date === dateStr)
      if (log?.completed) count++
    }

    return count
  }

  const completedCount = habits.filter(h => {
    if (h.type === 'quantity') return h.currentValue >= (h.target_value || 0)
    if (h.type === 'weekly_frequency') return h.completed // Today is marked
    return h.completed // daily_check
  }).length

  const totalStreak = Math.max(...habits.map(h => getStreak(h.id)), 0)

  const selectedHabitData = habits.find(h => h.id === selectedHabit)

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
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button onClick={loadHabits} className="text-xs font-medium underline hover:no-underline">
              Reintentar
            </button>
            <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-md">Hábitos</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/habits/progress"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-accent">Progreso</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Flame className="w-4 h-4 text-amber-400 animate-flame" />
            <span className="font-display text-sm font-semibold text-amber-400">{totalStreak} días</span>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="card !p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface-hover transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isToday ? 'Hoy' : selectedDateObj.toLocaleDateString('es-MX', { weekday: 'long' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedDateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => navigateDate(1)}
            disabled={isToday}
            className={`w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center transition-colors ${
              isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-hover'
            }`}
            aria-label="Día siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="w-full mt-3 text-xs text-accent hover:underline"
          >
            Volver a hoy
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Hoy</span>
          </div>
          <p className="font-display text-display-sm">
            {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}%
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">30 días</span>
          </div>
          <p className="font-display text-display-sm">
            {selectedHabitData ? getCompletionRate(selectedHabitData.id) : 0}%
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-flame" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Racha</span>
          </div>
          <p className="font-display text-display-sm text-amber-400">{totalStreak}</p>
        </div>
      </div>

      {/* 30-Day Heatmap */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Últimos 30 días</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {selectedHabitData ? getCompletionRate(selectedHabitData.id) : 0}% completado
          </span>
        </div>

        {/* Habit Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {habits.map((habit) => {
            const isSelected = selectedHabit === habit.id
            const colors = habitColors[habit.name] || { bg: 'bg-accent/10', text: 'text-accent', accent: '#10b981', gradient: 'from-accent/20' }
            return (
              <button
                key={habit.id}
                onClick={() => setSelectedHabit(habit.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? `${colors.bg} ${colors.text} border border-current/30`
                    : 'bg-surface-elevated text-muted-foreground hover:text-foreground'
                }`}
              >
                {habit.name}
              </button>
            )
          })}
        </div>

        {/* Heatmap Grid */}
        {selectedHabitData && (
          <div className="grid grid-cols-10 gap-[3px]">
            {get30DayHeatmap(selectedHabitData.id).map((day, i) => {
              const colors = habitColors[selectedHabitData.name] || { accent: '#10b981' }
              return (
                <div
                  key={i}
                  className={`w-[14px] h-[14px] rounded-sm transition-all ${
                    day.completed
                      ? ''
                      : day.isToday
                        ? 'bg-surface-hover border border-dashed border-border'
                        : 'bg-surface-elevated'
                  }`}
                  style={{
                    backgroundColor: day.completed ? colors.accent : undefined,
                    opacity: day.completed ? (day.isToday ? 1 : 0.8) : 1
                  }}
                  title={`${day.date}: ${day.completed ? 'Completado' : 'No completado'}`}
                />
              )
            })}
          </div>
        )}

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground">Hace 30 días</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Menos</span>
            <div className="w-3 h-3 rounded-sm bg-surface-elevated" />
            <div className="w-3 h-3 rounded-sm bg-accent/30" />
            <div className="w-3 h-3 rounded-sm bg-accent/60" />
            <div className="w-3 h-3 rounded-sm bg-accent" />
            <span className="text-[10px] text-muted-foreground ml-1">Más</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Hoy</span>
        </div>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">
            {isToday ? 'Hábitos de hoy' : `Hábitos del ${selectedDateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{habits.length} completados
          </p>
        </div>

        {habits.map((habit) => {
          const Icon = habitIcons[habit.name] || Target
          const colors = habitColors[habit.name] || { bg: 'bg-accent/10', text: 'text-accent', accent: '#10b981', gradient: 'from-accent/20' }
          const isCompleted = habit.type === 'quantity'
            ? habit.currentValue >= (habit.target_value || 0)
            : habit.completed
          const streak = getStreak(habit.id)
          const completionRate = getCompletionRate(habit.id)

          return (
            <div
              key={habit.id}
              className={`card !p-0 overflow-hidden transition-all ${
                isCompleted ? 'border-accent/30' : ''
              }`}
            >
              {/* Gradient background for completed */}
              <div className={`p-4 ${isCompleted ? `bg-gradient-to-r ${colors.gradient} to-transparent` : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-accent text-background'
                      : colors.bg + ' ' + colors.text
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{habit.name}</h3>
                      {streak > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <Flame className="w-3 h-3 text-amber-400 animate-flame" />
                          <span className="text-[10px] font-semibold text-amber-400">{streak} {streak === 1 ? 'día' : 'días'}</span>
                        </div>
                      )}
                      {/* Edit/Delete Actions */}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(habit); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                          aria-label="Editar hábito"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(habit.id); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                          aria-label="Eliminar hábito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {habit.type === 'quantity' && (
                        <p className="text-xs text-muted-foreground">
                          {habit.currentValue}/{habit.target_value} {habit.unit}
                        </p>
                      )}
                      {habit.type === 'weekly_frequency' && (
                        <p className="text-xs text-muted-foreground">
                          {getWeekCompletions(habit.id)}/{habit.target_value} días esta semana
                        </p>
                      )}
                      {habit.type === 'daily_check' && (
                        <p className="text-xs text-muted-foreground">
                          {completionRate}% en 30 días
                        </p>
                      )}
                    </div>
                  </div>

                  {habit.type === 'daily_check' && (
                    <button
                      onClick={() => toggleHabit(habit)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 ${
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
                        className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-display font-semibold tabular-nums text-sm">
                        {habit.currentValue}
                      </span>
                      <button
                        onClick={() => updateValue(habit, habit.currentValue + 0.5)}
                        className="w-9 h-9 rounded-lg bg-accent text-background flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {habit.type === 'weekly_frequency' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        <span className={habit.completed ? 'text-accent' : 'text-muted-foreground'}>
                          {getWeekCompletions(habit.id)}
                        </span>
                        <span className="text-muted-foreground">/{habit.target_value}</span>
                      </span>
                      <button
                        onClick={() => toggleHabit(habit)}
                        className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 ${
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
                    </div>
                  )}
                </div>

                {habit.type === 'quantity' && (
                  <div className="mt-3">
                    <div className="progress-track-lg">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min((habit.currentValue / (habit.target_value || 1)) * 100, 100)}%`,
                          backgroundColor: isCompleted ? '#10b981' : colors.accent
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={openCreateModal} className="w-full btn-secondary">
        <Plus className="w-4 h-4" />
        Agregar hábito
      </button>

      {/* Create/Edit Habit Modal */}
      {showHabitModal && (
        <>
          <div className="overlay animate-fade-in" onClick={closeHabitModal} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">
                {editingHabit ? 'Editar hábito' : 'Nuevo hábito'}
              </h2>
              <button onClick={closeHabitModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Meditación"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Tipo de seguimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setHabitType('daily_check')}
                    className={`p-3 rounded-lg text-xs font-medium transition-all text-center ${
                      habitType === 'daily_check'
                        ? 'bg-accent text-background'
                        : 'bg-surface-elevated border border-border'
                    }`}
                  >
                    <Check className="w-4 h-4 mx-auto mb-1" />
                    Sí/No diario
                  </button>
                  <button
                    onClick={() => setHabitType('quantity')}
                    className={`p-3 rounded-lg text-xs font-medium transition-all text-center ${
                      habitType === 'quantity'
                        ? 'bg-accent text-background'
                        : 'bg-surface-elevated border border-border'
                    }`}
                  >
                    <Plus className="w-4 h-4 mx-auto mb-1" />
                    Cantidad
                  </button>
                  <button
                    onClick={() => setHabitType('weekly_frequency')}
                    className={`p-3 rounded-lg text-xs font-medium transition-all text-center ${
                      habitType === 'weekly_frequency'
                        ? 'bg-accent text-background'
                        : 'bg-surface-elevated border border-border'
                    }`}
                  >
                    <Zap className="w-4 h-4 mx-auto mb-1" />
                    Días/semana
                  </button>
                </div>
              </div>

              {habitType === 'quantity' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Meta diaria</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="input"
                      placeholder="Ej: 2"
                      value={habitTarget}
                      onChange={(e) => setHabitTarget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Unidad</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej: litros"
                      value={habitUnit}
                      onChange={(e) => setHabitUnit(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {habitType === 'weekly_frequency' && (
                <div>
                  <label className="label">Días por semana</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input"
                    placeholder="Ej: 3"
                    min="1"
                    max="7"
                    value={habitTarget}
                    onChange={(e) => setHabitTarget(e.target.value)}
                  />
                </div>
              )}

              <button
                onClick={saveHabit}
                disabled={savingHabit || !habitName || (habitType !== 'daily_check' && !habitTarget)}
                className="w-full btn-primary"
              >
                {savingHabit ? (
                  <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
                ) : editingHabit ? (
                  'Guardar cambios'
                ) : (
                  'Crear hábito'
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="overlay animate-fade-in" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 animate-scale-in">
            <div className="card !p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-danger/10 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-danger" />
              </div>
              <h3 className="font-display text-display-xs mb-2">¿Eliminar hábito?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Esta acción no se puede deshacer. El historial del hábito se perderá.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteHabit(showDeleteConfirm)}
                  className="flex-1 py-3 px-4 rounded-xl bg-danger text-white font-medium text-sm hover:bg-danger/90 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
