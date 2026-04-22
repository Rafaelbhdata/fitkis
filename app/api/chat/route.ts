import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'
import {
  FOOD_EQUIVALENTS,
  DAILY_BUDGET,
  ROUTINES,
  ROUTINE_SCHEDULE,
} from '@/lib/constants'
import type { FoodGroup, MealType } from '@/types'

function createRouteHandlerClient() {
  const cookieStore = cookies()

  // Using 'any' for Database type since not all tables are typed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - middleware handles session refresh
          }
        },
      },
    }
  )
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
  supabase: ReturnType<typeof createRouteHandlerClient>,
  userId: string
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

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
      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          user_id: userId,
          date: (toolInput.date as string) || today,
          meal: toolInput.meal as MealType,
          group_type: toolInput.group_type as FoodGroup,
          quantity: toolInput.quantity as number,
          food_name: toolInput.food_name as string | undefined,
        })
        .select()
        .single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, data })
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
      const updates: Record<string, unknown> = {}
      if (toolInput.lbs !== undefined) updates.lbs = toolInput.lbs
      if (toolInput.reps !== undefined) updates.reps = toolInput.reps
      if (toolInput.feeling !== undefined) updates.feeling = toolInput.feeling

      const { data, error } = await supabase
        .from('session_sets')
        .update(updates)
        .eq('id', toolInput.set_id as string)
        .select()
        .single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, data })
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
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert({
          user_id: userId,
          date: (toolInput.date as string) || today,
          weight_kg: toolInput.weight_kg as number,
          notes: toolInput.notes as string | undefined,
        }, { onConflict: 'user_id,date' })
        .select()
        .single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, data })
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
      const { data, error } = await supabase
        .from('habit_logs')
        .upsert({
          habit_id: toolInput.habit_id as string,
          user_id: userId,
          date: today,
          value: toolInput.value as number | undefined,
          completed: toolInput.completed as boolean ?? true,
        }, { onConflict: 'habit_id,date' })
        .select()
        .single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, data })
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
      const dayOfWeek = new Date().getDay()
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
}

async function getPatientContext(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  userId: string
): Promise<PatientContext> {
  const today = new Date().toISOString().split('T')[0]

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
    .single()

  // Get active diet config
  const { data: dietConfig } = await supabase
    .from('diet_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

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

  // Get goal weight from user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('goal_weight_kg')
    .eq('user_id', userId)
    .single()

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
  }
}

function buildSystemPrompt(context: PatientContext): string {
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

  return `Eres el Coach AI personal de FitKis, una app de fitness y nutrición. Tu nombre es Coach Fit.
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

ESTILO:
- Habla en español casual (tuteo)
- Sé conciso pero amigable
- Usa emojis ocasionalmente
- Celebra los logros
- Si el usuario se excede del presupuesto, no lo regañes, sugiere ajustes

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
    const supabase = createRouteHandlerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { messages } = await request.json()

    // Get patient context for personalized system prompt
    const patientContext = await getPatientContext(supabase, user.id)
    const systemPrompt = buildSystemPrompt(patientContext)

    // Maintain conversation history through tool-use loop
    let conversationMessages = [...messages]

    // Initial call to Claude
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
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
    return NextResponse.json(
      { error: 'Error procesando el mensaje' },
      { status: 500 }
    )
  }
}
