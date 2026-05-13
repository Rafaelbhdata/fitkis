# Fitkis — Context

## Estado general

- Setup ✅ · UI v5.0 "Paper & Pulse" ✅
- **Web = portal clínico exclusivo** 🔄 EN PROGRESO — rama `clinic/v5-paper-pulse`
- App móvil en `fitkis-mobile` (repo separado), comparte BD Supabase y endpoints `/api/*`
- **Fase 3 ✅ completada (12 may 2026)** — ver sección abajo

---

## Estructura activa del repo

```
app/
  (auth)/login, register       — Auth
  (clinic)/                    — Portal clínico (gateado por practitioners.active)
    clinic/page.tsx            — Lista de pacientes + filtros + InviteModal
    clinic/pacientes/[id]/     — Detalle del paciente (tabs; Antropometría/Alim/Gym/Msg son stub)
    clinic/pacientes/[id]/plan — Editor SMAE ✅
    clinic/agenda/             — Agenda semanal ✅ (grilla horaria 8 col, zoom, AppointmentBlock)
    clinic/ajustes/            — Ajustes ✅ (perfil, consultorio, agenda semanal, alertas)
    clinic/reportes/           — KPIs reales (pacientes, adherencia, citas, alerta)
    clinic/biblioteca/         — CRUD de plantillas (plan/mensaje/receta)
  agendar/[id]/                — Página pública de booking mobile-first (Calendly-style)
  onboarding/                  — Formulario para nutrióloga invitada
  admin/, admin/invite/        — Panel admin (gateado por user_profiles.role='admin')
  api/
    admin/professional         — PATCH desactivar/reactivar nutriólogo
    available-slots/[id]/[d]   — GET { occupied } — slots ocupados del día
    book-appointment           — POST crear cita; usa default_duration del practitioner (cliente no elige)
    invite-professional        — POST invitar nutrióloga vía magic link
    reschedule-appointment     — POST reagendar cita (no_show | custom + email Resend)
  auth/callback/               — Intercambia code → sesión, redirige a /onboarding o /clinic
  download/, privacy/, terms/  — Páginas públicas
  not-found.tsx                — Página 404

components/
  clinic/  Sidebar, Topbar, Ic, MiniSpark, InviteModal, ComingSoon,
           NewAppointmentModal, AppointmentBlock, AppointmentDetailModal,
           CancelAppointmentModal, RescheduleModal, AddToCalendar,
           PatientFilterBar, ConsultationNotesCard, PatientReportPDF
  ui/      PulseLine, Fk, Btn, Card, Segments, Toast

lib/
  clinic/calendar-utils.ts    — Tipos (WeekSchedule, DaySchedule, Break, DayKey),
                                 generateSlots (respeta horario+breaks), TIME_OPTIONS,
                                 DAY_ORDER/DAY_LABELS, dateToDayKey, timeToMin/minToTime
  clinic/queries.ts            — Loaders/mutaciones Supabase + tipos; incluye updatePractitioner
  clinic/mock-data.ts          — Referencia visual (no importado en producción)
  api-auth.ts                  — Verifica bearer JWT para endpoints de la app móvil
  constants.ts                 — Equivalentes SMAE, rutinas
  hooks.ts                     — useSupabase, useUser
  supabase.ts                  — Cliente Supabase browser/server
  utils.ts                     — Helpers generales (formatDateISO, getToday)
```

---

## Modelo de datos — practitioners (campos relevantes)

```
practitioners:
  display_name, license_number, specialty, clinic_name, address
  schedule        JSONB   — WeekSchedule (horario por día + breaks); NULL → DEFAULT_WEEK_SCHEDULE
  default_duration INTEGER — Duración fija de citas (15/30/45/60 min); default 60
  active          BOOLEAN
```

---

## Roles y administración

- `user_profiles.role`: `user | practitioner | professional | admin`
- Portal `/clinic` gatea por **`practitioners.active = true`** (no por `role`) — diseño intencional
- `/admin` y `/admin/invite` gatean por `role = 'admin'`
- Admin actual: `rafael.blangah@gmail.com`

---

## Módulo de agenda ✅

- Grilla CSS 8 columnas (hora + 7 días), filas de `ROW_H` px con zoom (80/120/160 px)
- `AppointmentBlock` posicionado absolutamente — `top` y `height` calculados desde hora local
- `NewAppointmentModal`: toggle paciente vinculado (dropdown con search) / externo; calendar + slots
- `RescheduleModal`: razón `no_show | custom`; llama `POST /api/reschedule-appointment` → email Resend
- Zoom y hora inicio/fin de la grilla visual persistidos en `localStorage` (agenda_zoom, agenda_start_hour, agenda_end_hour)
- Indicador de hora actual (línea roja) en la columna de hoy

## Módulo de ajustes ✅ (12 mayo 2026)

