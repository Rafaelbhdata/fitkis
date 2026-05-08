# Onboarding Redesign — Design Spec

**Date:** 2026-05-07
**Owner:** Rafael
**Status:** Approved for planning

---

## Goal

Replace the current single-step gym-only onboarding with a 7-step editorial onboarding that captures the user's identity, body, dietary preferences, habits, and gym setup. The new flow:

1. Feels aligned with the FitKis "Paper & Pulse" identity (cream/ink palette, serif italic accents, mono uppercase eyebrows, hand-drawn PulseLine).
2. Adapts the coach to the user from the first interaction (tone preference + name).
3. Explains *why* each piece of data is asked.
4. Lets the user skip the optional modules (diet, habits, gym wizard) and finish in 3 screens if they want.
5. Replaces the old auto-seed of 3 default habits + a hardcoded 86 kg weight log with values the user actually provides.

---

## Scope

**In scope**

- New `/onboarding/*` route group with 7 screens (welcome → identity → body → diet → habits → gym → done).
- Shared `OnboardingStep` shell with editorial header, progress indicator, copy-explanation, body slot, sticky footer.
- Welcome animation built with `react-native-reanimated` (no Lottie) using the existing `PulseLine` component as the brand hero.
- Refactor of the existing gym wizard (`app/onboarding/gym.tsx`) into the new shell so it stops feeling generic.
- Migration `023_onboarding_redesign.sql` that adds new columns, resets all existing onboardings, disables the auto-seed trigger, and simplifies `initialize_user_data` to only create an empty `user_profiles` row.
- Auth gate change: dashboard reads `user_profiles.onboarding_completed_at` (new field) instead of `gym_onboarding_completed_at` and redirects accordingly.
- Mid-flow persistence (each step writes immediately so a quit-and-resume lands on the next incomplete step).

**Out of scope**

