/**
 * lib/clinic/mock-data.ts
 *
 * Datos mock para Fase 1 del portal clínico v5 Paper & Pulse.
 *
 * IMPORTANTE — ESTO ES DATA FALSA. La BD tiene tablas reales
 * (`practitioners`, `practitioner_patients`, `weight_logs`, `diet_configs`)
 * que **NO** se están consultando todavía. En Fase 2 reemplazaremos estos
 * exports por queries a Supabase usando la lógica de
 * `legacy/app/(clinic-v0)/clinic/page.tsx` como referencia.
 *
 * Cuando edites algo aquí, recuerda: ningún usuario real está representado
 * en estos arrays — son personajes inventados del prototipo de diseño.
 */

export type AlertKind = 'inactividad' | 'estancamiento' | null

/** Espejo del enum en BD (`practitioner_patients.status`). */
export type PatientStatus = 'active' | 'pending' | 'inactive'

export type MockPatient = {
  id: number
  name: string
  email: string
  initial: string
  status: PatientStatus
  plan: string
  goal: string
  age?: number
  height_m?: number
  weight: number[]
  fat: number[]
  muscle: number[]
  lastSeen: string
  alert: AlertKind
  adherence: number | null
  streak: number
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: 1,
    name: 'María Fernanda López',
    email: 'maria.lopez@gmail.com',
    initial: 'M',
    status: 'active',
    plan: 'v4',
    goal: '-6 kg',
    age: 34,
    height_m: 1.64,
    weight: [68.2, 68.0, 67.6, 67.5, 67.3, 67.0, 66.8, 66.5, 66.3, 66.1],
    fat: [28.1, 27.9, 27.8, 27.5, 27.2, 27.0, 26.7, 26.5, 26.3, 26.0],
    muscle: [24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9, 25.0],
    lastSeen: 'Hoy',
    alert: null,
    adherence: 92,
    streak: 14,
  },
  {
    id: 2,
    name: 'Diego Ramírez',
    email: 'd.ramirez@hey.com',
    initial: 'D',
    status: 'active',
    plan: 'v2',
    goal: '+3 kg',
    age: 28,
    height_m: 1.78,
    weight: [72.0, 72.4, 72.6, 72.8, 73.0, 73.3, 73.5, 73.7, 73.9, 74.1],
    fat: [18.2, 18.1, 18.0, 17.9, 17.8, 17.7, 17.6, 17.5, 17.4, 17.3],
    muscle: [32.0, 32.2, 32.4, 32.6, 32.8, 33.0, 33.2, 33.4, 33.6, 33.8],
    lastSeen: 'hace 2d',
    alert: null,
    adherence: 88,
    streak: 23,
  },
  {
    id: 3,
    name: 'Sofía Gutiérrez',
    email: 'sofia.g@outlook.com',
    initial: 'S',
    status: 'active',
    plan: 'v1',
    goal: 'mantenimiento',
    age: 41,
    height_m: 1.61,
    weight: [58.4, 58.6, 58.5, 58.8, 58.9, 59.1, 59.3, 59.5, 59.7, 59.9],
    fat: [22.0, 22.1, 22.2, 22.4, 22.5, 22.7, 22.9, 23.0, 23.2, 23.4],
    muscle: [21.0, 21.0, 21.0, 20.9, 20.9, 20.9, 20.8, 20.8, 20.8, 20.7],
    lastSeen: 'hace 9d',
    alert: 'inactividad',
    adherence: 54,
    streak: 0,
  },
  {
    id: 4,
    name: 'Ana Karen Solís',
    email: 'ak.solis@gmail.com',
    initial: 'A',
    status: 'active',
    plan: 'v3',
    goal: '-4 kg',
    age: 31,
    height_m: 1.66,
    weight: [74.5, 74.4, 74.0, 73.7, 73.5, 73.2, 73.0, 72.7, 72.4, 72.1],
    fat: [31.0, 30.7, 30.4, 30.1, 29.8, 29.5, 29.2, 28.9, 28.6, 28.3],
    muscle: [26.0, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9],
    lastSeen: 'hace 1d',
    alert: null,
    adherence: 96,
    streak: 31,
  },
  {
    id: 5,
    name: 'Luis Tovar',
    email: 'luis.tovar@fitkis.app',
    initial: 'L',
    status: 'pending',
    plan: '—',
    goal: 'por definir',
    weight: [],
    fat: [],
    muscle: [],
    lastSeen: 'invitado hoy',
    alert: null,
    adherence: null,
    streak: 0,
  },
  {
    id: 6,
    name: 'Paulina Vidal',
    email: 'pau.vidal@gmail.com',
    initial: 'P',
    status: 'active',
    plan: 'v6',
    goal: '-8 kg',
    age: 36,
    height_m: 1.69,
    weight: [81.2, 81.0, 80.6, 80.7, 80.5, 80.7, 80.6, 80.9, 80.7, 80.8],
    fat: [34.0, 33.8, 33.7, 33.6, 33.7, 33.6, 33.7, 33.6, 33.7, 33.6],
    muscle: [27.0, 27.0, 27.1, 27.0, 27.1, 27.0, 27.1, 27.0, 27.1, 27.0],
    lastSeen: 'hace 3d',
    alert: 'estancamiento',
    adherence: 71,
    streak: 5,
  },
  {
    id: 7,
    name: 'Roberto Cisneros',
    email: 'r.cisneros@me.com',
    initial: 'R',
    status: 'active',
    plan: 'v2',
    goal: '-10 kg',
    age: 45,
    height_m: 1.81,
    weight: [95.2, 95.0, 94.5, 94.0, 93.7, 93.2, 92.8, 92.4, 92.0, 91.6],
    fat: [36.0, 35.7, 35.4, 35.0, 34.7, 34.3, 34.0, 33.6, 33.3, 33.0],
    muscle: [30.0, 30.2, 30.4, 30.6, 30.8, 31.0, 31.2, 31.4, 31.6, 31.8],
    lastSeen: 'Hoy',
    alert: null,
    adherence: 90,
    streak: 18,
  },
  {
    id: 8,
    name: 'Camila Ortega',
    email: 'c.ortega@gmail.com',
    initial: 'C',
    status: 'active',
    plan: 'v1',
    goal: '+5 kg',
    age: 24,
    height_m: 1.58,
    weight: [51.0, 51.0, 51.1, 51.0, 51.1, 51.0, 51.0, 50.9, 50.9, 50.8],
    fat: [19.0, 19.1, 19.0, 19.0, 18.9, 19.0, 18.9, 18.9, 18.8, 18.8],
    muscle: [18.5, 18.5, 18.5, 18.5, 18.5, 18.5, 18.5, 18.5, 18.5, 18.5],
    lastSeen: 'hace 11d',
    alert: 'inactividad',
    adherence: 42,
    streak: 0,
  },
]

export function findMockPatient(id: number): MockPatient | undefined {
  return MOCK_PATIENTS.find((p) => p.id === id)
}

export const MOCK_CONSULTAS_HOY = [
  { time: '09:00', name: 'María F. López', kind: 'Seguimiento', dur: '30m' },
  { time: '10:30', name: 'Diego Ramírez', kind: 'Ajuste plan', dur: '45m' },
  { time: '12:00', name: 'Roberto Cisneros', kind: 'Primera vez', dur: '60m' },
  { time: '16:00', name: 'Ana K. Solís', kind: 'Seguimiento', dur: '30m' },
]

export const MOCK_PRACTITIONER = {
  initial: 'R',
  name: 'Dra. Rocío Mendoza',
  cedula: '8842311',
  specialty: 'Nutrición clínica · SMAE',
}
