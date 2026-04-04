import type { Exercise, FoodEquivalent, DailyBudget, MealBudget, FoodGroup } from '@/types'

// ==================== GYM ====================

export const ROUTINES: Record<string, Exercise[]> = {
  upper_a: [
    {
      id: 'press_banca',
      name: 'Press de Banca',
      defaultEquipment: 'Smith Machine',
      substitutions: ['Mancuernas en banco', 'Máquina de pecho'],
      targetSets: 4,
      targetReps: 10,
    },
    {
      id: 'press_militar',
      name: 'Press Militar',
      defaultEquipment: 'Mancuernas',
      substitutions: ['Barra', 'Press Arnold', 'Máquina hombro'],
      targetSets: 4,
      targetReps: 10,
    },
    {
      id: 'aperturas_pec_deck',
      name: 'Aperturas Pec Deck',
      defaultEquipment: 'Máquina',
      substitutions: ['Mancuernas en banco', 'Poleas cruzadas'],
      targetSets: 3,
      targetReps: 12,
    },
    {
      id: 'elevaciones_laterales',
      name: 'Elevaciones Laterales',
      defaultEquipment: 'Mancuernas',
      substitutions: ['Polea lateral', 'Máquina hombro lateral'],
      targetSets: 3,
      targetReps: 12,
    },
    {
      id: 'triceps_polea',
      name: 'Tríceps Polea Cuerda',
      defaultEquipment: 'Polea',
      substitutions: ['Extensión sobre cabeza', 'Fondos en banco'],
      targetSets: 3,
      targetReps: 12,
    },
  ],
  upper_b: [
    {
      id: 'jalon_pecho',
      name: 'Jalón al Pecho',
      defaultEquipment: 'Polea',
      substitutions: ['Máquina jalón', 'Dominadas asistidas'],
      targetSets: 4,
      targetReps: 10,
    },
    {
      id: 'remo_barra',
      name: 'Remo con Barra',
      defaultEquipment: 'Barra',
      substitutions: ['Máquina remo', 'Remo mancuerna dos manos'],
      targetSets: 4,
      targetReps: 10,
    },
    {
      id: 'remo_mancuerna',
      name: 'Remo Mancuerna 1 Mano',
      defaultEquipment: 'Mancuerna',
      substitutions: [],
      targetSets: 3,
      targetReps: 10,
    },
    {
      id: 'curl_biceps',
      name: 'Curl Bíceps',
      defaultEquipment: 'Barra',
      substitutions: ['Mancuernas alternas'],
      targetSets: 3,
      targetReps: 10,
    },
    {
      id: 'curl_martillo',
      name: 'Curl Martillo',
      defaultEquipment: 'Mancuernas',
      substitutions: [],
      targetSets: 3,
      targetReps: 10,
    },
  ],
  lower_a: [
    {
      id: 'sentadilla',
      name: 'Sentadilla con Barra',
      defaultEquipment: 'Barra libre',
      substitutions: ['Smith', 'Prensa', 'Sentadilla goblet'],
      targetSets: 4,
      targetReps: 10,
    },
    {
      id: 'prensa',
      name: 'Prensa de Pierna',
      defaultEquipment: 'Máquina',
      substitutions: [],
      targetSets: 4,
      targetReps: 12,
    },
    {
      id: 'extension_cuadriceps',
      name: 'Extensión Cuádriceps',
      defaultEquipment: 'Máquina',
      substitutions: [],
      targetSets: 3,
      targetReps: 12,
    },
    {
      id: 'zancadas',
      name: 'Zancadas',
      defaultEquipment: 'Mancuernas',
      substitutions: [],
      targetSets: 3,
      targetReps: 10,
    },
    {
      id: 'pantorrillas',
      name: 'Elevación de Pantorrillas',
      defaultEquipment: 'Máquina',
      substitutions: ['Mancuernas de pie'],
      targetSets: 3,
      targetReps: 15,
    },
  ],
  lower_b: [
    {
      id: 'peso_muerto',
      name: 'Peso Muerto',
      defaultEquipment: 'Barra',
      substitutions: ['Mancuernas rumano', 'Hip hinge máquina'],
      targetSets: 4,
      targetReps: 8,
    },
    {
      id: 'curl_femoral',
      name: 'Curl Femoral',
      defaultEquipment: 'Máquina',
      substitutions: [],
      targetSets: 3,
      targetReps: 12,
    },
    {
      id: 'hip_thrust',
      name: 'Hip Thrust',
      defaultEquipment: 'Barra',
      substitutions: ['Mancuerna'],
      targetSets: 3,
      targetReps: 12,
    },
    {
      id: 'abduccion_cadera',
      name: 'Abducción de Cadera',
      defaultEquipment: 'Máquina',
      substitutions: [],
      targetSets: 3,
      targetReps: 15,
    },
    {
      id: 'plancha',
      name: 'Plancha Abdominal',
      defaultEquipment: 'Sin equipo',
      substitutions: [],
      targetSets: 3,
      targetReps: 30, // segundos
    },
    {
      id: 'crunch_polea',
      name: 'Crunch en Polea',
      defaultEquipment: 'Polea',
      substitutions: ['Crunch suelo', 'Crunch máquina'],
      targetSets: 3,
      targetReps: 15,
    },
  ],
}

