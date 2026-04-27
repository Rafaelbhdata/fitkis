'use client'

import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, X, Scale, ChevronLeft, ChevronRight, Activity, Camera, ImageIcon, Maximize2, Trash2, Pencil } from 'lucide-react'
import { getToday, parseLocalDate } from '@/lib/utils'
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

type MetricKey = 'weight' | 'bmi' | 'bf_pct' | 'muscle' | 'fat_mass'
type ZoneColor = 'green' | 'yellow' | 'red'

type Zone = { color: ZoneColor; to: number; label: string }
type RangeMeterConfig = { min: number; max: number; zones: Zone[] }

// Classic traffic-light palette (vivid green, amber, deep red).
const ZONE_BG: Record<ZoneColor, string> = {
  green: 'bg-green-600',
  yellow: 'bg-amber-500',
  red: 'bg-red-600',
}

// Reference ranges (adult male, orientative — not medical advice).
// Each metric has 3 zones; bar widths are proportional to each zone's span.
const METRIC_RANGES: Record<Exclude<MetricKey, 'weight'>, RangeMeterConfig> = {
  bmi: {
    min: 15, max: 40,
    zones: [
      { color: 'yellow', to: 18.5, label: 'Bajo peso' },
      { color: 'green',  to: 25,   label: 'Normal' },
      { color: 'red',    to: 40,   label: 'Sobrepeso' },
    ],
  },
  bf_pct: {
    min: 5, max: 35,
    zones: [
      { color: 'green',  to: 18, label: 'Saludable' },
      { color: 'yellow', to: 25, label: 'Elevado' },
      { color: 'red',    to: 35, label: 'Alto' },
    ],
  },
  muscle: {
    min: 25, max: 45,
    zones: [
      { color: 'red',    to: 30, label: 'Bajo' },
      { color: 'yellow', to: 35, label: 'Medio' },
      { color: 'green',  to: 45, label: 'Alto' },
    ],
  },
  fat_mass: {
    min: 5, max: 30,
    zones: [
      { color: 'green',  to: 15, label: 'Saludable' },
      { color: 'yellow', to: 22, label: 'Elevado' },
      { color: 'red',    to: 30, label: 'Alto' },
    ],
  },
}


// Active zone helper — used both for the meter and the subtitle label.
function activeZoneIndex(value: number, config: RangeMeterConfig): number {
  for (let i = 0; i < config.zones.length; i++) {
    if (value <= config.zones[i].to) return i
  }
  return config.zones.length - 1
}

function RangeMeter({ value, config }: { value?: number; config: RangeMeterConfig }) {
  const { min, max, zones } = config
  const hasValue = value != null
  const clamped = hasValue ? Math.max(min, Math.min(max, value!)) : min
  const arrowPct = hasValue ? ((clamped - min) / (max - min)) * 100 : 0
  const activeIdx = hasValue ? activeZoneIndex(value!, config) : -1

  return (
    <div className="relative mt-2 select-none">
      {/* Arrow */}
      {hasValue && (
        <div
          className="absolute w-0 h-0"
          style={{
            top: -7,
            left: `${arrowPct}%`,
            transform: 'translateX(-50%)',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '5px solid var(--ink)',
          }}
        />
      )}
      {/* Bars */}
      <div className="flex h-1.5 rounded-full bg-ink-7">
        {zones.map((z, i) => {
          const from = i === 0 ? min : zones[i - 1].to
          const isActive = activeIdx === i
          const isFirst = i === 0
          const isLast = i === zones.length - 1
          return (
            <div
              key={i}
              className={`${ZONE_BG[z.color]} ${isFirst ? 'rounded-l-full' : ''} ${isLast ? 'rounded-r-full' : ''}`}
              style={{
                flexGrow: z.to - from,
                flexBasis: 0,
                opacity: hasValue && !isActive ? 0.25 : 1,
              }}
            />
          )
        })}
      </div>
      {/* X-axis scale: min, internal thresholds, max */}
      <div className="relative h-3 mt-0.5">
        <span className="absolute left-0 text-[8px] fk-mono text-ink-5">{min}</span>
        {zones.slice(0, -1).map((z, i) => {
          const pct = ((z.to - min) / (max - min)) * 100
          return (
            <span
              key={i}
              className="absolute text-[8px] fk-mono text-ink-5"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              {z.to}
            </span>
          )
        })}
        <span className="absolute right-0 text-[8px] fk-mono text-ink-5">{max}</span>
      </div>
    </div>
  )
}

