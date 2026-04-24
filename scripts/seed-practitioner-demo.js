/**
 * Seed script for B2B Practitioner Demo Data
 *
 * Run with: node scripts/seed-practitioner-demo.js
 *
 * Requires environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (not anon key!)
 *
 * This script seeds:
 * 1. 30 Mexican products in barcode_cache (shared/global)
 * 2. 20 plate_analysis_logs (requires practitioner_id and patient_ids)
 * 3. Updates 5 patients to have alert conditions (inactivity, weight gain)
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Format Date as YYYY-MM-DD in Mexico City timezone (script may run in UTC).
function formatDateISO(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(date)
}

// ============================================
// 1. MEXICAN PRODUCTS FOR BARCODE_CACHE
// ============================================

const MEXICAN_PRODUCTS = [
  {
    barcode: '7501000611072',
    product_data: {
      name: 'Coca-Cola Original',
      brand: 'Coca-Cola',
      serving_size: '355ml',
      nutrients_per_100g: { calories: 42, carbs: 10.6, protein: 0, fat: 0, sugar: 10.6 },
      estimated_equivalents: [{ group_type: 'carb', quantity: 2.5, note: '~37g azúcar por lata' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501000613014',
    product_data: {
      name: 'Sabritas Original',
      brand: 'Sabritas',
      serving_size: '45g',
      nutrients_per_100g: { calories: 536, carbs: 52, protein: 6, fat: 34 },
      estimated_equivalents: [
        { group_type: 'carb', quantity: 1.5, note: '~23g carbohidratos' },
        { group_type: 'grasa', quantity: 3, note: '~15g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501055300150',
    product_data: {
      name: 'Yogurt Griego Natural Danone',
      brand: 'Danone',
      serving_size: '150g',
      nutrients_per_100g: { calories: 97, carbs: 3.6, protein: 9, fat: 5 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 2, note: '~14g proteína' },
        { group_type: 'grasa', quantity: 1.5, note: '~7.5g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501055302628',
    product_data: {
      name: 'Activia Ciruela Pasa',
      brand: 'Danone',
      serving_size: '125g',
      nutrients_per_100g: { calories: 82, carbs: 13, protein: 4, fat: 1.5 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 0.5, note: '~5g proteína' },
        { group_type: 'carb', quantity: 1, note: '~16g carbohidratos' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501008042182',
    product_data: {
      name: 'Bimbo Pan Integral',
      brand: 'Bimbo',
      serving_size: '28g (1 rebanada)',
      nutrients_per_100g: { calories: 243, carbs: 43, protein: 9, fat: 3.5, fiber: 5 },
      estimated_equivalents: [{ group_type: 'carb', quantity: 1, note: '1 rebanada = 1 carb' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501008023884',
    product_data: {
      name: 'Tortillinas Tía Rosa',
      brand: 'Bimbo',
      serving_size: '35g (1 tortilla)',
      nutrients_per_100g: { calories: 300, carbs: 50, protein: 8, fat: 7 },
      estimated_equivalents: [{ group_type: 'carb', quantity: 1, note: '1 tortilla = 1 carb' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501052451015',
    product_data: {
      name: 'Atún Dolores en Agua',
      brand: 'Dolores',
      serving_size: '140g (1 lata)',
      nutrients_per_100g: { calories: 96, carbs: 0, protein: 23, fat: 0.5 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 4, note: '~32g proteína por lata' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501052450018',
    product_data: {
      name: 'Atún Dolores en Aceite',
      brand: 'Dolores',
      serving_size: '140g (1 lata)',
      nutrients_per_100g: { calories: 190, carbs: 0, protein: 26, fat: 9 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 4, note: '~36g proteína' },
        { group_type: 'grasa', quantity: 2.5, note: '~13g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501003124012',
    product_data: {
      name: 'Frijoles Bayos La Costeña',
      brand: 'La Costeña',
      serving_size: '100g',
      nutrients_per_100g: { calories: 85, carbs: 14, protein: 6, fat: 0.5, fiber: 5 },
      estimated_equivalents: [{ group_type: 'leguminosa', quantity: 1, note: '~14g carbs + 6g proteína' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501003123015',
    product_data: {
      name: 'Frijoles Negros Refritos La Costeña',
      brand: 'La Costeña',
      serving_size: '100g',
      nutrients_per_100g: { calories: 95, carbs: 15, protein: 5, fat: 1.5 },
      estimated_equivalents: [{ group_type: 'leguminosa', quantity: 1, note: '~15g carbs' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7500435001274',
    product_data: {
      name: 'Leche Lala 100 Light',
      brand: 'Lala',
      serving_size: '250ml',
      nutrients_per_100g: { calories: 35, carbs: 5, protein: 3.5, fat: 0 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 1, note: '~8.5g proteína por vaso' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7500435001250',
    product_data: {
      name: 'Leche Lala Entera',
      brand: 'Lala',
      serving_size: '250ml',
      nutrients_per_100g: { calories: 60, carbs: 4.7, protein: 3.1, fat: 3.3 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 1, note: '~8g proteína' },
        { group_type: 'grasa', quantity: 1.5, note: '~8g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501000112456',
    product_data: {
      name: 'Jumex Jugo de Mango',
      brand: 'Jumex',
      serving_size: '335ml',
      nutrients_per_100g: { calories: 50, carbs: 12, protein: 0.3, fat: 0.1, sugar: 11 },
      estimated_equivalents: [{ group_type: 'fruta', quantity: 2, note: '~40g azúcar' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501000112234',
    product_data: {
      name: 'Jumex Néctar de Durazno',
      brand: 'Jumex',
      serving_size: '335ml',
      nutrients_per_100g: { calories: 48, carbs: 11.5, protein: 0.2, fat: 0 },
      estimated_equivalents: [{ group_type: 'fruta', quantity: 2, note: '~38g azúcar' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501030420019',
    product_data: {
      name: 'Queso Panela Lala',
      brand: 'Lala',
      serving_size: '100g',
      nutrients_per_100g: { calories: 260, carbs: 3, protein: 20, fat: 19 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 3, note: '~20g proteína' },
        { group_type: 'grasa', quantity: 4, note: '~19g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501030420026',
    product_data: {
      name: 'Queso Oaxaca Lala',
      brand: 'Lala',
      serving_size: '100g',
      nutrients_per_100g: { calories: 300, carbs: 2, protein: 22, fat: 23 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 3, note: '~22g proteína' },
        { group_type: 'grasa', quantity: 4.5, note: '~23g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501055361700',
    product_data: {
      name: 'Alpura Leche Deslactosada',
      brand: 'Alpura',
      serving_size: '250ml',
      nutrients_per_100g: { calories: 40, carbs: 4.8, protein: 3.2, fat: 1 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 1, note: '~8g proteína por vaso' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501024556012',
    product_data: {
      name: 'Huevo San Juan (12 pzas)',
      brand: 'San Juan',
      serving_size: '60g (1 huevo)',
      nutrients_per_100g: { calories: 143, carbs: 0.7, protein: 13, fat: 10 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 1, note: '1 huevo = 1 proteína' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501025403010',
    product_data: {
      name: 'Aguacate Hass (pieza)',
      brand: 'Genérico',
      serving_size: '150g (1 aguacate)',
      nutrients_per_100g: { calories: 160, carbs: 8.5, protein: 2, fat: 15, fiber: 7 },
      estimated_equivalents: [{ group_type: 'grasa', quantity: 4.5, note: '~22g grasa por aguacate' }]
    },
    source: 'manual'
  },
  {
    barcode: '7501017006014',
    product_data: {
      name: 'Tortillas de Maíz Mission',
      brand: 'Mission',
      serving_size: '30g (1 tortilla)',
      nutrients_per_100g: { calories: 218, carbs: 44, protein: 6, fat: 2.5 },
      estimated_equivalents: [{ group_type: 'carb', quantity: 1, note: '1 tortilla = 1 carb' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501006556018',
    product_data: {
      name: 'Arroz Verde Valle Precocido',
      brand: 'Verde Valle',
      serving_size: '45g crudo',
      nutrients_per_100g: { calories: 360, carbs: 79, protein: 7, fat: 0.8 },
      estimated_equivalents: [{ group_type: 'carb', quantity: 2, note: '~35g carbs cocido' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501006557015',
    product_data: {
      name: 'Lentejas Verde Valle',
      brand: 'Verde Valle',
      serving_size: '50g crudo',
      nutrients_per_100g: { calories: 340, carbs: 60, protein: 25, fat: 1 },
      estimated_equivalents: [{ group_type: 'leguminosa', quantity: 1.5, note: '~30g carbs + 12g proteína' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501042401012',
    product_data: {
      name: 'Pechuga de Pollo Bachoco',
      brand: 'Bachoco',
      serving_size: '100g',
      nutrients_per_100g: { calories: 110, carbs: 0, protein: 23, fat: 2 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 3, note: '~23g proteína' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501042402019',
    product_data: {
      name: 'Muslo de Pollo Bachoco',
      brand: 'Bachoco',
      serving_size: '100g',
      nutrients_per_100g: { calories: 180, carbs: 0, protein: 18, fat: 12 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 2.5, note: '~18g proteína' },
        { group_type: 'grasa', quantity: 2, note: '~12g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501008014015',
    product_data: {
      name: 'Jamón de Pavo Fud',
      brand: 'FUD',
      serving_size: '30g (2 rebanadas)',
      nutrients_per_100g: { calories: 90, carbs: 3, protein: 13, fat: 3 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 0.5, note: '~4g proteína por porción' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501008015012',
    product_data: {
      name: 'Salchicha de Pavo Fud',
      brand: 'FUD',
      serving_size: '45g (1 salchicha)',
      nutrients_per_100g: { calories: 140, carbs: 2, protein: 12, fat: 10 },
      estimated_equivalents: [
        { group_type: 'proteina', quantity: 1, note: '~5g proteína' },
        { group_type: 'grasa', quantity: 1, note: '~4.5g grasa' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501055330010',
    product_data: {
      name: 'Queso Cottage Lala',
      brand: 'Lala',
      serving_size: '100g',
      nutrients_per_100g: { calories: 90, carbs: 3, protein: 12, fat: 3.5 },
      estimated_equivalents: [{ group_type: 'proteina', quantity: 2, note: '~12g proteína' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501000630012',
    product_data: {
      name: 'Sprite',
      brand: 'Coca-Cola',
      serving_size: '355ml',
      nutrients_per_100g: { calories: 40, carbs: 10, protein: 0, fat: 0, sugar: 10 },
      estimated_equivalents: [{ group_type: 'carb', quantity: 2.5, note: '~35g azúcar por lata' }]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501086801015',
    product_data: {
      name: 'Almendras Naturales Great Value',
      brand: 'Great Value',
      serving_size: '30g',
      nutrients_per_100g: { calories: 580, carbs: 20, protein: 21, fat: 50 },
      estimated_equivalents: [
        { group_type: 'grasa', quantity: 3, note: '~15g grasa por porción' },
        { group_type: 'proteina', quantity: 1, note: '~6g proteína' }
      ]
    },
    source: 'openfoodfacts'
  },
  {
    barcode: '7501086802012',
    product_data: {
      name: 'Nueces Great Value',
      brand: 'Great Value',
      serving_size: '30g',
      nutrients_per_100g: { calories: 650, carbs: 14, protein: 15, fat: 65 },
      estimated_equivalents: [{ group_type: 'grasa', quantity: 4, note: '~20g grasa por porción' }]
    },
    source: 'openfoodfacts'
  }
]

// ============================================
// 2. PLATE ANALYSIS LOGS TEMPLATE
// ============================================

const PLATE_ANALYSIS_TEMPLATES = [
  {
    meal: 'desayuno',
    analysis_result: {
      items: [
        { food_name: 'Huevos revueltos', group_type: 'proteina', quantity: 2, confidence: 'alta' },
        { food_name: 'Frijoles refritos', group_type: 'leguminosa', quantity: 1, confidence: 'alta' },
        { food_name: 'Tortilla de maíz', group_type: 'carb', quantity: 2, confidence: 'alta' }
      ],
      total_equivalents: { verdura: 0, fruta: 0, carb: 2, leguminosa: 1, proteina: 2, grasa: 0 },
      reasoning: 'Desayuno típico mexicano con huevos, frijoles y tortillas',
      suggestions: 'Considera agregar fruta para completar el desayuno'
    },
    applied: true
  },
  {
    meal: 'comida',
    analysis_result: {
      items: [
        { food_name: 'Pechuga de pollo a la plancha', group_type: 'proteina', quantity: 3, confidence: 'alta' },
        { food_name: 'Arroz blanco', group_type: 'carb', quantity: 1, confidence: 'alta' },
        { food_name: 'Ensalada verde', group_type: 'verdura', quantity: 2, confidence: 'media' },
        { food_name: 'Aguacate', group_type: 'grasa', quantity: 1, confidence: 'alta' }
      ],
      total_equivalents: { verdura: 2, fruta: 0, carb: 1, leguminosa: 0, proteina: 3, grasa: 1 },
      reasoning: 'Comida balanceada con proteína magra, carbohidrato y verduras',
      suggestions: null
    },
    applied: true
  },
  {
    meal: 'cena',
    analysis_result: {
      items: [
        { food_name: 'Tacos de bistec', group_type: 'proteina', quantity: 2, confidence: 'media' },
        { food_name: 'Tortillas de maíz', group_type: 'carb', quantity: 3, confidence: 'alta' },
        { food_name: 'Cebolla y cilantro', group_type: 'verdura', quantity: 0.5, confidence: 'baja' },
        { food_name: 'Salsa verde', group_type: 'verdura', quantity: 0.5, confidence: 'baja' }
      ],
      total_equivalents: { verdura: 1, fruta: 0, carb: 3, leguminosa: 0, proteina: 2, grasa: 0 },
      reasoning: 'Tacos de carne con tortilla, típico de cena mexicana',
      suggestions: 'Los tacos pueden tener grasa adicional dependiendo del corte de carne'
    },
    applied: false
  },
  {
    meal: 'snack1',
    analysis_result: {
      items: [
        { food_name: 'Manzana', group_type: 'fruta', quantity: 1, confidence: 'alta' },
        { food_name: 'Crema de cacahuate', group_type: 'grasa', quantity: 1, confidence: 'alta' }
      ],
      total_equivalents: { verdura: 0, fruta: 1, carb: 0, leguminosa: 0, proteina: 0, grasa: 1 },
      reasoning: 'Snack saludable con fruta y grasa buena',
      suggestions: null
    },
    applied: true
  },
  {
    meal: 'comida',
    analysis_result: {
      items: [
        { food_name: 'Salmón al horno', group_type: 'proteina', quantity: 3, confidence: 'alta' },
        { food_name: 'Espárragos', group_type: 'verdura', quantity: 1, confidence: 'alta' },
        { food_name: 'Papa al horno', group_type: 'carb', quantity: 1, confidence: 'alta' },
        { food_name: 'Aceite de oliva', group_type: 'grasa', quantity: 2, confidence: 'media' }
      ],
      total_equivalents: { verdura: 1, fruta: 0, carb: 1, leguminosa: 0, proteina: 3, grasa: 2 },
      reasoning: 'Comida nutritiva con pescado, verduras y carbohidrato complejo',
      suggestions: 'El salmón aporta omega-3, excelente elección'
    },
    applied: true
  }
]

// ============================================
// MAIN SEED FUNCTIONS
// ============================================

async function seedBarcodeCache() {
  console.log('\n📦 Seeding barcode_cache with Mexican products...')

  let inserted = 0
  let skipped = 0

  for (const product of MEXICAN_PRODUCTS) {
    const { error } = await supabase
      .from('barcode_cache')
      .upsert(product, { onConflict: 'barcode' })

    if (error) {
      console.error(`   ❌ Error inserting ${product.barcode}: ${error.message}`)
    } else {
      inserted++
    }
  }

  console.log(`   ✅ Inserted/updated ${inserted} products`)
  return inserted
}

async function seedPlateAnalysisLogs(practitionerId, patientIds) {
  console.log('\n📸 Seeding plate_analysis_logs...')

  if (!patientIds || patientIds.length === 0) {
    console.log('   ⚠️ No patient IDs provided, skipping plate analysis logs')
    return 0
  }

  let inserted = 0
  const today = new Date()

  // Distribute 20 logs among patients (4 per patient if 5 patients)
  for (let i = 0; i < 20; i++) {
    const patientId = patientIds[i % patientIds.length]
    const template = PLATE_ANALYSIS_TEMPLATES[i % PLATE_ANALYSIS_TEMPLATES.length]

    // Create date within last 14 days
    const logDate = new Date(today)
    logDate.setDate(logDate.getDate() - Math.floor(i / 2))

    const { error } = await supabase
      .from('plate_analysis_logs')
      .insert({
        user_id: patientId,
        meal: template.meal,
        analysis_result: template.analysis_result,
        applied: template.applied,
        applied_at: template.applied ? logDate.toISOString() : null,
        created_at: logDate.toISOString()
      })

    if (error) {
      console.error(`   ❌ Error inserting log for patient ${patientId}: ${error.message}`)
    } else {
      inserted++
    }
  }

  console.log(`   ✅ Inserted ${inserted} plate analysis logs`)
  return inserted
}

async function createAlertConditions(patientIds) {
  console.log('\n⚠️ Creating alert conditions for patients...')

  if (!patientIds || patientIds.length < 5) {
    console.log('   ⚠️ Need at least 5 patient IDs to create alerts')
    return 0
  }

  const today = new Date()
  let updated = 0

  // Patient 1 & 2: Inactivity (no food logs in 3+ days)
  // We'll delete recent food logs to simulate inactivity
  for (let i = 0; i < 2; i++) {
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('user_id', patientIds[i])
      .gte('date', formatDateISO(threeDaysAgo))

    if (!error) {
      console.log(`   📭 Patient ${i + 1}: Cleared recent food logs (inactivity alert)`)
      updated++
    }
  }

  // Patient 3, 4 & 5: Weight gain in last 30 days
  // We'll insert weight logs showing increase
  for (let i = 2; i < 5; i++) {
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const baseWeight = 70 + (i * 5) // 80, 85, 90 kg base

    // Insert old weight (30 days ago)
    await supabase
      .from('weight_logs')
      .upsert({
        user_id: patientIds[i],
        date: formatDateISO(thirtyDaysAgo),
        weight_kg: baseWeight
      }, { onConflict: 'user_id,date' })

    // Insert recent weight (today) - higher
    const { error } = await supabase
      .from('weight_logs')
      .upsert({
        user_id: patientIds[i],
        date: formatDateISO(today),
        weight_kg: baseWeight + 1.5 + (i * 0.5) // +1.5, +2.0, +2.5 kg gain
      }, { onConflict: 'user_id,date' })

    if (!error) {
      console.log(`   📈 Patient ${i + 1}: Added weight gain data (${1.5 + (i - 2) * 0.5} kg increase)`)
      updated++
    }
  }

  console.log(`   ✅ Created ${updated} alert conditions`)
  return updated
}

async function main() {
  console.log('🌱 Starting Practitioner Demo Seed...\n')

  // 1. Seed barcode cache (always runs - shared data)
  await seedBarcodeCache()

  // 2. Get practitioner and their patients
  console.log('\n🔍 Looking for practitioners and patients...')

  const { data: practitioners } = await supabase
    .from('practitioners')
    .select('id, user_id, display_name')
    .limit(1)

  if (!practitioners || practitioners.length === 0) {
    console.log('   ⚠️ No practitioners found. Create a practitioner account first.')
    console.log('   Barcode cache was seeded, but plate analysis logs require patients.')
    return
  }

  const practitioner = practitioners[0]
  console.log(`   Found practitioner: ${practitioner.display_name}`)

  // Get active patients for this practitioner
  const { data: relationships } = await supabase
    .from('practitioner_patients')
    .select('patient_id')
    .eq('practitioner_id', practitioner.id)
    .eq('status', 'active')

  if (!relationships || relationships.length === 0) {
    console.log('   ⚠️ No active patients found for this practitioner.')
    console.log('   Invite patients first, then run this seed again.')
    return
  }

  const patientIds = relationships.map(r => r.patient_id)
  console.log(`   Found ${patientIds.length} active patients`)

  // 3. Seed plate analysis logs
  await seedPlateAnalysisLogs(practitioner.id, patientIds)

  // 4. Create alert conditions
  await createAlertConditions(patientIds)

  console.log('\n✅ Seed complete!')
  console.log('\nTo see alerts, go to /clinic and check the alerts section.')
  console.log('To see plate analysis logs, view patient details or use Coach AI.')
}

main().catch(console.error)