export const FEELING_OPTIONS = [
  { value: 'muy_pesado', label: 'Muy pesado', emoji: '😫' },
  { value: 'dificil', label: 'Difícil', emoji: '😤' },
  { value: 'perfecto', label: 'Perfecto', emoji: '💪' },
  { value: 'ligero', label: 'Ligero', emoji: '😊' },
  { value: 'quiero_mas', label: 'Quiero más', emoji: '🔥' },
] as const

// ==================== ALIMENTACIÓN ====================

export const DAILY_BUDGET: DailyBudget = {
  verdura: 4,
  fruta: 2,
  carb: 4,
  leguminosa: 1,
  proteina: 8,
  grasa: 6,
}

export const MEAL_BUDGETS: Record<string, MealBudget> = {
  desayuno: { verdura: 0, fruta: 0, carb: 0, leguminosa: 0, proteina: 3, grasa: 0 },
  snack: { verdura: 0, fruta: 2, carb: 1, leguminosa: 0, proteina: 0, grasa: 2 },
  comida: { verdura: 2, fruta: 0, carb: 1, leguminosa: 1, proteina: 3, grasa: 2 },
  cena: { verdura: 2, fruta: 0, carb: 2, leguminosa: 0, proteina: 2, grasa: 2 },
}

export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  verdura: 'Verdura',
  fruta: 'Fruta',
  carb: 'Carbohidrato',
  proteina: 'Proteína',
  grasa: 'Grasa',
  leguminosa: 'Leguminosa',
}

export const FOOD_GROUP_COLORS: Record<FoodGroup, string> = {
  verdura: '#22c55e',
  fruta: '#f97316',
  carb: '#eab308',
  proteina: '#ef4444',
  grasa: '#8b5cf6',
  leguminosa: '#06b6d4',
}

export const FRUITS: FoodEquivalent[] = [
  { name: 'Agua de coco', portion: '1 bote' },
  { name: 'Arándanos deshidratados', portion: '¼ tza' },
  { name: 'Blueberries', portion: '½ taza' },
  { name: 'Cereza', portion: '8-10 pzas' },
  { name: 'Chabacano', portion: '2 pzas' },
  { name: 'Ciruela grande', portion: '1 pza' },
  { name: 'Dátil', portion: '2 pzas' },
  { name: 'Durazno', portion: '1 pza' },
  { name: 'Frambuesa', portion: '1 tza' },
  { name: 'Fresa', portion: '1 tza (6-8 pzas)' },
  { name: 'Guayaba', portion: '1 pza' },
  { name: 'Higo', portion: '3 pzas' },
  { name: 'Kiwi', portion: '2 pzas' },
  { name: 'Lichi', portion: '6 pzas' },
  { name: 'Mamey', portion: '¼ pza' },
  { name: 'Mandarina', portion: '2 pzas' },
  { name: 'Mango', portion: '½ pza' },
  { name: 'Manzana', portion: '1 pza' },
  { name: 'Melón', portion: '1 tza' },
  { name: 'Moras', portion: '1 tza' },
  { name: 'Naranja', portion: '2 pzas' },
  { name: 'Papaya', portion: '1 taza' },
  { name: 'Pera', portion: '1 pza' },
  { name: 'Pasitas', portion: '10 pzas' },
  { name: 'Piña', portion: '1 taza' },
  { name: 'Plátano', portion: '½ pza' },
  { name: 'Sandía', portion: '1 taza' },
  { name: 'Toronja', portion: '1 pza' },
  { name: 'Uvas', portion: '8-10 pzas' },
  { name: 'Mermelada natural', portion: '1 cda' },
]

export const VEGETABLES: FoodEquivalent[] = [
  { name: 'Alcachofa', portion: '1 pza' },
  { name: 'Apio', portion: '2 pzas' },
  { name: 'Betabel', portion: '½ pza' },
  { name: 'Berenjena', portion: '1 pza' },
  { name: 'Brócoli', portion: '1 tza' },
  { name: 'Calabaza', portion: '1 pza' },
  { name: 'Champiñón', portion: '1 tza' },
  { name: 'Chayote', portion: '1 tza' },
  { name: 'Col', portion: '1 tza' },
  { name: 'Ejote', portion: '1 tza' },
  { name: 'Elotitos cambray', portion: '8 pzas' },
  { name: 'Espárragos', portion: '6 pzas' },
  { name: 'Espinaca cruda', portion: '3 tzas' },
  { name: 'Espinaca cocida', portion: '1 tza' },
  { name: 'Jícama', portion: '1 tza' },
  { name: 'Jitomate deshidratado', portion: '5 pzas' },
  { name: 'Jitomate bola', portion: '1 pza' },
  { name: 'Lechuga', portion: '3 tzas' },
  { name: 'Nopal', portion: '1 tza' },
  { name: 'Pepino', portion: '1 pza' },
  { name: 'Setas', portion: '1 tza' },
  { name: 'Zanahoria', portion: '2 pzas' },
  { name: 'Palmitos', portion: '6-8 pzas (1 lata)' },
]

