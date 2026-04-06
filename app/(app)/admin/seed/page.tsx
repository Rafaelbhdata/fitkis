'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Database, Check, AlertCircle, Loader2 } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'

// Historical session data from CLAUDE.md
const SEED_SESSIONS = [
  {
    date: '2026-03-23',
    routine_type: 'upper_a',
    notes: 'Primera sesión registrada',
    sets: [
      // Press Banca (Smith) - Serie1: 90lbs/-, Serie2: 80lbs/8, Serie3: 80lbs/7, Serie4: 80lbs/5 | Muy pesado
      { exercise_id: 'press-banca', set_number: 1, lbs: 90, reps: null, feeling: 'muy_pesado' },
      { exercise_id: 'press-banca', set_number: 2, lbs: 80, reps: 8, feeling: 'muy_pesado' },
      { exercise_id: 'press-banca', set_number: 3, lbs: 80, reps: 7, feeling: 'muy_pesado' },
      { exercise_id: 'press-banca', set_number: 4, lbs: 80, reps: 5, feeling: 'muy_pesado' },
      // Press Militar (Mancuernas): 20lbs × (12, 10, 10) | Difícil
      { exercise_id: 'press-militar', set_number: 1, lbs: 20, reps: 12, feeling: 'dificil' },
      { exercise_id: 'press-militar', set_number: 2, lbs: 20, reps: 10, feeling: 'dificil' },
      { exercise_id: 'press-militar', set_number: 3, lbs: 20, reps: 10, feeling: 'dificil' },
      // Pec Deck: 60lbs × (12, 12, 12) | Difícil
      { exercise_id: 'aperturas', set_number: 1, lbs: 60, reps: 12, feeling: 'dificil' },
      { exercise_id: 'aperturas', set_number: 2, lbs: 60, reps: 12, feeling: 'dificil' },
      { exercise_id: 'aperturas', set_number: 3, lbs: 60, reps: 12, feeling: 'dificil' },
      // Elevaciones Laterales: 10lbs × (12, 12, 12) | Difícil
      { exercise_id: 'elevaciones-laterales', set_number: 1, lbs: 10, reps: 12, feeling: 'dificil' },
      { exercise_id: 'elevaciones-laterales', set_number: 2, lbs: 10, reps: 12, feeling: 'dificil' },
      { exercise_id: 'elevaciones-laterales', set_number: 3, lbs: 10, reps: 12, feeling: 'dificil' },
      // Tríceps Polea: Serie1: 40lbs/10, Serie2: 40lbs/6, Serie3: 30lbs/10 | Difícil
      { exercise_id: 'triceps-polea', set_number: 1, lbs: 40, reps: 10, feeling: 'dificil' },
      { exercise_id: 'triceps-polea', set_number: 2, lbs: 40, reps: 6, feeling: 'dificil' },
      { exercise_id: 'triceps-polea', set_number: 3, lbs: 30, reps: 10, feeling: 'dificil' },
    ]
  },
  {
    date: '2026-04-03',
    routine_type: 'upper_a',
    cardio_minutes: 12,
    cardio_speed: 5.5,
    notes: 'Segunda sesión Upper A',
    sets: [
      // Press Banca (Mancuernas): 25lbs × (10, 10, 10, 10)
      { exercise_id: 'press-banca', set_number: 1, lbs: 25, reps: 10, feeling: 'perfecto' },
      { exercise_id: 'press-banca', set_number: 2, lbs: 25, reps: 10, feeling: 'perfecto' },
      { exercise_id: 'press-banca', set_number: 3, lbs: 25, reps: 10, feeling: 'perfecto' },
      { exercise_id: 'press-banca', set_number: 4, lbs: 25, reps: 10, feeling: 'perfecto' },
      // Press Militar (Mancuernas): Serie1-3: 25lbs/10, Serie4: 25lbs/8
      { exercise_id: 'press-militar', set_number: 1, lbs: 25, reps: 10, feeling: 'perfecto' },
      { exercise_id: 'press-militar', set_number: 2, lbs: 25, reps: 10, feeling: 'perfecto' },
      { exercise_id: 'press-militar', set_number: 3, lbs: 25, reps: 10, feeling: 'perfecto' },
      { exercise_id: 'press-militar', set_number: 4, lbs: 25, reps: 8, feeling: 'dificil' },
      // Aperturas (Mancuernas banco): 20lbs × (12, 10, 10) | Difícil
      { exercise_id: 'aperturas', set_number: 1, lbs: 20, reps: 12, feeling: 'dificil' },
      { exercise_id: 'aperturas', set_number: 2, lbs: 20, reps: 10, feeling: 'dificil' },
      { exercise_id: 'aperturas', set_number: 3, lbs: 20, reps: 10, feeling: 'dificil' },
      // Elevaciones Laterales: 10lbs × (12, 12, 12)
      { exercise_id: 'elevaciones-laterales', set_number: 1, lbs: 10, reps: 12, feeling: 'perfecto' },
      { exercise_id: 'elevaciones-laterales', set_number: 2, lbs: 10, reps: 12, feeling: 'perfecto' },
      { exercise_id: 'elevaciones-laterales', set_number: 3, lbs: 10, reps: 12, feeling: 'perfecto' },
      // Tríceps Polea: Serie1-2: 30lbs/12, Serie3: 30lbs/8 | Difícil
      { exercise_id: 'triceps-polea', set_number: 1, lbs: 30, reps: 12, feeling: 'perfecto' },
      { exercise_id: 'triceps-polea', set_number: 2, lbs: 30, reps: 12, feeling: 'perfecto' },
      { exercise_id: 'triceps-polea', set_number: 3, lbs: 30, reps: 8, feeling: 'dificil' },
    ]
  }
]

