'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, X, Scale, ChevronLeft, ChevronRight, Droplets } from 'lucide-react'
import { getToday } from '@/lib/utils'
import { USER_PROFILE } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { PulseLine } from '@/components/ui/PulseLine'
import type { WeightLog } from '@/types'

// Simple sparkline component
const Sparkline = ({ values, width = 280, height = 100, color = 'var(--signal)' }: {
  values: number[]
  width?: number
  height?: number
  color?: string
}) => {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padding = 10

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPath = `
    M ${padding},${height - padding}
    L ${points.split(' ').map((p, i) => (i === 0 ? 'L ' : '') + p).join(' L ')}
    L ${width - padding},${height - padding}
    Z
  `

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WeightPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7D' | '1M' | '6M' | '1A'>('7D')

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
        .limit(90)
      if (fetchError) throw fetchError
      if (data) setWeightLogs(data as WeightLog[])
    } catch (err) {
      setError('Error al cargar registros')
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
      showToast(`Peso registrado: ${weight} kg`)
    } catch (err) {
      setError('Error al guardar peso')
    }
    setSaving(false)
  }

  const latestWeight = weightLogs[0]?.weight_kg || USER_PROFILE.initialWeight
  const goalWeight = USER_PROFILE.goalWeight
  const weightLost = USER_PROFILE.initialWeight - latestWeight

  // Get filtered logs based on time range
  const getFilteredLogs = () => {
    const now = new Date()
    let cutoffDate: Date

    switch (timeRange) {
      case '7D':
        cutoffDate = new Date(now.setDate(now.getDate() - 7))
        break
      case '1M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case '6M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6))
        break
      default:
        return weightLogs
    }

    return weightLogs.filter(log => new Date(log.date) >= cutoffDate)
  }

  const filteredLogs = getFilteredLogs()
  const chartData = [...filteredLogs].reverse().map(log => log.weight_kg)

  // 7-day average
  const recentLogs = weightLogs.slice(0, 7)
  const avgWeight = recentLogs.length > 0
    ? (recentLogs.reduce((sum, log) => sum + log.weight_kg, 0) / recentLogs.length).toFixed(1)
    : null

  // Find first log date for "desde" text
  const firstLogDate = weightLogs.length > 0
    ? new Date(weightLogs[weightLogs.length - 1].date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : null

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
      <div className="px-5 pt-3 flex items-center justify-between">
        <Link href="/dashboard" className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-ink" />
        </Link>
        <div className="fk-eyebrow">Peso · 2 semanas</div>
        <div className="w-[34px]" />
      </div>

      {/* Hero Stat */}
      <div className="px-5 mt-6">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[88px] font-extralight tracking-tight leading-none">{latestWeight.toFixed(1)}</span>
          <span className="fk-mono text-sm text-ink-4">kg</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {weightLost > 0 && (
            <span className="px-2 py-1 rounded-full text-xs fk-mono font-medium bg-leaf-soft text-leaf">
              ↓ {weightLost.toFixed(1)} kg
            </span>
          )}
          {firstLogDate && (
            <span className="text-xs text-ink-4">desde el {firstLogDate}</span>
          )}
        </div>
      </div>

      {/* Chart Card */}
      <div className="mx-5 mt-6 bg-white border border-ink-7 rounded-[18px] overflow-hidden">
        <div className="p-5 flex justify-between items-start">
          <div>
            <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest">Promedio 7 días</div>
            <div className="font-serif text-[22px] font-light mt-1">
              {avgWeight || '--'} <span className="text-sm text-ink-4">kg</span>
            </div>
          </div>
          <div className="flex gap-1">
            {(['7D', '1M', '6M', '1A'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-[10px] fk-mono font-medium tracking-wide transition-colors ${
                  timeRange === range
                    ? 'bg-ink text-paper'
                    : 'text-ink-4 hover:text-ink'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Sparkline */}
        <div className="px-2 pb-3">
          {chartData.length >= 2 ? (
            <Sparkline values={chartData} width={320} height={120} color="var(--signal)" />
          ) : (
            <div className="h-[120px] flex items-center justify-center text-xs text-ink-4">
              Registra más días para ver la tendencia
            </div>
          )}
        </div>

        {/* Date labels */}
        <div className="flex justify-between px-5 pb-4">
          {['1', '5', '10', '15'].map(d => (
            <span key={d} className="fk-mono text-[9px] text-ink-5">{d} abr</span>
          ))}
        </div>
      </div>

      {/* Quick Log Row */}
      <div
        onClick={() => setShowForm(true)}
        className="mx-5 mt-4 bg-ink text-paper rounded-[14px] p-4 flex items-center gap-3 cursor-pointer hover:bg-ink-2 transition-colors"
      >
        <div className="w-9 h-9 bg-signal rounded-[10px] flex items-center justify-center">
          <Droplets className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium">Registra hoy</div>
          <div className="text-[11px] text-ink-5 mt-0.5">En ayunas, después del baño</div>
        </div>
        <ChevronRight className="w-4 h-4 text-paper" />
      </div>

      {/* Insight Card */}
      {weightLost > 0 && (
        <div className="mx-5 mt-4 bg-leaf-soft rounded-[14px] p-4">
          <div className="fk-eyebrow text-leaf mb-1.5">✧ Patrón</div>
          <div className="font-serif text-[15px] font-light leading-relaxed tracking-tight">
            Bajas consistentemente los <span className="italic">lunes</span>. Tu domingo hidrata bien.
          </div>
        </div>
      )}

      {/* History */}
      <div className="px-5 mt-6">
        <div className="fk-eyebrow mb-3">Historial reciente</div>
        {weightLogs.length > 0 ? (
          <div className="bg-white border border-ink-7 rounded-xl overflow-hidden">
            {weightLogs.slice(0, 7).map((log, index) => {
              const prevLog = weightLogs[index + 1]
              const diff = prevLog ? log.weight_kg - prevLog.weight_kg : 0

              return (
                <div key={log.id} className="flex items-center justify-between p-3 border-b border-ink-7 last:border-0">
                  <span className="text-sm text-ink-4">
                    {new Date(log.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    {diff !== 0 && (
                      <span className={`text-[10px] fk-mono font-medium px-2 py-0.5 rounded-full ${
                        diff < 0
                          ? 'bg-leaf-soft text-leaf'
                          : 'bg-berry-soft text-berry'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                    <span className="font-medium fk-mono text-sm">{log.weight_kg} kg</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-ink-7 rounded-xl p-8 text-center">
            <Scale className="w-10 h-10 text-ink-5 mx-auto mb-3" />
            <p className="text-sm text-ink-4">Sin registros aún</p>
          </div>
        )}
      </div>

      {/* Weight Form Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-[24px] p-5 z-50 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-light">Registrar peso</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-paper-3 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="fk-eyebrow mb-2 block">Peso (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  className="w-full px-4 py-4 rounded-xl border border-ink-7 bg-white text-2xl font-serif text-center"
                  placeholder="80.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setWeight('')
                  }}
                  className="flex-1 py-3 rounded-xl border border-ink-7 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveWeight}
                  disabled={saving || !weight}
                  className="flex-1 py-3 rounded-full bg-ink text-paper font-medium text-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
