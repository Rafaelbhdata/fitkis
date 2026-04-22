'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Save, Check, X, Plus, Minus } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import { useToast } from '@/components/ui/Toast'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import type { FoodGroup, MealType, DietConfig, ActiveMeals } from '@/types'

const MEALS: { key: MealType; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'snack1', label: 'Snack mañana' },
  { key: 'comida', label: 'Comida' },
  { key: 'snack2', label: 'Snack tarde' },
  { key: 'cena', label: 'Cena' },
  { key: 'snack3', label: 'Snack noche' },
]

const GROUPS: FoodGroup[] = ['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa']

const DEFAULT_BUDGET: Record<FoodGroup, number> = {
  verdura: 4,
  fruta: 2,
  carb: 4,
  proteina: 8,
  grasa: 6,
  leguminosa: 1,
}

const DEFAULT_ACTIVE_MEALS: ActiveMeals = {
  desayuno: true,
  snack1: true,
  comida: true,
  snack2: false,
  cena: true,
  snack3: false,
}

export default function PlanEditorPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [practitionerId, setPractitionerId] = useState<string | null>(null)
  const [currentConfig, setCurrentConfig] = useState<DietConfig | null>(null)

  // Form state
  const [budget, setBudget] = useState<Record<FoodGroup, number>>(DEFAULT_BUDGET)
  const [activeMeals, setActiveMeals] = useState<ActiveMeals>(DEFAULT_ACTIVE_MEALS)
  const [notes, setNotes] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (user && patientId) {
      loadData()
    }
  }, [user, patientId])

  const loadData = async () => {
    setLoading(true)

    try {
      // Get practitioner ID
      const { data: practitioner } = await (supabase as any)
        .from('practitioners')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (practitioner) {
        setPractitionerId(practitioner.id)
      }

      // Load current diet config
      const { data: config } = await (supabase as any)
        .from('diet_configs')
        .select('*')
        .eq('user_id', patientId)
        .eq('active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      if (config) {
        setCurrentConfig(config)
        setBudget({
          verdura: config.verdura,
          fruta: config.fruta,
          carb: config.carb,
          proteina: config.proteina,
          grasa: config.grasa,
          leguminosa: config.leguminosa,
        })
        if (config.active_meals) {
          setActiveMeals(config.active_meals)
        }
        if (config.notes) {
          setNotes(config.notes)
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }

    setLoading(false)
  }

  const handleSave = async () => {
    if (!practitionerId) {
      showToast('Error: No se encontró tu perfil de nutricionista')
      return
    }

    setSaving(true)

    try {
      // Deactivate old configs
      await (supabase as any)
        .from('diet_configs')
        .update({ active: false })
        .eq('user_id', patientId)
        .eq('active', true)

      // Create new config
      const { error } = await (supabase as any)
        .from('diet_configs')
        .insert({
          user_id: patientId,
          effective_date: effectiveDate,
          verdura: budget.verdura,
          fruta: budget.fruta,
          carb: budget.carb,
          proteina: budget.proteina,
          grasa: budget.grasa,
          leguminosa: budget.leguminosa,
          prescribed_by: practitionerId,
          version: (currentConfig?.version || 0) + 1,
          active: true,
          notes: notes || null,
          active_meals: activeMeals,
        })

      if (error) throw error

      showToast('Plan guardado exitosamente')
      router.push(`/clinic/patient/${patientId}`)

    } catch (err: any) {
      console.error('Error saving plan:', err)
      showToast('Error al guardar el plan')
    }

    setSaving(false)
  }

  const adjustBudget = (group: FoodGroup, delta: number) => {
    setBudget(prev => ({
      ...prev,
      [group]: Math.max(0, prev[group] + delta)
    }))
  }

  const toggleMeal = (meal: MealType) => {
    setActiveMeals(prev => ({
      ...prev,
      [meal]: !prev[meal]
    }))
  }

  const totalEquivalents = Object.values(budget).reduce((a, b) => a + b, 0)
  const activeMealCount = Object.values(activeMeals).filter(Boolean).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Cargando plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-light tracking-tight">
              {currentConfig ? 'Editar plan' : 'Nuevo plan'}
            </h1>
            <p className="text-ink-4 text-sm">
              {currentConfig ? `Versión actual: ${currentConfig.version}` : 'Primera prescripción'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-signal text-white font-medium hover:bg-signal/90 disabled:opacity-50"
        >
          {saving ? (
            <PulseLine w={20} h={10} color="#fff" strokeWidth={2} active />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar
        </button>
      </div>

      {/* Effective Date */}
      <div className="bg-white rounded-2xl border border-ink-7 p-5 mb-6">
        <label className="block text-sm font-medium mb-2">Fecha efectiva</label>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="w-full md:w-auto bg-paper rounded-xl px-4 py-2 border border-ink-7 text-base"
        />
        <p className="text-xs text-ink-4 mt-2">
          El plan entrará en vigor a partir de esta fecha
        </p>
      </div>

      {/* Daily Budget */}
      <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden mb-6">
        <div className="p-5 border-b border-ink-7 flex items-center justify-between">
          <h2 className="font-medium">Presupuesto diario</h2>
          <span className="text-sm text-ink-4">{totalEquivalents} equivalentes</span>
        </div>
        <div className="divide-y divide-ink-7">
          {GROUPS.map(group => (
            <div key={group} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{FOOD_GROUP_LABELS[group]}</div>
                <div className="text-xs text-ink-4">equivalentes</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustBudget(group, -1)}
                  className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2 active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-serif text-2xl w-8 text-center">{budget[group]}</span>
                <button
                  onClick={() => adjustBudget(group, 1)}
                  className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Meals */}
      <div className="bg-white rounded-2xl border border-ink-7 overflow-hidden mb-6">
        <div className="p-5 border-b border-ink-7 flex items-center justify-between">
          <h2 className="font-medium">Comidas activas</h2>
          <span className="text-sm text-ink-4">{activeMealCount} de 6</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5">
          {MEALS.map(meal => {
            const isActive = activeMeals[meal.key]
            return (
              <button
                key={meal.key}
                onClick={() => toggleMeal(meal.key)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-signal bg-signal-soft/30'
                    : 'border-ink-7 bg-white hover:bg-paper-2'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{meal.label}</span>
                  {isActive ? (
                    <Check className="w-4 h-4 text-signal" />
                  ) : (
                    <X className="w-4 h-4 text-ink-5" />
                  )}
                </div>
                <div className="text-xs text-ink-4">
                  {isActive ? 'Activa' : 'Inactiva'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-ink-7 p-5 mb-6">
        <label className="block text-sm font-medium mb-2">Notas para el paciente</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Recomendaciones, observaciones, recordatorios..."
          rows={4}
          className="w-full bg-paper rounded-xl px-4 py-3 border border-ink-7 text-base resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl border border-ink-7 font-medium hover:bg-paper-2 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-signal text-white font-medium hover:bg-signal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <PulseLine w={20} h={10} color="#fff" strokeWidth={2} active />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar plan
            </>
          )}
        </button>
      </div>
    </div>
  )
}
