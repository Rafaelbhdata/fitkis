import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/api-auth'
import { ROUTINE_SCHEDULE, DAILY_BUDGET } from '@/lib/constants'
import { getTodayInTimezone } from '@/lib/utils'
import type { FoodGroup } from '@/types'

interface SuggestedPrompt {
  label: string
  message: string
  priority: number
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthedUser(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const today = getTodayInTimezone()
    const hour = new Date().getHours()

    // Get today's food logs
    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('group_type, quantity, meal')
      .eq('user_id', user.id)
      .eq('date', today)

    // Get active diet config
    const { data: dietConfig } = await supabase
      .from('diet_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()

    // Calculate today's progress
    const budget = dietConfig ? {
      verdura: dietConfig.verdura,
      fruta: dietConfig.fruta,
      carb: dietConfig.carb,
      leguminosa: dietConfig.leguminosa,
      proteina: dietConfig.proteina,
      grasa: dietConfig.grasa,
    } : DAILY_BUDGET

    const progress: Record<FoodGroup, number> = {
      verdura: 0,
      fruta: 0,
      carb: 0,
      leguminosa: 0,
      proteina: 0,
      grasa: 0,
    }

    const loggedMeals = new Set<string>()

    if (foodLogs) {
      foodLogs.forEach((log: { group_type: FoodGroup; quantity: number; meal: string }) => {
        if (log.group_type in progress) {
          progress[log.group_type] += log.quantity
        }
        loggedMeals.add(log.meal)
      })
    }

    // Calculate remaining
    const remaining = {
      verdura: budget.verdura - progress.verdura,
      fruta: budget.fruta - progress.fruta,
      carb: budget.carb - progress.carb,
      leguminosa: budget.leguminosa - progress.leguminosa,
      proteina: budget.proteina - progress.proteina,
      grasa: budget.grasa - progress.grasa,
    }

    // Get today's routine
    const dayOfWeek = new Date().getDay()
    const routineType = ROUTINE_SCHEDULE[dayOfWeek]
    const isGymDay = routineType !== 'rest'

    // Check if gym session exists today
    const { data: gymSession } = await supabase
      .from('gym_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    // Check if practitioner relationship exists
    const { data: relationship } = await supabase
      .from('practitioner_patients')
      .select('practitioners(display_name)')
      .eq('patient_id', user.id)
      .eq('status', 'active')
      .single()

    const hasPractitioner = !!relationship

    // Build suggested prompts based on context
    const prompts: SuggestedPrompt[] = []

    // Time-based meal suggestions
    if (hour >= 6 && hour < 10 && !loggedMeals.has('desayuno')) {
      prompts.push({
        label: '🍳 Registrar desayuno',
        message: 'Quiero registrar mi desayuno',
        priority: 10,
      })
    } else if (hour >= 10 && hour < 12 && !loggedMeals.has('snack1')) {
      prompts.push({
        label: '🍌 Registrar snack',
        message: 'Quiero registrar mi snack de media mañana',
        priority: 10,
      })
    } else if (hour >= 12 && hour < 16 && !loggedMeals.has('comida')) {
      prompts.push({
        label: '🍽️ Registrar comida',
        message: 'Quiero registrar mi comida',
        priority: 10,
      })
    } else if (hour >= 16 && hour < 19 && !loggedMeals.has('snack2')) {
      prompts.push({
        label: '🍎 Registrar snack',
        message: 'Quiero registrar mi snack de la tarde',
        priority: 8,
      })
    } else if (hour >= 19 && !loggedMeals.has('cena')) {
      prompts.push({
        label: '🌙 Registrar cena',
        message: 'Quiero registrar mi cena',
        priority: 10,
      })
    }

    // Remaining budget prompts
    if (remaining.verdura >= 2) {
      prompts.push({
        label: '🥗 Ideas con verdura',
        message: `Me faltan ${remaining.verdura} verduras. ¿Qué puedo comer?`,
        priority: 7,
      })
    }

    if (remaining.proteina >= 3) {
      prompts.push({
        label: '🥩 Ideas proteína',
        message: `Me faltan ${remaining.proteina} proteínas. ¿Qué me recomiendas?`,
        priority: 6,
      })
    }

    if (remaining.fruta >= 1 && remaining.fruta === budget.fruta) {
      prompts.push({
        label: '🍓 Ideas fruta',
        message: `No he comido frutas hoy. ¿Qué fruta puedo comer como snack?`,
        priority: 5,
      })
    }

    // Over-budget warnings
    if (remaining.grasa < 0) {
      prompts.push({
        label: '⚠️ Sin más grasa',
        message: `Me pasé ${Math.abs(remaining.grasa)} de grasa. ¿Qué puedo comer sin más grasa?`,
        priority: 9,
      })
    }

    if (remaining.carb < 0) {
      prompts.push({
        label: '⚠️ Sin más carbos',
        message: `Me pasé ${Math.abs(remaining.carb)} de carbohidratos. ¿Qué opciones tengo?`,
        priority: 9,
      })
    }

    // Gym-related prompts
    if (isGymDay && !gymSession) {
      prompts.push({
        label: '💪 ¿Qué rutina?',
        message: '¿Qué rutina me toca hoy?',
        priority: 8,
      })
    }

    if (gymSession) {
      prompts.push({
        label: '📊 Mi sesión',
        message: '¿Cómo fue mi sesión de gym hoy?',
        priority: 4,
      })
    }

    // General progress check
    prompts.push({
      label: '📋 ¿Qué me queda?',
      message: '¿Cuántos equivalentes me quedan hoy?',
      priority: 3,
    })

    // Late night legume reminder
    if (hour >= 18 && remaining.leguminosa > 0) {
      prompts.push({
        label: '🫘 Leguminosa',
        message: 'No he comido leguminosa hoy. ¿Qué puedo agregar a mi cena?',
        priority: 6,
      })
    }

    // Practitioner-specific prompt
    if (hasPractitioner) {
      prompts.push({
        label: '📝 Mi plan',
        message: '¿Cuál es mi plan de alimentación actual?',
        priority: 2,
      })
    }

    // Sort by priority (higher first) and take top 3
    const sortedPrompts = prompts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(({ label, message }) => ({ label, message }))

    // Fallback if no contextual prompts
    if (sortedPrompts.length === 0) {
      sortedPrompts.push(
        { label: '📋 ¿Qué me queda?', message: '¿Cuántos equivalentes me quedan hoy?' },
        { label: '💡 Ideas cena', message: 'Dame ideas para la cena con lo que me queda' },
        { label: '💪 Mi progreso', message: '¿Cómo voy con mi plan?' }
      )
    }

    return NextResponse.json({ prompts: sortedPrompts })

  } catch (error) {
    console.error('Suggested prompts error:', error)
    return NextResponse.json(
      { error: 'Error al generar sugerencias' },
      { status: 500 }
    )
  }
}
