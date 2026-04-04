export type RoutineType = 'upper_a' | 'upper_b' | 'lower_a' | 'lower_b'

export type Feeling = 'muy_pesado' | 'dificil' | 'perfecto' | 'ligero' | 'quiero_mas'

export type MealType = 'desayuno' | 'snack' | 'comida' | 'cena'

export type FoodGroup = 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'

export type HabitType = 'daily_check' | 'quantity' | 'weekly_frequency'

export interface Exercise {
  id: string
  name: string
  defaultEquipment: string
  substitutions: string[]
  targetSets: number
  targetReps: number
}

export interface FoodEquivalent {
  name: string
  portion: string
  note?: string
}

export interface GymSession {
  id: string
  user_id: string
  date: string
  routine_type: RoutineType
  cardio_minutes?: number
  cardio_speed?: number
  notes?: string
  created_at: string
}

export interface SessionSet {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  lbs?: number
  reps?: number
  feeling?: Feeling
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  notes?: string
  created_at: string
}

export interface FoodLog {
  id: string
  user_id: string
  date: string
  meal: MealType
  group_type: FoodGroup
  quantity: number
  food_name?: string
  created_at: string
}

export interface FavoriteMealItem {
  group_type: FoodGroup
  quantity: number
  food_name?: string
}

export interface FavoriteMeal {
  id: string
  user_id: string
  name: string
  meal: MealType
  items: FavoriteMealItem[]
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  type: HabitType
  target_value?: number
  unit?: string
  active: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  date: string
  value?: number
  completed: boolean
  created_at: string
}

export interface DailyBudget {
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
}

export interface MealBudget {
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
}

// Supabase Database types
export interface Database {
  public: {
    Tables: {
      gym_sessions: {
        Row: GymSession
        Insert: Omit<GymSession, 'id' | 'created_at'>
        Update: Partial<Omit<GymSession, 'id' | 'created_at'>>
      }
      session_sets: {
        Row: SessionSet
        Insert: Omit<SessionSet, 'id' | 'created_at'>
        Update: Partial<Omit<SessionSet, 'id' | 'created_at'>>
      }
      weight_logs: {
        Row: WeightLog
        Insert: Omit<WeightLog, 'id' | 'created_at'>
        Update: Partial<Omit<WeightLog, 'id' | 'created_at'>>
      }
      food_logs: {
        Row: FoodLog
        Insert: Omit<FoodLog, 'id' | 'created_at'>
        Update: Partial<Omit<FoodLog, 'id' | 'created_at'>>
      }
      favorite_meals: {
        Row: FavoriteMeal
        Insert: Omit<FavoriteMeal, 'id' | 'created_at'>
        Update: Partial<Omit<FavoriteMeal, 'id' | 'created_at'>>
      }
      habits: {
        Row: Habit
        Insert: Omit<Habit, 'id' | 'created_at'>
        Update: Partial<Omit<Habit, 'id' | 'created_at'>>
      }
      habit_logs: {
        Row: HabitLog
        Insert: Omit<HabitLog, 'id' | 'created_at'>
        Update: Partial<Omit<HabitLog, 'id' | 'created_at'>>
      }
    }
  }
}
