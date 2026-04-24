'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Flame, Target, Zap, TrendingUp, Calendar, Award, ChevronDown } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { getToday, formatDateISO } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import type { Habit, HabitLog } from '@/types'

interface WeekData {
  week: string
  weekLabel: string
  completionRate: number
  totalDays: number
  completedDays: number
}

interface HabitStats {
  habit: Habit
  currentStreak: number
  bestStreak: number
  completionRate: number
  totalCompleted: number
}

export default function HabitsProgressPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const todayStr = getToday()
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [allLogs, setAllLogs] = useState<HabitLog[]>([])
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)
  const [showHabitPicker, setShowHabitPicker] = useState(false)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)

    // Get all active habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at')

    if (habitsData) {
      // Deduplicate by name
      const seenNames = new Set<string>()
      const uniqueHabits = (habitsData as Habit[]).filter(habit => {
        if (seenNames.has(habit.name)) return false
        seenNames.add(habit.name)
        return true
      })
      setHabits(uniqueHabits)
      if (uniqueHabits.length > 0 && !selectedHabit) {
        setSelectedHabit(uniqueHabits[0].id)
      }
    }

    // Get all logs for the last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .gte('date', formatDateISO(ninetyDaysAgo))
      .order('date', { ascending: true })

    if (logsData) {
      setAllLogs(logsData as HabitLog[])
    }

    setLoading(false)
  }

  // Calculate weekly completion data for a habit
  const getWeeklyData = (habitId: string): WeekData[] => {
    const weeks: WeekData[] = []
    const today = new Date()

    // Get last 12 weeks
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (w * 7) - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      // Count completed days in this week
      let completedDays = 0
      let totalDays = 0

      for (let d = 0; d < 7; d++) {
        const checkDate = new Date(weekStart)
        checkDate.setDate(weekStart.getDate() + d)
        const dateStr = formatDateISO(checkDate)

        // Don't count future days
        if (dateStr > todayStr) continue

        totalDays++
        const log = allLogs.find(l => l.habit_id === habitId && l.date === dateStr)
        if (log?.completed || (log?.value && log.value > 0)) {
          completedDays++
        }
      }

      const weekLabel = weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

      weeks.push({
        week: formatDateISO(weekStart),
        weekLabel,
        completionRate: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
        totalDays,
        completedDays
      })
    }

    return weeks
  }

  // Calculate streak for a habit
  const calculateStreaks = (habitId: string): { current: number; best: number } => {
    const habitLogs = allLogs
      .filter(l => l.habit_id === habitId && (l.completed || (l.value && l.value > 0)))
      .map(l => l.date)
      .sort()

    const uniqueDates = Array.from(new Set(habitLogs))

    // Calculate current streak
    let currentStreak = 0
    const today = new Date(todayStr)

    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = formatDateISO(checkDate)

      if (uniqueDates.includes(dateStr)) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }

    // Calculate best streak
    let bestStreak = 0
    let tempStreak = 0
    let prevDate: Date | null = null

    uniqueDates.forEach(dateStr => {
      const date = new Date(dateStr + 'T12:00:00')

      if (prevDate) {
        const diffDays = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else {
          bestStreak = Math.max(bestStreak, tempStreak)
          tempStreak = 1
        }
      } else {
        tempStreak = 1
      }

      prevDate = date
    })

    bestStreak = Math.max(bestStreak, tempStreak)

    return { current: currentStreak, best: bestStreak }
  }

  // Get stats for all habits for comparison
  const getAllHabitStats = (): HabitStats[] => {
    return habits.map(habit => {
      const streaks = calculateStreaks(habit.id)
      const habitLogs = allLogs.filter(l => l.habit_id === habit.id && (l.completed || (l.value && l.value > 0)))

      return {
        habit,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        completionRate: Math.round((habitLogs.length / 90) * 100),
        totalCompleted: habitLogs.length
      }
    }).sort((a, b) => b.completionRate - a.completionRate)
  }

  // Get 30-day calendar data
  const get30DayCalendar = (habitId: string) => {
    const days = []
    const today = new Date()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = formatDateISO(date)
      const log = allLogs.find(l => l.habit_id === habitId && l.date === dateStr)
      const isCompleted = log?.completed || (log?.value && log.value > 0)

      days.push({
        date: dateStr,
        dayNum: date.getDate(),
        dayName: date.toLocaleDateString('es-MX', { weekday: 'narrow' }),
        completed: isCompleted,
        isToday: i === 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      })
    }

    return days
  }

  const selectedHabitData = habits.find(h => h.id === selectedHabit)
  const weeklyData = selectedHabit ? getWeeklyData(selectedHabit) : []
  const streaks = selectedHabit ? calculateStreaks(selectedHabit) : { current: 0, best: 0 }
  const allStats = getAllHabitStats()
  const calendarData = selectedHabit ? get30DayCalendar(selectedHabit) : []

  // Calculate overall completion rate for selected habit
  const overallCompletionRate = selectedHabit
    ? Math.round((allLogs.filter(l => l.habit_id === selectedHabit && (l.completed || (l.value && l.value > 0))).length / 90) * 100)
    : 0

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center gap-4 pt-2">
        <Link href="/habits" className="btn-icon -ml-2" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-display-sm">Progreso</h1>
          <p className="text-xs text-muted-foreground">Análisis de tus hábitos</p>
        </div>
      </header>

      {/* Habit Picker */}
      <button
        onClick={() => setShowHabitPicker(true)}
        className="w-full card !p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{selectedHabitData?.name || 'Seleccionar hábito'}</p>
            <p className="text-xs text-muted-foreground">
              {selectedHabitData?.type === 'daily_check' ? 'Diario' :
               selectedHabitData?.type === 'quantity' ? `${selectedHabitData.target_value} ${selectedHabitData.unit}/día` :
               `${selectedHabitData?.target_value} días/semana`}
            </p>
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Racha</span>
          </div>
          <p className="font-display text-display-sm text-orange-400">{streaks.current}<span className="text-sm text-muted-foreground ml-1">días</span></p>
        </div>
        <div className="card !p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mejor</span>
          </div>
          <p className="font-display text-display-sm text-amber-400">{streaks.best}<span className="text-sm text-muted-foreground ml-1">días</span></p>
        </div>
        <div className="card !p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">90 días</span>
          </div>
          <p className="font-display text-display-sm">{overallCompletionRate}<span className="text-sm text-muted-foreground ml-1">%</span></p>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {weeklyData.length > 0 && (
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Tendencia semanal</span>
            </div>
            <span className="text-xs text-muted-foreground">Últimas 12 semanas</span>
          </div>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="weekLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(value: number) => [`${value}%`, 'Completado']}
                />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorCompletion)"
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: '#10b981', strokeWidth: 2, stroke: '#fff', r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 30-Day Calendar */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Últimos 30 días</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {calendarData.filter(d => d.completed).length}/30 completados
          </span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-10 gap-[3px]">
          {calendarData.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-medium transition-all ${
                day.completed
                  ? 'bg-accent text-background'
                  : day.isToday
                    ? 'bg-surface-hover border border-dashed border-accent/50 text-foreground'
                    : day.isWeekend
                      ? 'bg-surface-elevated/50 text-muted-foreground'
                      : 'bg-surface-elevated text-muted-foreground'
              }`}
              title={`${day.date}: ${day.completed ? 'Completado' : 'No completado'}`}
            >
              {day.dayNum}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-accent" />
            <span className="text-[10px] text-muted-foreground">Completado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-surface-elevated" />
            <span className="text-[10px] text-muted-foreground">No completado</span>
          </div>
        </div>
      </div>

      {/* Habits Comparison */}
      {allStats.length > 1 && (
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Comparación de hábitos</span>
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allStats} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="habit.name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Completado']}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                  {allStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.habit.id === selectedHabit ? '#10b981' : '#27272a'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Streaks Ranking */}
      <div className="card !p-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium">Rachas actuales</span>
        </div>

        <div className="space-y-3">
          {allStats.sort((a, b) => b.currentStreak - a.currentStreak).map((stat, index) => (
            <div
              key={stat.habit.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                stat.habit.id === selectedHabit ? 'bg-accent/10 border border-accent/20' : 'bg-surface-elevated'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-500/20 text-amber-400' :
                  index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                  index === 2 ? 'bg-orange-600/20 text-orange-500' :
                  'bg-surface-hover text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{stat.habit.name}</p>
                  <p className="text-xs text-muted-foreground">Mejor: {stat.bestStreak} días</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="font-display text-sm font-bold text-orange-400">{stat.currentStreak}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Habit Picker Modal */}
      {showHabitPicker && (
        <>
          <div className="overlay animate-fade-in" onClick={() => setShowHabitPicker(false)} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <h2 className="font-display text-display-sm mb-4">Seleccionar hábito</h2>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {habits.map((habit) => {
                const stats = allStats.find(s => s.habit.id === habit.id)
                return (
                  <button
                    key={habit.id}
                    onClick={() => {
                      setSelectedHabit(habit.id)
                      setShowHabitPicker(false)
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedHabit === habit.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-surface-elevated hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{habit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {habit.type === 'daily_check' ? 'Diario' :
                           habit.type === 'quantity' ? `${habit.target_value} ${habit.unit}/día` :
                           `${habit.target_value} días/semana`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
                          {stats?.completionRate || 0}%
                        </span>
                        {stats && stats.currentStreak > 0 && (
                          <div className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                            <Flame className="w-3 h-3" />
                            {stats.currentStreak}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
