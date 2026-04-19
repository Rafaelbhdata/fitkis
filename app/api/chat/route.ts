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
          enum: ['desayuno', 'snack', 'comida', 'cena'],
          description: 'Tipo de comida',
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
      // Check if user has custom budget in settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('daily_budget')
        .eq('user_id', userId)
        .single()

      const budget = settings?.daily_budget || DAILY_BUDGET
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

const SYSTEM_PROMPT = `Eres el Coach AI personal de FitKis, una app de fitness y nutrición. Tu nombre es Coach Fit.

SOBRE EL USUARIO:
- Hombre de 163 cm que está bajando de peso
- Entrena 4 días a la semana con pesas (rutina Upper/Lower)
- Sigue un plan de alimentación por equivalentes (sistema mexicano)
- Meta: bajar de peso de forma sostenible

SISTEMA DE EQUIVALENTES:
El usuario tiene un presupuesto diario de grupos alimenticios:
- Verdura: 4 equivalentes
- Fruta: 2 equivalentes
- Carbohidratos: 4 equivalentes
- Leguminosa: 1 equivalente
- Proteína: 8 equivalentes
- Grasa: 6 equivalentes

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
3. Sugerir ideas de comidas y menús dentro del presupuesto
4. Consultar y actualizar datos de gimnasio (pesos, reps)
5. Dar consejos de entrenamiento y nutrición
6. Ser motivador pero realista

CUANDO EL USUARIO MENCIONE COMIDA:
1. Primero pregunta detalles si es necesario (cantidad, ingredientes, cómo estaba preparado)
2. Razona qué grupos alimenticios contiene
3. Convierte a equivalentes y registra usando add_food_log
4. Confirma lo registrado y muestra el presupuesto restante

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
- leguminosa = Leguminosas (frijoles, lentejas, garbanzos)

COMIDAS DEL DÍA:
- desayuno
- snack
- comida
- cena`

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { messages } = await request.json()

    // Initial call to Claude
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
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

      // Continue the conversation with tool results
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
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
