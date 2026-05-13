import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FOOD_EQUIVALENTS,
  DAILY_BUDGET,
  ROUTINES,
  ROUTINE_SCHEDULE,
} from '@/lib/constants'
import { getTodayInTimezone, getNowPartsInTimezone } from '@/lib/utils'
import type { FoodGroup, MealType } from '@/types'
import { getAuthedUser } from '@/lib/api-auth'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Chat does a tool-use loop with Claude (multiple round-trips), which can
// easily exceed Vercel's 10s default. Bump to 60s — works on Pro; on Hobby
// fluid compute also allows up to 60s.
export const maxDuration = 60

// Try Sonnet 4.6 first; if Anthropic returns 529 (Overloaded) or 429 (rate
// limit), retry with backoff. After two failures on the primary, fall back
// to Haiku 4.5 — slower-but-cheaper-and-different-pool model so the user
// still gets a reply when one model is saturated.
const PRIMARY_MODEL = 'claude-sonnet-4-6'
const FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

type ClaudeParams = Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>

async function callClaudeWithFallback(
  params: ClaudeParams
): Promise<Anthropic.Message> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const isRetriable = (err: any) => err?.status === 529 || err?.status === 429
  let lastError: any

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await anthropic.messages.create({ ...params, model })
      } catch (err) {
        lastError = err
        if (!isRetriable(err)) break // hard error → stop, don't try fallback
        if (attempt < 2) await sleep(500 * Math.pow(2, attempt)) // 500ms, 1s
      }
    }
  }
  throw lastError
}

// Validate a positive finite number within [min, max]. Throws with a user-safe message.
function validateNumber(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; allowZero?: boolean } = {}
): number {
  const n = typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n)) throw new Error(`${field}: debe ser un número válido`)
  const min = opts.min ?? (opts.allowZero ? 0 : 0.001)
  if (n < min) throw new Error(`${field}: debe ser al menos ${min}`)
  if (opts.max !== undefined && n > opts.max) throw new Error(`${field}: excede el máximo (${opts.max})`)
  return n
}

const VALID_MEALS: MealType[] = ['desayuno', 'snack1', 'comida', 'snack2', 'cena', 'snack3']
const VALID_GROUPS: FoodGroup[] = ['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa']
const VALID_FEELINGS = ['muy_pesado', 'dificil', 'perfecto', 'ligero', 'quiero_mas'] as const

function validateEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${field}: valor inválido (esperado: ${allowed.join(', ')})`)
  }
  return value as T
}

// Tool definitions for the coach
const tools: Anthropic.Tool[] = [
  {
    name: 'get_today_food_logs',
    description: 'Obtiene todos los alimentos registrados hoy por el usuario',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_food_logs_by_date',
    description: 'Obtiene los alimentos registrados en una fecha específica',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'add_food_log',
    description: 'Registra un alimento consumido. Usa esto cuando el usuario te dice que comió algo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        meal: {
          type: 'string',
          enum: ['desayuno', 'snack1', 'comida', 'snack2', 'cena', 'snack3'],
          description: 'Tipo de comida (snack1=mañana, snack2=tarde, snack3=noche)',
        },
        group_type: {
          type: 'string',
          enum: ['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa'],
          description: 'Grupo alimenticio',
        },
        quantity: {
          type: 'number',
          description: 'Cantidad de equivalentes (ej: 2 proteínas = 2)',
        },
        food_name: {
          type: 'string',
          description: 'Nombre del alimento (opcional, para referencia)',
        },
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD, por defecto hoy',
        },
      },
      required: ['meal', 'group_type', 'quantity'],
    },
  },
  {
    name: 'delete_food_log',
    description: 'Elimina un registro de alimento por su ID',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID del registro a eliminar',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_today_gym_session',
    description: 'Obtiene la sesión de gimnasio de hoy si existe',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_gym_sessions',
    description: 'Obtiene las sesiones de gimnasio recientes del usuario',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de sesiones a obtener (default 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_session_sets',
    description: 'Obtiene las series de una sesión de gimnasio específica',
    input_schema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'ID de la sesión',
        },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'update_session_set',
    description: 'Actualiza una serie específica de un ejercicio (peso, reps, feeling)',
    input_schema: {
      type: 'object' as const,
      properties: {
        set_id: {
          type: 'string',
          description: 'ID de la serie a actualizar',
        },
        lbs: {
          type: 'number',
          description: 'Peso en libras',
        },
        reps: {
          type: 'number',
          description: 'Número de repeticiones',
        },
        feeling: {
          type: 'string',
          enum: ['muy_pesado', 'dificil', 'perfecto', 'ligero', 'quiero_mas'],
          description: 'Cómo se sintió el ejercicio',
        },
      },
      required: ['set_id'],
    },
  },
  {
    name: 'get_weight_logs',
    description: 'Obtiene los registros de peso del usuario',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de registros (default 30)',
        },
      },
      required: [],
    },
  },
  {
    name: 'add_weight_log',
    description: 'Registra un nuevo peso corporal',
    input_schema: {
      type: 'object' as const,
      properties: {
        weight_kg: {
          type: 'number',
          description: 'Peso en kilogramos',
        },
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD, por defecto hoy',
        },
        notes: {
          type: 'string',
          description: 'Notas opcionales',
        },
      },
      required: ['weight_kg'],
    },
  },
  {
    name: 'get_habits_status',
    description: 'Obtiene el estado de los hábitos de hoy',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'log_habit',
    description: 'Registra el cumplimiento de un hábito',
    input_schema: {
      type: 'object' as const,
      properties: {
        habit_id: {
          type: 'string',
          description: 'ID del hábito',
        },
        value: {
          type: 'number',
          description: 'Valor (para hábitos de cantidad)',
        },
        completed: {
          type: 'boolean',
          description: 'Si se completó (para hábitos de check)',
        },
      },
      required: ['habit_id'],
    },
  },
  {
    name: 'get_food_equivalents',
    description: 'Obtiene la lista de equivalentes de un grupo alimenticio',
    input_schema: {
      type: 'object' as const,
      properties: {
        group: {
          type: 'string',
          enum: ['verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa'],
          description: 'Grupo alimenticio',
        },
      },
      required: ['group'],
    },
  },
  {
    name: 'get_daily_budget',
    description: 'Obtiene el presupuesto diario de equivalentes del usuario',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_routine_info',
    description: 'Obtiene información sobre una rutina de gimnasio específica',
    input_schema: {
      type: 'object' as const,
      properties: {
        routine_type: {
          type: 'string',
          enum: ['upper_a', 'upper_b', 'lower_a', 'lower_b'],
          description: 'Tipo de rutina',
        },
      },
      required: ['routine_type'],
    },
  },
  {
    name: 'get_today_routine',
    description: 'Obtiene qué rutina toca hoy según el calendario',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
]

// Tool execution
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const today = getTodayInTimezone()

  switch (toolName) {
    case 'get_today_food_logs': {
      const { data } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at')
      return JSON.stringify(data || [])
    }

    case 'get_food_logs_by_date': {
      const { data } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', toolInput.date as string)
        .order('created_at')
      return JSON.stringify(data || [])
    }

    case 'add_food_log': {
      try {
        const meal = validateEnum(toolInput.meal, 'meal', VALID_MEALS)
        const group_type = validateEnum(toolInput.group_type, 'group_type', VALID_GROUPS)
        const quantity = validateNumber(toolInput.quantity, 'quantity', { min: 0.1, max: 20 })
        const { data, error } = await supabase
          .from('food_logs')
          .insert({
            user_id: userId,
            date: (toolInput.date as string) || today,
            meal,
            group_type,
            quantity,
            food_name: toolInput.food_name as string | undefined,
          })
          .select()
          .single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, data })
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid input' })
      }
    }

    case 'delete_food_log': {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', toolInput.id as string)
        .eq('user_id', userId)
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true })
    }

    case 'get_today_gym_session': {
      const { data } = await supabase
        .from('gym_sessions')
        .select('*, session_sets(*)')
        .eq('user_id', userId)
        .eq('date', today)
        .single()
      return JSON.stringify(data || null)
    }

    case 'get_gym_sessions': {
      const limit = (toolInput.limit as number) || 10
      const { data } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit)
      return JSON.stringify(data || [])
    }

    case 'get_session_sets': {
      const { data } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', toolInput.session_id as string)
        .order('set_number')
      return JSON.stringify(data || [])
    }

    case 'update_session_set': {
      try {
        const updates: Record<string, unknown> = {}
        if (toolInput.lbs !== undefined) {
          updates.lbs = validateNumber(toolInput.lbs, 'lbs', { min: 0, max: 2000, allowZero: true })
        }
        if (toolInput.reps !== undefined) {
          updates.reps = validateNumber(toolInput.reps, 'reps', { min: 0, max: 500, allowZero: true })
        }
        if (toolInput.feeling !== undefined) {
          updates.feeling = validateEnum(toolInput.feeling, 'feeling', VALID_FEELINGS)
        }

        // Verify set ownership via join on gym_sessions.user_id before updating
        const { data: existing } = await supabase
          .from('session_sets')
          .select('session_id, gym_sessions!inner(user_id)')
          .eq('id', toolInput.set_id as string)
          .maybeSingle()

        const ownerId = (existing as { gym_sessions?: { user_id?: string } } | null)?.gym_sessions?.user_id
        if (!existing || ownerId !== userId) {
          return JSON.stringify({ error: 'Set no encontrado o sin permisos' })
        }

        const { data, error } = await supabase
          .from('session_sets')
          .update(updates)
          .eq('id', toolInput.set_id as string)
          .select()
          .single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, data })
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid input' })
      }
    }

    case 'get_weight_logs': {
      const limit = (toolInput.limit as number) || 30
      const { data } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit)
      return JSON.stringify(data || [])
    }

    case 'add_weight_log': {
      try {
        const weight_kg = validateNumber(toolInput.weight_kg, 'weight_kg', { min: 20, max: 300 })
        const { data, error } = await supabase
          .from('weight_logs')
          .upsert({
            user_id: userId,
            date: (toolInput.date as string) || today,
            weight_kg,
            notes: toolInput.notes as string | undefined,
          }, { onConflict: 'user_id,date' })
          .select()
          .single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, data })
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid input' })
      }
    }

    case 'get_habits_status': {
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)

      return JSON.stringify({ habits: habits || [], todayLogs: logs || [] })
    }

    case 'log_habit': {
      try {
        const value = toolInput.value !== undefined
          ? validateNumber(toolInput.value, 'value', { min: 0, max: 1000, allowZero: true })
          : undefined

        // Verify habit ownership before upsert
        const { data: habit } = await supabase
          .from('habits')
          .select('user_id')
          .eq('id', toolInput.habit_id as string)
          .maybeSingle()

        if (!habit || (habit as { user_id: string }).user_id !== userId) {
          return JSON.stringify({ error: 'Hábito no encontrado o sin permisos' })
        }

        const { data, error } = await supabase
          .from('habit_logs')
          .upsert({
            habit_id: toolInput.habit_id as string,
            user_id: userId,
            date: today,
            value,
            completed: toolInput.completed as boolean ?? true,
          }, { onConflict: 'habit_id,date' })
          .select()
          .single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, data })
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid input' })
      }
    }

    case 'get_food_equivalents': {
      const group = toolInput.group as FoodGroup
      const equivalents = FOOD_EQUIVALENTS[group] || []
      return JSON.stringify(equivalents)
    }

    case 'get_daily_budget': {
      // Check if user has active diet config
      const { data: dietConfig } = await supabase
        .from('diet_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      const budget = dietConfig ? {
        verdura: dietConfig.verdura,
        fruta: dietConfig.fruta,
        carb: dietConfig.carb,
        leguminosa: dietConfig.leguminosa,
        proteina: dietConfig.proteina,
        grasa: dietConfig.grasa,
      } : DAILY_BUDGET
      return JSON.stringify(budget)
    }

    case 'get_routine_info': {
      const routineType = toolInput.routine_type as string
      const routine = ROUTINES[routineType]
      if (!routine) return JSON.stringify({ error: 'Rutina no encontrada' })
      return JSON.stringify(routine)
    }

    case 'get_today_routine': {
      const { dayOfWeek } = getNowPartsInTimezone()
      const routineType = ROUTINE_SCHEDULE[dayOfWeek]
      if (routineType === 'rest') {
        return JSON.stringify({ type: 'rest', message: 'Hoy es día de descanso' })
      }
      const routine = ROUTINES[routineType]
      return JSON.stringify({ type: routineType, routine })
    }

    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` })
  }
}

