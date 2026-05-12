/**
 * scripts/seed-demo-clinic.js
 *
 * Crea 3 pacientes DEMO con datos completos para probar el portal clínico.
 * Todos los registros tienen el prefijo [DEMO] en nombres y @fitkis-demo.test
 * en emails para que sean fáciles de identificar y borrar.
 *
 * Uso:
 *   node scripts/seed-demo-clinic.js
 *
 * Para borrar TODOS los datos demo:
 *   node scripts/seed-demo-clinic.js --delete
 *
 * Requiere:
 *   NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 *
 * El script busca automáticamente al primer nutriólogo activo y lo vincula
 * como practitioner de los 3 pacientes demo.
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAdminKey) {
  console.error('❌  Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAdminKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_TAG   = '[DEMO]'
const DEMO_EMAIL_DOMAIN = 'fitkis-demo.test'

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n, tzOffset = -6) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  // shift to Mexico City time
  const local = new Date(d.getTime() + tzOffset * 60 * 60 * 1000)
  return local.toISOString().split('T')[0]
}

function rand(min, max, decimals = 1) {
  const v = min + Math.random() * (max - min)
  return parseFloat(v.toFixed(decimals))
}

function progression(start, end, steps) {
  return Array.from({ length: steps }, (_, i) => {
    const t   = i / (steps - 1)
    const raw = start + (end - start) * t
    const noise = (Math.random() - 0.5) * 0.4
    return parseFloat((raw + noise).toFixed(1))
  })
}

// ─── pacientes demo ───────────────────────────────────────────────────────────

const DEMO_PATIENTS = [
  {
    email:        `maria.fernanda@${DEMO_EMAIL_DOMAIN}`,
    displayName:  `${DEMO_TAG} María Fernanda López`,
    height_cm:    164,
    goal_weight:  60,
    // peso bajando 68→63 en 12 semanas
    weightProgression: { start: 68.2, end: 63.8, steps: 12, fatStart: 28.1, fatEnd: 24.2, muscleStart: 24.1, muscleEnd: 25.4 },
    plan:  { verdura: 5, fruta: 3, carb: 4, proteina: 8, grasa: 4, leguminosa: 1, version: 4, notes: 'Mantén la consistencia de la mañana. Snack tarde +1 fruta. Hidratación 2.5L.' },
    meals: { desayuno: true, snack1: true, comida: true, snack2: true, cena: true, snack3: false },
    gymProfile: 'upper_lower',
    foodAdherence: 0.85,   // % días con registros
    scenario: 'active_losing',
  },
  {
    email:        `diego.ramirez@${DEMO_EMAIL_DOMAIN}`,
    displayName:  `${DEMO_TAG} Diego Ramírez`,
    height_cm:    178,
    goal_weight:  80,
    // peso subiendo 72→75 (ganancia muscular)
    weightProgression: { start: 72.0, end: 75.2, steps: 10, fatStart: 18.2, fatEnd: 16.8, muscleStart: 32.0, muscleEnd: 35.1 },
    plan:  { verdura: 4, fruta: 3, carb: 7, proteina: 10, grasa: 5, leguminosa: 1, version: 3, notes: 'Alta proteína post-entreno. No saltar cenas. Creatina diaria.' },
    meals: { desayuno: true, snack1: true, comida: true, snack2: true, cena: true, snack3: true },
    gymProfile: 'upper_lower',
    foodAdherence: 0.90,
    scenario: 'active_gaining',
  },
  {
    email:        `sofia.gutierrez@${DEMO_EMAIL_DOMAIN}`,
    displayName:  `${DEMO_TAG} Sofía Gutiérrez`,
    height_cm:    161,
    goal_weight:  58,
    // peso estable/estancado
    weightProgression: { start: 58.4, end: 59.2, steps: 8, fatStart: 22.0, fatEnd: 23.1, muscleStart: 21.0, muscleEnd: 20.7 },
    plan:  { verdura: 4, fruta: 2, carb: 4, proteina: 7, grasa: 4, leguminosa: 1, version: 2, notes: null },
    meals: { desayuno: true, snack1: false, comida: true, snack2: true, cena: true, snack3: false },
    gymProfile: null,
    foodAdherence: 0.35,   // inactiva — genera alerta
    scenario: 'inactive',
  },
]

// ─── gym data templates ───────────────────────────────────────────────────────

const ROUTINES = {
  upper_a: {
    type: 'upper_a',
    exercises: [
      { id: 'press_banca',         sets: [[90,8],[85,8],[85,7],[80,6]] },
      { id: 'press_militar',       sets: [[25,10],[25,10],[20,10]] },
      { id: 'pec_deck',            sets: [[60,12],[60,12],[55,12]] },
      { id: 'elevaciones_lat',     sets: [[10,12],[10,12],[10,10]] },
      { id: 'triceps_polea',       sets: [[40,10],[35,10],[35,8]] },
    ],
    cardio: null,
  },
  upper_b: {
    type: 'upper_b',
    exercises: [
      { id: 'jalon_pecho',         sets: [[70,10],[70,10],[65,10]] },
      { id: 'remo_barra',          sets: [[80,10],[80,8],[75,8]] },
      { id: 'remo_mancuerna',      sets: [[35,10],[35,10],[35,8]] },
      { id: 'curl_biceps',         sets: [[40,12],[40,10],[35,10]] },
      { id: 'curl_martillo',       sets: [[20,12],[20,12],[20,10]] },
    ],
    cardio: { minutes: 12, speed: 5.5 },
  },
  lower_a: {
    type: 'lower_a',
    exercises: [
      { id: 'sentadilla',          sets: [[80,10],[80,10],[75,8],[70,8]] },
      { id: 'prensa_pierna',       sets: [[180,12],[180,12],[160,12]] },
      { id: 'extension_cuadriceps',sets: [[60,12],[60,12],[55,12]] },
      { id: 'zancadas',            sets: [[20,10],[20,10],[20,8]] },
      { id: 'elevacion_pantorrilla',sets: [[40,15],[40,15],[40,12]] },
    ],
    cardio: null,
  },
  lower_b: {
    type: 'lower_b',
    exercises: [
      { id: 'peso_muerto',         sets: [[100,8],[100,8],[90,8]] },
      { id: 'curl_femoral',        sets: [[50,12],[50,12],[45,10]] },
      { id: 'hip_thrust',          sets: [[80,12],[80,12],[75,12]] },
      { id: 'abduccion_cadera',    sets: [[50,15],[50,15],[50,15]] },
      { id: 'plancha_abdominal',   sets: [[0,60],[0,45],[0,45]] },
    ],
    cardio: { minutes: 15, speed: 6.0 },
  },
}

// Ciclo de rutinas
const ROUTINE_CYCLE = ['upper_a', 'lower_a', 'upper_b', 'lower_b']

function buildGymSessions(patientId, numSessions) {
  const sessions = []
  for (let i = 0; i < numSessions; i++) {
    const daysBack = numSessions - i  // más antiguo primero
    const routine  = ROUTINES[ROUTINE_CYCLE[i % 4]]
    const date     = daysAgo(daysBack * 2 + Math.floor(Math.random() * 2))

    const lbsNoise = rand(-5, 10, 0) // pequeña progresión
    sessions.push({
      patientId,
      date,
      routine_type:     routine.type,
      cardio_minutes:   routine.cardio?.minutes ?? null,
      cardio_speed:     routine.cardio?.speed ?? null,
      duration_seconds: rand(2400, 4200, 0),
      exercises: routine.exercises.map(ex => ({
        id:   ex.id,
        sets: ex.sets.map((s, si) => ({
          set_number: si + 1,
          lbs:        s[0] === 0 ? 0 : Math.max(5, s[0] + lbsNoise),
          reps:       s[1],
          feeling:    ['perfecto','dificil','ligero','muy_pesado','quiero_mas'][Math.floor(Math.random()*5)],
        })),
      })),
    })
  }
  return sessions
}

// ─── food log builder ─────────────────────────────────────────────────────────

const FOOD_TEMPLATES = {
  // [group_type, quantity, food_name]
  desayuno: [
    ['proteina', 2, 'Huevo'],
    ['proteina', 1, 'Claras de huevo'],
    ['grasa',    1, 'Aguacate'],
  ],
  snack1: [
    ['fruta',    1, 'Manzana'],
    ['proteina', 1, 'Yogurt griego'],
    ['grasa',    1, 'Nueces'],
  ],
  comida: [
    ['proteina', 3, 'Pollo deshebrado'],
    ['verdura',  2, 'Brócoli'],
    ['carb',     2, 'Arroz cocido'],
    ['leguminosa',1,'Frijol cocido'],
    ['grasa',    1, 'Aceite de oliva'],
  ],
  snack2: [
    ['fruta',    1, 'Plátano'],
    ['proteina', 1, 'Atún en agua'],
  ],
  cena: [
    ['proteina', 2, 'Salmón'],
    ['verdura',  2, 'Espinaca cocida'],
    ['carb',     1, 'Tortilla maíz'],
    ['grasa',    1, 'Aguacate'],
  ],
  snack3: [
    ['proteina', 1, 'Queso cottage'],
  ],
}

function buildFoodLogs(patientId, activeMeals, days, adherence) {
  const logs = []
  for (let d = 0; d < days; d++) {
    if (Math.random() > adherence) continue   // simula días sin registro
    const date = daysAgo(d)
    for (const [meal, active] of Object.entries(activeMeals)) {
      if (!active) continue
      const template = FOOD_TEMPLATES[meal] ?? []
      for (const [group_type, quantity, food_name] of template) {
        // pequeña variación en cantidad
        const qty = Math.max(0.5, quantity + (Math.random() > 0.7 ? rand(-0.5, 0.5, 0) : 0))
        logs.push({ user_id: patientId, date, meal, group_type, quantity: qty, food_name })
      }
    }
  }
  return logs
}

// ─── delete mode ─────────────────────────────────────────────────────────────

async function deleteDemo() {
  console.log('\n🗑️  Borrando todos los datos DEMO...\n')

  // 1. Encontrar usuarios demo
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) { console.error('Error listando usuarios:', listErr.message); process.exit(1) }

  const demoUsers = users.filter(u => u.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`))
  if (demoUsers.length === 0) { console.log('No se encontraron usuarios DEMO.'); return }

  const demoIds = demoUsers.map(u => u.id)
  console.log(`Encontrados ${demoIds.length} usuarios DEMO: ${demoUsers.map(u => u.email).join(', ')}`)

  // 2. Borrar datos relacionados
  const tables = ['food_logs', 'weight_logs', 'habit_logs', 'habits', 'gym_sessions', 'practitioner_patients', 'diet_configs', 'user_profiles']
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().in('user_id', demoIds)
    if (error) console.warn(`  ⚠️  ${table}: ${error.message}`)
    else       console.log(`  ✓  ${table} limpiado`)
  }

  // 3. Borrar session_sets (en cascada desde gym_sessions, pero por si acaso)
  // gym_sessions con ON DELETE CASCADE ya borró los sets

  // 4. Borrar practitioners demo (si alguno se creó como profesional)
  for (const id of demoIds) {
    await supabase.from('practitioners').delete().eq('user_id', id)
  }

  // 5. Borrar auth users
  for (const user of demoUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) console.warn(`  ⚠️  No se pudo borrar ${user.email}: ${error.message}`)
    else       console.log(`  ✓  Usuario ${user.email} eliminado`)
  }

  console.log('\n✅  Datos DEMO eliminados.\n')
}

// ─── seed mode ────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log('\n🌱  Creando datos DEMO para el portal clínico...\n')

  // 1. Encontrar el primer practitioner activo
  const { data: practitioners, error: pracErr } = await supabase
    .from('practitioners')
    .select('id, display_name, user_id')
    .eq('active', true)
    .limit(1)

  if (pracErr || !practitioners?.length) {
    console.error('❌  No se encontró ningún nutriólogo activo. Crea uno primero desde /admin/invite.')
    process.exit(1)
  }

  const practitioner = practitioners[0]
  console.log(`Nutriólogo encontrado: ${practitioner.display_name} (${practitioner.id})\n`)

  const createdPatients = []

  for (const p of DEMO_PATIENTS) {
    console.log(`─── Creando paciente: ${p.displayName}`)

    // 2. Crear usuario en auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:              p.email,
      password:           'Demo1234!',
      email_confirm:      true,
      user_metadata:      { display_name: p.displayName },
    })

    if (authErr) {
      if (authErr.message.includes('already')) {
        console.warn(`  ⚠️  Usuario ya existe: ${p.email} — omitiendo`)
        continue
      }
      console.error(`  ❌  Error creando usuario: ${authErr.message}`)
      continue
    }

    const userId = authData.user.id
    console.log(`  ✓  Auth user: ${userId}`)

    // 3. User profile
    const { error: profErr } = await supabase.from('user_profiles').upsert({
      user_id:       userId,
      display_name:  p.displayName,
      height_cm:     p.height_cm,
      goal_weight_kg: p.goal_weight,
      role:          'user',
    }, { onConflict: 'user_id' })
    if (profErr) console.warn(`  ⚠️  user_profiles: ${profErr.message}`)
    else         console.log('  ✓  user_profiles')

    // 4. Vincular con practitioner
    const { error: relErr } = await supabase.from('practitioner_patients').upsert({
      practitioner_id: practitioner.id,
      patient_id:      userId,
      status:          p.scenario === 'inactive' ? 'active' : 'active',
      invited_at:      new Date(Date.now() - 90 * 86400000).toISOString(),
      accepted_at:     new Date(Date.now() - 89 * 86400000).toISOString(),
    }, { onConflict: 'practitioner_id,patient_id' })
    if (relErr) console.warn(`  ⚠️  practitioner_patients: ${relErr.message}`)
    else        console.log('  ✓  practitioner_patients')

    // 5. Plan de dieta
    const { error: dietErr } = await supabase.from('diet_configs').insert({
      user_id:        userId,
      prescribed_by:  practitioner.id,
      effective_date: daysAgo(60),
      version:        p.plan.version,
      active:         true,
      verdura:        p.plan.verdura,
      fruta:          p.plan.fruta,
      carb:           p.plan.carb,
      proteina:       p.plan.proteina,
      grasa:          p.plan.grasa,
      leguminosa:     p.plan.leguminosa,
      notes:          p.plan.notes,
      active_meals:   p.meals,
    })
    if (dietErr) console.warn(`  ⚠️  diet_configs: ${dietErr.message}`)
    else         console.log('  ✓  diet_configs')

    // 6. Weight logs con progresión realista
    const { start, end, steps, fatStart, fatEnd, muscleStart, muscleEnd } = p.weightProgression
    const weights = progression(start, end, steps)
    const fats    = progression(fatStart, fatEnd, steps)
    const muscles = progression(muscleStart, muscleEnd, steps)

    const weightLogs = weights.map((w, i) => ({
      user_id:              userId,
      date:                 daysAgo(Math.round((steps - 1 - i) * 6.5)),
      weight_kg:            w,
      body_fat_percentage:  fats[i],
      body_fat_mass_kg:     parseFloat((w * fats[i] / 100).toFixed(1)),
      muscle_mass_kg:       muscles[i],
      notes:                i === steps - 1 ? 'Última medición' : null,
    }))

    const { error: weightErr } = await supabase.from('weight_logs').insert(weightLogs)
    if (weightErr) console.warn(`  ⚠️  weight_logs: ${weightErr.message}`)
    else           console.log(`  ✓  weight_logs (${weightLogs.length} entradas)`)

    // 7. Food logs (últimos 14 días)
    const foodLogs = buildFoodLogs(userId, p.meals, 14, p.foodAdherence)
    if (foodLogs.length > 0) {
      const { error: foodErr } = await supabase.from('food_logs').insert(foodLogs)
      if (foodErr) console.warn(`  ⚠️  food_logs: ${foodErr.message}`)
      else         console.log(`  ✓  food_logs (${foodLogs.length} entradas)`)
    } else {
      console.log('  ✓  food_logs (0 entradas — paciente inactivo)')
    }

    // 8. Gym sessions (solo pacientes con gymProfile)
    if (p.gymProfile) {
      const gymSessions = buildGymSessions(userId, 8)
      for (const session of gymSessions) {
        const { data: sessionData, error: sessionErr } = await supabase
          .from('gym_sessions')
          .insert({
            user_id:          userId,
            date:             session.date,
            routine_type:     session.routine_type,
            cardio_minutes:   session.cardio_minutes,
            cardio_speed:     session.cardio_speed,
            duration_seconds: session.duration_seconds,
            notes:            null,
          })
          .select('id')
          .single()

        if (sessionErr) { console.warn(`  ⚠️  gym_session: ${sessionErr.message}`); continue }

        const sets = session.exercises.flatMap(ex =>
          ex.sets.map(s => ({
            session_id:  sessionData.id,
            exercise_id: ex.id,
            set_number:  s.set_number,
            lbs:         s.lbs,
            reps:        s.reps,
            feeling:     s.feeling,
          }))
        )

        const { error: setsErr } = await supabase.from('session_sets').insert(sets)
        if (setsErr) console.warn(`  ⚠️  session_sets: ${setsErr.message}`)
      }
      console.log(`  ✓  gym_sessions + session_sets (${gymSessions.length} sesiones)`)
    }

    createdPatients.push({ email: p.email, id: userId, scenario: p.scenario })
    console.log()
  }

  console.log('─────────────────────────────────────────────')
  console.log(`✅  ${createdPatients.length} pacientes DEMO creados.\n`)
  console.log('Para verlos: inicia sesión como nutriólogo y abre /clinic')
  console.log('\nPara borrar TODOS los datos demo:')
  console.log('  node scripts/seed-demo-clinic.js --delete\n')
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
if (args.includes('--delete')) {
  deleteDemo().catch(console.error)
} else {
  seedDemo().catch(console.error)
}
