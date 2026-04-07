# Fitkis — Context

## Estado general
- Setup del proyecto ✅ COMPLETADO
- Sistema de diseño UI ✅ COMPLETADO (Rediseño v3.0 - "Whoop-Inspired")
- Base de datos Supabase ✅ CONFIGURADA (tablas + RLS)
- Auth ✅ COMPLETADO (login real con Supabase Auth)
- Módulo Weight ✅ CONECTADO a Supabase + Progress Photos
- Módulo Habits ✅ CONECTADO a Supabase (30-day heatmap)
- Módulo Food ✅ CONECTADO a Supabase (con selector de cantidad)
- Dashboard ✅ CONECTADO a Supabase (con logout)
- Módulo Gym ✅ CONECTADO a Supabase
- Módulo Journal ✅ NUEVO - Reflexiones diarias con 200 preguntas
- Deploy ✅ GitHub + Vercel configurado

## Último agente
Agente: Journal Module & Progress Photos
Fecha: 6 de abril 2026
Qué hizo:

### Rebranding: FitLife → Fitkis (6 abril)
- Renombrado en todos los componentes (Sidebar, Header, SideMenu)
- Nuevo favicon con dumbbell (public/favicon.svg)
- PWA manifest.json
- Logo cambiado de letra "K" a icono Dumbbell de lucide-react

### Journal Module (6 abril) ✅
- **Página**: `app/(app)/journal/page.tsx`
- **Banco de preguntas**: `lib/journal-questions.ts` (200 preguntas únicas)
- **Navegación**: Agregado a Sidebar, Header, SideMenu
- **Funcionalidades**:
  - Texto libre para diario del día
  - 3 preguntas aleatorias por día (no se repiten)
  - 2 cambios de pregunta permitidos por día
  - Preguntas marcadas como "usadas" al guardar
  - No se pueden ver preguntas de días futuros
  - Navegación por fechas (solo hacia el pasado)
- **Bug fix**: Corregido loop infinito donde preguntas cambiaban cada segundo
  - Causa: useCallback con dependencias circulares
  - Solución: useRef para trackear fecha cargada

### Progress Photos (6 abril) ✅
- **Ubicación**: Integrado en `app/(app)/weight/page.tsx`
- **Funcionalidades**:
  - Subir foto frontal y lateral por fecha
  - Galería de fotos agrupadas por fecha
  - Modo comparación lado a lado entre fechas
  - URLs firmadas para privacidad (1 hora expiración)
- **Storage**: Bucket privado "progress-photos" en Supabase

### Migraciones SQL Nuevas
- `supabase/migrations/003_journal.sql`:
  - Tabla `journal_entries` (con JSONB para preguntas)
  - Tabla `journal_used_questions` (tracking de preguntas usadas)
  - RLS policies
- `supabase/migrations/004_progress_photos.sql`:
  - Tabla `progress_photos`
  - RLS policies
  - Instrucciones para bucket de storage

### Tipos TypeScript Actualizados
- `JournalQuestion`: index, question, answer
- `JournalEntry`: id, user_id, date, free_text, questions[], skips_used, timestamps
- `JournalUsedQuestion`: id, user_id, question_index, date_used, created_at
- `ProgressPhoto`: id, user_id, date, photo_type (front/side), photo_url, notes

---

## Agente Anterior
Agente: Schedule Overrides Feature
Fecha: 6 de abril 2026
Qué hizo:

### Schedule Overrides - Cambio Flexible de Rutinas (6 abril - sesión 8)

#### 1. Nueva Tabla en Supabase ✅
- **Tabla**: `schedule_overrides`
- **Campos**: id, user_id, date, routine_type, created_at
- **Constraint**: UNIQUE(user_id, date) para upsert
- **RLS**: Políticas para SELECT, INSERT, UPDATE, DELETE por usuario
- **Migración**: `supabase/migrations/schedule_overrides.sql`