export default function SeedPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ session: string; status: 'success' | 'error' | 'exists'; message: string }[]>([])

  const runSeed = async () => {
    if (!user) return
    setLoading(true)
    setResults([])

    for (const sessionData of SEED_SESSIONS) {
      // Check if session already exists for this date
      const { data: existing } = await supabase
        .from('gym_sessions')
        .select('id')
        .eq('date', sessionData.date)
        .eq('routine_type', sessionData.routine_type)
        .single()

      if (existing) {
        setResults(prev => [...prev, {
          session: `${sessionData.routine_type} - ${sessionData.date}`,
          status: 'exists',
          message: 'Sesión ya existe'
        }])
        continue
      }

      // Insert session
      const { data: session, error: sessionError } = await (supabase
        .from('gym_sessions') as any)
        .insert({
          user_id: user.id,
          date: sessionData.date,
          routine_type: sessionData.routine_type,
          cardio_minutes: sessionData.cardio_minutes || null,
          cardio_speed: sessionData.cardio_speed || null,
          notes: sessionData.notes || null,
        })
        .select()
        .single()

      if (sessionError || !session) {
        setResults(prev => [...prev, {
          session: `${sessionData.routine_type} - ${sessionData.date}`,
          status: 'error',
          message: sessionError?.message || 'Error al crear sesión'
        }])
        continue
      }

      // Insert sets
      const setsToInsert = sessionData.sets.map(set => ({
        session_id: session.id,
        exercise_id: set.exercise_id,
        set_number: set.set_number,
        lbs: set.lbs,
        reps: set.reps,
        feeling: set.feeling,
      }))

      const { error: setsError } = await (supabase
        .from('session_sets') as any)
        .insert(setsToInsert)

      if (setsError) {
        setResults(prev => [...prev, {
          session: `${sessionData.routine_type} - ${sessionData.date}`,
          status: 'error',
          message: `Sesión creada pero error en sets: ${setsError.message}`
        }])
      } else {
        setResults(prev => [...prev, {
          session: `${sessionData.routine_type} - ${sessionData.date}`,
          status: 'success',
          message: `Creada con ${sessionData.sets.length} sets`
        }])
      }
    }

    setLoading(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center gap-4 pt-2">
        <Link href="/dashboard" className="btn-icon -ml-2" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-display-sm">Admin: Seed Data</h1>
          <p className="text-xs text-muted-foreground">Cargar datos históricos</p>
        </div>
      </header>

      <div className="card !p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-medium">Sesiones Históricas de Gym</h2>
            <p className="text-xs text-muted-foreground">2 sesiones Upper A (23 mar, 3 abr 2026)</p>
          </div>
        </div>

        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <p>Este seed cargará:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Sesión 1: Upper A - 23 marzo 2026 (17 sets)</li>
            <li>Sesión 2: Upper A - 3 abril 2026 (17 sets + cardio)</li>
          </ul>
        </div>

        <button
          onClick={runSeed}
          disabled={loading || !user}
          className="w-full btn-primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando datos...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Ejecutar Seed
            </>
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="card !p-4">
          <h3 className="font-medium mb-3">Resultados</h3>
          <div className="space-y-2">
            {results.map((result, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  result.status === 'success' ? 'bg-success/10' :
                  result.status === 'exists' ? 'bg-amber-500/10' :
                  'bg-danger/10'
                }`}
              >
                {result.status === 'success' ? (
                  <Check className="w-4 h-4 text-success" />
                ) : result.status === 'exists' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-danger" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{result.session}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
