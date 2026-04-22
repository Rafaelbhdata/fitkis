'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Barcode, Check, AlertCircle, Plus, Minus, Loader2, Camera, RefreshCw } from 'lucide-react'
import { PulseLine } from '@/components/ui/PulseLine'
import type { FoodGroup, MealType } from '@/types'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'

interface ProductEquivalent {
  group_type: FoodGroup
  quantity: number
  note?: string
}

interface ProductData {
  name: string
  brand?: string
  serving_size?: string
  image_url?: string
  nutrients_per_100g?: {
    calories?: number
    carbs?: number
    protein?: number
    fat?: number
    fiber?: number
    sugar?: number
  }
  estimated_equivalents?: ProductEquivalent[]
}

interface BarcodeScannerModalProps {
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

export function BarcodeScannerModal({ isOpen, onClose, selectedMeal, mealLabel, onAddItems }: BarcodeScannerModalProps) {
  const [step, setStep] = useState<'scan' | 'loading' | 'result' | 'notfound' | 'error'>('scan')
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductData | null>(null)
  const [editedEquivalents, setEditedEquivalents] = useState<ProductEquivalent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [cameraError, setCameraError] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const [useZxingFallback, setUseZxingFallback] = useState(false)

  const resetState = () => {
    setStep('scan')
    setScannedCode(null)
    setProduct(null)
    setEditedEquivalents([])
    setError(null)
    setSaving(false)
    setManualBarcode('')
    setCameraError(false)
    setUseZxingFallback(false)
  }

  const handleClose = () => {
    stopCamera()
    resetState()
    onClose()
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (zxingReaderRef.current) {
      zxingReaderRef.current.reset()
      zxingReaderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const startCamera = useCallback(async () => {
    try {
      setCameraError(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // Check if native BarcodeDetector is available (Chrome/Edge)
        const hasBarcodeDetector = 'BarcodeDetector' in window

        if (hasBarcodeDetector) {
          // Use native BarcodeDetector for best performance
          setUseZxingFallback(false)
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
          })

          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue
                  if (code) {
                    stopCamera()
                    await lookupBarcode(code)
                  }
                }
              } catch (err) {
                // Silent fail for detection errors
              }
            }
          }, 200)
        } else {
          // Fallback to ZXing for Safari/Firefox
          setUseZxingFallback(true)

          const hints = new Map()
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128
          ])
          hints.set(DecodeHintType.TRY_HARDER, true)

          const reader = new BrowserMultiFormatReader(hints)
          zxingReaderRef.current = reader

          // Start continuous scanning
          const scanWithZxing = async () => {
            if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
              return
            }

            try {
              const result = await reader.decodeOnceFromVideoElement(videoRef.current)
              if (result) {
                const code = result.getText()
                if (code) {
                  stopCamera()
                  await lookupBarcode(code)
                  return
                }
              }
            } catch (err) {
              // ZXing throws when no barcode found - this is expected
            }
          }

          // Poll for barcodes
          scanIntervalRef.current = setInterval(scanWithZxing, 300)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError(true)
    }
  }, [])

  useEffect(() => {
    if (isOpen && step === 'scan') {
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, step, startCamera])

  const lookupBarcode = async (barcode: string) => {
    setScannedCode(barcode)
    setStep('loading')
    setError(null)

    try {
      const response = await fetch(`/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar el producto')
      }

      if (data.found && data.product) {
        setProduct(data.product)
        setEditedEquivalents(data.product.estimated_equivalents || [])
        setStep('result')
      } else {
        setStep('notfound')
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar el producto')
      setStep('error')
    }
  }

  const handleManualLookup = () => {
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim())
    }
  }

  const updateEquivalentQuantity = (index: number, delta: number) => {
    setEditedEquivalents(prev => prev.map((eq, i) => {
      if (i !== index) return eq
      const newQty = Math.max(0.5, eq.quantity + delta)
      return { ...eq, quantity: newQty }
    }))
  }

  const removeEquivalent = (index: number) => {
    setEditedEquivalents(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = async () => {
    if (!product || editedEquivalents.length === 0) return

    setSaving(true)
    try {
      await onAddItems(editedEquivalents.map(eq => ({
        group_type: eq.group_type,
        quantity: eq.quantity,
        food_name: `${product.name}${product.brand ? ` (${product.brand})` : ''}`,
      })))
      handleClose()
    } catch (err) {
      setError('Error al guardar')
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50" onClick={handleClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-paper rounded-t-3xl border-t border-ink-7 shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="p-5">
          <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="fk-eyebrow mb-1 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-signal" />
                Escáner de código
              </div>
              <h2 className="font-serif text-2xl font-light">
                {step === 'scan' && 'Escanea el producto'}
                {step === 'loading' && 'Buscando...'}
                {step === 'result' && 'Producto encontrado'}
                {step === 'notfound' && 'No encontrado'}
                {step === 'error' && 'Error'}
              </h2>
            </div>
            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-paper-3 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step: Scan */}
          {step === 'scan' && (
            <div className="space-y-4">
              {/* Camera view */}
              <div className="relative aspect-[4/3] bg-ink rounded-2xl overflow-hidden">
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                    <Camera className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-center mb-4">No se pudo acceder a la cámara</p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-32 border-2 border-signal rounded-lg relative">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-signal animate-pulse" />
                      </div>
                    </div>
                    {useZxingFallback && (
                      <div className="absolute bottom-4 left-4 right-4 bg-ink/80 text-white text-xs p-3 rounded-lg">
                        Usando modo de compatibilidad. Mantén el código de barras centrado.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Manual input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="O escribe el código de barras..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-white rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
                <button
                  onClick={handleManualLookup}
                  disabled={!manualBarcode.trim()}
                  className="px-6 py-3 rounded-xl bg-signal text-white font-medium disabled:opacity-50"
                >
                  Buscar
                </button>
              </div>

              <p className="text-xs text-ink-5 text-center">
                Apunta la cámara al código de barras del producto
              </p>
            </div>
          )}

          {/* Step: Loading */}
          {step === 'loading' && (
            <div className="py-12 flex flex-col items-center">
              <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
              <p className="text-ink-4 mt-4">Buscando producto...</p>
              {scannedCode && (
                <p className="text-xs text-ink-5 mt-2 font-mono">{scannedCode}</p>
              )}
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && product && (
            <div className="space-y-4" style={{ maxHeight: 'calc(80vh - 180px)', overflowY: 'auto' }}>
              {/* Product info */}
              <div className="flex items-start gap-4 mb-4 p-4 bg-paper-2 rounded-xl">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  {product.brand && (
                    <p className="text-sm text-ink-4 truncate">{product.brand}</p>
                  )}
                  {product.serving_size && (
                    <p className="text-xs text-ink-5 mt-1">Porción: {product.serving_size}</p>
                  )}
                </div>
              </div>

              {/* Nutrients preview */}
              {product.nutrients_per_100g && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Calorías', value: product.nutrients_per_100g.calories, unit: '' },
                    { label: 'Carbs', value: product.nutrients_per_100g.carbs, unit: 'g' },
                    { label: 'Proteína', value: product.nutrients_per_100g.protein, unit: 'g' },
                    { label: 'Grasa', value: product.nutrients_per_100g.fat, unit: 'g' },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-paper-2 rounded-lg p-2">
                      <div className="text-xs text-ink-4">{label}</div>
                      <div className="font-medium text-sm">
                        {value != null ? `${value}${unit}` : '--'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Equivalents */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-ink-3">Equivalentes estimados:</p>
                {editedEquivalents.length === 0 ? (
                  <p className="text-sm text-ink-4 py-4 text-center">
                    No se pudieron estimar equivalentes para este producto
                  </p>
                ) : (
                  editedEquivalents.map((eq, index) => (
                    <div
                      key={index}
                      className="bg-white border border-ink-7 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{FOOD_COLORS[eq.group_type].emoji}</span>
                          <div>
                            <p className="font-medium">{FOOD_COLORS[eq.group_type].label}</p>
                            {eq.note && <p className="text-xs text-ink-4">{eq.note}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => removeEquivalent(index)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-4 hover:text-berry hover:bg-berry-soft"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => updateEquivalentQuantity(index, -0.5)}
                          className="w-10 h-10 rounded-xl bg-paper-3 flex items-center justify-center"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                          <span className="font-serif text-3xl text-signal tabular-nums">{eq.quantity}</span>
                          <span className="text-sm text-ink-4 ml-1">equiv.</span>
                        </div>
                        <button
                          onClick={() => updateEquivalentQuantity(index, 0.5)}
                          className="w-10 h-10 rounded-xl bg-signal text-white flex items-center justify-center"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-4">
                <button
                  onClick={() => { resetState(); startCamera() }}
                  className="flex-1 py-4 rounded-2xl border border-ink-7 text-sm font-medium hover:bg-paper-2 flex items-center justify-center gap-2"
                >
                  <Barcode className="w-4 h-4" />
                  Escanear otro
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={editedEquivalents.length === 0 || saving}
                  className="flex-1 py-4 rounded-2xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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

          {/* Step: Not Found */}
          {step === 'notfound' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-honey-soft flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-honey" />
              </div>
              <p className="font-medium mb-2">Producto no encontrado</p>
              {scannedCode && (
                <p className="text-xs text-ink-5 font-mono mb-4">{scannedCode}</p>
              )}
              <p className="text-sm text-ink-4 text-center mb-6 max-w-xs">
                Este código no está en Open Food Facts. Puedes agregarlo manualmente o tomar una foto de la etiqueta nutricional.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { resetState(); startCamera() }}
                  className="px-6 py-3 rounded-xl border border-ink-7 text-sm font-medium hover:bg-paper-2 flex items-center gap-2"
                >
                  <Barcode className="w-4 h-4" />
                  Escanear otro
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 rounded-xl bg-signal text-white text-sm font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="py-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-berry-soft flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-berry" />
              </div>
              <p className="text-ink-3 text-center mb-6 max-w-xs">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 rounded-xl border border-ink-7 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { resetState(); startCamera() }}
                  className="px-6 py-3 rounded-xl bg-signal text-white text-sm font-medium flex items-center gap-2"
                >
                  <Barcode className="w-4 h-4" />
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