#### 2. Funcionalidad en gym/page.tsx ✅
- **Cargar overrides**: `loadWeekOverrides()` - carga overrides de la semana visible
- **Guardar override**: `saveOverride()` - upsert con `onConflict: 'user_id,date'`
- **Eliminar override**: `removeOverride()` - restaura rutina original
- **getRoutineForDate()**: Primero busca override, luego usa schedule default

#### 3. UI de Cambio de Rutina ✅
- **Botón "Cambiar"**: En la tarjeta de rutina del día
- **Modal de selección**: Muestra todas las rutinas + opción de descanso
- **Indicador visual**: Punto ámbar en días modificados del calendario
- **Badge "Modificado"**: En la tarjeta cuando el día tiene override
- **Botón "Restaurar original"**: Para eliminar el override

#### 4. Restricciones del Calendario ✅
- **No navegar al pasado**: weekOffset no puede ser < 0
- **Días pasados deshabilitados**: Grises y no clickeables
- **Auto-reset**: Vuelve al día actual cuando regresa de semanas futuras

#### 5. Tipos TypeScript ✅
- **types/index.ts**: Agregado `ScheduleOverride` interface
- **Database type**: Agregado `schedule_overrides` table con Views, Functions, Enums vacíos

---

## Agente Anterior
Agente: Phase 4 - Cleanup, Seed Data y Tests
Fecha: 6 de abril 2026
Qué hizo:

### Phase 4 - Tareas Completadas (6 abril - sesión 7)

#### 1. Seed de Sesiones Históricas ✅
- **Ubicación**: `app/(app)/admin/seed/page.tsx` (NUEVA)
- **Funcionalidad**: Página admin para cargar datos históricos de CLAUDE.md
- **Sesiones**: 2 sesiones Upper A (23 marzo y 3 abril 2026)
- **Sets**: 17 sets totales con pesos, reps y feeling
- **Cardio**: Incluye datos de cardio (12 min @ 5.5 km/h)

#### 2. Extracción de Componentes Gym ✅
- **Componentes nuevos** en `components/gym/`:
  - `RestTimer.tsx` - Timer de descanso modal con controles
  - `ExerciseInstructions.tsx` - Panel de instrucciones expandible
  - `ProgressionBanner.tsx` - Banner de sugerencia +5 lbs
  - `SetRow.tsx` - Fila individual de serie con inputs
  - `index.ts` - Barrel export
- **Reducción**: gym/session de ~928 a ~763 líneas (~18% menos)

#### 3. Diseño Responsive Tablet/Desktop ✅
- **globals.css**: Utilidades `.desktop-grid-2/3/sidebar`
- **Sheet modal**: Centrado en desktop (no slide-up)
- **Food page**: Grid de 2 columnas en tablet+
- **Gym page**: Grid de stats responsive

#### 4. Tests Unitarios ✅
- **Setup**: Jest + React Testing Library configurados
- **Config**: `jest.config.js` + `jest.setup.js`
- **Tests creados** en `__tests__/`:
  - `components/gym/SetRow.test.tsx` (12 tests)
  - `components/gym/RestTimer.test.tsx` (12 tests)
  - `components/gym/ProgressionBanner.test.tsx` (8 tests)
  - `lib/utils.test.ts` (26 tests)
- **Total**: 58 tests pasando ✅

---

## Agente Anterior
Agente: Phase 3 Features - Visualización y Gráficas
Fecha: 6 de abril 2026
Qué hizo:

### Phase 3 Features Implementados (6 abril - sesión 6)

#### 1. Página de Progresión Gym ✅
- **Ubicación**: `app/(app)/gym/progress/page.tsx` (NUEVA)
- **Selector de ejercicio**: Modal para elegir ejercicio a analizar
- **Stats grid**: Peso actual, PR (récord personal), ganancia total
- **LineChart**: Gráfica de peso máximo por sesión con recharts
- **Historial**: Lista de las últimas 10 sesiones con diferencias (+/- lbs)
- **Link desde gym**: Botón "Progresión" con icono TrendingUp

