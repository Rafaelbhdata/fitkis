'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, AlertCircle, ChevronLeft, Loader2, Plus, Minus, Sparkles } from 'lucide-react'
import { PulseLine } from '@/components/ui/PulseLine'
import { compressImage } from '@/lib/image-utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { FoodGroup, MealType } from '@/types'

interface PlateAnalysisItem {
  food_name: string
  group_type: FoodGroup
  quantity: number
  confidence: 'alta' | 'media' | 'baja'
  notes?: string
}

interface PlateAnalysisResult {
  success: boolean
  items: PlateAnalysisItem[]
  total_equivalents: Record<FoodGroup, number>
  reasoning: string
  suggestions?: string
}

interface PlatePhotoModalProps {
  isOpen: boolean
  onClose: () => void
  selectedMeal: MealType
  mealLabel: string
  onAddItems: (items: { group_type: FoodGroup; quantity: number; food_name: string }[]) => Promise<void>
}

const FOOD_COLORS: Record<FoodGroup, { bg: string; fill: string; label: string; emoji: string }> = {
  verdura: { bg: 'bg-leaf-soft', fill: '#4a7c3a', label: 'Verduras', emoji: '🥬' },
  fruta: { bg: 'bg-signal-soft', fill: '#ff5a1f', label: 'Frutas', emoji: '🍎' },
  carb: { bg: 'bg-honey-soft', fill: '#d4a017', label: 'Cereales', emoji: '🍞' },
  leguminosa: { bg: 'bg-sky-soft', fill: '#3a6b8c', label: 'Leguminosas', emoji: '🫘' },
  proteina: { bg: 'bg-berry-soft', fill: '#c13b5a', label: 'Proteina', emoji: '🥩' },
  grasa: { bg: 'bg-paper-3', fill: '#737373', label: 'Grasas', emoji: '🥑' },
}

const CONFIDENCE_COLORS = {
  alta: 'bg-leaf-soft text-leaf',
  media: 'bg-honey-soft text-honey',
  baja: 'bg-berry-soft text-berry',
}

