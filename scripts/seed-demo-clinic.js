/**
 * scripts/seed-demo-clinic.js
 *
 * Crea datos DEMO para el portal clínico:
 *   - 3 nutriólogos  [DEMO-NUT]  con email @fitkis-demo.test
 *   - 9 pacientes    [DEMO-PAC]  (3 por nutriólogo) con email @fitkis-demo.test
 *
 * Todos los emails usan el dominio @fitkis-demo.test → fácil de identificar y borrar.
 * Contraseña de todas las cuentas demo: Demo1234!
 *
 * Uso:
 *   node scripts/seed-demo-clinic.js           # crea datos
 *   node scripts/seed-demo-clinic.js --delete  # borra TODO lo demo
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAdminKey) {
  console.error('❌  Faltan: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAdminKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DOMAIN = 'fitkis-demo.test'
const PASS   = 'Demo1234!'

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(d)
}

function rand(min, max, dec = 1) {
  return parseFloat((min + Math.random() * (max - min)).toFixed(dec))
}

function progression(start, end, steps) {
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    return parseFloat((start + (end - start) * t + (Math.random() - 0.5) * 0.4).toFixed(1))
  })
}

// ─── nutriólogos demo ─────────────────────────────────────────────────────────

const DEMO_NUTRITIONISTS = [
  {
    email:        `nut.ana.garcia@${DOMAIN}`,
    displayName:  '[DEMO-NUT] Dra. Ana García Morales',
    license:      'DEM-001',
    specialty:    'Nutrición clínica · SMAE',
    clinic:       'Clínica Demo Norte',
  },
  {
    email:        `nut.carlos.mendoza@${DOMAIN}`,
    displayName:  '[DEMO-NUT] Dr. Carlos Mendoza Ruiz',
    license:      'DEM-002',
    specialty:    'Nutrición deportiva',
    clinic:       'Centro Demo Fitness',
  },
  {
    email:        `nut.laura.vidal@${DOMAIN}`,
    displayName:  '[DEMO-NUT] Dra. Laura Vidal Torres',
    license:      'DEM-003',
    specialty:    'Nutrición pediátrica y familiar',
    clinic:       'Consultorio Demo Sur',
  },
]

// ─── pacientes demo (3 por nutriólogo) ───────────────────────────────────────

// Cada grupo de 3 irá vinculado al nutriólogo con el mismo índice (0, 1, 2)
const DEMO_PATIENT_GROUPS = [
  // ── Grupo 0 · Dra. Ana García ──────────────────────────────────────────────
  [
    {
      email: `pac.maria.fernandez@${DOMAIN}`,
      displayName: '[DEMO-PAC] María Fernanda López',
      height_cm: 164, goal_weight: 60,
      wp: { start: 68.2, end: 63.8, steps: 12, fatS: 28.1, fatE: 24.2, musS: 24.1, musE: 25.4 },
      plan: { verdura:5, fruta:3, carb:4, proteina:8, grasa:4, leguminosa:1, v:4, notes:'Mantén consistencia. +1 fruta en snack tarde. 2.5L agua.' },
      meals: { desayuno:true, snack1:true, comida:true, snack2:true, cena:true, snack3:false },
      gym: true, adherence: 0.85, scenario: 'losing',
    },
    {
      email: `pac.diego.ramirez@${DOMAIN}`,
      displayName: '[DEMO-PAC] Diego Ramírez',
      height_cm: 178, goal_weight: 80,
      wp: { start: 72.0, end: 75.2, steps: 10, fatS: 18.2, fatE: 16.8, musS: 32.0, musE: 35.1 },
      plan: { verdura:4, fruta:3, carb:7, proteina:10, grasa:5, leguminosa:1, v:3, notes:'Alta proteína post-entreno. No saltar cenas. Creatina diaria.' },
      meals: { desayuno:true, snack1:true, comida:true, snack2:true, cena:true, snack3:true },
      gym: true, adherence: 0.90, scenario: 'gaining',
    },
    {
      email: `pac.sofia.gutierrez@${DOMAIN}`,
      displayName: '[DEMO-PAC] Sofía Gutiérrez',
      height_cm: 161, goal_weight: 57,
      wp: { start: 58.4, end: 59.2, steps: 8, fatS: 22.0, fatE: 23.1, musS: 21.0, musE: 20.7 },
      plan: { verdura:4, fruta:2, carb:4, proteina:7, grasa:4, leguminosa:1, v:2, notes: null },
      meals: { desayuno:true, snack1:false, comida:true, snack2:true, cena:true, snack3:false },
      gym: false, adherence: 0.30, scenario: 'inactive',
    },
  ],
  // ── Grupo 1 · Dr. Carlos Mendoza ──────────────────────────────────────────
  [
    {
      email: `pac.roberto.cisneros@${DOMAIN}`,
      displayName: '[DEMO-PAC] Roberto Cisneros',
      height_cm: 181, goal_weight: 85,
      wp: { start: 95.2, end: 89.0, steps: 14, fatS: 36.0, fatE: 30.5, musS: 30.0, musE: 32.8 },
      plan: { verdura:5, fruta:2, carb:5, proteina:10, grasa:4, leguminosa:1, v:5, notes:'Déficit moderado. No omitir desayuno. Hidratación 3L.' },
      meals: { desayuno:true, snack1:true, comida:true, snack2:false, cena:true, snack3:false },
      gym: true, adherence: 0.88, scenario: 'losing',
    },
    {
      email: `pac.carmen.solis@${DOMAIN}`,
      displayName: '[DEMO-PAC] Carmen Solís',
      height_cm: 160, goal_weight: 55,
      wp: { start: 62.5, end: 58.3, steps: 10, fatS: 30.2, fatE: 26.1, musS: 20.5, musE: 21.8 },
      plan: { verdura:5, fruta:2, carb:3, proteina:8, grasa:3, leguminosa:1, v:3, notes:'Evitar carbs en cena. +verduras en comida.' },
      meals: { desayuno:true, snack1:false, comida:true, snack2:true, cena:true, snack3:false },
      gym: true, adherence: 0.75, scenario: 'losing',
    },
    {
      email: `pac.luis.tovar@${DOMAIN}`,
      displayName: '[DEMO-PAC] Luis Tovar',
      height_cm: 175, goal_weight: 72,
      wp: { start: 70.5, end: 72.8, steps: 6, fatS: 16.0, fatE: 15.2, musS: 34.0, musE: 36.5 },
      plan: { verdura:4, fruta:3, carb:8, proteina:11, grasa:5, leguminosa:2, v:2, notes:'Superávit ligero. Priorizar proteína post-entreno.' },
      meals: { desayuno:true, snack1:true, comida:true, snack2:true, cena:true, snack3:true },
      gym: true, adherence: 0.95, scenario: 'gaining',
    },
  ],
  // ── Grupo 2 · Dra. Laura Vidal ────────────────────────────────────────────
  [
    {
      email: `pac.gabriela.reyes@${DOMAIN}`,
      displayName: '[DEMO-PAC] Gabriela Reyes',
      height_cm: 166, goal_weight: 62,
      wp: { start: 74.1, end: 68.9, steps: 11, fatS: 32.5, fatE: 28.0, musS: 23.5, musE: 24.8 },
      plan: { verdura:5, fruta:3, carb:4, proteina:8, grasa:4, leguminosa:1, v:3, notes:'Plan balanceado. Incluir leguminosa en comida principal.' },
      meals: { desayuno:true, snack1:true, comida:true, snack2:true, cena:true, snack3:false },
      gym: false, adherence: 0.80, scenario: 'losing',
    },
    {
      email: `pac.andres.luna@${DOMAIN}`,
      displayName: '[DEMO-PAC] Andrés Luna',
      height_cm: 172, goal_weight: 70,
      wp: { start: 71.0, end: 70.5, steps: 7, fatS: 20.0, fatE: 19.8, musS: 31.0, musE: 31.2 },
      plan: { verdura:4, fruta:2, carb:5, proteina:8, grasa:4, leguminosa:1, v:2, notes: null },
      meals: { desayuno:true, snack1:false, comida:true, snack2:false, cena:true, snack3:false },
      gym: true, adherence: 0.60, scenario: 'maintenance',
    },
    {
      email: `pac.paola.vidal@${DOMAIN}`,
      displayName: '[DEMO-PAC] Paola Vidal',
      height_cm: 157, goal_weight: 52,
      wp: { start: 60.3, end: 61.1, steps: 8, fatS: 29.0, fatE: 29.8, musS: 19.5, musE: 19.2 },
      plan: { verdura:4, fruta:2, carb:4, proteina:7, grasa:3, leguminosa:1, v:1, notes: null },
      meals: { desayuno:true, snack1:false, comida:true, snack2:false, cena:true, snack3:false },
      gym: false, adherence: 0.25, scenario: 'inactive',
    },
  ],
]

// ─── gym data ─────────────────────────────────────────────────────────────────

const ROUTINES = {
  upper_a: { type:'upper_a', exercises:[
    { id:'press_banca',          sets:[[90,8],[85,8],[85,7],[80,6]] },
    { id:'press_militar',        sets:[[25,10],[25,10],[20,10]] },
    { id:'pec_deck',             sets:[[60,12],[60,12],[55,12]] },
    { id:'elevaciones_lat',      sets:[[10,12],[10,12],[10,10]] },
    { id:'triceps_polea',        sets:[[40,10],[35,10],[35,8]] },
  ], cardio: null },
  upper_b: { type:'upper_b', exercises:[
    { id:'jalon_pecho',          sets:[[70,10],[70,10],[65,10]] },
    { id:'remo_barra',           sets:[[80,10],[80,8],[75,8]] },
    { id:'remo_mancuerna',       sets:[[35,10],[35,10],[35,8]] },
    { id:'curl_biceps',          sets:[[40,12],[40,10],[35,10]] },
    { id:'curl_martillo',        sets:[[20,12],[20,12],[20,10]] },
  ], cardio: { minutes:12, speed:5.5 } },
  lower_a: { type:'lower_a', exercises:[
    { id:'sentadilla',           sets:[[80,10],[80,10],[75,8],[70,8]] },
    { id:'prensa_pierna',        sets:[[180,12],[180,12],[160,12]] },
    { id:'extension_cuadriceps', sets:[[60,12],[60,12],[55,12]] },
    { id:'zancadas',             sets:[[20,10],[20,10],[20,8]] },
    { id:'elevacion_pantorrilla',sets:[[40,15],[40,15],[40,12]] },
  ], cardio: null },
  lower_b: { type:'lower_b', exercises:[
    { id:'peso_muerto',          sets:[[100,8],[100,8],[90,8]] },
    { id:'curl_femoral',         sets:[[50,12],[50,12],[45,10]] },
    { id:'hip_thrust',           sets:[[80,12],[80,12],[75,12]] },
    { id:'abduccion_cadera',     sets:[[50,15],[50,15],[50,15]] },
    { id:'plancha_abdominal',    sets:[[0,60],[0,45],[0,45]] },
  ], cardio: { minutes:15, speed:6.0 } },
}

const CYCLE = ['upper_a','lower_a','upper_b','lower_b']
const FEELINGS = ['perfecto','dificil','ligero','muy_pesado','quiero_mas']

function buildGymSessions(userId, n) {
  return Array.from({ length: n }, (_, i) => {
    const routine = ROUTINES[CYCLE[i % 4]]
    const noise   = rand(-5, 10, 0)
    return {
      userId,
      date:             daysAgo((n - i) * 2 + Math.floor(Math.random() * 2)),
      routine_type:     routine.type,
      cardio_minutes:   routine.cardio?.minutes ?? null,
      cardio_speed:     routine.cardio?.speed ?? null,
      duration_seconds: rand(2400, 4200, 0),
      exercises: routine.exercises.map(ex => ({
        id:   ex.id,
        sets: ex.sets.map((s, si) => ({
          set_number: si + 1,
          lbs:        s[0] === 0 ? 0 : Math.max(5, s[0] + noise),
          reps:       s[1],
          feeling:    FEELINGS[Math.floor(Math.random() * FEELINGS.length)],
        })),
      })),
    }
  })
}

const FOOD_TMPL = {
  desayuno: [['proteina',2,'Huevo'],['grasa',1,'Aguacate']],
  snack1:   [['fruta',1,'Manzana'],['proteina',1,'Yogurt griego']],
  comida:   [['proteina',3,'Pollo deshebrado'],['verdura',2,'Brócoli'],['carb',2,'Arroz cocido'],['leguminosa',1,'Frijol cocido'],['grasa',1,'Aceite de oliva']],
  snack2:   [['fruta',1,'Plátano'],['proteina',1,'Atún en agua']],
  cena:     [['proteina',2,'Salmón'],['verdura',2,'Espinaca cocida'],['carb',1,'Tortilla maíz'],['grasa',1,'Aguacate']],
  snack3:   [['proteina',1,'Queso cottage'],['carb',1,'Rice cakes']],
}

function buildFoodLogs(userId, meals, days, adherence) {
  const logs = []
  for (let d = 0; d < days; d++) {
    if (Math.random() > adherence) continue
    const date = daysAgo(d)
    for (const [meal, active] of Object.entries(meals)) {
      if (!active) continue
      for (const [group_type, quantity, food_name] of (FOOD_TMPL[meal] ?? [])) {
        const qty = Math.max(0.5, quantity + (Math.random() > 0.7 ? rand(-0.5, 0.5, 0) : 0))
        logs.push({ user_id: userId, date, meal, group_type, quantity: qty, food_name })
      }
    }
  }
  return logs
}

// ─── create one user ─────────────────────────────────────────────────────────

async function createAuthUser(email, displayName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password:      PASS,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) {
    if (error.message.includes('already')) {
      // User exists → fetch their ID
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const existing = users.find(u => u.email === email)
      if (existing) return { id: existing.id, existed: true }
    }
    throw new Error(`auth.createUser(${email}): ${error.message}`)
  }
  return { id: data.user.id, existed: false }
}

// ─── seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  Creando datos DEMO...\n')

  for (let ni = 0; ni < DEMO_NUTRITIONISTS.length; ni++) {
    const nut = DEMO_NUTRITIONISTS[ni]
    console.log(`\n══ Nutriólogo ${ni + 1}/3: ${nut.displayName}`)

    // 1. Auth user para el nutriólogo
    let nutId
    try {
      const { id, existed } = await createAuthUser(nut.email, nut.displayName)
      nutId = id
      console.log(`  ✓  Auth ${existed ? '(ya existía)' : '(creado)'}  ${nut.email}`)
    } catch (e) { console.error(`  ❌  ${e.message}`); continue }

    // 2. user_profiles del nutriólogo
    await supabase.from('user_profiles').upsert({
      user_id:      nutId,
      display_name: nut.displayName,
      role:         'practitioner',
    }, { onConflict: 'user_id' })

    // 3. Registro en practitioners
    const { data: pracRow, error: pracErr } = await supabase
      .from('practitioners')
      .upsert({
        user_id:        nutId,
        display_name:   nut.displayName,
        license_number: nut.license,
        specialty:      nut.specialty,
        clinic_name:    nut.clinic,
        active:         true,
      }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (pracErr) { console.error(`  ❌  practitioners: ${pracErr.message}`); continue }
    const practitionerId = pracRow.id
    console.log(`  ✓  practitioners  id=${practitionerId}`)

    // 4. Pacientes del nutriólogo
    const patients = DEMO_PATIENT_GROUPS[ni]
    for (let pi = 0; pi < patients.length; pi++) {
      const p = patients[pi]
      console.log(`\n  ── Paciente ${pi + 1}/3: ${p.displayName}`)

      let patId
      try {
        const { id, existed } = await createAuthUser(p.email, p.displayName)
        patId = id
        console.log(`    ✓  Auth ${existed ? '(ya existía)' : '(creado)'}  ${p.email}`)
      } catch (e) { console.error(`    ❌  ${e.message}`); continue }

      // user_profiles
      await supabase.from('user_profiles').upsert({
        user_id:        patId,
        display_name:   p.displayName,
        height_cm:      p.height_cm,
        goal_weight_kg: p.goal_weight,
        role:           'user',
      }, { onConflict: 'user_id' })

      // practitioner_patients
      await supabase.from('practitioner_patients').upsert({
        practitioner_id: practitionerId,
        patient_id:      patId,
        status:          'active',
        invited_at:      new Date(Date.now() - 90 * 86400000).toISOString(),
        accepted_at:     new Date(Date.now() - 89 * 86400000).toISOString(),
      }, { onConflict: 'practitioner_id,patient_id' })

      // diet_configs
      await supabase.from('diet_configs').upsert({
        user_id:        patId,
        prescribed_by:  practitionerId,
        effective_date: daysAgo(60),
        version:        p.plan.v,
        active:         true,
        verdura:        p.plan.verdura,
        fruta:          p.plan.fruta,
        carb:           p.plan.carb,
        proteina:       p.plan.proteina,
        grasa:          p.plan.grasa,
        leguminosa:     p.plan.leguminosa,
        notes:          p.plan.notes,
        active_meals:   p.meals,
      }, { onConflict: 'user_id,effective_date' })

      // weight_logs
      const { start, end, steps, fatS, fatE, musS, musE } = p.wp
      const weights = progression(start, end, steps)
      const fats    = progression(fatS, fatE, steps)
      const muscles = progression(musS, musE, steps)
      const wLogs   = weights.map((w, i) => ({
        user_id:             patId,
        date:                daysAgo(Math.round((steps - 1 - i) * 6.5)),
        weight_kg:           w,
        body_fat_percentage: fats[i],
        body_fat_mass_kg:    parseFloat((w * fats[i] / 100).toFixed(1)),
        muscle_mass_kg:      muscles[i],
        notes:               i === steps - 1 ? 'Última medición' : null,
      }))
      const { error: wErr } = await supabase.from('weight_logs').insert(wLogs)
      if (wErr) console.warn(`    ⚠️  weight_logs: ${wErr.message}`)
      else      console.log(`    ✓  weight_logs (${wLogs.length})`)

      // food_logs
      const fLogs = buildFoodLogs(patId, p.meals, 14, p.adherence)
      if (fLogs.length) {
        const { error: fErr } = await supabase.from('food_logs').insert(fLogs)
        if (fErr) console.warn(`    ⚠️  food_logs: ${fErr.message}`)
        else      console.log(`    ✓  food_logs (${fLogs.length})`)
      } else {
        console.log('    ✓  food_logs (0 — paciente inactivo)')
      }

      // gym_sessions
      if (p.gym) {
        const sessions = buildGymSessions(patId, 8)
        let sCount = 0
        for (const s of sessions) {
          const { data: sRow, error: sErr } = await supabase
            .from('gym_sessions')
            .insert({ user_id: patId, date: s.date, routine_type: s.routine_type, cardio_minutes: s.cardio_minutes, cardio_speed: s.cardio_speed, duration_seconds: s.duration_seconds })
            .select('id').single()
          if (sErr) continue
          const sets = s.exercises.flatMap(ex => ex.sets.map(st => ({ session_id: sRow.id, exercise_id: ex.id, ...st })))
          await supabase.from('session_sets').insert(sets)
          sCount++
        }
        console.log(`    ✓  gym_sessions (${sCount})`)
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('✅  Seed DEMO completo.')
  console.log('\nNutriélogos demo (contraseña: Demo1234!):')
  DEMO_NUTRITIONISTS.forEach(n => console.log(`  ${n.email}`))
  console.log('\nPara borrar todo: node scripts/seed-demo-clinic.js --delete\n')
}

// ─── delete ───────────────────────────────────────────────────────────────────

async function deleteDemo() {
  console.log('\n🗑️  Borrando datos DEMO...\n')

  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error(error.message); process.exit(1) }

  const demo = users.filter(u => u.email?.endsWith(`@${DOMAIN}`))
  if (!demo.length) { console.log('No hay usuarios DEMO.'); return }

  const ids = demo.map(u => u.id)
  console.log(`Encontrados ${ids.length} usuarios @${DOMAIN}\n`)

  // Borrar datos en orden de dependencias
  const tables = [
    'food_logs','weight_logs','habit_logs','habits',
    'practitioner_patients','diet_configs','user_profiles',
  ]
  for (const t of tables) {
    const { error: e } = await supabase.from(t).delete().in('user_id', ids)
    if (e) console.warn(`  ⚠️  ${t}: ${e.message}`)
    else   console.log(`  ✓  ${t}`)
  }

  // gym_sessions (ON DELETE CASCADE borra session_sets)
  const { error: gErr } = await supabase.from('gym_sessions').delete().in('user_id', ids)
  if (gErr) console.warn(`  ⚠️  gym_sessions: ${gErr.message}`)
  else      console.log('  ✓  gym_sessions + session_sets')

  // practitioners
  const { error: pErr } = await supabase.from('practitioners').delete().in('user_id', ids)
  if (pErr) console.warn(`  ⚠️  practitioners: ${pErr.message}`)
  else      console.log('  ✓  practitioners')

  // auth users
  let deleted = 0
  for (const u of demo) {
    const { error: dErr } = await supabase.auth.admin.deleteUser(u.id)
    if (dErr) console.warn(`  ⚠️  ${u.email}: ${dErr.message}`)
    else      deleted++
  }
  console.log(`  ✓  auth.users (${deleted}/${demo.length})`)

  console.log('\n✅  Datos DEMO eliminados.\n')
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
if (args.includes('--delete')) {
  deleteDemo().catch(console.error)
} else {
  seed().catch(console.error)
}