#### 2. Página de Progreso de Hábitos ✅
- **Ubicación**: `app/(app)/habits/progress/page.tsx` (NUEVA)
- **Selector de hábito**: Modal para elegir hábito a analizar
- **Stats grid**: Racha actual, mejor racha, % completado en 90 días
- **AreaChart**: Tendencia semanal (últimas 12 semanas)
- **Calendario 30 días**: Grid con números de día y colores
- **BarChart comparativo**: Comparación de % completado entre hábitos
- **Ranking de rachas**: Lista ordenada por racha actual con posiciones
- **Link desde habits**: Botón "Progreso" con icono TrendingUp

---

## Agente Anterior
Agente: Phase 2 Features - Core Functionality
Fecha: 6 de abril 2026
Qué hizo:

### Phase 2 Features Implementados (6 abril - sesión 5)

#### 1. Timer de descanso entre series ✅
- **Ubicación**: `app/(app)/gym/session/[id]/page.tsx`
- **Auto-start**: Se inicia automáticamente al marcar una serie como completada
- **Presets**: 60s, 90s (default), 120s, 180s
- **UI**: Modal circular con progreso visual, countdown
- **Controles**: Play/Pause, Reset, Skip
- **Notificación**: Vibración (triple pulso) cuando termina el descanso
- **Botón manual**: "Iniciar descanso" debajo de las series
- **Lógica**: No se activa en la última serie completada del ejercicio

#### 2. Banner de progresión +5 lbs mejorado ✅
- **Ubicación**: `app/(app)/gym/session/[id]/page.tsx`
- **UI mejorada**: Iconos más grandes, texto más claro
- **Botón "Aplicar"**: Pre-llena el peso sugerido en TODAS las series del ejercicio
- **Botón "Ahora no"**: Descarta la sugerencia para esa sesión
- **Estado**: `dismissedSuggestions` Set para trackear sugerencias descartadas

#### 3. Sistema de favoritos de comidas ✅
- **Página de favoritos**: `app/(app)/food/favorites/page.tsx` - CRUD completo
  - Ver lista de favoritos con items
  - Crear favorito nuevo con nombre, comida y alimentos
  - Eliminar favoritos
  - Modal para agregar items con selección de grupo, búsqueda y cantidad
- **Integración en página principal**: `app/(app)/food/page.tsx`
  - Botones de quick-add para favoritos de cada comida
  - Aplica todos los items del favorito al log del día con un tap
  - Toast de confirmación al agregar

#### 4. CRUD completo de hábitos ✅
- **Ubicación**: `app/(app)/habits/page.tsx`
- **Crear hábito**:
  - Modal con nombre, tipo (Sí/No, Cantidad, Días/semana)
  - Campos dinámicos según tipo (meta diaria, unidad, días/semana)
- **Editar hábito**:
  - Botón de edición en cada hábito
  - Modal pre-llenado con datos existentes
- **Eliminar hábito**:
  - Botón de eliminar con confirmación
  - Soft-delete (active = false)
- **Iconos**: Edit3, Trash2 de lucide-react

---

### Quick Wins Implementados (6 abril - sesión 4)

#### 1. Botones "Reintentar" en errores
- Todas las páginas (Dashboard, Food, Weight, Habits) ahora muestran botón "Reintentar" junto con el error
- Permite al usuario reintentar la carga sin recargar la página

#### 2. Touch targets aumentados a 44px+
- Botones de navegación (prev/next semana/día) ahora son 40×40px
- Botones del calendario tienen min-h-[52px]
- Agregados aria-labels para accesibilidad

#### 3. Racha de días mejorada en Hábitos
- Ahora muestra "X días" en lugar de solo el número
- Borde agregado para mejor visibilidad
- Formato singular/plural correcto

#### 4. Sistema de Toast Notifications
- Nuevo componente `components/ui/Toast.tsx`
- Provider global en `components/Providers.tsx`
- Toasts de éxito en: agregar comida, completar hábito, registrar peso
- Auto-dismiss después de 3 segundos