export function PlatePhotoModal({ isOpen, onClose, selectedMeal, mealLabel, onAddItems }: PlatePhotoModalProps) {
  const [step, setStep] = useState<'capture' | 'analyzing' | 'results' | 'error'>('capture')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<PlateAnalysisResult | null>(null)
  const [editedItems, setEditedItems] = useState<PlateAnalysisItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setStep('capture')
    setImagePreview(null)
    setAnalysis(null)
    setEditedItems([])
    setError(null)
    setSaving(false)
    onClose()
  }

  const focusTrapRef = useFocusTrap({ isActive: isOpen, onEscape: handleClose })

  const resetState = () => {
    setStep('capture')
    setImagePreview(null)
    setAnalysis(null)
    setEditedItems([])
    setError(null)
    setSaving(false)
  }

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es muy grande. Maximo 10MB.')
      return
    }

    try {
      // Compress image before processing (reduces upload time and API costs)
      const compressedFile = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        maxSizeMB: 1
      })

      // Create preview from compressed image
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        setImagePreview(base64)
        await analyzeImage(base64)
      }
      reader.onerror = () => {
        setError('Error al procesar la imagen')
      }
      reader.readAsDataURL(compressedFile)
    } catch (err) {
      console.error('Image compression error:', err)
      setError('Error al procesar la imagen')
    }
  }, [])

  const analyzeImage = async (base64Image: string) => {
    setStep('analyzing')
    setError(null)

    // Abort controller with 60s timeout for AI analysis
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      const response = await fetch('/api/plate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          meal: selectedMeal,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Error al analizar la imagen')
      }

      const result: PlateAnalysisResult = await response.json()

      if (result.success && result.items.length > 0) {
        setAnalysis(result)
        setEditedItems(result.items)
        setStep('results')
      } else {
        setError(result.reasoning || 'No se pudieron identificar alimentos en la imagen')
        setStep('error')
      }
    } catch (err) {
      console.error('Analysis error:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('La solicitud tardó demasiado. Intenta con una imagen más pequeña.')
      } else {
        setError('Error al analizar la imagen. Intenta de nuevo.')
      }
      setStep('error')
    }
  }

  const updateItemQuantity = (index: number, delta: number) => {
    setEditedItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const newQty = Math.max(0.5, item.quantity + delta)
      return { ...item, quantity: newQty }
    }))
  }

  const removeItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = async () => {
    if (editedItems.length === 0) return

    setSaving(true)
    try {
      await onAddItems(editedItems.map(item => ({
        group_type: item.group_type,
        quantity: item.quantity,
        food_name: item.food_name,
      })))
      handleClose()
    } catch (err) {
      setError('Error al guardar los alimentos')
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50" onClick={handleClose} />
      <div ref={focusTrapRef} className="fixed inset-x-0 bottom-0 z-50 bg-paper rounded-t-3xl border-t border-ink-7 shadow-2xl max-h-[90vh] overflow-hidden" role="dialog" aria-modal="true">
        <div className="p-5">
          <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="fk-eyebrow mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-signal" />
                Foto del plato
              </div>
              <h2 className="font-serif text-2xl font-light">
                {step === 'capture' && 'Toma una foto'}
                {step === 'analyzing' && 'Analizando...'}
                {step === 'results' && 'Confirma los alimentos'}
                {step === 'error' && 'Algo salió mal'}
              </h2>
            </div>
            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-paper-3 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step: Capture */}
          {step === 'capture' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-4 mb-6">
                Toma o sube una foto de tu plato y la IA estimara los equivalentes.
              </p>

              {/* Hidden inputs */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {/* Camera button - primary action */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-5 rounded-2xl bg-signal text-white flex items-center justify-center gap-3 font-medium text-lg hover:bg-signal/90 transition-colors"
              >
                <Camera className="w-6 h-6" />
                Tomar foto
              </button>

              {/* Gallery button - secondary */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-ink-6 flex items-center justify-center gap-3 font-medium text-ink-3 hover:bg-paper-2 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Subir de galería
              </button>

              <p className="text-xs text-ink-5 text-center mt-4">
                La foto sera analizada por IA para estimar los equivalentes SMAE.
                Puedes ajustar las cantidades antes de guardar.
              </p>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 flex flex-col items-center">
              {imagePreview && (
                <div className="w-48 h-48 rounded-2xl overflow-hidden mb-6 ring-4 ring-signal/20">
                  <img src={imagePreview} alt="Plato" className="w-full h-full object-cover" />
                </div>
              )}
              <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
              <p className="text-ink-4 mt-4">Identificando alimentos...</p>
              <p className="text-xs text-ink-5 mt-2">Esto puede tomar unos segundos</p>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && analysis && (
            <div className="space-y-4" style={{ maxHeight: 'calc(80vh - 180px)', overflowY: 'auto' }}>
              {/* Image preview small */}
              {imagePreview && (
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={imagePreview} alt="Plato" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-ink-3">{analysis.reasoning}</p>
                    {analysis.suggestions && (
                      <p className="text-xs text-signal mt-1">{analysis.suggestions}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Items list */}
              <div className="space-y-3">
                {editedItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white border border-ink-7 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{FOOD_COLORS[item.group_type].emoji}</span>
                        <div>
                          <p className="font-medium">{item.food_name}</p>
                          <p className="text-xs text-ink-4">{FOOD_COLORS[item.group_type].label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CONFIDENCE_COLORS[item.confidence]}`}>
                          {item.confidence}
                        </span>
                        <button
                          onClick={() => removeItem(index)}
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-ink-4 hover:text-berry hover:bg-berry-soft transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-ink-4 mb-3">{item.notes}</p>
                    )}

                    {/* Quantity controls */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => updateItemQuantity(index, -0.5)}
                        className="w-10 h-10 rounded-xl bg-paper-3 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="text-center">
                        <span className="font-serif text-3xl text-signal tabular-nums">{item.quantity}</span>
                        <span className="text-sm text-ink-4 ml-1">equiv.</span>
                      </div>
                      <button
                        onClick={() => updateItemQuantity(index, 0.5)}
                        className="w-10 h-10 rounded-xl bg-signal text-white flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {editedItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-ink-4">No hay alimentos para agregar</p>
                </div>
              )}

              {/* Summary */}
              {editedItems.length > 0 && (
                <div className="bg-paper-2 rounded-xl p-4">
                  <p className="text-xs font-medium text-ink-3 mb-2">Resumen para {mealLabel}:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      editedItems.reduce((acc, item) => {
                        acc[item.group_type] = (acc[item.group_type] || 0) + item.quantity
                        return acc
                      }, {} as Record<FoodGroup, number>)
                    ).map(([group, qty]) => (
                      <span
                        key={group}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${FOOD_COLORS[group as FoodGroup].bg}`}
                      >
                        {FOOD_COLORS[group as FoodGroup].emoji} {qty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-4">
                <button
                  onClick={resetState}
                  className="flex-1 py-4 rounded-2xl border border-ink-7 text-sm font-medium hover:bg-paper-2 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Otra foto
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={editedItems.length === 0 || saving}
                  className="flex-1 py-4 rounded-2xl bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Agregar a {mealLabel}
                </button>
              </div>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="py-8 flex flex-col items-center">
              {imagePreview && (
                <div className="w-32 h-32 rounded-2xl overflow-hidden mb-6 opacity-50">
                  <img src={imagePreview} alt="Plato" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="w-16 h-16 rounded-full bg-berry-soft flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-berry" />
              </div>
              <p className="text-ink-3 text-center mb-6 max-w-xs">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 rounded-xl border border-ink-7 text-sm font-medium hover:bg-paper-2 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={resetState}
                  className="px-6 py-3 rounded-xl bg-signal text-white text-sm font-medium hover:bg-signal/90 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Intentar de nuevo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
