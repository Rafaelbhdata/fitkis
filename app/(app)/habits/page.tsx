'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Droplets, BookOpen, Pill, X, Minus, Target, ChevronRight, ChevronLeft, Trash2, Edit3, Check } from 'lucide-react'
import { getToday } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { DEFAULT_HABITS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
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
  const todayStr = getToday()
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [monthLogs, setMonthLogs] = useState<HabitLog[]>([])
  const [error, setError] = useState<string | null>(null)
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

  useEffect(() => {
    if (user) loadHabits()
  }, [user, selectedDate])

  const navigateDate = (days: number) => {
    const date = new Date(selectedDate + 'T12:00:00')
    date.setDate(date.getDate() + days)
    const newDateStr = date.toISOString().split('T')[0]
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

      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', selectedDate)

      if (logsError) throw logsError

      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const { data: monthLogsData } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('date', monthAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (monthLogsData) setMonthLogs(monthLogsData as HabitLog[])

      const typedLogsData = logsData as HabitLog[] | null

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

  // Calculate streak
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

  // Get 7-day data for a habit
  const get7DayData = (habitId: string) => {
    const days: number[] = []
    const todayDate = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(todayDate.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const log = monthLogs.find(l => l.habit_id === habitId && l.date === dateStr)
      const isCompleted = log?.completed || (log?.value && log.value > 0)
      days.push(isCompleted ? 1 : 0)
    }

    return days
  }

  // Get week completions
  const getWeekCompletions = (habitId: string) => {
    return get7DayData(habitId).filter(Boolean).length
  }

  const completedCount = habits.filter(h => {
    if (h.type === 'quantity') return h.currentValue >= (h.target_value || 0)
    if (h.type === 'weekly_frequency') return h.completed
    return h.completed
  }).length

  const totalStreak = Math.max(...habits.map(h => getStreak(h.id)), 0)

  // Calculate weekly completion rate
  const totalHabitDays = habits.length * 7
  const completedHabitDays = habits.reduce((sum, h) => sum + get7DayData(h.id).filter(Boolean).length, 0)
  const weeklyRate = totalHabitDays > 0 ? Math.round((completedHabitDays / totalHabitDays) * 100) : 0

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
        <div className="mx-5 mb-4 p-3 bg-berry-soft border border-berry/20 rounded-xl text-berry text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-berry hover:text-berry/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-3">
        <div className="fk-eyebrow mb-1">Ritual diario</div>
        <h1 className="font-serif text-[28px] font-light tracking-tight leading-none">
          Pequeñas <span className="italic">constantes</span>.
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="px-5 mt-5 flex gap-3">
        {/* Streak Card - Dark */}
        <div className="flex-1 bg-ink text-paper rounded-[14px] p-4">
          <div className="fk-eyebrow text-ink-5 mb-2">Racha</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-4xl font-light tracking-tight">{totalStreak}</span>
            <span className="fk-mono text-[10px] text-ink-5">días</span>
          </div>
          <div className="flex gap-[3px] mt-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-[6px] rounded-sm ${i < totalStreak % 8 ? 'bg-signal' : 'bg-white/15'}`}
              />
            ))}
          </div>
        </div>

        {/* Week Stats Card - Cream */}
        <div className="flex-1 bg-cream rounded-[14px] p-4">
          <div className="fk-eyebrow mb-2">Esta semana</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-4xl font-light tracking-tight">{weeklyRate}</span>
            <span className="font-serif text-xl">%</span>
          </div>
          <div className="fk-mono text-[10px] text-ink-4 mt-3">
            {completedHabitDays} / {totalHabitDays} hábitos
          </div>
        </div>
      </div>

      {/* Habits List */}
      <div className="px-5 mt-6">
        <div className="fk-eyebrow mb-3">Hoy · {completedCount} de {habits.length}</div>

        <div className="space-y-2">
          {habits.map((habit) => {
            const Icon = habitIcons[habit.name] || Target
            const isCompleted = habit.type === 'quantity'
              ? habit.currentValue >= (habit.target_value || 0)
              : habit.completed
            const weekData = get7DayData(habit.id)

            return (
              <div
                key={habit.id}
                className="bg-white border border-ink-7 rounded-xl p-4 flex items-center gap-3"
              >
                {/* Checkbox */}
                <button
                  onClick={() => habit.type !== 'quantity' && toggleHabit(habit)}
                  className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-ink border-ink'
                      : 'border-ink-6 hover:border-ink-4'
                  }`}
                >
                  {isCompleted && <Check className="w-3 h-3 text-paper" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-medium ${isCompleted ? 'text-ink' : 'text-ink-3'}`}>
                    {habit.name}
                  </div>
                  {/* Week mini chart */}
                  <div className="flex gap-[3px] mt-2">
                    {weekData.map((d, j) => (
                      <div
                        key={j}
                        className={`w-[14px] h-[14px] rounded-[3px] ${
                          d ? 'bg-signal' : 'bg-paper-3'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Quantity Controls */}
                {habit.type === 'quantity' && (
                  <div className="flex items-center gap-2 mr-2">
                    <button
                      onClick={() => updateValue(habit, Math.max(0, habit.currentValue - 0.5))}
                      className="w-8 h-8 rounded-lg bg-paper-3 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center fk-mono text-sm font-medium">
                      {habit.currentValue}
                    </span>
                    <button
                      onClick={() => updateValue(habit, habit.currentValue + 0.5)}
                      className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                {/* Week count */}
                <div className="fk-mono text-[10px] text-ink-4 tracking-wide">
                  {getWeekCompletions(habit.id)}/7
                </div>

                {/* Edit/Delete */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(habit)}
                    className="p-1.5 rounded-lg text-ink-4 hover:text-ink hover:bg-paper-3 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(habit.id)}
                    className="p-1.5 rounded-lg text-ink-4 hover:text-berry hover:bg-berry-soft transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Habit Button */}
        <button
          onClick={openCreateModal}
          className="w-full mt-4 py-3 rounded-xl border border-ink-7 text-sm font-medium flex items-center justify-center gap-2 hover:bg-paper-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar hábito
        </button>
      </div>

      {/* Create/Edit Habit Modal */}
      {showHabitModal && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={closeHabitModal} />
          <div className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-[24px] p-5 z-50 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-light">
                {editingHabit ? 'Editar hábito' : 'Nuevo hábito'}
              </h2>
              <button onClick={closeHabitModal} className="w-8 h-8 rounded-full bg-paper-3 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="fk-eyebrow mb-2 block">Nombre</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm"
                  placeholder="Ej: Meditación"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="fk-eyebrow mb-2 block">Tipo de seguimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'daily_check', label: 'Sí/No', icon: Check },
                    { type: 'quantity', label: 'Cantidad', icon: Plus },
                    { type: 'weekly_frequency', label: 'Días/sem', icon: Target },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setHabitType(type as any)}
                      className={`p-3 rounded-xl text-xs font-medium transition-all text-center ${
                        habitType === type
                          ? 'bg-ink text-paper'
                          : 'bg-paper-3 border border-ink-7'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {habitType === 'quantity' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="fk-eyebrow mb-2 block">Meta diaria</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-full px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm"
                      placeholder="Ej: 2"
                      value={habitTarget}
                      onChange={(e) => setHabitTarget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="fk-eyebrow mb-2 block">Unidad</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm"
                      placeholder="Ej: litros"
                      value={habitUnit}
                      onChange={(e) => setHabitUnit(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {habitType === 'weekly_frequency' && (
                <div>
                  <label className="fk-eyebrow mb-2 block">Días por semana</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm"
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
                className="w-full py-3 rounded-full bg-ink text-paper font-medium text-sm disabled:opacity-50"
              >
                {savingHabit ? 'Guardando...' : editingHabit ? 'Guardar cambios' : 'Crear hábito'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-5 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-berry-soft flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-berry" />
            </div>
            <h3 className="font-serif text-xl font-light mb-2">¿Eliminar hábito?</h3>
            <p className="text-sm text-ink-4 mb-5">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-ink-7 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteHabit(showDeleteConfirm)}
                className="flex-1 py-3 rounded-xl bg-berry text-white text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