- AI re-estimation when the user comes back to edit profile from Settings.
- Background image / video for the welcome screen.
- Onboarding for users on web (the web app currently doesn't drive consumer signup).
- Localization beyond Spanish.

---

## Audience

- **New signups going forward**: see the full flow on first launch.
- **All existing users**: their `onboarding_completed_at`, `gym_onboarding_completed_at`, `active_template_key`, `display_name`, and `coach_tone` are reset by the migration so they pass through the new flow next session. The migration also clears auto-seeded data (hardcoded 86 kg weight log, default 3 habits) when those rows are still untouched, so users start clean.

---

## Architecture

### Approach: shared shell + per-step content slots

Single `OnboardingStep` component owns the chrome (header, progress, copy, footer, transitions). Each route plugs its own children into the body slot. The shell guarantees visual consistency and removes the duplicate-form-per-step problem the current gym wizard suffers from.

```
app/onboarding/
  _layout.tsx          # Stack, hides tab bar, prevents swipe-back
  welcome.tsx          # step 1 — animation + Empezar
  identity.tsx         # step 2 — name + coach tone
  body.tsx             # step 3 — sex, dob, height, current weight, goal weight
  diet.tsx             # step 4 — diet type, allergies, active meals
  habits.tsx           # step 5 — picker of 12 predefined habits
  gym.tsx              # step 6 — refactored existing wizard inside the shell
  done.tsx             # step 7 — recap + Entrar

components/onboarding/
  OnboardingStep.tsx   # shell with eyebrow + serif title + copy + body slot + footer
  WelcomeAnimation.tsx # reanimated layered fade-in using PulseLine
  ToneChips.tsx        # 3 chips (Casual / Directo / Formal)
  HabitPickerGrid.tsx  # tappable grid of 12 habits
  ProgressBar.tsx      # 1px paper-3 with signal fill, animated
```

### `OnboardingStep` props

```ts
type Props = {
  step: number             // current 1..7
  total: number            // 7
  eyebrow: string          // "TU IDENTIDAD"
  title: ReactNode         // serif phrase, supports <Text className="italic">
  explanation?: string     // why we ask
  children: ReactNode      // body slot
  canContinue: boolean     // gates the Siguiente button
  skippable?: boolean      // shows the Saltar pill
  onBack?: () => void      // omitted on step 1
  onSkip?: () => void
  onContinue: () => void
  continueLabel?: string   // "Siguiente" by default; "Empezar" / "Entrar" on first/last
}
```

### Visual tokens (anchor the brand)

- Background: `bg-paper` (#fafaf7) — no dark mode here.
- Eyebrow: 10 px monospace uppercase, color `text-ink-4`, letter-spacing 1.5.
- Title: serif (Times New Roman), 36 px, fontWeight 300, lineHeight 40. Supports an inline italic span for the emphasized word.
- Explanation copy: 14 px regular, color `text-ink-3`, lineHeight 22, max-width ~80%.
- Progress bar: 2 px, `bg-paper-3` track with `bg-signal` fill, animated width.
- Step indicator (top-right): "PASO 02 · 06" mono uppercase letter-spacing 1.5.
- Footer: 56 px tall, sticky at bottom with the safe-area inset. Pills 14 px font, 14 px vertical padding, full width minus 5×2 gutter. Skip pill `bg-paper`, border ink-7, text ink-4. Continue pill `bg-ink`, text paper.
- Inline inputs: large numeric inputs use the same serif-italic centered style as the existing weight form (matches `WeightFormSheet`).

### Welcome animation timeline

`react-native-reanimated` shared values, no Lottie. Total duration ~2.0 s, all on a `bg-paper` background.

| t (ms) | Element | Effect |
|---|---|---|
| 0 | `PulseLine` (signal color, ~280 px wide) hidden | start |
| 200 | Eyebrow `FITKIS` | fade-in + letter-spacing 0 → 4 (200 ms) |
| 500 | `PulseLine` | draws left-to-right via stroke-dashoffset over 800 ms |
| 800 | Hero serif title `Bienvenido a tu *espacio*.` | three words stagger (200 ms each) translate-up + fade-in |
| 1600 | Subtitle mono uppercase `TU CUERPO · TU PLATO · TUS HÁBITOS · TU ENTRENO` | fade-in + letter-spacing 0 → 1.6 |
| 2000 | `Empezar` button | translate-up 24 px + fade-in (300 ms) |

The animation runs once on mount (no replay on re-focus). Skipping is implicit — tapping the screen during the run completes it instantly.

---

## Per-step contract

| # | Eyebrow | Title (serif italic accent on the **bold** word) | Explanation copy | Inputs | Skippable | Writes |
|---|---|---|---|---|---|---|
| 1 | FITKIS | Bienvenido a tu **espacio**. | (animation only) | Empezar button | no | — |
| 2 | TU IDENTIDAD | ¿Cómo te **llamas**? | "El coach te saluda por tu nombre y adapta el tono. Puedes cambiarlo después." | Text input (centered serif italic, max 32 chars). Below: 3 tone chips (Casual / Directo / Formal). | no | `user_profiles.display_name`, `coach_tone` |
| 3 | TU CUERPO | Lo **medible**, primero. | "Sirve para calcular IMC, calibrar el plato y recomendar pesos en gym. Solo tú lo ves." | Sex chips (M / F), date-of-birth (native picker), height cm, current weight kg, goal weight kg — all in one scroll. Inputs centered serif. | no | `user_profiles.sex, dob, height_cm, goal_weight_kg`. First `weight_logs` row with current weight + today's date. |
| 4 | TU PLATO | Cómo te **alimentas**. | "El plato funciona por equivalentes del SMAE. Esto nos dice qué quitar de tu menú y dónde poner el énfasis." | Diet-type chips: Omnívoro / Vegetariano / Vegano / Keto / Otro. Allergies chips (multiselect, common: Lactosa · Gluten · Mariscos · Frutos secos · Huevo · Soya). Comidas activas toggles (desayuno · snack 1 · comida · snack 2 · cena · snack 3). | yes | `user_profiles.diet_type, allergies[]`. `diet_configs` row with active_meals JSON. |
| 5 | TUS HÁBITOS | Lo que quieres **sostener**. | "Escoge los que importan ahora. Empieza con 2-3, agrega más después." | Picker grid of 12 predefined habits (each card has emoji + name + suggested target): Agua 2L · Lectura 30 min · Creatina · Dormir 8h · Meditar 10 min · Sol 15 min · Caminar 7k pasos · Suplementos · Sin alcohol · Sin azúcar añadido · Estiramiento · Diario. Tap toggles selection. | yes | One `habits` row per selected entry, populated with the suggested name/type/target. |
| 6 | TU ENTRENO | Cómo **entrenas**. | "La AI arma tu rutina y te recomienda pesos iniciales basados en tu nivel y tu cuerpo." | Existing gym wizard logic, ported into the new shell as multi-page sub-flow OR a tall scroll, whichever is cleaner. Captures: nivel, días/semana, sesión minutos, equipo, lesiones, focus. AI recommendation step calls `/api/coach/onboard`. | yes | `user_profiles.gym_*`, `active_template_key`, `user_exercise_weights`. |
| 7 | LISTO | **Vamos.** | "Lo que configuraste:" + bullet list rendering only the modules the user actually completed (name, peso meta, dieta, # hábitos, plantilla de gym). | Only `Entrar` button. | no | `user_profiles.onboarding_completed_at = now()` |

### Skip semantics

- Steps 1, 2, 3, 7 always run (no skip pill).
- Steps 4, 5, 6 show a `Saltar` pill in the footer that advances without writing any of that step's data. Defaults remain (active_meals all-on, no diet_type, no habits, no gym template).
- An exit button `[×]` shows up top-left starting at step 4. Tapping it opens a `ConfirmDialog` "¿Salir? Puedes terminar la configuración después en Ajustes." Confirmar → marks `onboarding_completed_at = now()` and routes to `/dashboard`. Cancelar → stays.

---

## Data model

### Migration `023_onboarding_redesign.sql`

```sql
-- 1. New columns on user_profiles.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sex TEXT,            -- 'M' | 'F'
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS diet_type TEXT,      -- 'omnivoro' | 'vegetariano' | 'vegano' | 'keto' | 'otro'
  ADD COLUMN IF NOT EXISTS allergies TEXT[],
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Reset all existing users — fuerza que pasen por el nuevo onboarding.
UPDATE user_profiles SET
  onboarding_completed_at = NULL,
  gym_onboarding_completed_at = NULL,
  active_template_key = NULL,
  display_name = NULL,
  coach_tone = NULL;

-- 3. Disable old auto-seed trigger so new signups don't get hardcoded data.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Replace seed function: only ensures a user_profiles row exists.
CREATE OR REPLACE FUNCTION initialize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (user_id, created_at, updated_at)
  VALUES (p_user_id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Wipe the auto-seeded "starter" data on accounts that never used it.
--    A weight_log of exactly 86kg with notes='Peso inicial' is the
--    fingerprint of the old hardcoded seed.
DELETE FROM weight_logs
WHERE notes = 'Peso inicial' AND weight_kg = 86;

--    The 3 hardcoded habits get cleared only if they have NO logs against
--    them (otherwise the user actually started using one — keep it).
DELETE FROM habits h
WHERE h.name IN ('Agua', 'Lectura', 'Creatina')
  AND NOT EXISTS (SELECT 1 FROM habit_logs WHERE habit_id = h.id);
```

### Mid-flow persistence

Each step's "Siguiente" handler writes to Supabase before navigating, so a force-quit mid-flow doesn't lose the data already entered.

The dashboard auth gate uses a simple two-rule check:

1. **`onboarding_completed_at IS NOT NULL`** → user finished or exited the flow. Route to dashboard.
2. **`onboarding_completed_at IS NULL`** → user is still mid-flow. Resolve which step to land on by walking the *required* fields in order:
   - `display_name IS NULL` → `/onboarding/welcome`
   - `display_name` set but `height_cm IS NULL OR goal_weight_kg IS NULL` → `/onboarding/body`
   - both required-step blocks satisfied → `/onboarding/diet` (start of optional run; user proceeds normally from there)

Optional steps (diet, habits, gym) never gate the auth check — only the act of reaching step 7 *or* tapping the `[×]` exit button on steps 4-6 sets `onboarding_completed_at = now()`. The `Saltar` pill advances within the flow but does NOT mark onboarding complete on its own.

The implementation lives in `lib/onboarding-state.ts` exporting `nextOnboardingRoute(profile): string | null` that returns either a route to redirect to, or `null` if the user is fully onboarded.

---

## Routing

- New `app/onboarding/_layout.tsx` is a `<Stack>` with `headerShown: false`. The Stack hides the tab bar (since onboarding lives outside the `(app)` group anyway).
- iOS swipe-back disabled on every screen except step 1 (where there's nothing to lose). All steps have an explicit Back button when applicable.
- The existing `app/onboarding/gym.tsx` becomes step 6. Its body content stays similar but is rendered inside `OnboardingStep`. Old single-screen wizard logic is broken into the same multi-question shape but now visually consistent.
- Auth gate in `app/(app)/dashboard.tsx` swaps the `gym_onboarding_completed_at` check for the new function.

---

## Error handling

- Each step's write to Supabase wraps in try/catch. On failure: toast "No pudimos guardar, intenta de nuevo" and stays on the step (no nav).
- The welcome animation is purely client-side; if reanimated throws (extremely unlikely), the step still shows the title and the Empezar button as a static fallback (use a try-catch around the animation worklet startup).
- AI call in step 6 (`/api/coach/onboard`) already has fallback logic; we surface its error toast as today.

---

## Testing

- **Manual smoke**: run through full flow as a brand-new account, then run again skipping 4-5-6. Verify dashboard auth gate correctly identifies which step the user landed on after a force-quit mid-flow.
- **Existing user reset**: after migration applies, your account and your friend's account get redirected to onboarding on next dashboard load. Verify nothing already saved (gym sessions, food_logs, weight_logs that the user actually entered) is lost.
- **Welcome animation perf**: confirm there's no jank on a real iPhone (not just simulator). If reanimated worklets feel heavy, drop the letter-spacing animation and keep only fade + translate.

---

## Open follow-ups (post-launch)

- AI re-recommendation when the user re-runs the gym wizard from Settings.
- Welcome screen video/animated illustration if the static text-only welcome feels flat after testing.
- Settings entry "Re-correr onboarding" so users can voluntarily redo the flow.
