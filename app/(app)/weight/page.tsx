'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingDown, Target, X, Minus } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { USER_PROFILE } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import type { WeightLog } from '@/types'

export default function WeightPage() {
  const today = new Date()
  const { user } = useUser()
  const supabase = useSupabase()
  const [showForm, setShowForm] = useState(false)
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadWeightLogs()
  }, [user])

  const loadWeightLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('weight_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)
      if (fetchError) throw fetchError
      if (data) setWeightLogs(data as WeightLog[])
    } catch (err) {
      setError('Error al cargar registros de peso')
    }
    setLoading(false)
  }

  const saveWeight = async () => {
    if (!user || !weight) return
    setSaving(true)
    setError(null)
    try {
      const { error: saveError } = await (supabase.from('weight_logs') as any).insert({
        user_id: user.id,
        date: getToday(),
        weight_kg: parseFloat(weight),
      })
      if (saveError) throw saveError
      await loadWeightLogs()
      setShowForm(false)
      setWeight('')
    } catch (err) {
      setError('Error al guardar peso')
    }
    setSaving(false)
  }

  const latestWeight = weightLogs[0]?.weight_kg || USER_PROFILE.initialWeight
  const weightLost = USER_PROFILE.initialWeight - latestWeight
  const progress = ((USER_PROFILE.initialWeight - latestWeight) / (USER_PROFILE.initialWeight - USER_PROFILE.goalWeight)) * 100

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="pt-2">
        <p className="text-sm text-muted-foreground mb-1 capitalize">{formatDate(today)}</p>
        <h1 className="font-display text-display-md text-foreground">Peso</h1>
      </header>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center justify-between animate-scale-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Current Weight - Hero */}
      <div className="card text-center py-8">
        <p className="section-label">Peso actual</p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-display text-display-xl text-accent">{latestWeight}</span>
          <span className="text-xl text-muted">kg</span>
        </div>

        {weightLost > 0 && (
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm">
            <TrendingDown className="w-4 h-4" />
            <span className="font-medium">-{weightLost.toFixed(1)} kg desde el inicio</span>
          </div>
        )}
      </div>

      {/* Progress to Goal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Meta: {USER_PROFILE.goalWeight} kg</p>
              <p className="text-xs text-muted">Faltan {Math.max(0, latestWeight - USER_PROFILE.goalWeight).toFixed(1)} kg</p>
            </div>
          </div>
          <span className="font-display text-lg font-semibold text-accent">
            {Math.max(0, progress).toFixed(0)}%
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill bg-accent"
            style={{ width: `${Math.min(Math.max(0, progress), 100)}%` }}
          />
        </div>
      </div>

      {/* Add Weight Form/Button */}
      {showForm ? (
        <div className="card animate-scale-in">
          <h2 className="font-display text-display-sm mb-5">Registrar peso</h2>
          <div className="space-y-5">
            <div>
              <label className="label">Peso (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                className="input"
                placeholder="Ej: 85.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 btn-secondary"
                onClick={() => {
                  setShowForm(false)
                  setWeight('')
                }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 btn-primary"
                onClick={saveWeight}
                disabled={saving || !weight}
              >
                {saving ? (
                  <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
                ) : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="w-full btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-5 h-5" />
          Registrar peso de hoy
        </button>
      )}

      {/* History */}
      <div className="card">
        <p className="section-label">Historial reciente</p>
        {weightLogs.length > 0 ? (
          <div className="space-y-0">
            {weightLogs.slice(0, 10).map((log, index) => {
              const prevLog = weightLogs[index + 1]
              const diff = prevLog ? log.weight_kg - prevLog.weight_kg : 0

              return (
                <div key={log.id} className="list-item">
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    {diff !== 0 && (
                      <span className={`text-xs font-medium ${diff < 0 ? 'text-success' : 'text-danger'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                    <span className="font-medium tabular-nums">{log.weight_kg} kg</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-muted py-8">Sin registros aún</p>
        )}
      </div>
    </div>
  )
}
