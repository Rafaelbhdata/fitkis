# Fitkis — Context

## Estado general

- Setup ✅ · UI v5.0 "Paper & Pulse" ✅
- **Web = portal clínico exclusivo** 🔄 EN PROGRESO — rama `clinic/v5-paper-pulse`
- App móvil en `fitkis-mobile` (repo separado), comparte BD Supabase y endpoints `/api/*`

---

## Pivote 11 mayo 2026

Web pasa a ser **únicamente el portal de nutriólogas**. Rutas `app/(app)/*` congeladas en `legacy/` (excluidas del build vía `tsconfig.json`). El paciente usa `fitkis-mobile`.

---

## Estructura activa del repo

```
app/
  (auth)/login, register       — Auth
  (clinic)/                    — Portal clínico (gateado por practitioners.active)
    clinic/page.tsx            — Lista de pacientes
    clinic/pacientes/[id]/     — Detalle del paciente
    clinic/pacientes/[id]/plan — Editor SMAE
    clinic/agenda/             — Agenda semanal ✅ (grilla horaria, AppointmentBlock, zoom, settings)
    clinic/reportes/           — Stub "Próximamente"
    clinic/biblioteca/         — Stub "Próximamente"
    clinic/ajustes/            — Stub "Próximamente"
  agendar/[id]/                — Página pública de booking (mobile-first, Calendly-style)
  onboarding/                  — Formulario para nutrióloga invitada
  admin/, admin/invite/        — Panel admin (gateado por user_profiles.role='admin')
  api/
    admin/professional         — PATCH desactivar/reactivar nutriólogo
    available-slots/[id]/[d]   — GET slots disponibles para booking
    book-appointment           — POST crear cita (soporta reschedule_id)
    invite-professional        — POST invitar nutrióloga vía magic link
    reschedule-appointment     — POST reagendar cita (no_show | custom + email Resend)
  auth/callback/               — Intercambia code → sesión, redirige a /onboarding o /clinic
  download/, privacy/, terms/  — Páginas públicas
  not-found.tsx                — Página 404 (evita bug ENOENT en build traces)

components/
  clinic/  Sidebar, Topbar, Ic, MiniSpark, InviteModal, ComingSoon,
           NewAppointmentModal, AppointmentBlock, RescheduleModal, AddToCalendar
  ui/      PulseLine, Fk, Btn, Chip, Card, Segments, Sparkline,
           BigNum, StatCard, LogoMark, Toast

lib/
  clinic/calendar-utils.ts    — Constantes y helpers de fecha/slot compartidos
  clinic/queries.ts            — Todos los loaders/mutaciones Supabase + tipos
  clinic/mock-data.ts          — Referencia visual (no se importa en producción)
  api-auth.ts                  — Verifica bearer JWT para endpoints consumidos por la app móvil
  constants.ts                 — Equivalentes SMAE, rutinas (importado por lib/utils.ts)
  hooks.ts                     — useSupabase, useUser
  supabase.ts                  — Cliente Supabase browser/server
  utils.ts                     — Helpers generales (formatDateISO, getToday — timezone-safe)

hooks/
  (vacío — los hooks de la app móvil viven en legacy/ o fitkis-mobile)
```

---

## Roles y administración

- `user_profiles.role`: `user | practitioner | professional | admin`
- Portal `/clinic` gatea por **`practitioners.active = true`** (no por `role`) — diseño intencional
- `/admin` y `/admin/invite` gatean por `role = 'admin'`
- Admin actual: `rafael.blangah@gmail.com` (asignado 11 mayo 2026)

---

## Módulo de agenda ✅ (12 mayo 2026)

- Grilla CSS 8 columnas (hora + 7 días), filas de `ROW_H` px con zoom (80/120/160 px)
- `AppointmentBlock` posicionado absolutamente — `top` y `height` calculados desde hora local
- `NewAppointmentModal`: toggle paciente vinculado (dropdown con search) / externo; calendar + slots
- `RescheduleModal`: razón `no_show | custom`; llama `POST /api/reschedule-appointment` → email Resend
- Settings de horario (hora inicio/fin) persistidos en `localStorage`
- Indicador de hora actual (línea roja) en la columna de hoy
- Migraciones: `028_appointments.sql`, `029_appointments_rescheduling.sql` — **aplicar en Supabase SQL editor**

---

## Migraciones aplicadas (acumulado)

001–024 + `schedule_overrides.sql` + 025 (admin role) + 026 (user_profiles.display_name) +
027 (signup trigger restore) — **aplicadas**.

028 (appointments) + 029 (rescheduling status) — **pendientes de aplicar manualmente** en Supabase SQL editor.

---

## Issues conocidos (no rompen build)

1. `loadPractitionerByUser` no filtra por `active` — agregar `.eq('active', true)` en `queries.ts:53`
2. Onboarding no actualiza `user_profiles.role` a `'practitioner'` — funcional pero inconsistente
3. Copy engañoso en `/admin/invite` — dice "establece contraseña"; Supabase usa magic link, no password
4. N+1 en `loadAllProfessionals` — aceptable para MVP, refactorizar con `GROUP BY` cuando sea relevante
5. Round-trip extra para email del paciente en `loadPatientDetail` — crear RPC dedicada

---

## Pendiente · Fase 3

- **Adherencia real** desde última visita (`weight_logs ∪ food_logs ∪ gym_sessions` desde appointment más reciente)
- **Notas de consulta** — migración `030_consultation_notes.sql` + card en detalle del paciente
- **Tabs de detalle** aún stub: Antropometría, Alimentación, Entrenamiento, Conversación
- **Reportes globales** — `/clinic/reportes`
- **Biblioteca** — `/clinic/biblioteca` (plantillas SMAE, mensajes, recetario)
- **Ajustes** — `/clinic/ajustes` (perfil del practitioner, umbrales de alertas)
- **Alerta de estancamiento de peso** — `computeAlert` solo marca inactividad; agregar lógica vs goal
- **Reporte PDF** — Btn ya pintado en header; stack: `@react-pdf/renderer`
- **`RESEND_API_KEY`** en `.env.local` para que los emails de reagenda funcionen

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # para invite-professional y reschedule-appointment
NEXT_PUBLIC_SITE_URL=          # URL base del sitio (dev: http://localhost:3000)
RESEND_API_KEY=                # emails de reagenda (opcional; se omite si no está)
ANTHROPIC_API_KEY=             # si se reactivan rutas AI
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
- Patrón de pantallas: Client Component + `useEffect` para datos + loading/error/empty states con `PulseLine`
