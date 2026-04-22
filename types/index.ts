export type RoutineType = 'upper_a' | 'upper_b' | 'lower_a' | 'lower_b'

export type Feeling = 'muy_pesado' | 'dificil' | 'perfecto' | 'ligero' | 'quiero_mas'

export type MealType = 'desayuno' | 'snack1' | 'comida' | 'snack2' | 'cena' | 'snack3'

export type UserRole = 'user' | 'practitioner'

export type PatientStatus = 'pending' | 'active' | 'inactive'

export type FoodGroup = 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'

export type HabitType = 'daily_check' | 'quantity' | 'weekly_frequency'

export interface Exercise {
  id: string
  name: string
  equipment: string
  sets: number
  reps: string
  lastWeight: number
  weightUnit: string
  weightNote: string
  instructions: string[]
  tip: string
  substitutions: string[]
}

export interface Routine {
  name: string
  subtitle: string
  muscles: string[]
  estimatedMinutes: number
  exercises: Exercise[]
}

// Tipo antiguo para compatibilidad con constants.ts
export interface FoodEquivalentLegacy {
  name: string
  portion: string
  note?: string
}

// Tipo nuevo para la BD de equivalentes SMAE
export interface FoodEquivalent {
  id: string
  name: string
  portion: string
  weight_g?: number
  category_smae: string
  verdura: number
  fruta: number
  carb: number
  proteina: number
  grasa: number
  leguminosa: number
  created_at: string
}

export interface GymSession {
  id: string
  user_id: string
  date: string
  routine_type: RoutineType
  duration_seconds?: number
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
  muscle_mass_kg?: number
  body_fat_mass_kg?: number
  body_fat_percentage?: number
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
  favorite_name?: string  // Groups items that came from same favorite
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
  meal?: MealType | null  // Optional - favorites can be used for any meal
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

export interface ScheduleOverride {
  id: string
  user_id: string
  date: string
  routine_type: RoutineType | 'rest'
  created_at: string
}

export interface JournalQuestion {
  index: number
  question: string
  answer: string
}

export interface JournalEntry {
  id: string
  user_id: string
  date: string
  free_text?: string
  questions: JournalQuestion[]
  skips_used: number
  created_at: string
  updated_at: string
}

export interface JournalUsedQuestion {
  id: string
  user_id: string
  question_index: number
  date_used: string
  created_at: string
}

export type PhotoType = 'front' | 'side'

export interface ProgressPhoto {
  id: string
  user_id: string
  date: string
  photo_type: PhotoType
  photo_url: string
  notes?: string
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

export interface CustomFood {
  id: string
  user_id: string
  name: string
  group_type: FoodGroup
  portion: string
  note?: string
  created_at: string
}

export interface MealBudget {
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
}

// B2B Types

export interface ActiveMeals {
  desayuno: boolean
  snack1: boolean
  comida: boolean
  snack2: boolean
  cena: boolean
  snack3: boolean
}

export interface UserProfile {
  id: string
  user_id: string
  height_cm?: number
  goal_weight_kg?: number
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Practitioner {
  id: string
  user_id: string
  display_name: string
  license_number?: string
  specialty?: string
  clinic_name?: string
  created_at: string
  updated_at: string
}

export interface PractitionerPatient {
  id: string
  practitioner_id: string
  patient_id: string
  status: PatientStatus
  invited_at: string
  accepted_at?: string
  created_at: string
}

export interface DietConfig {
  id: string
  user_id: string
  effective_date: string
  verdura: number
  fruta: number
  carb: number
  leguminosa: number
  proteina: number
  grasa: number
  prescribed_by?: string
  version: number
  active: boolean
  notes?: string
  active_meals: ActiveMeals
  meal_budgets?: Record<MealType, MealBudget>
  created_at: string
}

// Patient with practitioner context (for clinic dashboard)
export interface PatientWithRelation {
  id: string  // user id
  email: string
  profile?: UserProfile
  relation: PractitionerPatient
  latest_weight?: WeightLog
  latest_diet?: DietConfig
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
      schedule_overrides: {
        Row: ScheduleOverride
        Insert: Omit<ScheduleOverride, 'id' | 'created_at'>
        Update: Partial<Omit<ScheduleOverride, 'id' | 'created_at'>>
      }
      food_equivalents: {
        Row: FoodEquivalent
        Insert: Omit<FoodEquivalent, 'id' | 'created_at'>
        Update: Partial<Omit<FoodEquivalent, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
      }
      practitioners: {
        Row: Practitioner
        Insert: Omit<Practitioner, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Practitioner, 'id' | 'created_at' | 'updated_at'>>
      }
      practitioner_patients: {
        Row: PractitionerPatient
        Insert: Omit<PractitionerPatient, 'id' | 'created_at'>
        Update: Partial<Omit<PractitionerPatient, 'id' | 'created_at'>>
      }
      diet_configs: {
        Row: DietConfig
        Insert: Omit<DietConfig, 'id' | 'created_at'>
        Update: Partial<Omit<DietConfig, 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
