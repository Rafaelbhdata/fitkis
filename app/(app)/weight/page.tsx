'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingDown, Target, Loader2 } from 'lucide-react'
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

  useEffect(() => {
    if (user) {
      loadWeightLogs()
    }
  }, [user])

  const loadWeightLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    if (!error && data) {
      setWeightLogs(data)
    }
    setLoading(false)
  }

  const saveWeight = async () => {
    if (!user || !weight) return

    setSaving(true)
    const { error } = await supabase.from('weight_logs').insert({
      user_id: user.id,
      date: getToday(),
      weight_kg: parseFloat(weight),
    })

    if (!error) {
      await loadWeightLogs()
      setShowForm(false)
      setWeight('')
    }
    setSaving(false)
  }

  const latestWeight = weightLogs[0]?.weight_kg || USER_PROFILE.initialWeight
  const weightLost = USER_PROFILE.initialWeight - latestWeight
  const progress = ((USER_PROFILE.initialWeight - latestWeight) / (USER_PROFILE.initialWeight - USER_PROFILE.goalWeight)) * 100

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Peso</h1>
        <p className="text-muted capitalize">{formatDate(today)}</p>
      </header>

      {/* Peso actual */}
      <section className="card text-center">
        <p className="text-sm text-muted mb-1">Peso actual</p>
        <p className="font-display text-5xl font-bold text-accent">{latestWeight}</p>
        <p className="text-xl text-muted">kg</p>

        {weightLost > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4 text-green-500">
            <TrendingDown className="w-5 h-5" />
            <span className="font-medium">-{weightLost.toFixed(1)} kg desde el inicio</span>
          </div>
        )}
      </section>

      {/* Progreso a la meta */}
      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            <span className="font-medium">Meta: {USER_PROFILE.goalWeight} kg</span>
          </div>
          <span className="text-sm text-muted">{Math.max(0, progress).toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${Math.min(Math.max(0, progress), 100)}%` }}
          />
        </div>
        <p className="text-sm text-muted mt-2">
          Faltan {Math.max(0, latestWeight - USER_PROFILE.goalWeight).toFixed(1)} kg
        </p>
      </section>

      {/* Formulario de registro */}
      {showForm ? (
        <section className="card">
          <h2 className="font-display text-lg font-semibold mb-4">Registrar peso</h2>
          <div className="space-y-4">
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
              />
            </div>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setShowForm(false)
                  setWeight('')
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={saveWeight}
                disabled={saving || !weight}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <button
          className="w-full btn-primary flex items-center justify-center gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-5 h-5" />
          Registrar peso de hoy
        </button>
      )}

      {/* Historial */}
      <section className="card">
        <h2 className="text-sm font-medium text-muted mb-3">Historial</h2>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : weightLogs.length > 0 ? (
          <div className="space-y-2">
            {weightLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-muted">
                  {new Date(log.date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="font-medium">{log.weight_kg} kg</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted py-4">Sin registros aún</p>
        )}
      </section>
    </div>
  )
}
