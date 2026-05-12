'use client'

import { useState, useEffect } from 'react'
import {
  User, Building2, Award, Stethoscope, Save, Check, Mail, Phone,
  Bell, Scale, Clock, Utensils, Info
} from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { PulseLine } from '@/components/ui/PulseLine'
import { DEFAULT_DAILY_BUDGET } from '@/lib/constants'

export default function ClinicSettingsPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Professional profile
  const [displayName, setDisplayName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [specialty, setSpecialty] = useState('')

  // Practice info
  const [clinicName, setClinicName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Alert preferences (stored in localStorage for now)
  const [inactivityDays, setInactivityDays] = useState(7)
  const [weightGainThreshold, setWeightGainThreshold] = useState(0.5)

  // Default diet plan
  const [defaultDiet, setDefaultDiet] = useState({
    verdura: DEFAULT_DAILY_BUDGET.verdura,
    fruta: DEFAULT_DAILY_BUDGET.fruta,
    carb: DEFAULT_DAILY_BUDGET.carb,
    leguminosa: DEFAULT_DAILY_BUDGET.leguminosa,
    proteina: DEFAULT_DAILY_BUDGET.proteina,
    grasa: DEFAULT_DAILY_BUDGET.grasa,
  })

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const { data: practitioner } = await (supabase as any)
          .from('practitioners')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (practitioner) {
          setDisplayName(practitioner.display_name || '')
          setLicenseNumber(practitioner.license_number || '')
          setSpecialty(practitioner.specialty || '')
          setClinicName(practitioner.clinic_name || '')
          // These would come from practitioner table if we add the columns
          setContactPhone(practitioner.contact_phone || '')
          setContactEmail(practitioner.contact_email || user.email || '')
        }

        // Load preferences from localStorage
        const prefs = localStorage.getItem('clinic_preferences')
        if (prefs) {
          const parsed = JSON.parse(prefs)
          setInactivityDays(parsed.inactivityDays || 7)
          setWeightGainThreshold(parsed.weightGainThreshold || 0.5)
          if (parsed.defaultDiet) {
            setDefaultDiet(parsed.defaultDiet)
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, supabase])

  const saveProfile = async () => {
    if (!user || !displayName.trim()) return
    setSaving(true)

    try {
      const { error } = await (supabase as any)
        .from('practitioners')
        .update({
          display_name: displayName.trim(),
          license_number: licenseNumber.trim() || null,
          specialty: specialty.trim() || null,
          clinic_name: clinicName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Save preferences to localStorage
      localStorage.setItem('clinic_preferences', JSON.stringify({
        inactivityDays,
        weightGainThreshold,
        defaultDiet
      }))

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-light tracking-tight">
          Configuración
        </h1>
        <p className="text-ink-4 mt-1">
          Personaliza tu perfil y preferencias
        </p>
      </div>

      {/* Professional Profile */}
      <div className="bg-white rounded-2xl border border-ink-7 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-sky-soft flex items-center justify-center">
            <User className="w-5 h-5 text-sky" />
          </div>
          <div>
            <h2 className="font-medium">Perfil profesional</h2>
          </div>
        </div>
        <p className="text-sm text-ink-4 mb-6 ml-[52px]">
          Esta información aparece en los reportes que generas para tus pacientes.
        </p>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
              <User className="w-4 h-4" />
              Nombre completo
              <span className="text-berry">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Lic. María García"
              className="w-full bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
            <p className="text-xs text-ink-5 mt-1">
              Aparece en reportes y es visible para tus pacientes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
                <Award className="w-4 h-4" />
                Cédula profesional
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="12345678"
                className="w-full bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
              <p className="text-xs text-ink-5 mt-1">
                Se incluye en reportes oficiales
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
                <Stethoscope className="w-4 h-4" />
                Especialidad
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Nutriología clínica"
                className="w-full bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
              <p className="text-xs text-ink-5 mt-1">
                Se muestra bajo tu nombre
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Info */}
      <div className="bg-white rounded-2xl border border-ink-7 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-leaf-soft flex items-center justify-center">
            <Building2 className="w-5 h-5 text-leaf" />
          </div>
          <div>
            <h2 className="font-medium">Consultorio</h2>
          </div>
        </div>
        <p className="text-sm text-ink-4 mb-6 ml-[52px]">
          Datos de contacto para tus pacientes.
        </p>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
              <Building2 className="w-4 h-4" />
              Nombre del consultorio
            </label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Centro de Nutrición Integral"
              className="w-full bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
            <p className="text-xs text-ink-5 mt-1">
              Aparece como encabezado en reportes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
                <Phone className="w-4 h-4" />
                Teléfono de contacto
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="55 1234 5678"
                className="w-full bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
                <Mail className="w-4 h-4" />
                Email de contacto
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="nutricion@ejemplo.com"
                className="w-full bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Preferences */}
      <div className="bg-white rounded-2xl border border-ink-7 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-honey-soft flex items-center justify-center">
            <Bell className="w-5 h-5 text-honey" />
          </div>
          <div>
            <h2 className="font-medium">Alertas de seguimiento</h2>
          </div>
        </div>
        <p className="text-sm text-ink-4 mb-6 ml-[52px]">
          Define cuándo un paciente aparece en "Requieren atención" en Reportes.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
              <Clock className="w-4 h-4" />
              Días sin actividad
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="30"
                value={inactivityDays}
                onChange={(e) => setInactivityDays(parseInt(e.target.value) || 7)}
                className="w-20 bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10 text-center"
              />
              <span className="text-ink-4">días</span>
            </div>
            <p className="text-xs text-ink-5 mt-2">
              Pacientes sin registros en este período se marcan para seguimiento
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-3 mb-2">
              <Scale className="w-4 h-4" />
              Umbral de aumento
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={weightGainThreshold}
                onChange={(e) => setWeightGainThreshold(parseFloat(e.target.value) || 0.5)}
                className="w-20 bg-paper rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10 text-center"
              />
              <span className="text-ink-4">kg</span>
            </div>
            <p className="text-xs text-ink-5 mt-2">
              Alertar si un paciente sube más de este peso en 30 días
            </p>
          </div>
        </div>
      </div>

      {/* Default Diet Plan */}
      <div className="bg-white rounded-2xl border border-ink-7 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-signal-soft flex items-center justify-center">
            <Utensils className="w-5 h-5 text-signal" />
          </div>
          <div>
            <h2 className="font-medium">Plan nutricional por defecto</h2>
          </div>
        </div>
        <p className="text-sm text-ink-4 mb-6 ml-[52px]">
          Valores iniciales al crear un plan para un nuevo paciente. Puedes personalizarlos después.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'verdura', label: 'Verdura', color: 'text-leaf', bg: 'bg-leaf-soft' },
            { key: 'fruta', label: 'Fruta', color: 'text-berry', bg: 'bg-berry-soft' },
            { key: 'carb', label: 'Carbohidratos', color: 'text-honey', bg: 'bg-honey-soft' },
            { key: 'leguminosa', label: 'Leguminosa', color: 'text-sky', bg: 'bg-sky-soft' },
            { key: 'proteina', label: 'Proteína', color: 'text-berry', bg: 'bg-berry-soft' },
            { key: 'grasa', label: 'Grasa', color: 'text-honey', bg: 'bg-honey-soft' },
          ].map(({ key, label, color, bg }) => (
            <div key={key} className={`${bg} rounded-xl p-4`}>
              <label className={`block text-xs font-medium ${color} mb-2`}>
                {label}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={defaultDiet[key as keyof typeof defaultDiet]}
                onChange={(e) => setDefaultDiet(prev => ({
                  ...prev,
                  [key]: parseInt(e.target.value) || 0
                }))}
                className="w-full bg-white rounded-lg px-3 py-2 text-center text-lg font-medium border-0 focus:ring-2 focus:ring-ink/10"
              />
              <p className="text-xs text-ink-4 text-center mt-1">porciones</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-paper-2 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-ink-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ink-4">
            Estos son valores de referencia. El plan de cada paciente se configura individualmente desde su perfil.
          </p>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-paper-2 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-ink-4" />
            <div>
              <p className="text-sm text-ink-4">Cuenta vinculada</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-sky-soft text-sky text-xs font-medium">
            Profesional
          </span>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveProfile}
        disabled={saving || !displayName.trim()}
        className="w-full py-4 rounded-full bg-signal text-white font-medium hover:bg-signal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
      >
        {saved ? (
          <>
            <Check className="w-5 h-5" />
            Cambios guardados
          </>
        ) : saving ? (
          <PulseLine w={24} h={12} color="#fff" strokeWidth={2} active />
        ) : (
          <>
            <Save className="w-5 h-5" />
            Guardar configuración
          </>
        )}
      </button>
    </div>
  )
}