#### 5. Indicador visual over-budget en Food
- Color rojo cuando se excede el presupuesto diario
- Badge "+X" mostrando el exceso
- Track de la barra de progreso se vuelve rojo

### Correcciones adicionales (6 abril - sesión 4)
- Semana empieza en Lunes en Dashboard (consistente con Gym)
- Navegación de fechas en Hábitos para editar días pasados
- Fix de botones fantasma en Dashboard (display: block en cards)

---

### Previous Agent: Gym Module Enhancement
Fecha: 6 de abril 2026

### New Features (6 abril - sesión 3)

#### 1. Weekly Calendar View (`/gym`)
- **Navigable Week Calendar**: Navigate between weeks with prev/next buttons
- **Day Selection**: Tap any day to see its scheduled routine
- **ROUTINE_SCHEDULE**: Hardcoded weekly schedule (Mon=Upper A, Tue=Lower A, Wed=Rest, Thu=Upper B, Fri=Lower B, Sat/Sun=Rest)
- **Rest Day UX**: Shows motivational message + "Ver rutinas de todos modos" to select any routine
- **Visual Indicators**: Blue dots on workout days, accent highlight on selected day

#### 2. Session Timer
- **Real-time Timer**: Starts automatically when session begins
- **Format**: MM:SS until 60 min, then HH:MM:SS (uses `formatDuration` utility)
- **Persistence**: Saves `duration_seconds` to `gym_sessions` table
- **History Display**: Shows duration in session history page

#### 3. Exercise Instructions Panel
- **Toggle Button**: "?" icon to expand/collapse instructions
- **Numbered Steps**: Ordered list of exercise instructions
- **Pro Tips**: Highlighted tip box with lightbulb icon
- **Weight Notes**: Explains what the weight value means (e.g., "Peso por mancuerna")

#### 4. Updated ROUTINES Structure
- **New Exercise Interface**: `id`, `name`, `equipment`, `sets`, `reps` (string like "8-10"), `lastWeight`, `weightUnit`, `weightNote`, `instructions[]`, `tip`, `substitutions[]`
- **New Routine Interface**: `name`, `subtitle`, `muscles[]`, `estimatedMinutes`, `exercises[]`
- **Complete Data**: All 4 routines (upper_a, lower_a, upper_b, lower_b) with full exercise details

### Previous Session (6 abril - sesión 2)

### Bug Fixes (6 abril - sesión 2)
- **Dashboard "Nutrición hoy" broken element**: Fixed by adding weekly_frequency habit support to Dashboard
- **Habits "Lectura" no interaction**: Added complete weekly_frequency type UI with checkbox + "X/Y días esta semana" counter
- **Dashboard "Iniciar" button confusing**: Changed to "→ Ir al gym" link pointing to /gym

### UX Improvements (6 abril - sesión 2)
- **Food badges**: Changed from colored to neutral chips with emoji (🥩 Proteína ×3)
- **Gym "Última sesión"**: Added collapsible section showing previous weights per exercise
- **Gym exercise list**: Now shows last weight hint (→ X lbs) for each exercise
- **Weight chart**: Shows message when only 1 data point ("Registra más días para ver la tendencia")
- **Dashboard exercises preview**: Shows first 2-3 exercises under "Hoy toca"

### Visual Fixes (6 abril - sesión 2)
- **Food progress bars**: Changed from h-3 (12px) to h-2 (8px)
- **Habits heatmap cells**: Changed from aspect-square to 14px × 14px with 3px gap

### Previous Session Bug Fixes
- **Duplicate habits bug**: Fixed by adding Set-based deduplication filtering by habit.name before setting state in both `habits/page.tsx` and `dashboard/page.tsx`
- **Calendar "0 entrenamientos" bug**: Fixed by comparing date strings (YYYY-MM-DD format) instead of Date objects to avoid timezone issues