function MetricStatCard({
  metricKey, selected, onSelect, label, value, numericValue, unit, delta, deltaUnit, deltaLowerIsBetter,
}: {
  metricKey: Exclude<MetricKey, 'weight'>
  selected: boolean
  onSelect: (m: MetricKey) => void
  label: string
  value: string
  numericValue?: number
  unit?: string
  delta?: number
  deltaUnit: string
  deltaLowerIsBetter: boolean
}) {
  const showDelta = delta != null && Math.abs(delta) >= 0.05
  const deltaIsGood = showDelta && (deltaLowerIsBetter ? delta! < 0 : delta! > 0)
  const arrow = showDelta ? (delta! > 0 ? '↑' : '↓') : ''
  const config = METRIC_RANGES[metricKey]
  const activeZoneLabel =
    numericValue != null ? config.zones[activeZoneIndex(numericValue, config)].label : null
  return (
    <button
      type="button"
      onClick={() => onSelect(metricKey)}
      className={`relative text-left bg-white rounded-[14px] p-4 transition-colors ${
        selected ? 'border-2 border-signal' : 'border border-ink-7 hover:border-ink-5'
      }`}
    >
      <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-serif text-[28px] font-light text-signal">{value}</span>
        {unit && <span className="text-sm text-ink-4">{unit}</span>}
        {showDelta && (
          <span className={`text-[10px] fk-mono font-medium px-1.5 py-0.5 rounded-full ${
            deltaIsGood ? 'bg-leaf-soft text-leaf' : 'bg-berry-soft text-berry'
          }`}>
            {arrow} {Math.abs(delta!).toFixed(1)}{deltaUnit}
          </span>
        )}
      </div>
      <RangeMeter value={numericValue} config={config} />
      {activeZoneLabel && (
        <div className="text-[11px] text-ink-4 mt-0.5">{activeZoneLabel}</div>
      )}
    </button>
  )
}

