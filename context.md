# Fitkis — Context

## Estado general

- Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel
- **Web = portal clínico exclusivo** (rama `master`). App móvil del paciente vive en repo separado `fitkis-mobile`
- Fase 3 ✅ completada (12 may 2026). Próximamente Fase 4 — ver pendientes abajo
- **Flow practitioner-patient end-to-end (14 may 2026)**: nutrióloga invita desde web → mobile ve bandeja en dashboard → acepta/rechaza → "Mi nutrióloga" en Ajustes → onboarding alterno + push. Detalles abajo
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
    invite-patient           — POST invitar paciente (existente o nuevo via inviteUserByEmail)
                                + envía push si !wasNew (fire-and-forget)
    invite-professional      — POST magic link al nuevo profesional
    invitations              — GET pending del paciente + active flag (mobile bandeja)
    invitations/[id]/respond — POST accept|decline (transición pending→active|inactive)
    practitioner/unlink      — POST paciente se desvincula (active→inactive)
    push-tokens              — POST mobile registra ExponentPushToken
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
  clinic/calendar-utils.ts   — WeekSchedule/DaySchedule/OccupiedSlot types,
                                generateSlots, isSlotOccupied, intervalsOverlap,
                                scheduleHourRange, fmtShortDate/DateTime/LongDate,
                                MONTHS_*, DAYS_*, TIME_OPTIONS
  clinic/queries.ts          — Todos los loaders/mutaciones Supabase
  clinic/appointment-meta.ts — APPOINTMENT_STATUS_LABEL/COLOR, RescheduleReason
  clinic/mock-data.ts        — Referencia visual (no importado en prod)
  api-auth.ts                — Bearer JWT verify para API móvil
  push.ts                    — sendPushToUser via Expo Push API + cleanup tokens
                                muertos (DeviceNotRegistered)
  constants.ts               — Equivalentes SMAE, rutinas
  hooks.ts                   — useSupabase, useUser
  supabase.ts                — Cliente browser/server
  utils.ts                   — formatDateISO, slugify, getToday, etc.
```

---

## Modelo de datos clave

### Tablas del portal clínico (nutriólogo)

```
practitioners:
  user_id (→ auth.users), display_name, license_number, specialty
  clinic_name, address
  schedule JSONB               — WeekSchedule por día + breaks (default si NULL)
  default_duration INT         — 15|30|45|60 min, default 60
  inactivity_threshold_days INT — alerta de inactividad (default 7)
  min_adherence_pct INT        — umbral "requiere atención" (default 60)
  active BOOLEAN

practitioner_patients:
  practitioner_id (→ practitioners), patient_id (→ auth.users)
  status ∈ pending|active|inactive
  invited_at, accepted_at (nullable), created_at

appointments:
  practitioner_id, patient_id, patient_name, patient_email
  starts_at (timestamptz), duration_minutes, status, notes
  status ∈ scheduled|cancelled|no_show|rescheduling
  "completada" = scheduled + ends_at < now (se infiere, no hay estado explícito)

consultation_notes:
  practitioner_id, patient_id, appointment_id (opt)
  note_date, body, tags[]
  tag ∈ ajuste_plan|recordatorio|reagenda|objetivo|observacion

library_templates:
  practitioner_id, kind (plan|mensaje|receta), title, body, plan_equivs JSONB
```

### Tablas del paciente (compartidas con fitkis-mobile)

```
user_profiles:
  user_id, role (user|practitioner|professional|admin)
  display_name, height_cm, goal_weight_kg

weight_logs:
  user_id, date (DATE), weight_kg
  muscle_mass_kg, body_fat_mass_kg, body_fat_percentage (nullable), notes
  — Nutriólogo puede INSERT/UPDATE/DELETE en pacientes activos

food_logs:
  user_id, date (DATE)
  meal ∈ desayuno|snack1|comida|snack2|cena|snack3
  group_type ∈ verdura|fruta|carb|proteina|grasa|leguminosa
  quantity, food_name

diet_configs:
  user_id, prescribed_by (→ practitioners, nullable)
  version, active BOOLEAN
  active_meals JSONB — {"desayuno": true, ...}
  meal_budgets JSONB — porciones por comida (nullable), notes

gym_sessions:
  user_id, date (DATE)
  routine_type ∈ upper_a|upper_b|lower_a|lower_b
  cardio_minutes, cardio_speed, notes

session_sets:
  session_id (→ gym_sessions)
  exercise_id, set_number, lbs, reps
  feeling ∈ muy_pesado|dificil|perfecto|ligero|quiero_mas

habits:
  user_id, name
  type ∈ daily_check|quantity|weekly_frequency
  target_value, unit, active BOOLEAN

habit_logs:
  habit_id (→ habits), user_id, date (DATE)
  value (nullable), completed BOOLEAN
