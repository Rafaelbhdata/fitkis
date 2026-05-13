# Fitkis — Context

## Estado general

- Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel
- **Web = portal clínico exclusivo** (rama `master`). App móvil del paciente vive en repo separado `fitkis-mobile`
- Fase 3 ✅ completada (12 may 2026). Próximamente Fase 4 — ver pendientes abajo
- BD compartida con `fitkis-mobile`; endpoints `/api/*` los consume el móvil

---

## Estructura activa

```
app/
  (auth)/login, register      — Auth
  (clinic)/                   — Portal clínico (gate por practitioners.active)
    clinic/page              — Lista de pacientes + InviteModal + filtros
    clinic/pacientes/[id]    — Detalle del paciente (6 tabs wireadas a BD)
    clinic/pacientes/[id]/plan — Editor SMAE
    clinic/agenda            — Grilla semanal sincronizada con schedule
    clinic/ajustes           — Perfil, consultorio, horario, umbrales
    clinic/reportes          — KPIs reales (pacientes, adherencia, citas, alertas)
    clinic/biblioteca        — CRUD plantillas (plan/mensaje/receta)
  agendar/[id]               — Booking público mobile-first
  onboarding/                — Form para nutrióloga invitada
  admin/, admin/invite       — Panel admin (gate por role='admin')
  api/
    admin/professional       — PATCH activar/desactivar nutrióloga
    available-slots/[id]/[d] — GET slots ocupados del día
    book-appointment         — POST crear cita
    invite-professional      — POST magic link al nuevo profesional
    reschedule-appointment   — POST reagendar + email (Resend)
  auth/callback              — Intercambia code → sesión
  download, privacy, terms   — Páginas públicas

components/
  clinic/   Sidebar, Topbar, Ic, MiniSpark, BigSpark, InviteModal, ComingSoon,
            NewAppointmentModal, AppointmentBlock, AppointmentDetailModal,
            CancelAppointmentModal, AddToCalendar, PatientFilterBar,
            ConsultationNotesCard, PatientReportPDF,
            ui/Modal (ModalShell/Close/Btn), ui/Chip (chipStyle)
  ui/       PulseLine, Fk, Btn, Card, Segments, Toast

lib/
  clinic/calendar-utils.ts   — WeekSchedule/DaySchedule types, generateSlots,
                                scheduleHourRange, fmtShortDate/DateTime/LongDate,
                                MONTHS_*, DAYS_*, TIME_OPTIONS
  clinic/queries.ts          — Todos los loaders/mutaciones Supabase
  clinic/appointment-meta.ts — APPOINTMENT_STATUS_LABEL/COLOR, RescheduleReason
  clinic/mock-data.ts        — Referencia visual (no importado en prod)
  api-auth.ts                — Bearer JWT verify para API móvil
  constants.ts               — Equivalentes SMAE, rutinas
  hooks.ts                   — useSupabase, useUser
  supabase.ts                — Cliente browser/server
  utils.ts                   — formatDateISO, slugify, getToday, etc.
```

---

## Modelo de datos clave

```
practitioners:
  display_name, license_number, specialty, clinic_name, address
  schedule JSONB                — WeekSchedule por día + breaks (default si NULL)
  default_duration INTEGER       — 15|30|45|60 min, default 60
  inactivity_threshold_days INT  — alerta de inactividad
  min_adherence_pct INT          — umbral de "requiere atención"
  active BOOLEAN

appointments:
  practitioner_id, patient_id, patient_name, patient_email
  starts_at, duration_minutes, status, notes
  status ∈ scheduled|confirmed|completed|cancelled|no_show|rescheduling

consultation_notes:
  practitioner_id, patient_id, appointment_id (opt), note_date, body, tags[]
  tag ∈ ajuste_plan|recordatorio|reagenda|objetivo|observacion

library_templates:
  practitioner_id, kind (plan|mensaje|receta), title, body, plan_equivs JSONB
```

---

## Roles

