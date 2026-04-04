# FitLife — Context

## Estado general
- Setup del proyecto ✅ COMPLETADO
- Sistema de diseño UI ✅ COMPLETADO
- Base de datos Supabase ✅ CONFIGURADA (tablas + RLS)
- Auth ✅ COMPLETADO (páginas + middleware + hooks)
- Módulo Weight ✅ CONECTADO a Supabase
- Módulo Habits ✅ CONECTADO a Supabase
- Módulo Food ✅ CONECTADO a Supabase
- Dashboard ✅ CONECTADO a Supabase
- Módulo Gym ✅ CONECTADO a Supabase

## Último agente
Agente: agent:gym
Fecha: 3 de abril 2026
Qué hizo:
- Conectó gym/session/[id]/page.tsx a Supabase
  - Crea sesiones nuevas al finalizar
  - Guarda series (lbs, reps, feeling) en session_sets
  - Modo vista para ver sesiones pasadas
  - Selección de equipo alternativo (substitutions)
  - Sistema de progresión automática (+5 lbs si completó 2 sesiones)
  - Cardio opcional al final de la sesión
- Conectó gym/history/page.tsx a Supabase
  - Carga sesiones del usuario desde la base de datos
  - Muestra fecha, tipo de rutina, y cardio si aplica

## Módulos
### Setup: ✅ Completado
### Auth: ✅ Completado (login, register, middleware)
### UI: ✅ Completado (tokens, componentes base)
### Gym: ✅ Conectado a Supabase
### Food: ✅ Conectado a Supabase
### Weight: ✅ Conectado a Supabase
### Habits: ✅ Conectado a Supabase
### Dashboard: ✅ Conectado a Supabase

## Schema actual
Todas las tablas creadas según CLAUDE.md:
- gym_sessions ✅
- session_sets ✅
- weight_logs ✅
- food_logs ✅
- favorite_meals ✅
- habits ✅
- habit_logs ✅

RLS habilitado con políticas por usuario en todas las tablas.

## Variables de entorno configuradas (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://lfchljualpowofdzmajz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Archivos principales
### App
- app/layout.tsx - Layout raíz con metadata PWA
- app/(app)/layout.tsx - Layout con BottomNav
- app/(app)/dashboard/page.tsx - Dashboard conectado a Supabase
- app/(app)/gym/page.tsx - Rutina del día
- app/(app)/gym/session/[id]/page.tsx - Tracker de sesión conectado a Supabase
- app/(app)/gym/history/page.tsx - Historial conectado a Supabase
- app/(app)/food/page.tsx - Módulo food conectado a Supabase
- app/(app)/weight/page.tsx - Módulo weight conectado a Supabase
- app/(app)/habits/page.tsx - Módulo habits conectado a Supabase
- app/(auth)/* - Login y registro

### Lib
- lib/supabase.ts - Clientes browser y server
- lib/hooks.ts - useUser, useSupabase
- lib/utils.ts - Helpers
- lib/constants.ts - Datos estáticos completos

### Auth
- middleware.ts - Protección de rutas

## Repositorio
URL: Aún no creado en GitHub

## Deploy
URL Vercel: Aún no configurado

## Funcionalidades del módulo Gym
- **Rutina del día**: Muestra ejercicios según día de la semana
- **Tracker de sesión**:
  - Registrar peso (lbs) y repeticiones por serie
  - Marcar series como completadas
  - Seleccionar sensación (muy pesado, difícil, perfecto, ligero, quiero más)
  - Cambiar equipo por alternativas
  - Registrar cardio al final
- **Progresión automática**:
  - Revisa las últimas 2 sesiones del mismo tipo de rutina
  - Si completó todas las reps objetivo → sugiere +5 lbs
- **Historial**: Lista de sesiones pasadas con acceso a detalles

## Próximos pasos recomendados
1. **Probar la app** ejecutando `npm run dev`
2. **Registrar usuario** en /register
3. **Probar todos los módulos** (gym, food, habits, weight)
4. **Crear repo en GitHub** y hacer deploy en Vercel
5. (Opcional) Seed de sesiones históricas del CLAUDE.md

## Comandos útiles
```bash
npm run dev    # Desarrollo
npm run build  # Build de producción
npm run lint   # Linting
```

## Notas
- Proyecto: Fitkis en Supabase (us-west-2)
- El token de Supabase usado: sbp_0c43... (guardar seguro)
- Diseño mobile-first, tema oscuro, acento #e8ff47
- Todos los módulos conectados y funcionales