### Navigation System Overhaul
- **Desktop (≥768px)**: New fixed sidebar (220px) on left side with full navigation
- **Mobile (<768px)**: Hamburger menu with slide-in drawer
- Removed BottomNav (replaced with sidebar/drawer system)

### New Design Tokens
- background: #080808 (deeper black)
- surface-1: #0f0f0f, surface-2: #141414, surface-3: #1a1a1a
- border: #242424, border-subtle: #1a1a1a
- accent: #10b981 (emerald), accent-dim: #064e3b
- text-primary: #f5f5f5, text-secondary: #a3a3a3, text-muted: #525252

### Page Redesigns
- **Dashboard**: Dense stats grid, week calendar, mini charts, Whoop-style layout
- **Gym**: Hero card with routine info, muscle group tags, stats row, clean exercise list
- **Food**: Large progress bars per food group, collapsible meal sections
- **Habits**: 30-day heatmap (GitHub-style), habit tabs, completion stats

---

## Repositorio
URL: https://github.com/Rafaelbhdata/fitkis
Rama: master

## Deploy
URL Vercel: (configurar en Vercel con el repo de GitHub)

---

## Módulos - Estado Actual

### Setup: ✅ Completado
### Auth: ✅ Completado
- Login con `supabase.auth.signInWithPassword()`
- Register con `supabase.auth.signUp()`
- Logout con `supabase.auth.signOut()`
- Middleware protege rutas /dashboard, /gym, /food, /habits, /weight

### UI: ✅ Completado (Rediseño v3.0 - "Whoop-Inspired")
**Sistema de Diseño:**
- Fondo: #080808 (deeper black)
- Acento: #10b981 (emerald)
- Foreground: #f5f5f5
- Surfaces: #0f0f0f / #141414 / #1a1a1a (jerarquía de elevación)
- Border: #242424 (standard) / #1a1a1a (subtle)
- Tipografía: Outfit (display) + DM Sans (body) via next/font/google
- Animaciones: fadeIn, slideUp, scaleIn

**Componentes:**
- btn-primary, btn-secondary, btn-ghost, btn-icon
- card, card-interactive
- input, label, badge-accent
- sheet (modal), overlay
- progress-track-lg, progress-fill
- stat-card, stat-value, stat-label
- heatmap-cell-* (for habit tracking)

**Navigation (NEW):**
- Sidebar (desktop ≥768px): 220px fixed left, full navigation
- Header (mobile <768px): compact with hamburger menu
- SideMenu (drawer): slide-in-right for mobile navigation
- BottomNav REMOVED

**Gráficas (recharts):**
- AreaChart en Weight con gradiente y línea de referencia (meta)
- Mini AreaChart en Dashboard para peso
- 30-day heatmap en Habits (GitHub-style)

### Gym: ✅ Conectado a Supabase + Nuevas Features
- Weekly calendar view with day selection
- Session timer (saves duration_seconds)
- Exercise instructions panel with tips and weight notes
- ROUTINE_SCHEDULE for weekly routine assignment
- Full ROUTINES data with detailed exercise info
- **Schedule Overrides**: Cambiar rutina de cualquier día futuro
  - Modal para seleccionar rutina o descanso
  - Indicadores visuales (punto ámbar, badge "Modificado")
  - Restaurar rutina original
### Food: ✅ Conectado a Supabase (con cantidad variable)
### Weight: ✅ Conectado a Supabase + Progress Photos
- Registro de peso con gráfica de tendencia
- **Progress Photos**: Fotos de frente y lado con comparación entre fechas
### Habits: ✅ Conectado a Supabase
### Dashboard: ✅ Conectado a Supabase (con logout)
### Journal: ✅ NUEVO - Reflexiones diarias
- Banco de 200 preguntas reflexivas (no rating, texto libre)
- 3 preguntas aleatorias por día que no se repiten
- 2 cambios de pregunta permitidos
- Texto libre para diario personal