// Coach personality presets — two independent axes the user picks in Settings.
type CoachTone = 'sereno' | 'cercano' | 'directo' | 'academico'
type CoachStyle = 'estricto' | 'equilibrado' | 'animador'

const TONE_DIRECTIVES: Record<CoachTone, string> = {
  sereno:
    'Tono: pausado y editorial. Frases medidas, sin floritura, sin signos de exclamación. Como un coach que ha visto todo y no se altera.',
  cercano:
    'Tono: cálido y cercano, como un amigo que sabe del tema. Permite alguna palabra coloquial natural ("oye", "fíjate") sin caer en modismos forzados. Evita la solemnidad.',
  directo:
    'Tono: muy breve, sin rodeos, militar. Frases cortas, una idea por frase. Cero relleno, cero cortesías de manual. Termina rápido.',
  academico:
    'Tono: explicativo y reflexivo. Cuando dé un consejo, da el porqué corto detrás (fisiología, balance energético, contexto). No suena pedante: explica como buen profesor.',
}

const STYLE_DIRECTIVES: Record<CoachStyle, string> = {
  estricto:
    'Estilo de coaching: confronta cuando el usuario se sale del plan. No suaviza la realidad. Si se excede, lo dice y ofrece un correctivo concreto. Nunca insulta ni culpa.',
  equilibrado:
    'Estilo de coaching: directo pero amable. Sugiere ajustes con calma, no juzga. Si el usuario se excede, ofrece un siguiente paso útil sin dramatismo.',
  animador:
    'Estilo de coaching: celebra el proceso. Cuando el usuario se excede, encuentra el aprendizaje y vuelve al plan. Refuerza lo que ya está haciendo bien antes de sugerir un cambio.',
}