- **Perfil**: display_name, cédula, especialidad — guardado en BD
- **Consultorio**: clinic_name, address, link público `/agendar/[id]` con botón Copiar
- **Agenda**: horario semanal por día (toggle on/off, hora inicio/fin, breaks) + duración fija de citas
  - Guardado en `practitioners.schedule` (JSONB) y `practitioners.default_duration`
  - El paciente **no** elige duración desde el link de reservas
- **Alertas**: umbrales de inactividad y adherencia mínima — localStorage (pendiente migrar a BD)

## Booking público ✅

- Página `/agendar/[id]`: lee `default_duration` y `schedule` del practitioner al inicio
- Días sin atención aparecen deshabilitados en el calendario
- Slots generados respetando horario + breaks del día
- API valida server-side que el slot caiga dentro del horario antes de insertar

---

## Migraciones (acumulado)

**Aplicadas:** 001–035 + `schedule_overrides.sql` — todas aplicadas.

Migraciones Fase 3:
- `033_practitioners_alert_thresholds.sql` — umbrales por practitioner
- `034_consultation_notes.sql` — notas de consulta del nutriólogo
- `035_library_templates.sql` — biblioteca (planes, mensajes, recetas)

---

## Issues conocidos (no rompen build)

1. Onboarding no actualiza `user_profiles.role` a `'practitioner'` — funcional pero inconsistente
2. Copy engañoso en `/admin/invite` — dice "establece contraseña"; Supabase usa magic link
3. N+1 en `loadAllProfessionals` — aceptable para MVP
4. Round-trip extra para email del paciente en `loadPatientDetail` — crear RPC dedicada

---

## Fase 3 ✅ (completada 12 may 2026)

- ✅ **Adherencia desde última visita** — `loadPatientDetail` calcula ventana desde la última cita completada (≤90d), fallback a 30d. UI cambia el label según contexto
- ✅ **Notas de consulta** — `consultation_notes` con CRUD inline en la tab Resumen, tags (ajuste_plan, recordatorio, reagenda, objetivo, observación)
- ✅ **Tabs de detalle wireadas** — Antropometría / Alimentación / Gym ya leen de BD; Plan vigente ya editable; Conversación reorienta a Biblioteca + Notas (mensajería vive en móvil)
- ✅ **Alerta de estancamiento** — `isStagnant`: 3+ mediciones en ≥21d con delta < 1kg
- ✅ **Reportes globales** — KPIs (pacientes, adherencia media, citas próximas, alertas), gráfica de tendencia del grupo, lista priorizada
- ✅ **Biblioteca** — CRUD de plantillas tipo plan/mensaje/receta, planes con equivalentes SMAE
- ✅ **Reporte PDF** — `@react-pdf/renderer` con dynamic import, incluye métricas + plan + últimas 8 notas
- ✅ **Umbrales en BD** — `practitioners.inactivity_threshold_days` y `min_adherence_pct`
- ✅ **Sync agenda↔schedule** — grilla deriva inicio/fin del `practitioner.schedule`; override manual sigue disponible

---

## Pendiente · Fase 4

- **Auto-rellenado de nombre** en plantillas tipo mensaje (`{paciente}` → nombre real)
- **Aplicar plantilla de plan** directo al plan vigente del paciente (1 click desde Biblioteca)
- **Export CSV/PDF mensual** desde Reportes
- **RPC `get_patient_for_practitioner`** para evitar round-trip extra en `loadPatientDetail`
- **savePlanDraft atómico** (RPC server-side en lugar de 2 statements desde cliente)

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # para invite-professional y reschedule-appointment
NEXT_PUBLIC_SITE_URL=          # URL base del sitio (dev: http://localhost:3000)
RESEND_API_KEY=                # emails de reagenda (opcional; se omite si no está)
```

---

## Cómo arrancar localmente

```bash
git checkout clinic/v5-paper-pulse
npm install   # solo si cambió package.json
npm run dev   # http://localhost:3000
```

Para probar como **admin**: `rafael.blangah@gmail.com` ya tiene `role = 'admin'`.

Para probar el **portal clínico** con una cuenta nueva:
```sql
INSERT INTO practitioners (user_id, display_name, license_number, specialty, active)
SELECT id, 'Nombre', '12345', 'Nutrición clínica', true
FROM auth.users WHERE email = '<TU_EMAIL>'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Notas de diseño

- Tokens CSS en `app/globals.css`: `--ink`, `--signal` (#ff5a1f), `--leaf`, `--berry`, `--honey`, `--sky`, `--paper`, `--cream`
- Fuentes: `--f-serif` Fraunces (títulos italic 300), `--f-sans` Geist, `--f-mono` JetBrains Mono
- Clases utilitarias: `.fk-eyebrow` (mono 10px uppercase tracking ink-4), `.fk-serif`, `.fk-mono`
- `PulseLine` es la firma visual — usar en loading states y elementos destacados
- Fondo sidebar: `var(--paper)` · Fondo página principal: `#fff`
- Patrón de pantallas: Client Component + `useEffect` para datos + loading/error/empty states
