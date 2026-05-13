# legacy/

Código congelado al cambiar el repo a "portal solo para nutriólogas" (rama `clinic/v5-paper-pulse`, mayo 2026).

**No se compila** — `tsconfig.json` excluye este directorio, y los route groups con paréntesis (`(app)`, `(clinic-v0)`) están fuera de `app/` así que Next.js no los enruta.

## Qué hay

| Carpeta | Qué era |
|---|---|
| `app/(app)/` | App del paciente (gym, food, weight, habits, journal, coach, dashboard, equivalentes, settings, admin). Ahora vive en el repo de la app móvil. |
| `app/(clinic-v0)/` | Primera versión del portal clínico — wired a Supabase (`practitioners`, `practitioner_patients`, `diet_configs`). Sustituido por `app/(clinic)/` v5 Paper & Pulse (que ya consume estas mismas tablas vía `lib/clinic/queries.ts`). |
| `app/test/` | Rutas de prueba de ejercicios. |
| `components/coach/` `food/` `gym/` `habits/` | Componentes del paciente. |
| `components/MobileDock.tsx` | Dock móvil del paciente. |
| `components/ui/{Sidebar,Header,SideMenu}.tsx` | Shell del paciente. |

## Reglas

1. **No modificar**. Si necesitas algo de aquí, cópialo a `/app` o `/components` con el cambio.
2. **Las migraciones SQL en `supabase/migrations/`** que estos archivos referencian **siguen vivas en la BD** — no se borraron porque la app móvil aún las usa.
3. Si algo de `legacy/` rompe el `tsc` o el `next build`, es bug — la exclusión en `tsconfig.json` debe atraparlo.

## Cuándo borrar

Cuando el portal clínico v5 esté en producción y nadie haya tocado este directorio en 3 meses.