// Patient context for Coach AI
interface PatientContext {
  hasPractitioner: boolean
  practitionerName?: string
  clinicName?: string
  dailyBudget: {
    verdura: number
    fruta: number
    carb: number
    leguminosa: number
    proteina: number
    grasa: number
  }
  activeMeals: Record<string, boolean>
  todayProgress: {
    verdura: number
    fruta: number
    carb: number
    leguminosa: number
    proteina: number
    grasa: number
  }
  currentWeight?: number
  goalWeight?: number
  weightChange30d?: number
  prescriptionNotes?: string
  coachTone: CoachTone
  coachStyle: CoachStyle
}

async function getPatientContext(
  supabase: SupabaseClient,
  userId: string
): Promise<PatientContext> {
  const today = getTodayInTimezone()

  // Check if user has an active practitioner relationship
  const { data: relationship } = await supabase
    .from('practitioner_patients')
    .select(`
      status,
      practitioners (
        display_name,
        clinic_name
      )
    `)
    .eq('patient_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  // Get active diet config
  const { data: dietConfig } = await supabase
    .from('diet_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get today's food logs for progress
  const { data: todayLogs } = await supabase
    .from('food_logs')
    .select('group_type, quantity')
    .eq('user_id', userId)
    .eq('date', today)

  // Calculate today's progress
  const progress = {
    verdura: 0,
    fruta: 0,
    carb: 0,
    leguminosa: 0,
    proteina: 0,
    grasa: 0,
  }
  if (todayLogs) {
    todayLogs.forEach((log: { group_type: FoodGroup; quantity: number }) => {
      if (log.group_type in progress) {
        progress[log.group_type as keyof typeof progress] += log.quantity
      }
    })
  }

  // Get current weight and 30-day change
  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('weight_kg, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30)

  let currentWeight: number | undefined
  let weightChange30d: number | undefined
  if (weightLogs && weightLogs.length > 0) {
    currentWeight = weightLogs[0].weight_kg
    if (weightLogs.length > 1 && currentWeight !== undefined) {
      const oldestWeight = weightLogs[weightLogs.length - 1].weight_kg
      weightChange30d = currentWeight - oldestWeight
    }
  }

  // Get goal weight + coach personality preferences from user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('goal_weight_kg, coach_tone, coach_style')
    .eq('user_id', userId)
    .maybeSingle()

  // Build default budget
  const defaultBudget = {
    verdura: 4,
    fruta: 2,
    carb: 4,
    leguminosa: 1,
    proteina: 8,
    grasa: 6,
  }

  // Build active meals (default all enabled)
  const defaultActiveMeals = {
    desayuno: true,
    snack1: true,
    comida: true,
    snack2: true,
    cena: true,
    snack3: true,
  }

  // Cast practitioners to single object (Supabase returns it as array for joins)
  const practitioner = relationship?.practitioners as unknown as { display_name: string; clinic_name: string } | null

  return {
    hasPractitioner: !!relationship && !!practitioner,
    practitionerName: practitioner?.display_name,
    clinicName: practitioner?.clinic_name,
    dailyBudget: dietConfig ? {
      verdura: dietConfig.verdura,
      fruta: dietConfig.fruta,
      carb: dietConfig.carb,
      leguminosa: dietConfig.leguminosa,
      proteina: dietConfig.proteina,
      grasa: dietConfig.grasa,
    } : defaultBudget,
    activeMeals: dietConfig?.active_meals || defaultActiveMeals,
    todayProgress: progress,
    currentWeight,
    goalWeight: profile?.goal_weight_kg,
    weightChange30d,
    prescriptionNotes: dietConfig?.notes,
    coachTone: (profile?.coach_tone as CoachTone | undefined) || 'sereno',
    coachStyle: (profile?.coach_style as CoachStyle | undefined) || 'equilibrado',
  }
}

// Manual Spanish date formatting — toLocaleDateString('es-MX') is unreliable
// on Vercel's Node runtime (locale data may not be bundled).
const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function buildSystemPrompt(context: PatientContext): string {
  // Anchor "today" so Claude can compute "ayer", "el lunes", etc. when the
  // user logs food/weight after the fact. Without this, the model has no
  // ground truth for relative dates and defaults to its training cutoff.
  const today = getTodayInTimezone('America/Mexico_City')
  const [yyyy, mm, dd] = today.split('-').map(Number)
  // Construct date at noon UTC to avoid TZ flips on edge dates.
  const anchorDate = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0))
  const todayHumanLong = `${DAYS_ES[anchorDate.getUTCDay()]} ${dd} de ${MONTHS_ES[mm - 1]} de ${yyyy}`

  const dateSection = `
FECHA ACTUAL:
- Hoy es ${todayHumanLong} (${today} en formato YYYY-MM-DD).
- Cuando el usuario mencione "ayer", "antier", "el lunes pasado" u otra fecha relativa,
  calcula la fecha exacta y pásala al campo \`date\` del tool. Nunca asumas que un
  registro fuera de hoy va a hoy: si la fecha es distinta, debes pasarla explícita.`

  // Build practitioner context section
  const practitionerSection = context.hasPractitioner
    ? `
SOBRE TU NUTRICIONISTA:
- Tu nutricionista es ${context.practitionerName}${context.clinicName ? ` de ${context.clinicName}` : ''}
- El plan que sigues fue diseñado específicamente para ti
${context.prescriptionNotes ? `- Notas del plan: ${context.prescriptionNotes}` : ''}
- Si tienes dudas sobre cambios al plan, recuerda consultar con tu nutricionista
`
    : ''

  // Build budget section
  const budgetSection = `
SISTEMA DE EQUIVALENTES:
Tu presupuesto diario de grupos alimenticios:
- Verdura: ${context.dailyBudget.verdura} equivalentes
- Fruta: ${context.dailyBudget.fruta} equivalentes
- Carbohidratos: ${context.dailyBudget.carb} equivalentes
- Leguminosa: ${context.dailyBudget.leguminosa} equivalente(s)
- Proteína: ${context.dailyBudget.proteina} equivalentes
- Grasa: ${context.dailyBudget.grasa} equivalentes`

  // Build progress section
  const remaining = {
    verdura: context.dailyBudget.verdura - context.todayProgress.verdura,
    fruta: context.dailyBudget.fruta - context.todayProgress.fruta,
    carb: context.dailyBudget.carb - context.todayProgress.carb,
    leguminosa: context.dailyBudget.leguminosa - context.todayProgress.leguminosa,
    proteina: context.dailyBudget.proteina - context.todayProgress.proteina,
    grasa: context.dailyBudget.grasa - context.todayProgress.grasa,
  }

  const progressSection = `
PROGRESO DE HOY:
- Verdura: ${context.todayProgress.verdura}/${context.dailyBudget.verdura} (faltan ${Math.max(0, remaining.verdura)})
- Fruta: ${context.todayProgress.fruta}/${context.dailyBudget.fruta} (faltan ${Math.max(0, remaining.fruta)})
- Carbohidratos: ${context.todayProgress.carb}/${context.dailyBudget.carb} (faltan ${Math.max(0, remaining.carb)})
- Leguminosa: ${context.todayProgress.leguminosa}/${context.dailyBudget.leguminosa} (faltan ${Math.max(0, remaining.leguminosa)})
- Proteína: ${context.todayProgress.proteina}/${context.dailyBudget.proteina} (faltan ${Math.max(0, remaining.proteina)})
- Grasa: ${context.todayProgress.grasa}/${context.dailyBudget.grasa} (faltan ${Math.max(0, remaining.grasa)})`

  // Build weight section
  const weightSection = context.currentWeight
    ? `
PESO:
- Peso actual: ${context.currentWeight} kg
${context.goalWeight ? `- Meta: ${context.goalWeight} kg` : ''}
${context.weightChange30d !== undefined ? `- Cambio últimos 30 días: ${context.weightChange30d > 0 ? '+' : ''}${context.weightChange30d.toFixed(1)} kg` : ''}`
    : ''

  // Build active meals section
  const activeMealsList = Object.entries(context.activeMeals)
    .filter(([_, enabled]) => enabled)
    .map(([meal]) => meal)

  const mealsSection = `
COMIDAS HABILITADAS:
${activeMealsList.includes('desayuno') ? '- desayuno (mañana)' : ''}
${activeMealsList.includes('snack1') ? '- snack1 (media mañana)' : ''}
${activeMealsList.includes('comida') ? '- comida (mediodía)' : ''}
${activeMealsList.includes('snack2') ? '- snack2 (tarde)' : ''}
${activeMealsList.includes('cena') ? '- cena (noche)' : ''}
${activeMealsList.includes('snack3') ? '- snack3 (antes de dormir)' : ''}`

  // Personality preset directives picked by the user in Settings
  const personalitySection = `
PERSONALIDAD (estos dos rasgos son el filtro principal sobre todo lo demás del estilo):
${TONE_DIRECTIVES[context.coachTone]}
${STYLE_DIRECTIVES[context.coachStyle]}`

  return `Eres el Coach AI personal de FitKis, una app de fitness y nutrición. Tu nombre es Coach Fit.
${personalitySection}
${dateSection}
${practitionerSection}
${budgetSection}
${progressSection}
${weightSection}
${mealsSection}

Un equivalente es una porción estándar de un alimento. Por ejemplo:
- 1 huevo = 1 proteína
- 1 manzana = 1 fruta
- ½ taza arroz = 1 carbohidrato

REGLAS ESPECIALES:
- Yogurt griego = 1 proteína + 1 grasa (cuenta doble)
- 1 copa de alcohol = 1 carbohidrato
- Si cocina con aceite, cuenta como grasa de cocinar

TU ROL:
1. Ayudar a registrar alimentos cuando el usuario te dice qué comió
2. Razonar sobre alimentos no estándar (ej: "hamburguesa de pollo sin pan" → preguntar ingredientes y convertir a equivalentes)
3. Sugerir ideas de comidas y menús dentro del presupuesto restante
4. Consultar y actualizar datos de gimnasio (pesos, reps)
5. Dar consejos de entrenamiento y nutrición
6. Ser motivador pero realista
${context.hasPractitioner ? '7. Recordar que el plan fue diseñado por su nutricionista y respetar sus indicaciones' : ''}

CUANDO EL USUARIO MENCIONE COMIDA:
1. Primero pregunta detalles si es necesario (cantidad, ingredientes, cómo estaba preparado)
2. Razona qué grupos alimenticios contiene
3. Convierte a equivalentes y registra usando add_food_log UNA VEZ por cada grupo alimenticio
4. IMPORTANTE: Cada alimento se registra UNA SOLA VEZ. No dupliques llamadas a add_food_log.
5. Puedes hacer múltiples llamadas a add_food_log en una sola respuesta (una por cada grupo diferente)
6. Confirma lo registrado y muestra el presupuesto restante actualizado

ESTILO (la app es editorial y calmada, no un chatbot ruidoso):
- Tuteo natural, español neutro, sin modismos forzados.
- Respuestas BREVES. Una a tres frases en la mayoría de los casos. Listas SOLO si el usuario pide opciones o menús.
- Markdown está permitido y se renderiza en la app: puedes usar **negritas** con moderación para destacar números o nombres, listas con guiones para opciones, y > para citar. NO abuses — un mensaje sano tiene 0-1 negritas, no 5.
- Evita preámbulos como "por ejemplo:", "tip:", "nota:". Si das un ejemplo, intégralo en la frase: "una manzana mediana cuenta como una fruta", no "Por ejemplo: 1 manzana = 1 fruta".
- Sin emojis. El tono es sobrio.
- Voz amable pero directa. No regañes si se excede; sugiere un ajuste concreto en una frase.
- Cuando confirmes un registro, una frase: "Anoté tu manzana, te quedan 3 frutas." No hagas resúmenes largos con secciones.
- Cuando preguntes detalles, una pregunta a la vez. No bombardees.

GRUPOS ALIMENTICIOS Y SUS CÓDIGOS:
- verdura = Verduras
- fruta = Frutas
- carb = Carbohidratos
- proteina = Proteínas (carnes, huevos, lácteos)
- grasa = Grasas (aguacate, nueces, aceites)
- leguminosa = Leguminosas (frijoles, lentejas, garbanzos)`
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthedUser(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { messages } = await request.json()

    // Get patient context for personalized system prompt.
    // If any query fails (missing table, RLS, etc.), fall back to defaults so
    // the chat still works.
    let patientContext: PatientContext
    try {
      patientContext = await getPatientContext(supabase, user.id)
    } catch (ctxErr) {
      console.error('getPatientContext failed, using defaults:', ctxErr)
      patientContext = {
        hasPractitioner: false,
        dailyBudget: { verdura: 4, fruta: 2, carb: 4, leguminosa: 1, proteina: 8, grasa: 6 },
        activeMeals: { desayuno: true, snack1: true, comida: true, snack2: true, cena: true, snack3: true },
        todayProgress: { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 0, grasa: 0 },
        coachTone: 'sereno',
        coachStyle: 'equilibrado',
      }
    }
    const systemPrompt = buildSystemPrompt(patientContext)

    // Maintain conversation history through tool-use loop
    let conversationMessages = [...messages]

    // Initial call to Claude (with retry + fallback model on overload)
    let response = await callClaudeWithFallback({
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: conversationMessages,
    })

    // Process tool calls in a loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          supabase,
          user.id
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })
      }

      // Add assistant response and tool results to conversation history
      conversationMessages = [
        ...conversationMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ]

      // Continue the conversation with full history
      response = await callClaudeWithFallback({
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: conversationMessages,
      })
    }

    // Extract text response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    return NextResponse.json({
      message: textContent?.text || 'No response',
      role: 'assistant',
    })

  } catch (error) {
    console.error('Chat API error:', error)
    const message = error instanceof Error ? error.message : String(error)
    const name = error instanceof Error ? error.name : 'Error'
    // Surface the real error so the mobile client and Vercel logs match.
    return NextResponse.json(
      { error: 'Error procesando el mensaje', detail: `${name}: ${message}` },
      { status: 500 }
    )
  }
}