---

## Auditoría de Frontend (3 abril 2026)

### Problemas Críticos CORREGIDOS ✅
1. **Logout** - Agregado botón en header del dashboard
2. **Cantidad comida** - Selector de 0.5 a N porciones
3. **Contraste muted** - Ahora cumple WCAG AA (4.7:1)
4. **Manejo errores** - try/catch + alertas en todas las páginas

### Funcionalidades PENDIENTES (para futuro)
| Feature | Prioridad | Estado |
|---------|-----------|--------|
| Gráfica de peso semanal (recharts) | Alta | ✅ COMPLETADO |
| Session timer | Alta | ✅ COMPLETADO |
| Favoritos de comidas (CRUD) | Alta | ✅ COMPLETADO |
| Exercise instructions panel | Alta | ✅ COMPLETADO |
| Weekly calendar view | Alta | ✅ COMPLETADO |
| Gráficas de progresión gym | Media | ✅ COMPLETADO |
| Gráficas de hábitos (racha, %) | Media | ✅ COMPLETADO |
| CRUD completo de hábitos | Media | ✅ COMPLETADO |
| Timer de descanso entre series | Media | ✅ COMPLETADO |
| Banner de progresión (+5 lbs) UI | Media | ✅ COMPLETADO |
| Seed de sesiones históricas | Baja | ✅ COMPLETADO |
| Diseño responsive tablet/desktop | Baja | ✅ COMPLETADO |
| Tests unitarios | Baja | ✅ COMPLETADO (58 tests) |

### Mejoras de Código PENDIENTES
- ✅ Extraer componentes de páginas grandes (gym/session ahora ~763 líneas, componentes en components/gym/)
- Remover `as any` en operaciones Supabase (usar tipos generados con `supabase gen types`)
  - gym/page.tsx: 3 operaciones de schedule_overrides usan `as any`
- Agregar skeleton loaders en vez de spinner genérico
- Agregar aria-labels para accesibilidad completa

---

## Schema de Base de Datos
Todas las tablas creadas según CLAUDE.md:
- gym_sessions ✅
- session_sets ✅
- weight_logs ✅
- food_logs ✅
- favorite_meals ✅
- habits ✅
- habit_logs ✅
- schedule_overrides ✅ (6 abril 2026)
- journal_entries ✅ (NUEVA - 6 abril 2026) - Entradas de diario con JSONB para preguntas
- journal_used_questions ✅ (NUEVA - 6 abril 2026) - Tracking de preguntas usadas
- progress_photos ✅ (NUEVA - 6 abril 2026) - Fotos de progreso corporal

**Storage Buckets:**
- progress-photos (privado) - Bucket para fotos de progreso con signed URLs

RLS habilitado con políticas por usuario en todas las tablas y storage.

---

## Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://lfchljualpowofdzmajz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Para Vercel, configurar las mismas variables en Settings > Environment Variables.

---

## Archivos Modificados (Rediseño v3.0 - 6 abril 2026)

### Sistema de Diseño
- `tailwind.config.ts` - Nueva paleta, spacing.sidebar (220px), nuevos tokens
- `app/globals.css` - Sistema de componentes completamente reescrito, Whoop-style
- `app/layout.tsx` - Configuración de Outfit + DM Sans fonts

### Páginas Rediseñadas
- `app/(auth)/login/page.tsx` - Nuevo diseño con gradiente
- `app/(auth)/register/page.tsx` - Consistente con login
- `app/(app)/layout.tsx` - Sidebar (desktop) + Header (mobile), responsive layout
- `app/(app)/dashboard/page.tsx` - Dense stats grid, week calendar, bug fixes
- `app/(app)/food/page.tsx` - Large progress bars, collapsible meals
- `app/(app)/weight/page.tsx` - Hero card, area chart
- `app/(app)/habits/page.tsx` - 30-day heatmap, habit tabs, bug fixes
- `app/(app)/gym/page.tsx` - Weekly calendar view, routine details, rest day handling
- `app/(app)/gym/session/[id]/page.tsx` - Session timer, exercise instructions panel
- `app/(app)/gym/history/page.tsx` - Shows session duration

