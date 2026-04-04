'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { getRoutineName } from '@/lib/utils'
import { useUser, useSupabase } from '@/lib/hooks'
import type { GymSession } from '@/types'

export default function HistoryPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<GymSession[]>([])

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user])

  const loadSessions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gym_sessions')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    if (data) setSessions(data)
    setLoading(false)
  }

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/gym" className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-display text-2xl font-bold">Historial</h1>
      </header>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/gym/session/${session.id}`}
            className="card flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{getRoutineName(session.routine_type)}</p>
              <p className="text-sm text-muted">
                {new Date(session.date).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            {session.cardio_minutes && (
              <span className="text-sm text-muted">
                +{session.cardio_minutes}min cardio
              </span>
            )}
          </Link>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-muted">No hay sesiones registradas aún</p>
          <Link href="/gym" className="btn-primary inline-block mt-4">
            Iniciar primera sesión
          </Link>
        </div>
      )}
    </div>
  )
}
