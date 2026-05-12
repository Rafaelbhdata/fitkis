// app/test/exercises/page.tsx
//
// Throwaway POC page to validate the ExerciseDB integration. Loads 10
// exercises via /api/exercises/search and renders the GIF + metadata in
// a grid. Not linked from anywhere — visit /test/exercises directly.

'use client'

import { useEffect, useState } from 'react'

type Exercise = {
  id: string
  name: string
  gifUrl: string
  target: string
  bodyPart: string
  equipment: string
  secondaryMuscles: string[]
  instructions: string[]
}

export default function TestExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('')

  const load = async (qs = '') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/exercises/search?limit=10${qs ? `&${qs}` : ''}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.detail || json?.error || `HTTP ${res.status}`)
        setExercises([])
      } else {
        setExercises(json.exercises ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-light text-ink mb-1">
          ExerciseDB · POC
        </h1>
        <p className="text-sm text-ink-4 mb-6">
          GET /api/exercises/search · primeros 10 resultados.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            ['', 'Cualquiera'],
            ['bodyPart=back', 'Espalda'],
            ['bodyPart=chest', 'Pecho'],
            ['target=biceps', 'Bíceps'],
            ['equipment=barbell', 'Barra'],
            ['equipment=dumbbell', 'Mancuerna'],
          ].map(([qs, label]) => (
            <button
              key={qs}
              onClick={() => {
                setFilter(label)
                load(qs)
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                filter === label
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-white text-ink border-ink-7 hover:border-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-sm text-ink-4">Cargando ejercicios…</div>
        )}

        {error && (
          <div className="rounded-xl bg-berry-soft border border-berry/30 px-4 py-3 mb-6">
            <div className="text-sm font-medium text-berry mb-1">
              Error al cargar ExerciseDB
            </div>
            <div className="text-xs text-berry/80 font-mono break-all">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && exercises.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="bg-white border border-ink-7 rounded-2xl overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/exercises/gif?url=${encodeURIComponent(ex.gifUrl)}`}
                  alt={ex.name}
                  className="w-full aspect-square object-cover bg-paper-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.3'
                  }}
                />
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-widest text-ink-4 font-mono mb-1">
                    {ex.bodyPart} · {ex.equipment}
                  </div>
                  <div className="font-medium text-ink capitalize mb-1">
                    {ex.name}
                  </div>
                  <div className="text-xs text-ink-3">
                    Target: <span className="font-medium">{ex.target}</span>
                  </div>
                  {ex.secondaryMuscles.length > 0 && (
                    <div className="text-xs text-ink-4 mt-1">
                      También: {ex.secondaryMuscles.join(', ')}
                    </div>
                  )}
                  <a
                    href={ex.gifUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[10px] text-signal underline mt-2 break-all font-mono"
                  >
                    {ex.gifUrl}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && exercises.length === 0 && (
          <div className="text-sm text-ink-4">Sin resultados.</div>
        )}
      </div>
    </div>
  )
}
