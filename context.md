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
Agente: UI/UX Redesign v3.0 - Whoop-Inspired
Fecha: 6 de abril 2026
Qué hizo:

### Bug Fixes
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

### Gym: ✅ Conectado a Supabase
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
| Timer de descanso entre series | Alta | ⏳ |
| Favoritos de comidas (CRUD) | Alta | ⏳ |
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
- `app/(app)/gym/page.tsx` - Hero card, muscle tags, stats row
- `app/(app)/gym/session/[id]/page.tsx` - Grid de sets, feeling pills

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

## Próximos pasos recomendados (para mañana)

### Prioridad Alta
1. **Configurar Vercel** - Importar repo de GitHub, agregar env vars
2. **Probar la app** desplegada en producción
3. **Implementar gráfica de peso** con recharts (ya instalado)
4. **Implementar favoritos de comidas** (tabla existe, falta UI)

### Prioridad Media
5. Agregar timer de descanso en gym
6. Implementar gráficas de hábitos
7. Mostrar banner de progresión (+5 lbs) cuando aplique

### Prioridad Baja
8. Extraer componentes reutilizables
9. Agregar tests
10. Diseño responsive para tablet

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
