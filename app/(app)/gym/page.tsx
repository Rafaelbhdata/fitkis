'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ROUTINES, ROUTINE_SCHEDULE } from '@/lib/constants'
import { formatDuration, formatDateISO } from '@/lib/utils'
import { ChevronRight, ChevronLeft, Play, History, Dumbbell, Settings, Coffee, TrendingUp, Check } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import type { GymSession, SessionSet, RoutineType, Routine, ScheduleOverride } from '@/types'

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const jsDayToUiIndex = (jsDay: number) => (jsDay + 6) % 7

export default function GymPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayIndex = jsDayToUiIndex(today.getDay())
  const todayISO = formatDateISO(today)

  const [loading, setLoading] = useState(true)
  const [weekSessions, setWeekSessions] = useState<Record<string, GymSession>>({})
  const [weekOverrides, setWeekOverrides] = useState<Record<string, string>>({})
  const [lastSession, setLastSession] = useState<{ session: GymSession; sets: SessionSet[] } | null>(null)

  // Get the week dates (Monday-first)
  const getWeekDates = () => {
    const dates: Date[] = []
    const startOfWeek = new Date(today)
    const daysFromMonday = (today.getDay() + 6) % 7
    startOfWeek.setDate(today.getDate() - daysFromMonday)
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates()

  useEffect(() => {
    if (user) loadWeekData()
  }, [user])

  const loadWeekData = async () => {
    setLoading(true)
    const startDate = formatDateISO(weekDates[0])
    const endDate = formatDateISO(weekDates[6])

    try {
      const [overridesRes, sessionsRes] = await Promise.all([
        (supabase as any).from('schedule_overrides').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('gym_sessions').select('*').gte('date', startDate).lte('date', endDate)
      ])

      if (overridesRes.data) {
        const map: Record<string, string> = {}
        ;(overridesRes.data as ScheduleOverride[]).forEach(o => { map[o.date] = o.routine_type })
        setWeekOverrides(map)
      }

      if (sessionsRes.data) {
        const map: Record<string, GymSession> = {}
        ;(sessionsRes.data as GymSession[]).forEach(s => { map[s.date] = s })
        setWeekSessions(map)
      }
    } catch (err) {
      console.error('Error loading week data:', err)
    }
    setLoading(false)
  }

  // Get routine for today
  const getRoutineForDate = (date: Date): string => {
    const dateISO = formatDateISO(date)
    if (weekOverrides[dateISO]) return weekOverrides[dateISO]
    return ROUTINE_SCHEDULE[date.getDay()]
  }

  const routineKey = getRoutineForDate(today)
  const isRest = routineKey === 'rest'
  const routine: Routine | null = isRest ? null : ROUTINES[routineKey]

  // Load last session for this routine type
  useEffect(() => {
    if (user && routine) {
      loadLastSession(routineKey as RoutineType)
    }
  }, [user, routineKey])

  const loadLastSession = async (type: RoutineType) => {
    try {
      const { data: sessionData } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('routine_type', type)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (sessionData) {
        const session = sessionData as GymSession
        const { data: setsData } = await supabase
          .from('session_sets')
          .select('*')
          .eq('session_id', session.id)
          .order('exercise_id')
          .order('set_number')

        setLastSession({ session, sets: (setsData || []) as SessionSet[] })
      }
    } catch (err) {
      setLastSession(null)
    }
  }

  const getLastWeight = (exerciseId: string): number | null => {
    if (!lastSession) return null
    const exerciseSets = lastSession.sets.filter(s => s.exercise_id === exerciseId && s.lbs)
    return exerciseSets.length > 0 ? exerciseSets[0].lbs || null : null
  }

  // Calculate week stats
  const completedThisWeek = Object.keys(weekSessions).length

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
      {/* Header */}
      <div className="px-5 pt-3 flex items-center justify-between">
        <Link href="/dashboard" className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-ink" />
        </Link>
        <div className="text-center">
          <div className="fk-eyebrow">Semana {Math.ceil(today.getDate() / 7)} · {routine?.name.split(' ')[0] || 'Descanso'}</div>
          <div className="text-sm font-medium">Entrenamiento</div>
        </div>
        <Link href="/gym/history" className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 flex items-center justify-center">
          <Settings className="w-4 h-4 text-ink" />
        </Link>
      </div>

      {/* Week Progress Card */}
      <div className="mx-5 mt-5 bg-ink text-paper rounded-[20px] p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="fk-eyebrow text-ink-5">Esta semana</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif text-5xl font-light tracking-tighter">{completedThisWeek}</span>
              <span className="fk-mono text-sm text-ink-5">/ 4 días</span>
            </div>
          </div>
          {completedThisWeek >= 3 && (
            <span className="px-2 py-1 rounded-full text-xs fk-mono font-medium uppercase bg-signal/15 text-signal-2">
              En racha
            </span>
          )}
        </div>

        {/* Week dots */}
        <div className="flex gap-2 mb-4">
          {weekDates.map((date, i) => {
            const dateISO = formatDateISO(date)
            const dayRoutine = getRoutineForDate(date)
            const hasSession = weekSessions[dateISO]
            const isToday = i === todayIndex
            const isPast = date < today
            const isGymDay = dayRoutine !== 'rest'

            let bgColor = 'bg-white/10'
            if (hasSession) bgColor = 'bg-signal'
            else if (isPast && isGymDay) bgColor = 'bg-berry/50'
            else if (isToday) bgColor = 'bg-white/30'

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
                  {hasSession && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="fk-mono text-[9px] text-ink-5">{DAY_NAMES[i]}</span>
              </div>
            )
          })}
        </div>

        <PulseLine w={280} h={28} color="var(--signal)" strokeWidth={1.8} active />
      </div>

      {/* Today's Workout */}
      <div className="px-5 mt-6">
        <div className="fk-eyebrow mb-2.5">Hoy</div>

        {routine ? (
          <>
            {/* Routine Hero */}
            <div className="bg-cream rounded-[20px] p-5 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-serif text-3xl font-light tracking-tight mb-1">{routine.name}</h2>
                  <p className="text-sm text-ink-3">{routine.subtitle}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-signal flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Muscle tags */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {routine.muscles.map(muscle => (
                  <span key={muscle} className="px-2 py-0.5 rounded-full text-xs fk-mono font-medium bg-signal-soft text-signal">
                    {muscle}
                  </span>
                ))}
              </div>

              {/* Start button */}
              <Link
                href={`/gym/session/new?routine=${routineKey}`}
                className="w-full py-3 rounded-full bg-ink text-paper flex items-center justify-center gap-2 text-sm font-semibold hover:bg-ink-2 transition-colors"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Iniciar entrenamiento
              </Link>
            </div>

            {/* Exercise List */}
            <div className="fk-eyebrow mb-2.5">Ejercicios · {routine.exercises.length}</div>
            <div className="bg-white border border-ink-7 rounded-xl overflow-hidden">
              {routine.exercises.map((exercise, i) => {
                const lastWeight = getLastWeight(exercise.id)
                return (
                  <div key={exercise.id} className="flex items-center gap-3 p-3 border-b border-ink-7 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-paper-3 flex items-center justify-center fk-mono text-xs font-semibold text-ink-3">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{exercise.name}</p>
                      <p className="text-xs text-ink-4">{exercise.equipment}</p>
                    </div>
                    <div className="text-right">
                      <p className="fk-mono text-sm font-medium">{exercise.sets}×{exercise.reps}</p>
                      {lastWeight && (
                        <p className="text-[10px] text-signal font-medium">{lastWeight} {exercise.weightUnit}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="bg-cream rounded-[20px] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-paper-3 flex items-center justify-center">
              <Coffee className="w-8 h-8 text-ink-3" />
            </div>
            <h2 className="font-serif text-2xl font-light mb-2">Día de descanso</h2>
            <p className="text-sm text-ink-4 max-w-[240px] mx-auto">
              Tu cuerpo necesita recuperarse. Vuelve con más fuerza mañana.
            </p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="px-5 mt-6 grid grid-cols-2 gap-3">
        <Link href="/gym/history" className="bg-white border border-ink-7 rounded-xl p-4 flex items-center gap-3 hover:bg-paper-2 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-paper-3 flex items-center justify-center">
            <History className="w-5 h-5 text-ink-3" />
          </div>
          <div>
            <p className="text-sm font-medium">Historial</p>
            <p className="text-xs text-ink-4">Ver sesiones</p>
          </div>
        </Link>
        <Link href="/gym/progress" className="bg-white border border-ink-7 rounded-xl p-4 flex items-center gap-3 hover:bg-paper-2 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-signal-soft flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-signal" />
          </div>
          <div>
            <p className="text-sm font-medium">Progreso</p>
            <p className="text-xs text-ink-4">Ver gráficas</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