### Componentes (NEW/Updated)
- `components/ui/Sidebar.tsx` - NEW: Desktop navigation (220px fixed)
- `components/ui/Header.tsx` - Updated: Mobile-only with hamburger menu
- `components/ui/SideMenu.tsx` - Updated: Drawer for mobile navigation
- `components/ui/BottomNav.tsx` - DEPRECATED (replaced by sidebar/drawer)

---

## Estructura de Archivos Principal
```
fitkis/
├── app/
│   ├── (auth)/login, register
│   ├── (app)/
│   │   ├── layout.tsx (sidebar desktop + header mobile)
│   │   ├── dashboard, gym/*, food/*, weight, habits/*
│   │   ├── journal/page.tsx (NUEVO - reflexiones diarias)
│   │   └── admin/seed/page.tsx (seed data page)
│   ├── layout.tsx, page.tsx, globals.css
├── components/
│   ├── ui/
│   │   ├── Sidebar.tsx (desktop nav - con Journal)
│   │   ├── Header.tsx (mobile nav - con Journal)
│   │   ├── SideMenu.tsx (mobile drawer - con Journal)
│   │   └── Toast.tsx (notifications)
│   └── gym/
│       ├── RestTimer.tsx (rest timer modal)
│       ├── ExerciseInstructions.tsx (instructions panel)
│       ├── ProgressionBanner.tsx (+5 lbs banner)
│       ├── SetRow.tsx (individual set input)
│       └── index.ts (barrel export)
├── __tests__/
│   ├── components/gym/
│   │   ├── SetRow.test.tsx
│   │   ├── RestTimer.test.tsx
│   │   └── ProgressionBanner.test.tsx
│   └── lib/utils.test.ts
├── lib/
│   ├── constants.ts, supabase.ts, hooks.ts, utils.ts
│   └── journal-questions.ts (NUEVO - 200 preguntas reflexivas)
├── public/
│   ├── favicon.svg (NUEVO - icono dumbbell)
│   └── manifest.json (NUEVO - PWA manifest)
├── supabase/migrations/
│   ├── 003_journal.sql (NUEVO)
│   └── 004_progress_photos.sql (NUEVO)
├── types/index.ts
├── middleware.ts
├── tailwind.config.ts
├── jest.config.js, jest.setup.js
├── CLAUDE.md (spec completa)
└── context.md (este archivo)
```

---

## Comandos útiles
```bash
npm run dev        # Desarrollo local
npm run build      # Build de producción
npm run lint       # Linting
npm test           # Ejecutar tests (58 tests)
npm run test:watch # Tests en modo watch
npx tsc --noEmit   # Verificar TypeScript
```

---

## Próximos pasos recomendados

### ✅ COMPLETADOS
1. ~~Configurar Vercel~~ - Importar repo de GitHub, agregar env vars ✅
2. ~~Probar la app desplegada en producción~~ ✅
3. ~~Implementar gráfica de peso con recharts~~ ✅
4. ~~Implementar favoritos de comidas~~ ✅
5. ~~Implementar gráficas de hábitos (racha, %)~~ ✅
6. ~~Mostrar banner de progresión (+5 lbs)~~ ✅
7. ~~Timer de descanso entre series~~ ✅
8. ~~CRUD completo de hábitos~~ ✅
9. ~~Extraer componentes reutilizables~~ ✅ (components/gym/)
10. ~~Agregar tests~~ ✅ (58 tests con Jest)
11. ~~Diseño responsive para tablet~~ ✅

### Pendiente (Mejoras futuras)
1. E2E tests con Playwright
2. Skeleton loaders para mejor UX de carga
3. PWA: offline support, install prompt (manifest.json ya existe)
4. Notificaciones push para recordatorios
5. Exportar datos a CSV/PDF

