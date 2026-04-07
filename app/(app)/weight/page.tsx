'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingDown, TrendingUp, Target, X, Scale, Calendar, ChevronDown, Camera, Image, ArrowLeftRight } from 'lucide-react'
import { formatDate, getToday } from '@/lib/utils'
import { USER_PROFILE } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip
} from 'recharts'
import type { WeightLog, ProgressPhoto } from '@/types'

export default function WeightPage() {
  const today = new Date()
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month')

  // Progress photos state
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareDate1, setCompareDate1] = useState<string>('')
  const [compareDate2, setCompareDate2] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadWeightLogs()
      loadPhotos()
    }
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
      setError('Error al cargar registros de peso')
    }
    setLoading(false)
  }

  const loadPhotos = async () => {
    if (!user) return
    try {
      const { data } = await (supabase as any)
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (data && data.length > 0) {
        // Generate signed URLs for each photo (valid for 1 hour)
        const photosWithSignedUrls = await Promise.all(
          data.map(async (photo: ProgressPhoto) => {
            const { data: signedData } = await supabase.storage
              .from('progress-photos')
              .createSignedUrl(photo.photo_url, 3600) // 1 hour expiry

            return {
              ...photo,
              photo_url: signedData?.signedUrl || photo.photo_url
            }
          })
        )
        setPhotos(photosWithSignedUrls as ProgressPhoto[])
      }
    } catch (err) {
      console.error('Error loading photos:', err)
    }
  }

  const uploadPhoto = async (file: File, photoType: 'front' | 'side') => {
    if (!user) return
    setUploadingPhoto(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${today}_${photoType}.${fileExt}`

      // Upload to storage (private bucket)
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Save file path to database (not the URL)
      await (supabase as any)
        .from('progress_photos')
        .upsert({
          user_id: user.id,
          date: today,
          photo_type: photoType,
          photo_url: filePath  // Store path, not URL
        }, { onConflict: 'user_id,date,photo_type' })

      await loadPhotos()
      showToast(`Foto ${photoType === 'front' ? 'frontal' : 'lateral'} guardada`)
    } catch (err) {
      console.error('Error uploading photo:', err)
      alert('Error al subir la foto. Asegúrate de que el bucket "progress-photos" exista en Supabase Storage.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, photoType: 'front' | 'side') => {
    const file = e.target.files?.[0]
    if (file) {
      uploadPhoto(file, photoType)
    }
  }

  // Group photos by date
  const photosByDate = photos.reduce((acc, photo) => {
    if (!acc[photo.date]) acc[photo.date] = {}
    acc[photo.date][photo.photo_type] = photo
    return acc
  }, {} as Record<string, Record<string, ProgressPhoto>>)

  const photoDates = Object.keys(photosByDate).sort((a, b) => b.localeCompare(a))

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
  const weightLost = USER_PROFILE.initialWeight - latestWeight
  const progress = ((USER_PROFILE.initialWeight - latestWeight) / (USER_PROFILE.initialWeight - USER_PROFILE.goalWeight)) * 100
  const remaining = Math.max(0, latestWeight - USER_PROFILE.goalWeight)

  // Filter logs based on time range
  const getFilteredLogs = () => {
    const now = new Date()
    let cutoffDate: Date

    switch (timeRange) {
      case 'week':
        cutoffDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      default:
        return weightLogs
    }

    return weightLogs.filter(log => new Date(log.date) >= cutoffDate)
  }

  const filteredLogs = getFilteredLogs()

  // Chart data
  const chartData = [...filteredLogs].reverse().map(log => ({
    date: new Date(log.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    weight: log.weight_kg,
    fullDate: log.date
  }))

  // Stats
  const weekChange = weightLogs.length >= 2 ? (() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const oldLog = weightLogs.find(log => new Date(log.date) <= weekAgo)
    return oldLog ? (weightLogs[0].weight_kg - oldLog.weight_kg).toFixed(1) : null
  })() : null

  // Chart domain
  const weights = chartData.map(d => d.weight)
  const minWeight = Math.min(...weights, USER_PROFILE.goalWeight) - 1
  const maxWeight = Math.max(...weights, USER_PROFILE.initialWeight) + 1

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
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center justify-between animate-scale-in">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button onClick={loadWeightLogs} className="text-xs font-medium underline hover:no-underline">
              Reintentar
            </button>
            <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current Weight */}
        <div className="card !p-5 col-span-2 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent border-purple-500/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Peso actual</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-display-xl text-purple-400">{latestWeight}</span>
                <span className="text-xl text-muted-foreground">kg</span>
              </div>
              {weightLost > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <TrendingDown className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">-{weightLost.toFixed(1)} kg desde inicio</span>
                </div>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Scale className="w-7 h-7 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Goal Card */}
        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Meta</span>
          </div>
          <p className="font-display text-display-sm">{USER_PROFILE.goalWeight} kg</p>
          <p className="text-xs text-muted-foreground mt-1">Faltan {remaining.toFixed(1)} kg</p>
        </div>

        {/* Week Change */}
        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Esta semana</span>
          </div>
          {weekChange ? (
            <>
              <p className={`font-display text-display-sm ${parseFloat(weekChange) <= 0 ? 'text-success' : 'text-danger'}`}>
                {parseFloat(weekChange) > 0 ? '+' : ''}{weekChange} kg
              </p>
              <div className="flex items-center gap-1 mt-1">
                {parseFloat(weekChange) <= 0 ? (
                  <TrendingDown className="w-3 h-3 text-success" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-danger" />
                )}
                <span className="text-xs text-muted-foreground">vs semana pasada</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Sin datos previos</p>
          )}
        </div>
      </div>

      {/* Progress to Goal */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progreso hacia la meta</span>
          <span className="font-display text-sm font-semibold text-accent">
            {Math.max(0, progress).toFixed(0)}%
          </span>
        </div>
        <div className="relative h-3 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Math.max(0, progress), 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{USER_PROFILE.initialWeight} kg</span>
          <span>{USER_PROFILE.goalWeight} kg</span>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Tendencia</span>
            {chartData.length === 1 ? (
              <span className="text-xs text-muted-foreground">Registra más días para ver la tendencia</span>
            ) : (
              <div className="flex bg-surface-elevated rounded-lg p-0.5">
                {(['week', 'month', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-accent text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {range === 'week' ? '7D' : range === 'month' ? '30D' : 'Todo'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minWeight, maxWeight]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(value: number) => [`${value} kg`, 'Peso']}
                />
                <ReferenceLine
                  y={USER_PROFILE.goalWeight}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  dot={{ fill: '#a855f7', strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: '#a855f7', strokeWidth: 2, stroke: '#fff', r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-purple-500 rounded" />
              <span>Peso</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-accent rounded" style={{ borderStyle: 'dashed' }} />
              <span>Meta ({USER_PROFILE.goalWeight} kg)</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Weight Form/Button */}
      {showForm ? (
        <div className="card !p-5 animate-scale-in">
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
      <div className="card !p-4">
        <p className="text-sm font-medium mb-4">Historial reciente</p>
        {weightLogs.length > 0 ? (
          <div className="space-y-0">
            {weightLogs.slice(0, 10).map((log, index) => {
              const prevLog = weightLogs[index + 1]
              const diff = prevLog ? log.weight_kg - prevLog.weight_kg : 0

              return (
                <div key={log.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    {diff !== 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        diff < 0
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}>
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

      {/* Progress Photos Section */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-accent" />
            <p className="text-sm font-medium">Fotos de progreso</p>
          </div>
          <div className="flex gap-2">
            {photoDates.length >= 2 && (
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  showCompare
                    ? 'bg-accent text-background'
                    : 'bg-surface-elevated hover:bg-surface-hover'
                }`}
              >
                <ArrowLeftRight className="w-3 h-3 inline mr-1" />
                Comparar
              </button>
            )}
            <button
              onClick={() => setShowPhotoUpload(!showPhotoUpload)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors"
            >
              <Plus className="w-3 h-3 inline mr-1" />
              Subir
            </button>
          </div>
        </div>

        {/* Upload Section */}
        {showPhotoUpload && (
          <div className="mb-4 p-4 bg-surface-elevated rounded-lg space-y-3">
            <p className="text-xs text-muted-foreground">Sube tus fotos de hoy</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-accent/50 flex flex-col items-center justify-center gap-2 transition-colors">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Frontal</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'front')}
                  disabled={uploadingPhoto}
                />
              </label>
              <label className="cursor-pointer">
                <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-accent/50 flex flex-col items-center justify-center gap-2 transition-colors">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Lateral</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'side')}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            {uploadingPhoto && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Subiendo...</span>
              </div>
            )}
          </div>
        )}

        {/* Compare Mode */}
        {showCompare && photoDates.length >= 2 && (
          <div className="mb-4 p-4 bg-surface-elevated rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha 1</label>
                <select
                  value={compareDate1}
                  onChange={(e) => setCompareDate1(e.target.value)}
                  className="w-full bg-surface rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value="">Seleccionar</option>
                  {photoDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha 2</label>
                <select
                  value={compareDate2}
                  onChange={(e) => setCompareDate2(e.target.value)}
                  className="w-full bg-surface rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value="">Seleccionar</option>
                  {photoDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {compareDate1 && compareDate2 && (
              <div className="space-y-4">
                {/* Front comparison */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Frontal</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface">
                      {photosByDate[compareDate1]?.front ? (
                        <img
                          src={photosByDate[compareDate1].front.photo_url}
                          alt="Frontal"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface">
                      {photosByDate[compareDate2]?.front ? (
                        <img
                          src={photosByDate[compareDate2].front.photo_url}
                          alt="Frontal"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Side comparison */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Lateral</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface">
                      {photosByDate[compareDate1]?.side ? (
                        <img
                          src={photosByDate[compareDate1].side.photo_url}
                          alt="Lateral"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface">
                      {photosByDate[compareDate2]?.side ? (
                        <img
                          src={photosByDate[compareDate2].side.photo_url}
                          alt="Lateral"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photo Gallery */}
        {photoDates.length > 0 ? (
          <div className="space-y-4">
            {photoDates.slice(0, 6).map(date => (
              <div key={date} className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface-elevated">
                    {photosByDate[date]?.front ? (
                      <img
                        src={photosByDate[date].front.photo_url}
                        alt="Frontal"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Sin foto frontal</span>
                      </div>
                    )}
                  </div>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface-elevated">
                    {photosByDate[date]?.side ? (
                      <img
                        src={photosByDate[date].side.photo_url}
                        alt="Lateral"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Sin foto lateral</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sin fotos de progreso</p>
            <p className="text-xs text-muted-foreground mt-1">Sube tu primera foto para comenzar a trackear tu progreso visual</p>
          </div>
        )}
      </div>
    </div>
  )
}
