'use client'

import { useEffect, useState } from 'react'
import { createClient } from './supabase'
import { calculateGymStreak } from './utils'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

export function useSupabase() {
  return createClient()
}

// Shared gym streak used in Sidebar / Header / SideMenu.
// Fetches once per mount; the three chrome components each keep their own copy
// — that's fine for a single-user mobile app and avoids a global store.
export function useGymStreak(): number {
  const { user } = useUser()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      const [sessionsRes, overridesRes] = await Promise.all([
        supabase.from('gym_sessions').select('date').eq('user_id', user.id),
        supabase.from('schedule_overrides').select('date, routine_type').eq('user_id', user.id),
      ])
      if (cancelled) return
      const sessions = (sessionsRes.data as { date: string }[] | null) ?? []
      const overrides = (overridesRes.data as { date: string; routine_type: string }[] | null) ?? []
      setStreak(calculateGymStreak(sessions, overrides))
    })()

    return () => { cancelled = true }
  }, [user])

  return streak
}
