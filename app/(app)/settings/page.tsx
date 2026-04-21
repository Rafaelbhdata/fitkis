'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Target, Utensils, Save, Check, Plus, Trash2, Calendar } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { DEFAULT_DAILY_BUDGET } from '@/lib/constants'

interface UserProfile {
  height_cm: number | null
  goal_weight_kg: number | null
}

interface DietConfig {
  id: string
  effective_date: string
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function SettingsPage() {
  const { user } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile state
  const [heightCm, setHeightCm] = useState<string>('')
  const [goalWeightKg, setGoalWeightKg] = useState<string>('')

  // Diet configs state
  const [dietConfigs, setDietConfigs] = useState<DietConfig[]>([])
  const [showNewDiet, setShowNewDiet] = useState(false)
  const [newDietDate, setNewDietDate] = useState(new Date().toISOString().split('T')[0])
  const [newDiet, setNewDiet] = useState({
    verdura: DEFAULT_DAILY_BUDGET.verdura,
    fruta: DEFAULT_DAILY_BUDGET.fruta,
    carb: DEFAULT_DAILY_BUDGET.carb,
    leguminosa: DEFAULT_DAILY_BUDGET.leguminosa,
    proteina: DEFAULT_DAILY_BUDGET.proteina,
    grasa: DEFAULT_DAILY_BUDGET.grasa
  })

  useEffect(() => {
    if (!user) return

    const loadSettings = async () => {
      setLoading(true)
      try {
        // Load profile
        const { data: profile } = await (supabase as any)
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (profile) {
          setHeightCm(profile.height_cm?.toString() || '')
          setGoalWeightKg(profile.goal_weight_kg?.toString() || '')
        }

        // Load diet configs
        const { data: configs } = await (supabase as any)
          .from('diet_configs')
          .select('*')
          .eq('user_id', user.id)
          .order('effective_date', { ascending: false })

        if (configs) {
          setDietConfigs(configs)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user, supabase])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)

    try {
      const profileData = {
        user_id: user.id,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        goal_weight_kg: goalWeightKg ? parseFloat(goalWeightKg) : null,
        updated_at: new Date().toISOString()
      }

      const { data: existing } = await (supabase as any)
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await (supabase as any)
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id)
      } else {
        await (supabase as any)
          .from('user_profiles')
          .insert(profileData)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const addDietConfig = async () => {
    if (!user) return
    setSaving(true)

    try {
      const { data, error } = await (supabase as any)
        .from('diet_configs')
        .upsert({
          user_id: user.id,
          effective_date: newDietDate,
          ...newDiet
        }, { onConflict: 'user_id,effective_date' })
        .select()
        .single()

      if (error) throw error

      // Reload configs
      const { data: configs } = await (supabase as any)
        .from('diet_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('effective_date', { ascending: false })

      if (configs) {
        setDietConfigs(configs)
      }

      setShowNewDiet(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving diet config:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const deleteDietConfig = async (id: string) => {
    if (!confirm('¿Eliminar esta configuración de dieta?')) return

    try {
      await (supabase as any)
        .from('diet_configs')
        .delete()
        .eq('id', id)

      setDietConfigs(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Error deleting diet config:', err)
      alert('Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center border border-border">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold">Configuración</h1>
            <p className="text-xs text-muted-foreground">Perfil y preferencias</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-cyan-400" />
          <h2 className="font-medium">Perfil</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Altura (cm)
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="163"
              className="w-full bg-surface-elevated rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se usa para calcular tu IMC
            </p>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Peso objetivo (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={goalWeightKg}
              onChange={(e) => setGoalWeightKg(e.target.value)}
              placeholder="75"
              className="w-full bg-surface-elevated rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Guardado
              </>
            ) : saving ? (
              <>
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                Guardando
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar perfil
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diet Configuration Section */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-400" />
            <h2 className="font-medium">Configuración de dieta</h2>
          </div>
          {!showNewDiet && (
            <button
              onClick={() => setShowNewDiet(true)}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Nueva
            </button>
          )}
        </div>

        {/* New diet form */}
        {showNewDiet && (
          <div className="bg-surface-elevated rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Fecha efectiva:</span>
              <input
                type="date"
                value={newDietDate}
                onChange={(e) => setNewDietDate(e.target.value)}
                className="bg-surface rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { key: 'verdura', label: 'Verdura', color: 'text-food-verdura' },
                { key: 'fruta', label: 'Fruta', color: 'text-food-fruta' },
                { key: 'carb', label: 'Carbohidratos', color: 'text-food-carb' },
                { key: 'leguminosa', label: 'Leguminosa', color: 'text-food-leguminosa' },
                { key: 'proteina', label: 'Proteína', color: 'text-food-proteina' },
                { key: 'grasa', label: 'Grasa', color: 'text-food-grasa' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-xs ${color} mb-1`}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={newDiet[key as keyof typeof newDiet]}
                    onChange={(e) => setNewDiet(prev => ({
                      ...prev,
                      [key]: parseInt(e.target.value) || 0
                    }))}
                    className="w-full bg-surface rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowNewDiet(false)}
                className="btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={addDietConfig}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Diet configs list */}
        {dietConfigs.length === 0 && !showNewDiet ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <p>No hay configuraciones de dieta.</p>
            <p className="text-xs mt-1">Se usarán los valores por defecto.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dietConfigs.map((config, index) => (
              <div
                key={config.id}
                className={`bg-surface-elevated rounded-lg p-3 ${index === 0 ? 'ring-1 ring-accent/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatDate(config.effective_date)}
                    </span>
                    {index === 0 && (
                      <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                        Activa
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteDietConfig(config.id)}
                    className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1 text-xs">
                  <div className="text-center">
                    <span className="text-food-verdura">V</span>
                    <p className="text-foreground">{config.verdura}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-food-fruta">F</span>
                    <p className="text-foreground">{config.fruta}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-food-carb">C</span>
                    <p className="text-foreground">{config.carb}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-food-leguminosa">L</span>
                    <p className="text-foreground">{config.leguminosa}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-food-proteina">P</span>
                    <p className="text-foreground">{config.proteina}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-food-grasa">G</span>
                    <p className="text-foreground">{config.grasa}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Default values info */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Valores por defecto:</p>
          <div className="grid grid-cols-6 gap-1 text-xs text-muted-foreground">
            <div className="text-center">V: {DEFAULT_DAILY_BUDGET.verdura}</div>
            <div className="text-center">F: {DEFAULT_DAILY_BUDGET.fruta}</div>
            <div className="text-center">C: {DEFAULT_DAILY_BUDGET.carb}</div>
            <div className="text-center">L: {DEFAULT_DAILY_BUDGET.leguminosa}</div>
            <div className="text-center">P: {DEFAULT_DAILY_BUDGET.proteina}</div>
            <div className="text-center">G: {DEFAULT_DAILY_BUDGET.grasa}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