// Interactive line chart with axes, data points, and hover tooltip.
function MetricChart({
  data,
  unit,
  color,
  formatValue,
}: {
  data: { value: number; date: string }[]
  unit: string
  color: string
  formatValue?: (v: number) => string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const gradId = useId()

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-ink-4">
        Sin datos suficientes
      </div>
    )
  }

  const W = 320
  const H = 180
  const padL = 32
  const padR = 12
  const padT = 12
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const baselineY = padT + plotH

  const values = data.map(d => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const span = (maxV - minV) || 1
  const yMin = minV - span * 0.15
  const yMax = maxV + span * 0.15
  const yRange = yMax - yMin

  const xAt = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const yAt = (v: number) => padT + (1 - (v - yMin) / yRange) * plotH

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), value: d.value, date: d.date }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length >= 2
      ? `M ${points[0].x},${baselineY} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${baselineY} Z`
      : ''

  const yTicks = [yMax, (yMin + yMax) / 2, yMin]

  // X-axis: at most 4 evenly-spaced labels.
  const labelCount = Math.min(4, data.length)
  const xLabelIndices =
    data.length <= 4
      ? data.map((_, i) => i)
      : Array.from({ length: labelCount }, (_, k) =>
          Math.round((k * (data.length - 1)) / (labelCount - 1))
        )

  const fmt = formatValue || ((v: number) => v.toFixed(1))
  const hovered = hoverIdx != null ? points[hoverIdx] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid + labels */}
        {yTicks.map((v, i) => {
          const y = yAt(v)
          const isEdge = i === 0 || i === yTicks.length - 1
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="var(--ink-7)"
                strokeWidth={1}
                strokeDasharray={isEdge ? '' : '2,2'}
              />
              <text
                x={padL - 4}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="var(--ink-5)"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                {fmt(v)}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {xLabelIndices.map(i => {
          const dateLabel = parseLocalDate(data[i].date).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
          })
          return (
            <text
              key={i}
              x={xAt(i)}
              y={baselineY + 14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--ink-5)"
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            >
              {dateLabel}
            </text>
          )
        })}

        {/* Filled area + line */}
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {points.length >= 2 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points (interactive) */}
        {points.map((p, i) => (
          <g key={i}>
            {/* invisible larger hit target for easier hover/tap */}
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onTouchStart={() => setHoverIdx(i)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3.5}
              fill={hoverIdx === i ? color : 'white'}
              stroke={color}
              strokeWidth={2}
              className="pointer-events-none transition-all"
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none bg-ink text-white text-[10px] fk-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
          style={{
            left: `${(hovered.x / W) * 100}%`,
            top: `${(hovered.y / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 8px))',
          }}
        >
          <div className="text-paper">
            {fmt(hovered.value)}
            {unit}
          </div>
          <div className="text-ink-5">
            {parseLocalDate(hovered.date).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
        </div>
      )}
    </div>
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
  const [compareToLogId, setCompareToLogId] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight')
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null)

  // Tap a card to select; tap the already-selected card to deselect (back to Peso).
  const toggleMetric = (m: MetricKey) => {
    setSelectedMetric(prev => (prev === m ? 'weight' : m))
  }

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

  // Default comparison target = second-most-recent log (vs "last time").
  // Resets if the chosen log is deleted.
  useEffect(() => {
    const stillExists = compareToLogId && weightLogs.some(l => l.id === compareToLogId)
    if (!stillExists && weightLogs.length >= 2) {
      setCompareToLogId(weightLogs[1].id)
    } else if (weightLogs.length < 2 && compareToLogId) {
      setCompareToLogId(null)
    }
  }, [weightLogs, compareToLogId])

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
      const { data, error: fetchError } = await (supabase
        .from('progress_photos') as any)
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
      const { error: dbError } = await (supabase
        .from('progress_photos') as any)
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

  const closeForm = () => {
    setShowForm(false)
    setEditingLog(null)
    setWeight('')
    setMuscleMass('')
    setBodyFatMass('')
    setBodyFatPercentage('')
  }

  const openEdit = (log: WeightLog) => {
    setEditingLog(log)
    setWeight(log.weight_kg.toString())
    setMuscleMass(log.muscle_mass_kg?.toString() ?? '')
    setBodyFatMass(log.body_fat_mass_kg?.toString() ?? '')
    setBodyFatPercentage(log.body_fat_percentage?.toString() ?? '')
    setShowForm(true)
  }

  const saveWeight = async () => {
    if (!user || !weight) return
    const weightNum = parseFloat(weight)
    if (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 300) {
      setError('Peso fuera de rango (20-300 kg)')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const mm = parseFloat(muscleMass)
      const bfm = parseFloat(bodyFatMass)
      const bfp = parseFloat(bodyFatPercentage)
      // For partial updates: clear field if empty so we don't keep stale values.
      const fields: Record<string, any> = {
        weight_kg: weightNum,
        muscle_mass_kg: muscleMass && Number.isFinite(mm) && mm > 0 ? mm : null,
        body_fat_mass_kg: bodyFatMass && Number.isFinite(bfm) && bfm > 0 ? bfm : null,
        body_fat_percentage: bodyFatPercentage && Number.isFinite(bfp) && bfp >= 0 && bfp <= 70 ? bfp : null,
      }

      if (editingLog) {
        const { error: updateError } = await (supabase.from('weight_logs') as any)
          .update(fields)
          .eq('id', editingLog.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await (supabase.from('weight_logs') as any).insert({
          user_id: user.id,
          date: getToday(),
          ...fields,
        })
        if (insertError) throw insertError
      }
      await loadWeightLogs()
      const wasEditing = !!editingLog
      closeForm()
      showToast(wasEditing ? 'Registro actualizado' : 'Composición corporal registrada')
    } catch (err) {
      setError('Error al guardar')
    }
    setSaving(false)
  }

  const deleteEditing = async () => {
    if (!editingLog) return
    if (!window.confirm('¿Eliminar este registro? No se puede deshacer.')) return
    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', editingLog.id)
      if (deleteError) throw deleteError
      await loadWeightLogs()
      closeForm()
      showToast('Registro eliminado')
    } catch (err) {
      setError('Error al eliminar')
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

  // Deltas vs the manually-picked comparison log.
  const compareToLog = compareToLogId ? weightLogs.find(l => l.id === compareToLogId) : undefined

  // Hero delta: signed difference vs the comparison record. Negative = bajaste.
  const heroWeightDelta = compareToLog ? latestWeight - compareToLog.weight_kg : null
  const baselineWeight = compareToLog?.weight_kg
  const baselineMuscle = compareToLog?.muscle_mass_kg
  const baselineFatMass = compareToLog?.body_fat_mass_kg
  const baselineFatPct = compareToLog?.body_fat_percentage
  const baselineBMI = baselineWeight != null ? calculateBMI(baselineWeight) : undefined

  const bmiDelta = baselineBMI != null && latestLog ? latestBMI - baselineBMI : undefined
  const fatPctDelta = baselineFatPct != null && latestBodyFatPercentage != null ? latestBodyFatPercentage - baselineFatPct : undefined
  const muscleDelta = baselineMuscle != null && latestMuscleMass != null ? latestMuscleMass - baselineMuscle : undefined
  const fatMassDelta = baselineFatMass != null && latestBodyFatMass != null ? latestBodyFatMass - baselineFatMass : undefined

  // Per-metric chart config (label, color, value extractor).
  const metricMeta: Record<MetricKey, { label: string; unit: string; color: string; pick: (l: WeightLog) => number | undefined }> = {
    weight:   { label: 'Peso',          unit: 'kg', color: 'var(--signal)', pick: l => l.weight_kg },
    bmi:      { label: 'IMC',           unit: '',   color: 'var(--signal)', pick: l => calculateBMI(l.weight_kg) },
    bf_pct:   { label: '% Grasa',       unit: '%',  color: 'var(--berry)',  pick: l => l.body_fat_percentage },
    muscle:   { label: 'Masa Muscular', unit: 'kg', color: 'var(--leaf)',   pick: l => l.muscle_mass_kg },
    fat_mass: { label: 'Masa Grasa',    unit: 'kg', color: 'var(--honey)',  pick: l => l.body_fat_mass_kg },
  }
  const activeMetric = metricMeta[selectedMetric]
  // Chart shows the full available history for the selected metric (sorted asc).
  const chartDataPoints = [...weightLogs]
    .reverse()
    .map(l => ({ value: activeMetric.pick(l), date: l.date }))
    .filter((d): d is { value: number; date: string } => typeof d.value === 'number')

  // Latest non-null value of the selected metric (logs are ordered desc by date).
  const latestMetricValue = weightLogs
    .map(activeMetric.pick)
    .find((v): v is number => typeof v === 'number')

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
          <span className="font-serif text-[88px] font-extralight tracking-tight leading-none text-signal">{latestWeight.toFixed(1)}</span>
          <span className="fk-mono text-sm text-ink-4">kg</span>
        </div>
        {heroWeightDelta != null && Math.abs(heroWeightDelta) >= 0.05 && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs fk-mono font-medium ${
              heroWeightDelta < 0 ? 'bg-leaf-soft text-leaf' : 'bg-berry-soft text-berry'
            }`}>
              {heroWeightDelta < 0 ? '↓' : '↑'} {Math.abs(heroWeightDelta).toFixed(1)} kg
            </span>
          </div>
        )}
      </div>

      {/* Comparison target — pick a specific past record to diff each card against */}
      {weightLogs.length >= 2 && (
        <div className="px-5 mt-5 flex items-center gap-2">
          <span className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest">Comparar contra</span>
          <select
            value={compareToLogId ?? ''}
            onChange={e => setCompareToLogId(e.target.value || null)}
            className="ml-auto px-3 py-1.5 rounded-md text-[11px] fk-mono font-medium bg-white border border-ink-7 text-ink hover:border-ink-5 cursor-pointer max-w-[60%]"
          >
            {weightLogs.slice(1).map(log => (
              <option key={log.id} value={log.id}>
                {parseLocalDate(log.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                {' · '}{log.weight_kg} kg
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Body Composition Cards */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <MetricStatCard
          metricKey="bmi"
          selected={selectedMetric === 'bmi'}
          onSelect={toggleMetric}
          label="IMC"
          value={latestLog ? latestBMI.toFixed(1) : '--'}
          numericValue={latestLog ? latestBMI : undefined}
          delta={bmiDelta}
          deltaUnit=""
          deltaLowerIsBetter
        />
        <MetricStatCard
          metricKey="bf_pct"
          selected={selectedMetric === 'bf_pct'}
          onSelect={toggleMetric}
          label="% Grasa"
          value={latestBodyFatPercentage != null ? latestBodyFatPercentage.toFixed(1) : '--'}
          numericValue={latestBodyFatPercentage}
          unit="%"
          delta={fatPctDelta}
          deltaUnit="%"
          deltaLowerIsBetter
        />
        <MetricStatCard
          metricKey="muscle"
          selected={selectedMetric === 'muscle'}
          onSelect={toggleMetric}
          label="Masa Muscular"
          value={latestMuscleMass != null ? latestMuscleMass.toFixed(1) : '--'}
          numericValue={latestMuscleMass}
          unit="kg"
          delta={muscleDelta}
          deltaUnit="kg"
          deltaLowerIsBetter={false}
        />
        <MetricStatCard
          metricKey="fat_mass"
          selected={selectedMetric === 'fat_mass'}
          onSelect={toggleMetric}
          label="Masa Grasa"
          value={latestBodyFatMass != null ? latestBodyFatMass.toFixed(1) : '--'}
          numericValue={latestBodyFatMass}
          unit="kg"
          delta={fatMassDelta}
          deltaUnit="kg"
          deltaLowerIsBetter
        />
      </div>

      {/* Chart Card */}
      <div className="mx-5 mt-6 bg-white border border-ink-7 rounded-[18px] overflow-hidden">
        <div className="p-5">
          <div className="fk-mono text-[10px] text-ink-4 uppercase tracking-widest">{activeMetric.label} · actual</div>
          <div className="font-serif text-[22px] font-light mt-1 text-signal">
            {latestMetricValue != null ? latestMetricValue.toFixed(1) : '--'}
            {activeMetric.unit && <span className="text-sm text-ink-4 ml-1">{activeMetric.unit}</span>}
          </div>
        </div>

        {/* Chart */}
        <div className="px-3 pb-4">
          {chartDataPoints.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-ink-4">
              Sin registros de {activeMetric.label.toLowerCase()}
            </div>
          ) : (
            <MetricChart
              data={chartDataPoints}
              unit={activeMetric.unit}
              color={activeMetric.color}
            />
          )}
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
      {weightLogs.length > 1 && latestWeight < (weightLogs[weightLogs.length - 1]?.weight_kg ?? USER_PROFILE.initialWeight) && (
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
                <button
                  type="button"
                  key={log.id}
                  onClick={() => openEdit(log)}
                  className="w-full text-left p-3 border-b border-ink-7 last:border-0 hover:bg-paper-2 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-4 flex items-center gap-1.5">
                      <Pencil className="w-3 h-3 text-ink-5" />
                      {parseLocalDate(log.date).toLocaleDateString('es-MX', {
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
                </button>
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
                  <button className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-white" />
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
              <button onClick={() => setShowPhotoModal(false)} className="w-11 h-11 rounded-full bg-paper-3 flex items-center justify-center">
                <X className="w-5 h-5" />
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
          <div className="fixed inset-0 bg-ink/40 z-40" onClick={closeForm} />
          <div className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-[24px] p-5 z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-xl font-light">
                  {editingLog ? 'Editar registro' : 'Composición corporal'}
                </h2>
                {editingLog && (
                  <div className="text-xs text-ink-4 mt-0.5">
                    {parseLocalDate(editingLog.date).toLocaleDateString('es-MX', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </div>
                )}
              </div>
              <button onClick={closeForm} className="w-11 h-11 rounded-full bg-paper-3 flex items-center justify-center">
                <X className="w-5 h-5" />
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
                  min="20"
                  max="300"
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
                {editingLog ? (
                  <button
                    onClick={deleteEditing}
                    disabled={saving}
                    className="py-3 px-4 rounded-xl border border-berry/30 text-berry text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                ) : (
                  <button
                    onClick={closeForm}
                    className="flex-1 py-3 rounded-xl border border-ink-7 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={saveWeight}
                  disabled={saving || !weight}
                  className="flex-1 py-3 rounded-full bg-ink text-paper font-medium text-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingLog ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