export const CARBS: FoodEquivalent[] = [
  { name: 'Arroz cocido (preferir integral)', portion: '½ tza' },
  { name: 'Avena cruda', portion: '⅓ tza' },
  { name: 'Avena cocida', portion: '½ tza' },
  { name: 'Bagel', portion: '½ pza' },
  { name: 'Bolillo sin migajón', portion: '½ pza' },
  { name: 'Pan hamburguesa', portion: '½ pza' },
  { name: 'Cereal integral de caja', portion: '1 tza' },
  { name: 'Chapata sin migajón', portion: '½ pza' },
  { name: 'Elote desgranado', portion: '½ tza' },
  { name: 'Elote entero', portion: '1 chico' },
  { name: 'Palomitas naturales', portion: '2 tzas' },
  { name: 'Pasta cocida', portion: '1 tza' },
  { name: 'Pan integral', portion: '1 pza' },
  { name: 'Pan árabe', portion: '½ pza' },
  { name: 'Pan de hot dog', portion: '½ pza' },
  { name: 'Papa cocida', portion: '1 pza chica' },
  { name: 'Papa cambray', portion: '4-5 pzas' },
  { name: 'Puré de papa', portion: '½ tza' },
  { name: 'Salmas', portion: '1 paquete' },
  { name: 'Tortilla maíz', portion: '1 pza' },
  { name: 'Tortilla nopal', portion: '2 pzas' },
  { name: 'Tostadas sanísimo', portion: '2 pzas' },
  { name: 'Rice cakes', portion: '2 pzas' },
]

export const LEGUMES: FoodEquivalent[] = [
  { name: 'Frijol cocido / lenteja', portion: '⅓ taza' },
  { name: 'Garbanzo cocido', portion: '1 tza' },
  { name: 'Hummus', portion: '⅓ tza' },
  { name: 'Edamames', portion: '⅓ tza' },
]

export const PROTEINS: FoodEquivalent[] = [
  { name: 'Anillos de calamar', portion: '4 pzas' },
  { name: 'Atún en agua', portion: '1 lata' },
  { name: 'Bistec', portion: '1 palma de la mano' },
  { name: 'Carne molida', portion: '1 bola (pelota béisbol)' },
  { name: 'Carne deshebrada', portion: '¾ tza' },
  { name: 'Pollo deshebrado', portion: '¾ tza' },
  { name: 'Camarón U8', portion: '3 pzas' },
  { name: 'Camarón normal', portion: '6 pzas' },
  { name: 'Huevo', portion: '1 pza' },
  { name: 'Claras de huevo', portion: '2 pzas' },
  { name: 'Jamón', portion: '5 rebanadas' },
  { name: 'Jocoque', portion: '1 cda' },
  { name: 'Filete', portion: 'Palma de la mano' },
  { name: 'Pescado', portion: 'Palma de la mano con dedos' },
  { name: 'Pavo', portion: 'Palma de la mano con dedos' },
  { name: 'Salmón', portion: 'Palma de la mano con dedos' },
  { name: 'Queso cottage', portion: '2-3 cdas soperas' },
  { name: 'Queso panela/oaxaca/mozarella/feta', portion: 'Palma con dedos' },
  { name: 'Yogurt griego', portion: '1 botesito', note: 'Cuenta como 1 proteína + 1 grasa' },
  { name: 'Leche light', portion: '1 taza' },
]

export const FATS: FoodEquivalent[] = [
  { name: 'Aguacate', portion: '⅓ pza' },
  { name: 'Nueces/pistache/almendra/avellana/cacahuate natural', portion: '10-12 pzas' },
  { name: 'Aceitunas', portion: '4 pzas' },
  { name: 'Crema de avellana', portion: '1 cda' },
  { name: 'Crema de almendra', portion: '1 cda' },
  { name: 'Crema de cacahuate', portion: '1 cda' },
  { name: 'Jocoque', portion: '1 cda sopera' },
  { name: 'Chocolate amargo Turín sin azúcar', portion: '2 chiquitos' },
  { name: 'Queso cabra', portion: '⅓ barra chica' },
]

export const FOOD_EQUIVALENTS: Record<FoodGroup, FoodEquivalent[]> = {
  fruta: FRUITS,
  verdura: VEGETABLES,
  carb: CARBS,
  leguminosa: LEGUMES,
  proteina: PROTEINS,
  grasa: FATS,
}

// ==================== HÁBITOS INICIALES ====================

export const DEFAULT_HABITS = [
  {
    name: 'Agua',
    type: 'quantity' as const,
    target_value: 2,
    unit: 'litros',
  },
  {
    name: 'Lectura',
    type: 'weekly_frequency' as const,
    target_value: 4,
    unit: 'días/semana',
  },
  {
    name: 'Creatina',
    type: 'daily_check' as const,
    target_value: null,
    unit: null,
  },
]

// ==================== USUARIO ====================

export const USER_PROFILE = {
  initialWeight: 86,
  height: 163,
  goalWeight: 79,
  initialBMI: 32.4,
}