```

### Tabla de push tokens

```
expo_push_tokens:
  user_id (→ auth.users CASCADE), token, platform ∈ ios|android
  last_used_at, created_at
  UNIQUE (user_id, token)
  — RLS: user CRUD propios. Service role lee cross-user para sendPushToUser
```

### Función helper de RLS

```
is_practitioner_of(patient_uuid) → BOOLEAN
— Nutriólogo activo puede SELECT weight_logs, food_logs, habit_logs,
  habits, gym_sessions, session_sets, diet_configs, user_profiles del paciente

is_practitioner_of_pending_or_active(patient_uuid) → BOOLEAN  (mig 014)
— Permite a la nutrióloga INSERT/UPDATE diet_configs incluso en pending
  (preconfigurar el plan antes de que el paciente acepte)
```

---

## Roles

- `user_profiles.role`: `user | practitioner | professional | admin`
- `/clinic/*` gatea por **`practitioners.active = true`** (diseño intencional, no por role)
- `/admin/*` gatea por `role = 'admin'`. Admin actual: `rafael.blangah@gmail.com`

---

## Migraciones

Aplicadas: **001–041** + `schedule_overrides.sql`

Recientes (Fase 3):
- `033_practitioners_alert_thresholds.sql` — umbrales en BD
- `034_consultation_notes.sql` — notas + RLS por practitioner
- `035_library_templates.sql` — biblioteca + RLS
- `036_patient_for_practitioner_rpc.sql` — RPC que devuelve email+nombre de un paciente
- `037_appointment_status_simplify.sql`, `038_calendar_integration.sql`, `039_practitioner_weight_rls.sql`
- `040_expo_push_tokens.sql` (14 may 2026) — tabla `expo_push_tokens` para push remoto desde server
- `041_calendar_multiple_accounts.sql` (18 may 2026) — soporte para múltiples cuentas Google
  por nutrióloga: quita UNIQUE (practitioner_id, provider), agrega `google_email`,
  `display_label`, `is_write_target` (índice parcial único), `read_enabled`, `degraded_at`.
  Vincula `appointments.google_event_id` + `google_calendar_connection_id` para escritura de
  eventos. Conexiones existentes quedan marcadas como write target automáticamente.
  Script de backfill: `scripts/backfill-calendar-google-email.js` (correr una vez para
  poblar `google_email` vía userinfo de Google).

---

## Notas de implementación

**Flow practitioner-patient (14 may 2026):**
- **Invitar paciente existente** (`/api/invite-patient` con email que ya tiene cuenta): solo inserta `practitioner_patients` con `status='pending'`, devuelve `wasNew: false`. Después del insert, fire-and-forget `sendPushToUser(patientId, ...)` notifica al paciente.
- **Invitar paciente nuevo**: `admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL/download })` crea cuenta + manda magic link. Después inserta `practitioner_patients` con el nuevo `user_id`. El push NO aplica (todavía no hay token registrado); ve la card en dashboard cuando abre la app por primera vez via magic link.
- **Aceptar/rechazar** (`/api/invitations/[id]/respond`): mobile cambia status. Accept rechaza con 409 si ya hay otra activa (regla 1-activa por paciente).
- **Desvincular** (`/api/practitioner/unlink`): paciente cambia su relación activa a inactive. No borra fila (la nutrióloga sigue viendo "inactivo").
- **Onboarding alterno mobile**: si paciente nuevo llega via magic link con `practitioner_patients.status='pending'`, AuthGate rutea a `/onboarding/invitation-welcome` (gateado por SecureStore `invitation_welcome_seen_<userId>`). Si la nutri preconfiguró `diet_configs` (mig 014 lo permite), `/onboarding/diet` muestra banner y skipea el form.
- **Push**: `lib/push.ts` → POST batch a `https://exp.host/--/api/v2/push/send`. Limpia tokens con `DeviceNotRegistered` automáticamente.

**Email de invitación a paciente nuevo — bypass de Supabase Auth (14 may 2026):**
- `/api/invite-patient` para usuarios nuevos ya **NO** usa `inviteUserByEmail` directo (deliverability mala del SMTP default de Supabase). En su lugar:
  1. `admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: SITE_URL/download } })` → crea el user en `auth.users` y devuelve el `action_link` SIN disparar email.
  2. Sobreescribe `redirect_to=...` del action_link para garantizar `SITE_URL/download` (Supabase puede embeber su Site URL configurado ignorando el parámetro).
  3. Envía email de marca via Resend (`from: Fitkis <info@fitkis.com>`) con template HTML editorial inline (Georgia/Arial, paleta paper/ink/signal).
  4. Inserta `practitioner_patients` después.
- **Fallback**: si `RESEND_API_KEY` no está en env, cae al `inviteUserByEmail` estándar como red de seguridad.
- Dominio `fitkis.com` debe estar verificado en Resend (DNS). `fitkis.app` también lo está (lo usa `reschedule-appointment`).
- Alternativa que NO se tomó: configurar SMTP Resend en Supabase Auth Settings. Funcionaría, pero el template quedaría con el default de Supabase. El bypass via generateLink + Resend directo da control total del email.

**Google Calendar — integración completa (14 may 2026):**
- `NewAppointmentModal`: al seleccionar fecha hace fetch a `/api/available-slots` y filtra slots que solapan con bloques ocupados (citas existentes + Calendar). Usa `AbortController` para cancelar fetches en vuelo si el usuario cambia de fecha.
- `/api/book-appointment`: valida contra Google Calendar server-side con `getBusyBlocks` antes de insertar. `getBusyBlocks` y la query de conflictos en BD corren en paralelo con `Promise.all`.
- `app/agendar/[id]` (booking público): ya integraba Calendar correctamente desde antes.
- Lógica de solapamiento centralizada en `calendar-utils.ts` (`intervalsOverlap`, `isSlotOccupied`, `OccupiedSlot`) — eliminada de tres sitios duplicados.

**Agenda:** grilla 8 col (hora + 7 días), zoom 80/120/160px persistido en `localStorage`. Hora inicio/fin derivada del `practitioner.schedule` (override manual disponible).

**Adherencia:** en el detalle del paciente, ventana = desde última cita completada (≤90d) o 30d rolling. KPIs globales usan ventana fija de 30d.

**Reportes:** 5 queries paralelas (RPC + appointments + 4 bulk activity) independientes del tamaño de la práctica. Errores ya no se silencian.

**PDF:** `@react-pdf/renderer` con `dynamic import` para evitar SSR bloat. Incluye métricas, plan vigente y top 10 notas (manuales + de citas).

**Modales:** `components/clinic/ui/Modal.tsx` expone `ModalShell/Close/Btn` con 5 variants (`secondary | signal | danger-soft | danger-solid | warning`).

**Zona horaria CDMX (forzada):** todo cálculo y formato de fecha/hora del portal se pinea a `America/Mexico_City` (UTC-6) vía helpers centralizados en `lib/utils.ts`:
- `APP_TZ`, `getTodayInTimezone()`, `formatDateISOInTimezone()`, `shiftDateISO()`
- `getNowPartsInTimezone()` (hour/minute/dayOfWeek), `getHourMinuteInTimezone()`, `getDayOfWeekInTimezone()`, `fmtTimeCDMX()`
Crítico porque Vercel corre en UTC: `new Date().getHours()` o `.toISOString().split('T')[0]` server-side daban "mañana" después de las 18:00 CDMX. Filtros Supabase contra `timestamptz` usan offset explícito `-06:00`.

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

## Multi-cuenta Google Calendar (18 may 2026)

Fases 1–6 completas en código. Una nutrióloga puede conectar N cuentas Google
(ej. personal + trabajo). Cada conexión tiene:
- `read_enabled` — si bloquea slots con sus horarios ocupados (lectura agregada
  en paralelo desde todas las cuentas marcadas, ver `lib/clinic/google-calendar.ts`).
- `is_write_target` — cuál cuenta recibe el evento al agendar (único por nutrióloga
  vía índice parcial). La primera conexión queda como write target automáticamente.
- `degraded_at` — marca conexiones con token revocado / scope insuficiente.

Endpoints:
- `GET /api/auth/google-calendar/status` — lista de conexiones.
- `GET /api/auth/google-calendar/connect` — inicia OAuth con `prompt=select_account consent`.
- `PATCH /api/auth/google-calendar/connections/[id]` — label, read_enabled, is_write_target.
- `DELETE /api/auth/google-calendar/connections/[id]` — revoca una sola cuenta.
- `DELETE /api/auth/google-calendar/disconnect` — legacy, revoca TODAS.

UI nueva en `ajustes` → tab agenda. Escritura va por `lib/clinic/google-calendar-write.ts`
(create/update/deleteCalendarEvent), gated por `CALENDAR_WRITE_ENABLED=true`.
`book-appointment` y `reschedule-appointment` ya hookeados (fire-and-forget,
nunca bloquean el flujo principal).

### Pendiente operativo (no-código)

- Volver a someter el OAuth Consent Screen a Google con el scope nuevo
  `calendar.events` (proceso 2–6 semanas).
- Mantener `CALENDAR_WRITE_ENABLED=false` en producción hasta aprobación.
- Correr `node scripts/backfill-calendar-google-email.js` una vez para poblar
  `google_email` en conexiones legacy (si las hay).

---

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # invite-professional, reschedule-appointment, seeds
NEXT_PUBLIC_SITE_URL           # http://localhost:3000 en dev
RESEND_API_KEY                 # opcional; sin esto los emails se omiten silenciosamente
GOOGLE_CALENDAR_CLIENT_ID      # OAuth client (proyecto Cloud)
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI   # https://fitkis.com/api/auth/google-calendar/callback
CALENDAR_WRITE_ENABLED         # 'true' para activar creación de eventos en Google
                               # (requiere re-verificación de scope calendar.events)
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
