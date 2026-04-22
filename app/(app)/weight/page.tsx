'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, X, Scale, ChevronLeft, ChevronRight, Activity, Camera, ImageIcon, Maximize2 } from 'lucide-react'
import { getToday } from '@/lib/utils'
import { USER_PROFILE } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { PulseLine } from '@/components/ui/PulseLine'
import type { WeightLog, ProgressPhoto, PhotoType } from '@/types'

// Calculate BMI from weight (kg) and height (cm)
const calculateBMI = (weightKg: number, heightCm: number = USER_PROFILE.height): number => {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

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
  const [muscleMass, setMuscleMass] = useState('')
  const [bodyFatMass, setBodyFatMass] = useState('')
  const [bodyFatPercentage, setBodyFatPercentage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7D' | '1M' | '6M' | '1A'>('7D')

  // Photo state
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotoType, setSelectedPhotoType] = useState<PhotoType>('front')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [comparePhotos, setComparePhotos] = useState<[ProgressPhoto | null, ProgressPhoto | null]>([null, null])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setError('Error al cargar registros')
    }
    setLoading(false)
  }

  const loadPhotos = async () => {
    if (!user) return
    try {
      const { data, error: fetchError } = await supabase
        .from('progress_photos')
        .select('*')
        .order('date', { ascending: false })
        .limit(50)
      if (fetchError) throw fetchError

      // Get signed URLs for each photo
      if (data && data.length > 0) {
        const photosWithUrls = await Promise.all(
          data.map(async (photo: ProgressPhoto) => {
            const { data: urlData } = await supabase.storage
              .from('progress-photos')
              .createSignedUrl(photo.photo_url, 3600) // 1 hour expiry
            return { ...photo, photo_url: urlData?.signedUrl || photo.photo_url }
          })
        )
        setPhotos(photosWithUrls)
      } else {
        setPhotos([])
      }
    } catch (err) {
      console.error('Error loading photos:', err)
    }
  }

  const uploadPhoto = async (file: File) => {
    if (!user) return
    setUploadingPhoto(true)
    try {
      const today = getToday()
      const fileName = `${user.id}/${today}_${selectedPhotoType}_${Date.now()}.jpg`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, file, { contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      // Save to database
      const { error: dbError } = await supabase
        .from('progress_photos')
        .upsert({
          user_id: user.id,
          date: today,
          photo_type: selectedPhotoType,
          photo_url: fileName,
        }, { onConflict: 'user_id,date,photo_type' })

      if (dbError) throw dbError

      await loadPhotos()
      setShowPhotoModal(false)
      showToast(`Foto ${selectedPhotoType === 'front' ? 'frontal' : 'lateral'} guardada`)
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Error al subir foto')
    }
    setUploadingPhoto(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadPhoto(file)
    }
  }

  const saveWeight = async () => {
    if (!user || !weight) return
    setSaving(true)
    setError(null)
    try {
      const logData: Record<string, any> = {
        user_id: user.id,
        date: getToday(),
        weight_kg: parseFloat(weight),
      }
      if (muscleMass) logData.muscle_mass_kg = parseFloat(muscleMass)
      if (bodyFatMass) logData.body_fat_mass_kg = parseFloat(bodyFatMass)
      if (bodyFatPercentage) logData.body_fat_percentage = parseFloat(bodyFatPercentage)

      const { error: saveError } = await (supabase.from('weight_logs') as any).insert(logData)
      if (saveError) throw saveError
      await loadWeightLogs()
      setShowForm(false)
      setWeight('')
      setMuscleMass('')
      setBodyFatMass('')
      setBodyFatPercentage('')
      showToast(`Composición corporal registrada`)
    } catch (err) {
      setError('Error al guardar')
    }
    setSaving(false)
  }

  const latestLog = weightLogs[0]
  const latestWeight = latestLog?.weight_kg || USER_PROFILE.initialWeight
  const latestMuscleMass = latestLog?.muscle_mass_kg
  const latestBodyFatMass = latestLog?.body_fat_mass_kg
  const latestBodyFatPercentage = latestLog?.body_fat_percentage
  const latestBMI = calculateBMI(latestWeight)
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
        <div className="fk-eyebrow">Composición Corporal</div>
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

      {/* Body Composition Cards */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        {/* IMC Card */}
        <div className="bg-white border border-ink-7 rounded-[14px] p-4">
          <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest mb-1">IMC</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[28px] font-light">{latestBMI.toFixed(1)}</span>
          </div>
          <div className="text-[11px] text-ink-4 mt-1">
            {latestBMI < 18.5 ? 'Bajo peso' : latestBMI < 25 ? 'Normal' : latestBMI < 30 ? 'Sobrepeso' : 'Obesidad'}
          </div>
        </div>

        {/* Body Fat % Card */}
        <div className="bg-white border border-ink-7 rounded-[14px] p-4">
          <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest mb-1">% Grasa</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[28px] font-light">
              {latestBodyFatPercentage ? latestBodyFatPercentage.toFixed(1) : '--'}
            </span>
            <span className="text-sm text-ink-4">%</span>
          </div>
        </div>

        {/* Muscle Mass Card */}
        <div className="bg-white border border-ink-7 rounded-[14px] p-4">
          <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest mb-1">Masa Muscular</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[28px] font-light">
              {latestMuscleMass ? latestMuscleMass.toFixed(1) : '--'}
            </span>
            <span className="text-sm text-ink-4">kg</span>
          </div>
        </div>

        {/* Body Fat Mass Card */}
        <div className="bg-white border border-ink-7 rounded-[14px] p-4">
          <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest mb-1">Masa Grasa</div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[28px] font-light">
              {latestBodyFatMass ? latestBodyFatMass.toFixed(1) : '--'}
            </span>
            <span className="text-sm text-ink-4">kg</span>
          </div>
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
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium">Registra hoy</div>
          <div className="text-[11px] text-ink-5 mt-0.5">Peso y composición corporal</div>
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
              const hasComposition = log.muscle_mass_kg || log.body_fat_percentage || log.body_fat_mass_kg

              return (
                <div key={log.id} className="p-3 border-b border-ink-7 last:border-0">
                  <div className="flex items-center justify-between">
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
                  {hasComposition && (
                    <div className="flex gap-3 mt-2 text-[10px] fk-mono text-ink-4">
                      {log.muscle_mass_kg && (
                        <span>Músculo: {log.muscle_mass_kg} kg</span>
                      )}
                      {log.body_fat_mass_kg && (
                        <span>Grasa: {log.body_fat_mass_kg} kg</span>
                      )}
                      {log.body_fat_percentage && (
                        <span>%Grasa: {log.body_fat_percentage}%</span>
                      )}
                    </div>
                  )}
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

      {/* Progress Photos Section */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="fk-eyebrow">Fotos de progreso</div>
          <button
            onClick={() => setShowPhotoModal(true)}
            className="flex items-center gap-1.5 text-xs text-signal font-medium"
          >
            <Camera className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>

        {photos.length > 0 ? (
          <div className="space-y-4">
            {/* Photo Grid */}
            <div className="grid grid-cols-2 gap-3">
              {photos.slice(0, 4).map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setViewingPhoto(photo)}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-ink-7 cursor-pointer group"
                >
                  <Image
                    src={photo.photo_url}
                    alt={`Foto ${photo.photo_type}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] fk-mono text-white/90 bg-ink/50 px-2 py-0.5 rounded-full">
                        {photo.photo_type === 'front' ? 'Frontal' : 'Lateral'}
                      </span>
                      <span className="text-[10px] fk-mono text-white/70">
                        {new Date(photo.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Compare Button */}
            {photos.length >= 2 && (
              <button
                onClick={() => {
                  const frontPhotos = photos.filter(p => p.photo_type === 'front')
                  if (frontPhotos.length >= 2) {
                    setComparePhotos([frontPhotos[frontPhotos.length - 1], frontPhotos[0]])
                    setCompareMode(true)
                  } else if (photos.length >= 2) {
                    setComparePhotos([photos[photos.length - 1], photos[0]])
                    setCompareMode(true)
                  }
                }}
                className="w-full py-3 rounded-xl border border-ink-7 text-sm font-medium flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Comparar primera vs última
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={() => setShowPhotoModal(true)}
            className="bg-white border border-dashed border-ink-6 rounded-xl p-8 text-center cursor-pointer hover:border-ink-4 transition-colors"
          >
            <Camera className="w-10 h-10 text-ink-5 mx-auto mb-3" />
            <p className="text-sm text-ink-4">Toma tu primera foto de progreso</p>
            <p className="text-xs text-ink-5 mt-1">Frontal o lateral</p>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setShowPhotoModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-[24px] p-5 z-50 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-light">Nueva foto</h2>
              <button onClick={() => setShowPhotoModal(false)} className="w-8 h-8 rounded-full bg-paper-3 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Type Selection */}
            <div className="mb-5">
              <div className="fk-eyebrow mb-3">Tipo de foto</div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPhotoType('front')}
                  className={`flex-1 py-4 rounded-xl border text-center transition-colors ${
                    selectedPhotoType === 'front'
                      ? 'border-signal bg-signal/10 text-signal'
                      : 'border-ink-7 text-ink-4'
                  }`}
                >
                  <div className="text-2xl mb-1">🧍</div>
                  <div className="text-sm font-medium">Frontal</div>
                </button>
                <button
                  onClick={() => setSelectedPhotoType('side')}
                  className={`flex-1 py-4 rounded-xl border text-center transition-colors ${
                    selectedPhotoType === 'side'
                      ? 'border-signal bg-signal/10 text-signal'
                      : 'border-ink-7 text-ink-4'
                  }`}
                >
                  <div className="text-2xl mb-1">🚶</div>
                  <div className="text-sm font-medium">Lateral</div>
                </button>
              </div>
            </div>

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full py-4 rounded-full bg-ink text-paper font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <>
                  <PulseLine w={24} h={12} color="var(--paper)" strokeWidth={2} active />
                  Subiendo...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Tomar o seleccionar foto
                </>
              )}
            </button>

            <p className="text-[11px] text-ink-5 text-center mt-4">
              Las fotos son privadas y solo tú puedes verlas
            </p>
          </div>
        </>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <>
          <div className="fixed inset-0 bg-ink z-50" onClick={() => setViewingPhoto(null)}>
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="text-paper">
                <div className="text-sm font-medium">
                  {viewingPhoto.photo_type === 'front' ? 'Frontal' : 'Lateral'}
                </div>
                <div className="text-xs text-paper/60">
                  {new Date(viewingPhoto.date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-5 h-5 text-paper" />
              </button>
            </div>
            <Image
              src={viewingPhoto.photo_url}
              alt={`Foto ${viewingPhoto.photo_type}`}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}

      {/* Compare Mode Modal */}
      {compareMode && comparePhotos[0] && comparePhotos[1] && (
        <>
          <div className="fixed inset-0 bg-ink z-50">
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="text-paper font-serif text-lg">Comparación</div>
              <button
                onClick={() => setCompareMode(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-paper" />
              </button>
            </div>
            <div className="absolute inset-0 top-16 flex">
              {/* Before */}
              <div className="flex-1 relative">
                <Image
                  src={comparePhotos[0].photo_url}
                  alt="Antes"
                  fill
                  className="object-contain"
                />
                <div className="absolute bottom-4 left-4 bg-ink/70 text-paper px-3 py-1.5 rounded-full text-xs fk-mono">
                  {new Date(comparePhotos[0].date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              {/* Divider */}
              <div className="w-px bg-paper/30" />
              {/* After */}
              <div className="flex-1 relative">
                <Image
                  src={comparePhotos[1].photo_url}
                  alt="Después"
                  fill
                  className="object-contain"
                />
                <div className="absolute bottom-4 right-4 bg-signal text-paper px-3 py-1.5 rounded-full text-xs fk-mono">
                  {new Date(comparePhotos[1].date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Weight Form Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-[24px] p-5 z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-light">Composición corporal</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-paper-3 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Weight - Main field */}
              <div>
                <label className="fk-eyebrow mb-2 block">Peso (kg) *</label>
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

              <div className="pt-2 border-t border-ink-7">
                <div className="fk-eyebrow text-ink-4 mb-3">Composición (opcional)</div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Muscle Mass */}
                  <div>
                    <label className="text-[11px] fk-mono text-ink-4 uppercase tracking-wide mb-1.5 block">Masa Muscular (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      className="w-full px-3 py-3 rounded-xl border border-ink-7 bg-white text-lg font-serif text-center"
                      placeholder="35.0"
                      value={muscleMass}
                      onChange={(e) => setMuscleMass(e.target.value)}
                    />
                  </div>

                  {/* Body Fat Mass */}
                  <div>
                    <label className="text-[11px] fk-mono text-ink-4 uppercase tracking-wide mb-1.5 block">Masa Grasa (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      className="w-full px-3 py-3 rounded-xl border border-ink-7 bg-white text-lg font-serif text-center"
                      placeholder="20.0"
                      value={bodyFatMass}
                      onChange={(e) => setBodyFatMass(e.target.value)}
                    />
                  </div>

                  {/* Body Fat Percentage */}
                  <div className="col-span-2">
                    <label className="text-[11px] fk-mono text-ink-4 uppercase tracking-wide mb-1.5 block">% Grasa Corporal</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      className="w-full px-3 py-3 rounded-xl border border-ink-7 bg-white text-lg font-serif text-center"
                      placeholder="25.0"
                      value={bodyFatPercentage}
                      onChange={(e) => setBodyFatPercentage(e.target.value)}
                    />
                  </div>
                </div>

                {/* Auto-calculated IMC */}
                {weight && (
                  <div className="mt-3 p-3 rounded-xl bg-paper-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] fk-mono text-ink-4 uppercase tracking-wide">IMC calculado</span>
                      <span className="font-serif text-lg">{calculateBMI(parseFloat(weight)).toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setWeight('')
                    setMuscleMass('')
                    setBodyFatMass('')
                    setBodyFatPercentage('')
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
