# FitLife — Context

## Estado general
- Setup del proyecto ✅ COMPLETADO
- Sistema de diseño UI ✅ COMPLETADO (Rediseño v3.0 - "Whoop-Inspired")
- Base de datos Supabase ✅ CONFIGURADA (tablas + RLS)
- Auth ✅ COMPLETADO (login real con Supabase Auth)
- Módulo Weight ✅ CONECTADO a Supabase
- Módulo Habits ✅ CONECTADO a Supabase (30-day heatmap)
- Módulo Food ✅ CONECTADO a Supabase (con selector de cantidad)
- Dashboard ✅ CONECTADO a Supabase (con logout)
- Módulo Gym ✅ CONECTADO a Supabase
- Deploy ✅ GitHub + Vercel configurado

## Último agente
Agente: Gym Module Enhancement
Fecha: 6 de abril 2026
Qué hizo:

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
### Food: ✅ Conectado a Supabase (con cantidad variable)
### Weight: ✅ Conectado a Supabase
### Habits: ✅ Conectado a Supabase
### Dashboard: ✅ Conectado a Supabase (con logout)

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
| Gráfica de peso semanal (recharts) | Alta | ⏳ |
| Session timer | Alta | ✅ COMPLETADO |
| Favoritos de comidas (CRUD) | Alta | ⏳ |
| Exercise instructions panel | Alta | ✅ COMPLETADO |
| Weekly calendar view | Alta | ✅ COMPLETADO |
| Gráficas de progresión gym | Media | ⏳ |
| Gráficas de hábitos (racha, %) | Media | ⏳ |
| CRUD completo de hábitos | Media | ⏳ |
| Banner de progresión (+5 lbs) UI | Media | ⏳ |
| Seed de sesiones históricas | Baja | ⏳ |
| Diseño responsive tablet/desktop | Baja | ⏳ |
| Tests unitarios/E2E | Baja | ⏳ |

### Mejoras de Código PENDIENTES
- Extraer componentes de páginas grandes (gym/session tiene 600+ líneas)
- Remover `as any` en operaciones Supabase (usar tipos correctos)
- Agregar skeleton loaders en vez de spinner genérico
- Agregar aria-labels para accesibilidad completa

---

## Schema de Base de Datos
Todas las tablas creadas según CLAUDE.md:
- gym_sessions ✅
- session_sets ✅
- weight_logs ✅
- food_logs ✅
- favorite_meals ✅ (tabla existe, UI no implementada)
- habits ✅
- habit_logs ✅

RLS habilitado con políticas por usuario en todas las tablas.

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
│   │   ├── dashboard, gym/*, food/*, weight, habits
│   ├── layout.tsx, page.tsx, globals.css
├── components/ui/
│   ├── Sidebar.tsx (NEW - desktop nav)
│   ├── Header.tsx (mobile nav)
│   ├── SideMenu.tsx (mobile drawer)
│   └── BottomNav.tsx (DEPRECATED)
├── lib/constants.ts, supabase.ts, hooks.ts, utils.ts
├── types/index.ts
├── middleware.ts
├── tailwind.config.ts
├── CLAUDE.md (spec completa)
└── context.md (este archivo)
```

---

## Comandos útiles
```bash
npm run dev    # Desarrollo local
npm run build  # Build de producción
npm run lint   # Linting
npx tsc --noEmit  # Verificar TypeScript
```

---

## Próximos pasos recomendados

### Prioridad Alta
1. **Configurar Vercel** - Importar repo de GitHub, agregar env vars
2. **Probar la app** desplegada en producción
3. **Implementar gráfica de peso** con recharts (ya instalado)
4. **Implementar favoritos de comidas** (tabla existe, falta UI)

### Prioridad Media
5. Implementar gráficas de hábitos (racha, %)
6. Mostrar banner de progresión (+5 lbs) cuando aplique
7. Timer de descanso entre series (diferente al session timer)
8. CRUD completo de hábitos

### Prioridad Baja
9. Extraer componentes reutilizables
10. Agregar tests
11. Diseño responsive para tablet

---

## Notas
- Proyecto Supabase: Fitkis (us-west-2)
- Repo GitHub: https://github.com/Rafaelbhdata/fitkis
- Diseño: mobile-first responsive, tema oscuro profesional
- Concepto: "Whoop-Inspired" - dense, data-heavy, professional gym app
- Acento: emerald (#10b981)
- Tipografía: Outfit (display) + DM Sans (body)
- Navegación: Sidebar (desktop ≥768px) + Drawer (mobile)
- Estado: MVP funcional con diseño premium v3.0, listo para deploy

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
