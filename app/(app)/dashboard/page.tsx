'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDayOfWeek, getRoutineForDay, getRoutineName, getToday, calculateGymStreak, calculateDietStreak } from '@/lib/utils'
import { DAILY_BUDGET, ROUTINES, DEFAULT_DAILY_BUDGET } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import {
  Dumbbell,
  ChevronRight,
  Apple,
  BookOpen,
  Flame,
  X,
} from 'lucide-react'
import { PulseLine } from '@/components/ui/PulseLine'
import type { FoodGroup, FoodLog, WeightLog, Habit, HabitLog, GymSession, ScheduleOverride, DailyBudget } from '@/types'

export default function DashboardPage() {
  const today = new Date()
  const todayStr = getToday()
  const dayOfWeek = getDayOfWeek()
  const routineType = getRoutineForDay(dayOfWeek)
  const { user } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [allFoodLogs, setAllFoodLogs] = useState<FoodLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [gymSessions, setGymSessions] = useState<GymSession[]>([])
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([])
  const [userBudget, setUserBudget] = useState<DailyBudget>(DEFAULT_DAILY_BUDGET)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

      const [foodRes, allFoodRes, weightRes, habitsRes, habitLogsRes, gymRes, overridesRes, dietConfigRes] = await Promise.all([
        supabase.from('food_logs').select('*').eq('date', todayStr),
        supabase.from('food_logs').select('date, group_type, quantity').gte('date', ninetyDaysAgoStr),
        supabase.from('weight_logs').select('*').order('date', { ascending: false }).limit(14),
        supabase.from('habits').select('*').eq('active', true),
        supabase.from('habit_logs').select('*').eq('date', todayStr),
        supabase.from('gym_sessions').select('*').order('date', { ascending: false }).limit(90),
        (supabase as any).from('schedule_overrides').select('*').gte('date', ninetyDaysAgoStr),
        (supabase as any).from('diet_configs').select('*').eq('user_id', user?.id).lte('effective_date', todayStr).order('effective_date', { ascending: false }).limit(1),
      ])
      if (foodRes.data) setFoodLogs(foodRes.data as FoodLog[])
      if (allFoodRes.data) setAllFoodLogs(allFoodRes.data as FoodLog[])
      if (weightRes.data) setWeightLogs(weightRes.data as WeightLog[])
      if (habitsRes.data) setHabits(habitsRes.data as Habit[])
      if (habitLogsRes.data) setHabitLogs(habitLogsRes.data as HabitLog[])
      if (gymRes.data) setGymSessions(gymRes.data as GymSession[])
      if (overridesRes?.data) setScheduleOverrides(overridesRes.data as ScheduleOverride[])
      if (dietConfigRes?.data) {
        const config = dietConfigRes.data
        setUserBudget({
          verdura: config.verdura,
          fruta: config.fruta,
          carb: config.carb,
          leguminosa: config.leguminosa,
          proteina: config.proteina,
          grasa: config.grasa,
        })
      }
    } catch (err) {
      setError('Error al cargar datos')
    }
    setLoading(false)
  }

  // Calculate consumed per group
  const consumed: Record<FoodGroup, number> = { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 }
  foodLogs.forEach(log => { consumed[log.group_type] += log.quantity })

  // Calculate streaks
  const gymStreak = calculateGymStreak(gymSessions, scheduleOverrides)
  const dietStreak = calculateDietStreak(allFoodLogs, userBudget)

  // Calculate totals
  const totalConsumed = Object.values(consumed).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(DAILY_BUDGET).reduce((a, b) => a + b, 0)

  // Deduplicate habits
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

  // Pulse score (simplified - combine metrics)
  const pulseScore = Math.round(
    ((totalConsumed / totalBudget) * 25) + // Food: 25%
    (gymStreak > 0 ? 25 : 0) + // Movement: 25%
    25 + // Sleep placeholder: 25%
    ((completedHabits / Math.max(uniqueHabits.length, 1)) * 25) // Mood/habits: 25%
  )

  // Get greeting and user name
  const userName = user?.email?.split('@')[0] || 'Usuario'
  const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1)

  // Motivational quote based on streak
  const getMotivationalQuote = () => {
    if (gymStreak >= 7) return `Llevas ${gymStreak} días moviéndote. Tu cuerpo ya lo nota.`
    if (gymStreak >= 3) return `${gymStreak} días en racha. Sigue así.`
    if (gymStreak >= 1) return 'Un buen inicio. Cada día cuenta.'
    return 'Hoy es un buen día para empezar.'
  }

  // Calculate missing vegetables
  const missingVerduras = Math.max(0, DAILY_BUDGET.verdura - consumed.verdura)

  // Date formatting
  const dateStr = today.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

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
        <div className="mx-5 mb-4 p-3 bg-berry-soft border border-berry/20 rounded-lg text-berry text-sm flex items-center justify-between">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="text-xs font-medium underline hover:no-underline">
              Reintentar
            </button>
            <button onClick={() => setError(null)} className="text-berry hover:text-berry/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Greeting Block */}
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="fk-eyebrow mb-1">{capitalizedDate}</div>
            <h1 className="font-serif text-4xl font-light tracking-tight leading-none">
              Hola, <span className="italic">{capitalizedName}</span>.
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-paper-3 flex items-center justify-center font-serif text-base font-medium">
            {capitalizedName.charAt(0)}
          </div>
        </div>
        <p className="font-serif text-[17px] leading-relaxed text-ink-2 italic font-light max-w-[260px]">
          "{getMotivationalQuote().split(String(gymStreak))[0]}
          {gymStreak > 0 && <span className="not-italic text-signal font-medium">{gymStreak} días</span>}
          {getMotivationalQuote().split(String(gymStreak))[1]}"
        </p>
      </div>

      {/* Hero Pulse Card */}
      <div className="mx-5 bg-ink text-paper rounded-[20px] p-[22px] relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="fk-eyebrow text-ink-5">Tu pulso · hoy</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif text-[64px] font-light tracking-tighter leading-[0.9]">{pulseScore}</span>
              <span className="fk-mono text-[11px] text-ink-5 uppercase tracking-wider">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            {gymStreak > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs fk-mono font-medium uppercase tracking-wider bg-signal/15 text-signal-2">
                <Flame className="w-2.5 h-2.5" /> Racha {gymStreak}
              </span>
            )}
          </div>
        </div>

        <div className="my-3">
          <PulseLine w={280} h={36} color="var(--signal)" strokeWidth={1.8} active />
        </div>

        <div className="grid grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10">
          {[
            { l: 'Comida', v: `${totalConsumed}/${totalBudget}`, c: 'var(--leaf)' },
            { l: 'Mov.', v: routineType ? 'Gym' : 'Rest', c: 'var(--signal)' },
            { l: 'Sueño', v: '7:20', c: 'var(--sky)' },
            { l: 'Ánimo', v: completedHabits.toString(), c: 'var(--honey)' },
          ].map(m => (
            <div key={m.l}>
              <div className="w-1.5 h-1.5 rounded-full mb-1.5" style={{ background: m.c }} />
              <div className="fk-mono text-[10px] text-ink-5 uppercase tracking-wider">{m.l}</div>
              <div className="font-serif text-lg font-normal mt-0.5">{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Up Section */}
      <div className="px-5 pt-6">
        <div className="flex items-baseline justify-between mb-3">
          <div className="fk-eyebrow">Lo que sigue</div>
          <span className="fk-mono text-[10px] text-ink-4">
            {(routineType ? 1 : 0) + (missingVerduras > 0 ? 1 : 0) + 1} pendientes
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Workout Card */}
          {routineType && (
            <Link
              href="/gym"
              className="flex items-center gap-3 p-3 bg-white border border-ink-7 rounded-xl hover:bg-paper-2 transition-colors"
            >
              <div className="w-[34px] h-[34px] rounded-[10px] bg-signal-soft text-signal flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{getRoutineName(routineType)}</div>
                <div className="fk-mono text-[10px] text-ink-4 mt-0.5 tracking-wider">
                  {ROUTINES[routineType]?.exercises.length || 5} EJERCICIOS · HOY
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-4" />
            </Link>
          )}

          {/* Missing Vegetables Card */}
          {missingVerduras > 0 && (
            <Link
              href="/food"
              className="flex items-center gap-3 p-3 bg-white border border-ink-7 rounded-xl hover:bg-paper-2 transition-colors"
            >
              <div className="w-[34px] h-[34px] rounded-[10px] bg-leaf-soft text-leaf flex items-center justify-center">
                <Apple className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Te faltan <span className="font-serif italic">{missingVerduras} verduras</span>
                </div>
                <div className="fk-mono text-[10px] text-ink-4 mt-0.5 tracking-wider">
                  SUGERENCIA SMAE · CENA
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-4" />
            </Link>
          )}

          {/* Journal Card */}
          <Link
            href="/habits"
            className="flex items-center gap-3 p-3 bg-white border border-ink-7 rounded-xl hover:bg-paper-2 transition-colors"
          >
            <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-soft text-sky flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Hábitos de hoy</div>
              <div className="fk-mono text-[10px] text-ink-4 mt-0.5 tracking-wider">
                {completedHabits}/{uniqueHabits.length} COMPLETADOS
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
