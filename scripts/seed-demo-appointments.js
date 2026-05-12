/**
 * scripts/seed-demo-appointments.js
 *
 * Pobla la tabla appointments con citas de mayo 2026 para los nutriólogos
 * y pacientes DEMO (@fitkis-demo.test).
 *
 * Uso:
 *   node scripts/seed-demo-appointments.js           # crea citas
 *   node scripts/seed-demo-appointments.js --delete  # borra citas demo
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

// ─── helpers ─────────────────────────────────────────────────────────────────

function isoAt(year, month, day, hour, minute = 0) {
  // Genera ISO en hora local Mexico City (UTC-6) → offset fijo para demo
  const pad = n => String(n).padStart(2, '0')
  return `2026-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-06:00`
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── datos de citas ───────────────────────────────────────────────────────────

// Motivos de consulta variados
const NOTAS = [
  'Primera consulta — revisión general y toma de medidas.',
  'Seguimiento mensual — paciente reporta buena adherencia.',
  'Ajuste de plan: semana de viaje, flexibilizar equivalentes.',
  'Revisión de análisis de sangre — glucosa en límite superior.',
  'Consulta de urgencia — paciente con malestar digestivo.',
  'Seguimiento quincenal — reajuste de macro proteína.',
  'Evaluación composición corporal con bioimpedancia.',
  'Consulta motivacional — paciente estancado en peso.',
  'Introducción de nueva rutina de entrenamiento.',
  'Cierre de objetivo: paciente alcanzó meta de peso.',
  null, null, // algunas sin notas
]

// Horarios disponibles (hora, minuto)
const HORARIOS = [
  [9, 0], [9, 50], [11, 0], [11, 50],
  [13, 0], [16, 0], [16, 50], [18, 0], [18, 50],
]

// Distribución de estatus: más futuras son "scheduled", pasadas varían
function statusForDate(day) {
  const today = new Date()
  const apptDate = new Date(`2026-05-${String(day).padStart(2, '0')}`)
  if (apptDate > today) return pick(['scheduled', 'scheduled', 'scheduled', 'confirmed'])
  // Pasadas
  return pick(['completed', 'completed', 'completed', 'completed', 'no_show', 'cancelled'])
}

// ─── seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n📅  Seeding citas demo — mayo 2026\n')

  // Obtener usuarios DEMO
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error(error.message); process.exit(1) }

  const demoUsers = users.filter(u => u.email?.endsWith(`@${DOMAIN}`))
  if (!demoUsers.length) {
    console.error('❌  No hay usuarios DEMO. Corre seed-demo-clinic.js primero.')
    process.exit(1)
  }

  // Separar nutriólogos y pacientes
  const nutEmails = demoUsers.filter(u => u.email?.includes('nut.')).map(u => u.email)
  console.log(`Nutriólogos encontrados: ${nutEmails.length}`)

  for (const nutUser of demoUsers.filter(u => u.email?.includes('nut.'))) {
    // Buscar el practitioner record
    const { data: prac } = await supabase
      .from('practitioners')
      .select('id, display_name')
      .eq('user_id', nutUser.id)
      .eq('active', true)
      .maybeSingle()

    if (!prac) {
      console.log(`  ⚠️  Sin practitioner para ${nutUser.email} — skip`)
      continue
    }

    console.log(`\n  ${prac.display_name}`)

    // Buscar pacientes vinculados
    const { data: relations } = await supabase
      .from('practitioner_patients')
      .select('patient_id')
      .eq('practitioner_id', prac.id)
      .eq('status', 'active')

    if (!relations?.length) {
      console.log(`    ⚠️  Sin pacientes vinculados`)
      continue
    }

    // Obtener nombres de los pacientes
    const patientIds = relations.map(r => r.patient_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', patientIds)

    const patientMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.user_id, p.display_name ?? 'Paciente'])
    )

    // Generar citas para mayo 2026
    // Días hábiles de mayo (lunes a sábado)
    const DAYS = [
      2, 3, 5, 6, 7, 8, 9,          // semana 1-2
      12, 13, 14, 15, 16,             // semana 3
      19, 20, 21, 22, 23,             // semana 4
      26, 27, 28, 29, 30,             // semana 5
    ]

    const appointments = []
    const usedSlots = new Set() // 'day-hour' para evitar conflictos

    for (const patId of patientIds) {
      const patName = patientMap[patId] ?? 'Paciente'

      // Asignar 2-4 citas por paciente distribuidas en el mes
      const numAppts = 2 + Math.floor(Math.random() * 3) // 2 a 4
      const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5).slice(0, numAppts)
      shuffledDays.sort((a, b) => a - b)

      for (const day of shuffledDays) {
        // Elegir horario libre
        const available = HORARIOS.filter(([h]) => !usedSlots.has(`${day}-${h}`))
        if (!available.length) continue

        const [hour, minute] = pick(available)
        usedSlots.add(`${day}-${hour}`)

        appointments.push({
          practitioner_id:  prac.id,
          patient_id:       patId,
          patient_name:     patName,
          patient_email:    demoUsers.find(u => u.id === patId)?.email ?? null,
          starts_at:        isoAt(2026, 5, day, hour, minute),
          duration_minutes: pick([50, 50, 50, 30, 60]),
          status:           statusForDate(day),
          notes:            pick(NOTAS),
        })
      }
    }

    // Insertar en lotes
    if (!appointments.length) continue

    const { error: insErr } = await supabase
      .from('appointments')
      .insert(appointments)

    if (insErr) {
      console.log(`    ❌  Error: ${insErr.message}`)
    } else {
      console.log(`    ✓  ${appointments.length} citas insertadas`)
    }
  }

  console.log('\n✅  Citas demo creadas.\n')
}

// ─── delete ───────────────────────────────────────────────────────────────────

async function deleteAppointments() {
  console.log('\n🗑️  Borrando citas demo...\n')

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const demoIds = (users ?? [])
    .filter(u => u.email?.endsWith(`@${DOMAIN}`))
    .map(u => u.id)

  if (!demoIds.length) { console.log('No hay usuarios DEMO.'); return }

  // Buscar practitioner IDs de los demo users
  const { data: pracs } = await supabase
    .from('practitioners')
    .select('id')
    .in('user_id', demoIds)

  const pracIds = (pracs ?? []).map(p => p.id)
  if (!pracIds.length) { console.log('Sin practitioners demo.'); return }

  const { error, count } = await supabase
    .from('appointments')
    .delete({ count: 'exact' })
    .in('practitioner_id', pracIds)

  if (error) console.error(`  ❌  ${error.message}`)
  else       console.log(`  ✓  ${count ?? '?'} citas eliminadas`)

  console.log('\n✅  Listo.\n')
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
if (args.includes('--delete')) {
  deleteAppointments().catch(console.error)
} else {
  seed().catch(console.error)
}