- `user_profiles.role`: `user | practitioner | professional | admin`
- `/clinic/*` gatea por **`practitioners.active = true`** (diseño intencional, no por role)
- `/admin/*` gatea por `role = 'admin'`. Admin actual: `rafael.blangah@gmail.com`

---

## Migraciones

Aplicadas: **001–036** + `schedule_overrides.sql`

Recientes (Fase 3):
- `033_practitioners_alert_thresholds.sql` — umbrales en BD
- `034_consultation_notes.sql` — notas + RLS por practitioner
- `035_library_templates.sql` — biblioteca + RLS
- `036_patient_for_practitioner_rpc.sql` — RPC que devuelve email+nombre de un paciente

---

## Notas de implementación

**Agenda:** grilla 8 col (hora + 7 días), zoom 80/120/160px persistido en `localStorage`. Hora inicio/fin derivada del `practitioner.schedule` (override manual disponible).

**Adherencia:** en el detalle del paciente, ventana = desde última cita completada (≤90d) o 30d rolling. KPIs globales usan ventana fija de 30d.

**Reportes:** 5 queries paralelas (RPC + appointments + 4 bulk activity) independientes del tamaño de la práctica. Errores ya no se silencian.

**PDF:** `@react-pdf/renderer` con `dynamic import` para evitar SSR bloat. Incluye métricas, plan vigente y top 10 notas (manuales + de citas).

**Modales:** `components/clinic/ui/Modal.tsx` expone `ModalShell/Close/Btn` con 5 variants (`secondary | signal | danger-soft | danger-solid | warning`).

---

## Issues conocidos (no rompen build)

1. Onboarding no actualiza `user_profiles.role` a `'practitioner'` — funcional pero inconsistente
2. Copy engañoso en `/admin/invite` — dice "establece contraseña"; Supabase usa magic link
3. N+1 en `loadAllProfessionals` — aceptable para MVP
4. ESC handling en `AppointmentDetailModal` — la sub-sección de reagendar cierra con ESC pero la X cierra el modal entero (inconsistente; revisar si se ve raro)

---

## Pendiente · Fase 4

- **Auto-rellenado de nombre** en plantillas tipo mensaje (`{paciente}` → nombre real)
- **Aplicar plantilla de plan** directo al plan vigente desde Biblioteca (1 click)
- **Export CSV/PDF mensual** desde Reportes
- **savePlanDraft atómico** (RPC server-side en lugar de 2 statements)
- **RPC `get_practice_kpis`** — el rewrite JS ya es eficiente; SQL solo si crece la práctica >100 pacientes

---

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # invite-professional, reschedule-appointment, seeds
NEXT_PUBLIC_SITE_URL           # http://localhost:3000 en dev
RESEND_API_KEY                 # opcional; sin esto los emails se omiten silenciosamente
```

---

## Arrancar localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

Para probar como **admin**: `rafael.blangah@gmail.com` ya tiene `role = 'admin'`.

Para crear un nutriólogo de prueba en una cuenta nueva:
```sql
INSERT INTO practitioners (user_id, display_name, license_number, specialty, active)
SELECT id, 'Nombre', '12345', 'Nutrición clínica', true
FROM auth.users WHERE email = '<TU_EMAIL>'
ON CONFLICT (user_id) DO NOTHING;
```

Seeds de demo (opcional): `node scripts/seed-demo-clinic.js` + `node scripts/seed-demo-appointments.js`

---

## Notas de diseño v5 "Paper & Pulse"

- Tokens CSS en `app/globals.css`: `--ink`, `--signal` (#ff5a1f), `--leaf`, `--berry`, `--honey`, `--sky`, `--paper`, `--cream`
- Fuentes: `--f-serif` Fraunces (títulos italic 300), `--f-sans` Geist, `--f-mono` JetBrains Mono
- Clases utilitarias: `.fk-eyebrow` (mono 10px uppercase), `.fk-serif`, `.fk-mono`
- `PulseLine` es la firma visual — loading states
- Patrón de pantallas: Client Component + `useEffect` para datos + estados loading/error/empty
