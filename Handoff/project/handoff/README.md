# Fitkis v5 · Paper & Pulse — Paquete de handoff

Este directorio contiene todo lo que Claude Code necesita para implementar el rediseño v5.

## Estructura

```
handoff/
├── HANDOFF.md                    ← INSTRUCCIONES. Léelo primero, completo.
├── globals.css                   ← Tokens CSS — reemplaza tu :root
├── tailwind.config.ts            ← Drop-in para el root
├── app-layout.tsx                ← Reemplaza tu app/layout.tsx
└── components/
    ├── PulseLine.tsx             ← Firma visual EKG — úsala por todos lados
    ├── Fk.tsx                    ← FkMark + FkWord (logo)
    ├── Chip.tsx                  ← Chips de tono
    ├── Btn.tsx                   ← Botones (primary/signal/secondary/ghost)
    ├── Data.tsx                  ← Spark + BigNum + Segments
    └── MobileDock.tsx            ← Nav mobile con PulseLine en el activo
```

## Prompt para Claude Code

Copia y pega:

> Lee `handoff/HANDOFF.md` completo. Luego aplica los cambios uno por uno siguiendo el **Plan de migración** (sección 9). Haz una rama por paso: `redesign/v5-paper-pulse` como base, y subramas `v5/tokens-fonts`, `v5/primitives`, `v5/nav-mobile-dock`, etc. Después de cada rama corre `npm run build && npx tsc --noEmit` y pídeme review antes de mergear. Usa `Fitkis v5.html` como referencia pixel-exact — si algo se ve distinto, el diseño manda. Empieza por `v5/tokens-fonts`.

## Archivos a copiar al repo

| De handoff | A tu repo |
|---|---|
| `globals.css` | `app/globals.css` (reemplaza completo o mezcla con el existente) |
| `tailwind.config.ts` | `tailwind.config.ts` |
| `app-layout.tsx` | `app/layout.tsx` |
| `components/PulseLine.tsx` | `components/ui/PulseLine.tsx` |
| `components/Fk.tsx` | `components/ui/Fk.tsx` |
| `components/Chip.tsx` | `components/ui/Chip.tsx` |
| `components/Btn.tsx` | `components/ui/Btn.tsx` |
| `components/Data.tsx` | `components/ui/Data.tsx` |
| `components/MobileDock.tsx` | `components/ui/MobileDock.tsx` |

Después viene el refactor pantalla por pantalla según `HANDOFF.md` sección 6.