### Migraciones pendientes de ejecutar en Supabase Dashboard
- `supabase/migrations/003_journal.sql` - Tablas para Journal
- `supabase/migrations/004_progress_photos.sql` - Tabla para fotos de progreso
- Crear bucket "progress-photos" en Storage con política unificada

---

## Notas
- **Nombre**: Fitkis (antes FitLife)
- **Favicon**: Dumbbell icon en SVG con gradiente emerald
- Proyecto Supabase: Fitkis (us-west-2)
- Repo GitHub: https://github.com/Rafaelbhdata/fitkis
- Diseño: mobile-first responsive, tema oscuro profesional
- Concepto: "Whoop-Inspired" - dense, data-heavy, professional gym app
- Acento: emerald (#10b981)
- Tipografía: Outfit (display) + DM Sans (body)
- Navegación: Sidebar (desktop ≥768px) + Drawer (mobile) - ahora incluye Journal
- Estado: MVP funcional con diseño premium v3.0, Journal y Progress Photos implementados

## Bugs Corregidos (6 abril 2026)
1. **Duplicate habits**: Set-based deduplication en habits/page.tsx y dashboard/page.tsx
2. **Calendar "0 entrenamientos"**: Comparación de date strings en vez de Date objects
3. **Dashboard "Nutrición hoy" roto**: Era el hábito Lectura (weekly_frequency) sin controles UI
4. **Habits "Lectura" sin interacción**: Agregado soporte completo para weekly_frequency
5. **Dashboard "Iniciar" confuso**: Cambiado a "→ Ir al gym" link

## Mejoras Implementadas (6 abril 2026)
1. **Food badges**: Chips neutrales con emoji (🥩 Proteína ×3)
2. **Gym "Última sesión"**: Sección colapsable con pesos de la sesión anterior
3. **Gym exercise hints**: Muestra peso anterior (→ X lbs) en cada ejercicio
4. **Weight single point**: Mensaje cuando solo hay 1 dato
5. **Dashboard exercises**: Muestra primeros 2-3 ejercicios bajo "Hoy toca"
6. **Food progress bars**: Ahora 8px (h-2)
7. **Habits heatmap**: Celdas 14px con gap de 3px

## Nueva Funcionalidad Gym (6 abril 2026 - sesión 3)

### Weekly Calendar View
- Navegación semanal con botones prev/next
- Selección de día con highlight visual
- Muestra rutina programada o "Descanso"
- Calendario con puntos azules para días de entrenamiento
- Rest days: Mensaje motivacional + opción de ver cualquier rutina

### Session Timer
- Timer en tiempo real desde que inicia la sesión
- Formato MM:SS (o HH:MM:SS después de 60 min)
- Se guarda `duration_seconds` en tabla `gym_sessions`
- Se muestra duración en historial de sesiones

### Exercise Instructions Panel
- Botón "?" para expandir/colapsar instrucciones
- Lista numerada de pasos
- Caja de tip con icono de bombilla (amber)
- Nota de peso explicando qué significa el valor

### ROUTINE_SCHEDULE (lib/constants.ts)
```typescript
export const ROUTINE_SCHEDULE: Record<number, string> = {
  0: 'rest',     // Domingo
  1: 'upper_a',  // Lunes
  2: 'lower_a',  // Martes
  3: 'rest',     // Miércoles
  4: 'upper_b',  // Jueves
  5: 'lower_b',  // Viernes
  6: 'rest',     // Sábado
}
```

### Exercise Interface (types/index.ts)
```typescript
interface Exercise {
  id: string
  name: string
  equipment: string
  sets: number
  reps: string            // "8-10", "10 por pierna", etc.
  lastWeight: number
  weightUnit: string
  weightNote: string      // "Peso por mancuerna (cada mano)"
  instructions: string[]  // Pasos numerados
  tip: string             // Consejo para el ejercicio
  substitutions: string[] // Equipos alternativos
}
```
