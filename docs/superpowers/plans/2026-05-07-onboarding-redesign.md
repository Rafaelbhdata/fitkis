# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the gym-only onboarding with a 7-step editorial flow (welcome → identity → body → diet → habits → gym → done) that captures real user data instead of hardcoded defaults and adapts the coach to each user from the first interaction.

**Architecture:** A shared `OnboardingStep` shell owns the chrome (eyebrow, serif title, copy, progress bar, sticky footer with Back/Skip/Continue). Each route plugs its own body content into a slot. The dashboard auth gate consults `lib/onboarding-state.ts` to route the user to the first incomplete step until `user_profiles.onboarding_completed_at` is set. Existing users get reset by the migration so they pass through the new flow on next launch.

**Tech Stack:**
- React Native + Expo SDK 54
- expo-router (Stack inside `/onboarding/_layout.tsx`)
- NativeWind / Tailwind for styling
- `react-native-reanimated` (already installed) for the welcome animation
- Supabase (Postgres + Auth + RLS)
- The existing `PulseLine` component as the brand hero

**Repos:**
- DB migration → `C:\Users\Rafae\Projects\fitkis` (web/backend repo, has `supabase/migrations/`)
- All app code → `C:\Users\Rafae\Projects\fitkis-mobile`

---

## File map

### Create
- `fitkis/supabase/migrations/023_onboarding_redesign.sql` — DB columns + reset + trigger cleanup
- `fitkis-mobile/lib/onboarding-state.ts` — pure routing helper
- `fitkis-mobile/components/onboarding/OnboardingStep.tsx` — shared shell
- `fitkis-mobile/components/onboarding/WelcomeAnimation.tsx` — step 1 hero animation
- `fitkis-mobile/components/onboarding/ToneChips.tsx` — Casual/Directo/Formal selector
- `fitkis-mobile/components/onboarding/HabitPickerGrid.tsx` — 12-habit picker
- `fitkis-mobile/app/onboarding/welcome.tsx` — step 1 route
- `fitkis-mobile/app/onboarding/identity.tsx` — step 2 route
- `fitkis-mobile/app/onboarding/body.tsx` — step 3 route
- `fitkis-mobile/app/onboarding/diet.tsx` — step 4 route
- `fitkis-mobile/app/onboarding/habits.tsx` — step 5 route
- `fitkis-mobile/app/onboarding/done.tsx` — step 7 route

### Modify
- `fitkis-mobile/types/index.ts` — extend UserProfile fields
- `fitkis-mobile/app/onboarding/_layout.tsx` — Stack with `headerShown: false`, swipe-back disabled
- `fitkis-mobile/app/onboarding/gym.tsx` — refactor to use `OnboardingStep` shell + accept skip
- `fitkis-mobile/app/(app)/dashboard.tsx` — replace `gym_onboarding_completed_at` check with `nextOnboardingRoute()`

---

## Notes on testing

This codebase has no automated test infra (no Jest/Detox set up). "Tests" in the plan are manual smoke verifications and state-of-DB checks. Pure functions (`lib/onboarding-state.ts`) get a small inline test scaffold you run with `npx tsx` once.

---

## Task 1: Migration `023_onboarding_redesign.sql`

**Files:**
- Create: `fitkis/supabase/migrations/023_onboarding_redesign.sql`

- [ ] **Step 1: Create the migration file**

Path: `C:\Users\Rafae\Projects\fitkis\supabase\migrations\023_onboarding_redesign.sql`

Content:

```sql
-- 023_onboarding_redesign.sql
--
-- New onboarding captures identity + body + diet + habits + gym in
-- a multi-step editorial flow instead of the single gym-only wizard.
-- This migration:
--   1. Adds the columns the new flow writes to.
--   2. Resets every existing user so they pass through the new flow.
--   3. Disables the auto-seed trigger that was inserting hardcoded
--      habits + a fake 86 kg weight log on signup. The new flow
--      gathers those values from the user instead.
--   4. Cleans up rows the old auto-seed left on accounts that never
--      actually used them.

-- 1. New columns on user_profiles.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS diet_type TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT[],
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Reset every existing user. They re-onboard on next dashboard load.
UPDATE user_profiles SET
  onboarding_completed_at = NULL,
  gym_onboarding_completed_at = NULL,
  active_template_key = NULL,
  display_name = NULL,
  coach_tone = NULL;

-- 3. Disable the old auto-seed trigger so new signups don't get a
--    hardcoded 86 kg weight log + 3 default habits anymore.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Replace the seed function: it just ensures a user_profiles row
--    exists for the new user. The onboarding fills in the rest.
CREATE OR REPLACE FUNCTION initialize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (user_id, created_at, updated_at)
  VALUES (p_user_id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Wipe the auto-seeded "starter" rows on accounts that never used
--    them. Only deletes the exact fingerprint of the old seed (86 kg
--    weight log with notes='Peso inicial', and the three named habits
--    when no habit_logs reference them).
DELETE FROM weight_logs
WHERE notes = 'Peso inicial' AND weight_kg = 86;

DELETE FROM habits h
WHERE h.name IN ('Agua', 'Lectura', 'Creatina')
  AND NOT EXISTS (SELECT 1 FROM habit_logs WHERE habit_id = h.id);
```

- [ ] **Step 2: Apply the migration in Supabase**

Open Supabase Dashboard → SQL Editor. Paste the entire contents of `023_onboarding_redesign.sql`. Click Run.

Expected: "Success. No rows returned" or similar confirmation.

- [ ] **Step 3: Verify columns + reset worked**

Run in SQL Editor:

```sql
-- Columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('sex','dob','diet_type','allergies','onboarding_completed_at');

-- All users reset
SELECT email, p.onboarding_completed_at, p.display_name, p.active_template_key
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC LIMIT 10;

-- No more hardcoded 86 kg seed rows
SELECT COUNT(*) FROM weight_logs WHERE notes = 'Peso inicial' AND weight_kg = 86;
```

Expected: first query returns 5 rows; second shows all `onboarding_completed_at` and `display_name` columns null; third returns `0`.

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis" add supabase/migrations/023_onboarding_redesign.sql
git -C "C:\Users\Rafae\Projects\fitkis" commit -m "feat(db): migration 023 — onboarding redesign columns + reset"
```

---

## Task 2: Extend the `UserProfile` type

**Files:**
- Modify: `fitkis-mobile/types/index.ts`

- [ ] **Step 1: Find the existing `UserProfile` interface**

Open `C:\Users\Rafae\Projects\fitkis-mobile\types\index.ts`. Search for `UserProfile`. The current shape includes `display_name`, `coach_tone`, `coach_style`, `gym_*`, `active_template_key`, `gym_onboarding_completed_at`, etc.

- [ ] **Step 2: Add the new fields**

Add these properties to the interface (anywhere inside it):

```ts
sex?: 'M' | 'F' | null
dob?: string | null            // ISO date YYYY-MM-DD
diet_type?: 'omnivoro' | 'vegetariano' | 'vegano' | 'keto' | 'otro' | null
allergies?: string[] | null
onboarding_completed_at?: string | null
```

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add types/index.ts
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "types: extend UserProfile with onboarding fields"
```

---

## Task 3: `lib/onboarding-state.ts` (pure routing helper)

**Files:**
- Create: `fitkis-mobile/lib/onboarding-state.ts`

- [ ] **Step 1: Create the helper**

Path: `C:\Users\Rafae\Projects\fitkis-mobile\lib\onboarding-state.ts`

```ts
// lib/onboarding-state.ts
//
// Pure helper that decides where to route a user based on their
// profile state. The dashboard auth gate calls this on every focus
// to either send the user into the onboarding flow or let them
// reach the dashboard.
//
// Two rules:
//   1. onboarding_completed_at IS NOT NULL  → user finished or exited
//      → route = null (dashboard).
//   2. onboarding_completed_at IS NULL → walk the required fields in
//      order and return the first incomplete step.
//
// Optional steps (diet/habits/gym) NEVER gate routing here. Only the
// completed flag matters.

type OnboardingProfile = {
  display_name?: string | null
  height_cm?: number | null
  goal_weight_kg?: number | null
  onboarding_completed_at?: string | null
}

export type OnboardingRoute =
  | '/onboarding/welcome'
  | '/onboarding/identity'
  | '/onboarding/body'
  | '/onboarding/diet'

export function nextOnboardingRoute(
  profile: OnboardingProfile | null | undefined
): OnboardingRoute | null {
  if (!profile) return '/onboarding/welcome'
  if (profile.onboarding_completed_at) return null
  if (!profile.display_name) return '/onboarding/welcome'
  if (profile.height_cm == null || profile.goal_weight_kg == null) {
    return '/onboarding/body'
  }
  return '/onboarding/diet'
}
```

- [ ] **Step 2: Verify with a quick scratch test**

Create a temp file at `C:\Users\Rafae\Projects\fitkis-mobile\_scratch-onboarding-state.ts`:

```ts
import { nextOnboardingRoute } from './lib/onboarding-state'

const cases: { name: string; input: any; expected: any }[] = [
  { name: 'null profile', input: null, expected: '/onboarding/welcome' },
  { name: 'empty profile', input: {}, expected: '/onboarding/welcome' },
  { name: 'name only', input: { display_name: 'Rafa' }, expected: '/onboarding/body' },
  {
    name: 'name + height + goal',
    input: { display_name: 'Rafa', height_cm: 175, goal_weight_kg: 80 },
    expected: '/onboarding/diet',
  },
  {
    name: 'completed',
    input: {
      display_name: 'Rafa', height_cm: 175, goal_weight_kg: 80,
      onboarding_completed_at: '2026-05-07T20:00:00Z',
    },
    expected: null,
  },
]

for (const c of cases) {
  const got = nextOnboardingRoute(c.input)
  const ok = got === c.expected
  console.log(`${ok ? '✓' : '✗'} ${c.name}: got=${got} expected=${c.expected}`)
  if (!ok) process.exit(1)
}
console.log('All cases passed.')
```

Run: `cd C:\Users\Rafae\Projects\fitkis-mobile && npx tsx _scratch-onboarding-state.ts`

Expected: 5 lines starting with `✓`, then `All cases passed.`

- [ ] **Step 3: Delete the scratch file**

```bash
rm "C:\Users\Rafae\Projects\fitkis-mobile\_scratch-onboarding-state.ts"
```

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add lib/onboarding-state.ts
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): pure helper nextOnboardingRoute"
```

---

## Task 4: `OnboardingStep` shared shell

**Files:**
- Create: `fitkis-mobile/components/onboarding/OnboardingStep.tsx`

- [ ] **Step 1: Create the component**

Path: `C:\Users\Rafae\Projects\fitkis-mobile\components\onboarding\OnboardingStep.tsx`

```tsx
// components/onboarding/OnboardingStep.tsx
//
// Shared shell for every step of the onboarding flow. Owns the
// header (back + step counter + progress bar), the editorial copy
// block (eyebrow + serif title + explanation), the body slot, and
// the sticky footer (Saltar + Continuar). Individual route screens
// only declare the body content + the handlers.

import { ReactNode } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, X } from 'lucide-react-native'

type Props = {
  step: number
  total: number
  eyebrow: string
  title: ReactNode
  explanation?: string
  children: ReactNode
  canContinue: boolean
  skippable?: boolean
  // showBack: hidden on step 1, otherwise shown unless explicitly disabled.
  showBack?: boolean
  // showExit: only on optional steps (4-6) per spec.
  showExit?: boolean
  onBack?: () => void
  onSkip?: () => void
  onExit?: () => void
  onContinue: () => void
  continueLabel?: string
}

export function OnboardingStep({
  step, total, eyebrow, title, explanation, children,
  canContinue, skippable = false, showBack = true, showExit = false,
  onBack, onSkip, onExit, onContinue,
  continueLabel = 'Siguiente',
}: Props) {
  const progressPct = (step / total) * 100

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      {/* Header row: back + step counter */}
      <View className="px-5 pt-2 flex-row items-center justify-between" style={{ minHeight: 36 }}>
        {showBack && onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Atrás"
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <ArrowLeft size={18} color="#0a0a0a" />
          </Pressable>
        ) : showExit && onExit ? (
          <Pressable
            onPress={onExit}
            accessibilityLabel="Salir"
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <X size={18} color="#0a0a0a" />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text
          className="text-[10px] uppercase text-ink-4"
          style={{ fontFamily: 'ui-monospace', letterSpacing: 1.5 }}
        >
          Paso {String(step).padStart(2, '0')} · {String(total).padStart(2, '0')}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="mx-5 mt-3 h-[2px] bg-paper-3 rounded-full overflow-hidden">
        <View className="h-full bg-signal" style={{ width: `${progressPct}%` }} />
      </View>

      {/* Editorial header: eyebrow + serif title + explanation */}
      <View className="px-5 mt-8">
        <Text
          className="text-[10px] uppercase text-ink-4 mb-3"
          style={{ fontFamily: 'ui-monospace', letterSpacing: 1.5 }}
        >
          {eyebrow}
        </Text>
        <Text
          className="font-serif text-ink"
          style={{ fontSize: 36, lineHeight: 40, fontWeight: '300' }}
        >
          {title}
        </Text>
        {explanation && (
          <Text
            className="text-ink-3 mt-3"
            style={{ fontSize: 14, lineHeight: 22 }}
          >
            {explanation}
          </Text>
        )}
      </View>

      {/* Body slot — scrollable so long forms (body, gym) work */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {/* Sticky footer */}
      <View className="px-5 pt-2 pb-4 flex-row" style={{ gap: 8 }}>
        {skippable && onSkip && (
          <Pressable
            onPress={onSkip}
            className="flex-1 py-3.5 rounded-full bg-paper border border-ink-7 items-center"
          >
            <Text
              className="text-ink-4 text-xs uppercase"
              style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2, fontWeight: '600' }}
            >
              Saltar
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onContinue}
          disabled={!canContinue}
          className={`flex-1 py-3.5 rounded-full items-center ${canContinue ? 'bg-ink' : 'bg-ink opacity-40'}`}
        >
          <Text
            className="text-paper text-xs uppercase"
            style={{ fontFamily: 'ui-monospace', letterSpacing: 1.5, fontWeight: '600' }}
          >
            {continueLabel}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add components/onboarding/OnboardingStep.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): shared OnboardingStep shell"
```

---

## Task 5: `WelcomeAnimation` component

**Files:**
- Create: `fitkis-mobile/components/onboarding/WelcomeAnimation.tsx`

- [ ] **Step 1: Create the component**

Path: `C:\Users\Rafae\Projects\fitkis-mobile\components\onboarding\WelcomeAnimation.tsx`

```tsx
// components/onboarding/WelcomeAnimation.tsx
//
// Layered editorial fade-in for the welcome screen. Uses the existing
// PulseLine component as the brand hero so the welcome feels of a
// piece with the rest of the app instead of a generic Lottie.
//
// Timeline (~2s total):
//   200ms  eyebrow FITKIS appears, letterSpacing animates 0 → 4
//   500ms  PulseLine draws across (left → right) over 800ms
//   800ms  hero serif title staggers in word-by-word (200ms each)
//   1600ms subtitle mono uppercase fades in
//   2000ms `onReady` callback fires so the parent can show its CTA

import { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { PulseLine } from '../ui/PulseLine'

type Props = {
  onReady?: () => void
}

const TITLE_WORDS: { text: string; italic?: boolean }[] = [
  { text: 'Bienvenido' },
  { text: ' a tu ' },
  { text: 'espacio.', italic: true },
]

export function WelcomeAnimation({ onReady }: Props) {
  const eyebrowOpacity = useSharedValue(0)
  const eyebrowSpacing = useSharedValue(0)
  const pulseOpacity = useSharedValue(0)
  const wordOpacity0 = useSharedValue(0)
  const wordOpacity1 = useSharedValue(0)
  const wordOpacity2 = useSharedValue(0)
  const wordTranslate0 = useSharedValue(12)
  const wordTranslate1 = useSharedValue(12)
  const wordTranslate2 = useSharedValue(12)
  const subtitleOpacity = useSharedValue(0)

  useEffect(() => {
    eyebrowOpacity.value = withDelay(200, withTiming(1, { duration: 300 }))
    eyebrowSpacing.value = withDelay(200, withTiming(4, { duration: 300 }))
    pulseOpacity.value = withDelay(500, withTiming(1, { duration: 200 }))
    wordOpacity0.value = withDelay(800, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }))
    wordTranslate0.value = withDelay(800, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }))
    wordOpacity1.value = withDelay(1000, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }))
    wordTranslate1.value = withDelay(1000, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }))
    wordOpacity2.value = withDelay(1200, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }))
    wordTranslate2.value = withDelay(1200, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }))
    subtitleOpacity.value = withDelay(1600, withTiming(1, { duration: 400 }))
    const t = setTimeout(() => onReady?.(), 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const eyebrowStyle = useAnimatedStyle(() => ({
    opacity: eyebrowOpacity.value,
    letterSpacing: eyebrowSpacing.value,
  }))
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }))
  const word0Style = useAnimatedStyle(() => ({
    opacity: wordOpacity0.value,
    transform: [{ translateY: wordTranslate0.value }],
  }))
  const word1Style = useAnimatedStyle(() => ({
    opacity: wordOpacity1.value,
    transform: [{ translateY: wordTranslate1.value }],
  }))
  const word2Style = useAnimatedStyle(() => ({
    opacity: wordOpacity2.value,
    transform: [{ translateY: wordTranslate2.value }],
  }))
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }))

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.Text
        style={[
          { fontFamily: 'ui-monospace', fontSize: 11, color: '#737373' },
          eyebrowStyle,
        ]}
      >
        FITKIS
      </Animated.Text>

      <Animated.View style={[{ marginTop: 24, marginBottom: 32 }, pulseStyle]}>
        <PulseLine w={240} h={28} color="#ff5a1f" strokeWidth={2} active />
      </Animated.View>

      <View className="flex-row flex-wrap justify-center" style={{ maxWidth: 320 }}>
        <Animated.Text
          style={[
            { fontFamily: 'Times New Roman', fontSize: 36, lineHeight: 42, fontWeight: '300', color: '#0a0a0a' },
            word0Style,
          ]}
        >
          {TITLE_WORDS[0].text}
        </Animated.Text>
        <Animated.Text
          style={[
            { fontFamily: 'Times New Roman', fontSize: 36, lineHeight: 42, fontWeight: '300', color: '#0a0a0a' },
            word1Style,
          ]}
        >
          {TITLE_WORDS[1].text}
        </Animated.Text>
        <Animated.Text
          style={[
            { fontFamily: 'Times New Roman', fontSize: 36, lineHeight: 42, fontWeight: '300', color: '#0a0a0a', fontStyle: 'italic' },
            word2Style,
          ]}
        >
          {TITLE_WORDS[2].text}
        </Animated.Text>
      </View>

      <Animated.Text
        style={[
          {
            fontFamily: 'ui-monospace',
            fontSize: 10,
            color: '#737373',
            letterSpacing: 1.6,
            marginTop: 32,
            textAlign: 'center',
          },
          subtitleStyle,
        ]}
      >
        TU CUERPO · TU PLATO · TUS HÁBITOS · TU ENTRENO
      </Animated.Text>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add components/onboarding/WelcomeAnimation.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): WelcomeAnimation with reanimated + PulseLine"
```

---

## Task 6: `ToneChips` component

**Files:**
- Create: `fitkis-mobile/components/onboarding/ToneChips.tsx`

- [ ] **Step 1: Create the component**

Path: `C:\Users\Rafae\Projects\fitkis-mobile\components\onboarding\ToneChips.tsx`

```tsx
// components/onboarding/ToneChips.tsx
//
// Single-select chip group for the coach tone preference. Used in
// step 2 of the onboarding (identity).

import { View, Text, Pressable } from 'react-native'

export type CoachTone = 'casual' | 'directo' | 'formal'

type Props = {
  value: CoachTone | null
  onChange: (next: CoachTone) => void
}

const OPTIONS: { value: CoachTone; label: string; sub: string }[] = [
  { value: 'casual',  label: 'Casual',  sub: 'Cercano, relajado' },
  { value: 'directo', label: 'Directo', sub: 'Sin rodeos, claro'  },
  { value: 'formal',  label: 'Formal',  sub: 'Profesional, neutro' },
]

export function ToneChips({ value, onChange }: Props) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 px-3 py-3.5 rounded-2xl items-center ${selected ? 'bg-ink' : 'bg-paper-2'}`}
            style={selected ? undefined : { borderWidth: 1, borderColor: '#e5e5e5' }}
          >
            <Text
              className={`text-sm font-medium ${selected ? 'text-paper' : 'text-ink'}`}
            >
              {opt.label}
            </Text>
            <Text
              className={`text-[10px] mt-0.5 ${selected ? 'text-paper opacity-70' : 'text-ink-4'}`}
            >
              {opt.sub}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add components/onboarding/ToneChips.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): ToneChips selector"
```

---

## Task 7: `HabitPickerGrid` component

**Files:**
- Create: `fitkis-mobile/components/onboarding/HabitPickerGrid.tsx`

- [ ] **Step 1: Create the component**

Path: `C:\Users\Rafae\Projects\fitkis-mobile\components\onboarding\HabitPickerGrid.tsx`

```tsx
// components/onboarding/HabitPickerGrid.tsx
//
// 12 predefined habit cards. Tap to toggle. The parent reads which
// habits are selected and inserts them as `habits` rows on confirm.

import { View, Text, Pressable } from 'react-native'

export type HabitTemplate = {
  key: string
  emoji: string
  name: string
  type: 'daily_check' | 'quantity' | 'weekly_frequency'
  target_value?: number | null
  unit?: string | null
  hint: string
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  { key: 'agua',         emoji: '💧', name: 'Agua',          type: 'quantity',          target_value: 2,    unit: 'litros',     hint: '2L diarios' },
  { key: 'lectura',      emoji: '📖', name: 'Lectura',       type: 'weekly_frequency',  target_value: 4,    unit: 'días/semana', hint: '4 días/sem' },
  { key: 'creatina',     emoji: '🥄', name: 'Creatina',      type: 'daily_check',       target_value: null, unit: null,         hint: 'Diario' },
  { key: 'dormir',       emoji: '😴', name: 'Dormir 8h',     type: 'daily_check',       target_value: null, unit: null,         hint: 'Sí / no' },
  { key: 'meditar',      emoji: '🧘', name: 'Meditar',       type: 'quantity',          target_value: 10,   unit: 'minutos',    hint: '10 min' },
  { key: 'sol',          emoji: '☀️', name: 'Sol',           type: 'quantity',          target_value: 15,   unit: 'minutos',    hint: '15 min' },
  { key: 'caminar',      emoji: '🚶', name: 'Caminar',       type: 'quantity',          target_value: 7000, unit: 'pasos',      hint: '7k pasos' },
  { key: 'suplementos',  emoji: '💊', name: 'Suplementos',   type: 'daily_check',       target_value: null, unit: null,         hint: 'Diario' },
  { key: 'sin_alcohol',  emoji: '🚫', name: 'Sin alcohol',   type: 'daily_check',       target_value: null, unit: null,         hint: 'Sí / no' },
  { key: 'sin_azucar',   emoji: '🍬', name: 'Sin azúcar',    type: 'daily_check',       target_value: null, unit: null,         hint: 'Añadido' },
  { key: 'estiramiento', emoji: '🤸', name: 'Estiramiento',  type: 'quantity',          target_value: 10,   unit: 'minutos',    hint: '10 min' },
  { key: 'diario',       emoji: '✍️', name: 'Diario',        type: 'daily_check',       target_value: null, unit: null,         hint: 'Escribir' },
]

type Props = {
  selected: Set<string>
  onToggle: (key: string) => void
}

export function HabitPickerGrid({ selected, onToggle }: Props) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {HABIT_TEMPLATES.map((h) => {
        const isOn = selected.has(h.key)
        return (
          <Pressable
            key={h.key}
            onPress={() => onToggle(h.key)}
            style={{
              width: '31.5%',
              minHeight: 92,
              padding: 10,
              borderRadius: 14,
              backgroundColor: isOn ? '#0a0a0a' : '#f5f4ef',
              borderWidth: isOn ? 0 : 1,
              borderColor: '#e5e5e5',
            }}
          >
            <Text style={{ fontSize: 22 }}>{h.emoji}</Text>
            <Text
              className={`text-xs font-medium mt-1 ${isOn ? 'text-paper' : 'text-ink'}`}
              numberOfLines={1}
            >
              {h.name}
            </Text>
            <Text
              className={`text-[10px] mt-0.5 ${isOn ? 'text-paper opacity-70' : 'text-ink-4'}`}
              numberOfLines={1}
            >
              {h.hint}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add components/onboarding/HabitPickerGrid.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): HabitPickerGrid with 12 templates"
```

---

## Task 8: Replace `app/onboarding/_layout.tsx`

**Files:**
- Modify: `fitkis-mobile/app/onboarding/_layout.tsx`

- [ ] **Step 1: Read the current layout**

Open `C:\Users\Rafae\Projects\fitkis-mobile\app\onboarding\_layout.tsx`. Note its current shape.

- [ ] **Step 2: Replace contents**

```tsx
// app/onboarding/_layout.tsx
//
// Stack navigator for the onboarding flow. Hides the system header
// and disables iOS swipe-back so the user can't accidentally dismiss
// a step they're filling out.

import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/_layout.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): hide header + disable swipe-back on stack"
```

---

## Task 9: Step 1 — `app/onboarding/welcome.tsx`

**Files:**
- Create: `fitkis-mobile/app/onboarding/welcome.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/onboarding/welcome.tsx
//
// Step 1 of 7. Plays the welcome animation, then shows the Empezar
// button. No data captured here.

import { useState } from 'react'
import { View, Pressable, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { WelcomeAnimation } from '../../components/onboarding/WelcomeAnimation'

export default function WelcomeScreen() {
  const [ready, setReady] = useState(false)

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <View className="flex-1">
        <WelcomeAnimation onReady={() => setReady(true)} />
      </View>
      <View className="px-5 pb-6">
        <Pressable
          onPress={() => router.push('/onboarding/identity' as any)}
          disabled={!ready}
          className={`py-3.5 rounded-full bg-ink items-center ${ready ? '' : 'opacity-30'}`}
        >
          <Text
            className="text-paper text-xs uppercase"
            style={{ fontFamily: 'ui-monospace', letterSpacing: 1.5, fontWeight: '600' }}
          >
            Empezar
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/welcome.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 1 welcome screen"
```

---

## Task 10: Step 2 — `app/onboarding/identity.tsx`

**Files:**
- Create: `fitkis-mobile/app/onboarding/identity.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/onboarding/identity.tsx
//
// Step 2 of 7. Captures display_name + coach_tone.

import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useUser } from '../../lib/hooks/useUser'
import { useToast } from '../../lib/hooks/useToast'
import { supabase } from '../../lib/supabase'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { ToneChips, type CoachTone } from '../../components/onboarding/ToneChips'

export default function IdentityScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [tone, setTone] = useState<CoachTone | null>(null)
  const [saving, setSaving] = useState(false)

  const canContinue = name.trim().length >= 2 && tone !== null && !saving

  const handleContinue = async () => {
    if (!user || !canContinue) return
    setSaving(true)
    try {
      await (supabase.from('user_profiles') as any)
        .update({
          display_name: name.trim(),
          coach_tone: tone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      router.push('/onboarding/body' as any)
    } catch {
      showToast('No pudimos guardar, intenta de nuevo')
    }
    setSaving(false)
  }

  return (
    <OnboardingStep
      step={2}
      total={7}
      eyebrow="Tu identidad"
      title={<>¿Cómo te <Text className="italic">llamas</Text>?</>}
      explanation="El coach te saluda por tu nombre y adapta el tono a tu estilo. Puedes cambiarlo después."
      canContinue={canContinue}
      onBack={() => router.back()}
      onContinue={handleContinue}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        placeholderTextColor="#a3a3a3"
        autoFocus
        maxLength={32}
        className="px-4 py-4 rounded-2xl bg-paper-2 border border-ink-7 text-center font-serif text-2xl text-ink"
      />

      <Text
        className="text-[10px] uppercase text-ink-4 mt-8 mb-3"
        style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}
      >
        Tono del coach
      </Text>
      <ToneChips value={tone} onChange={setTone} />
    </OnboardingStep>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/identity.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 2 identity (name + coach tone)"
```

---

## Task 11: Step 3 — `app/onboarding/body.tsx`

**Files:**
- Create: `fitkis-mobile/app/onboarding/body.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/onboarding/body.tsx
//
// Step 3 of 7. Captures sex, dob, height, current weight, goal weight.
// Writes to user_profiles + creates the first weight_logs row.

import { useState } from 'react'
import { View, Text, TextInput, Pressable, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Calendar } from 'lucide-react-native'
import { router } from 'expo-router'
import { useUser } from '../../lib/hooks/useUser'
import { useToast } from '../../lib/hooks/useToast'
import { supabase } from '../../lib/supabase'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { formatDateISO, parseLocalDate, getToday } from '../../lib/utils'

export default function BodyScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [sex, setSex] = useState<'M' | 'F' | null>(null)
  const [dob, setDob] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [heightCm, setHeightCm] = useState('')
  const [currentKg, setCurrentKg] = useState('')
  const [goalKg, setGoalKg] = useState('')
  const [saving, setSaving] = useState(false)

  const heightNum = parseFloat(heightCm)
  const currentNum = parseFloat(currentKg)
  const goalNum = parseFloat(goalKg)

  const canContinue =
    sex !== null &&
    dob !== '' &&
    Number.isFinite(heightNum) && heightNum >= 100 && heightNum <= 230 &&
    Number.isFinite(currentNum) && currentNum >= 30 && currentNum <= 250 &&
    Number.isFinite(goalNum) && goalNum >= 30 && goalNum <= 250 &&
    !saving

  const onDateChange = (_e: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selected) setDob(formatDateISO(selected))
  }

  const handleContinue = async () => {
    if (!user || !canContinue) return
    setSaving(true)
    try {
      await (supabase.from('user_profiles') as any)
        .update({
          sex,
          dob,
          height_cm: heightNum,
          goal_weight_kg: goalNum,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      await (supabase.from('weight_logs') as any).insert({
        user_id: user.id,
        date: getToday(),
        weight_kg: currentNum,
        notes: null,
      })

      router.push('/onboarding/diet' as any)
    } catch {
      showToast('No pudimos guardar, intenta de nuevo')
    }
    setSaving(false)
  }

  const dobLabel = dob
    ? parseLocalDate(dob).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Selecciona la fecha'

  return (
    <OnboardingStep
      step={3}
      total={7}
      eyebrow="Tu cuerpo"
      title={<>Lo <Text className="italic">medible</Text>, primero.</>}
      explanation="Sirve para calcular IMC, calibrar el plato y recomendar pesos en gym. Solo tú lo ves."
      canContinue={canContinue}
      onBack={() => router.back()}
      onContinue={handleContinue}
    >
      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Sexo</Text>
      <View className="flex-row mb-6" style={{ gap: 8 }}>
        {(['M', 'F'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSex(s)}
            className={`flex-1 py-3.5 rounded-2xl items-center ${sex === s ? 'bg-ink' : 'bg-paper-2'}`}
            style={sex === s ? undefined : { borderWidth: 1, borderColor: '#e5e5e5' }}
          >
            <Text className={`text-sm font-medium ${sex === s ? 'text-paper' : 'text-ink'}`}>
              {s === 'M' ? 'Hombre' : 'Mujer'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Fecha de nacimiento</Text>
      <Pressable
        onPress={() => setShowDatePicker(true)}
        className="px-4 py-4 rounded-2xl bg-paper-2 border border-ink-7 flex-row items-center mb-6"
        style={{ gap: 10 }}
      >
        <Calendar size={16} color="#737373" />
        <Text className="text-sm text-ink capitalize">{dobLabel}</Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={dob ? parseLocalDate(dob) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Altura (cm)</Text>
      <TextInput
        value={heightCm}
        onChangeText={setHeightCm}
        keyboardType="number-pad"
        placeholder="170"
        placeholderTextColor="#a3a3a3"
        className="px-4 py-4 rounded-2xl bg-paper-2 border border-ink-7 text-center font-serif text-xl text-ink mb-6"
      />

      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Peso actual (kg)</Text>
      <TextInput
        value={currentKg}
        onChangeText={setCurrentKg}
        keyboardType="decimal-pad"
        placeholder="80"
        placeholderTextColor="#a3a3a3"
        className="px-4 py-4 rounded-2xl bg-paper-2 border border-ink-7 text-center font-serif text-xl text-ink mb-6"
      />

      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Peso meta (kg)</Text>
      <TextInput
        value={goalKg}
        onChangeText={setGoalKg}
        keyboardType="decimal-pad"
        placeholder="75"
        placeholderTextColor="#a3a3a3"
        className="px-4 py-4 rounded-2xl bg-paper-2 border border-ink-7 text-center font-serif text-xl text-ink"
      />
    </OnboardingStep>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/body.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 3 body (sex, dob, height, weights)"
```

---

## Task 12: Step 4 — `app/onboarding/diet.tsx`

**Files:**
- Create: `fitkis-mobile/app/onboarding/diet.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/onboarding/diet.tsx
//
// Step 4 of 7. Optional. Captures diet_type, allergies, active_meals.
// Writes to user_profiles + diet_configs.

import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useUser } from '../../lib/hooks/useUser'
import { useToast } from '../../lib/hooks/useToast'
import { supabase } from '../../lib/supabase'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { DEFAULT_DAILY_BUDGET } from '../../lib/constants'

const DIET_OPTIONS = [
  { value: 'omnivoro',     label: 'Omnívoro' },
  { value: 'vegetariano',  label: 'Vegetariano' },
  { value: 'vegano',       label: 'Vegano' },
  { value: 'keto',         label: 'Keto' },
  { value: 'otro',         label: 'Otro' },
] as const

const ALLERGY_OPTIONS = ['Lactosa', 'Gluten', 'Mariscos', 'Frutos secos', 'Huevo', 'Soya']

const MEAL_OPTIONS: { key: string; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'snack1',   label: 'Snack 1'  },
  { key: 'comida',   label: 'Comida'   },
  { key: 'snack2',   label: 'Snack 2'  },
  { key: 'cena',     label: 'Cena'     },
  { key: 'snack3',   label: 'Snack 3'  },
]

export default function DietScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [diet, setDiet] = useState<typeof DIET_OPTIONS[number]['value'] | null>(null)
  const [allergies, setAllergies] = useState<Set<string>>(new Set())
  const [meals, setMeals] = useState<Record<string, boolean>>({
    desayuno: true, snack1: true, comida: true, snack2: false, cena: true, snack3: false,
  })
  const [saving, setSaving] = useState(false)

  const canContinue = diet !== null && !saving

  const writeDietConfig = async () => {
    if (!user) return
    await (supabase.from('user_profiles') as any)
      .update({
        diet_type: diet,
        allergies: Array.from(allergies),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    await (supabase.from('diet_configs') as any)
      .insert({
        user_id: user.id,
        active: true,
        active_meals: meals,
        ...DEFAULT_DAILY_BUDGET,
        effective_date: new Date().toISOString().split('T')[0],
      })
  }

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)
    try {
      await writeDietConfig()
      router.push('/onboarding/habits' as any)
    } catch {
      showToast('No pudimos guardar, intenta de nuevo')
    }
    setSaving(false)
  }

  const handleSkip = () => router.push('/onboarding/habits' as any)

  return (
    <OnboardingStep
      step={4}
      total={7}
      eyebrow="Tu plato"
      title={<>Cómo te <Text className="italic">alimentas</Text>.</>}
      explanation="El plato funciona por equivalentes del SMAE. Esto nos dice qué quitar de tu menú y dónde poner el énfasis."
      canContinue={canContinue}
      skippable
      showExit
      onBack={() => router.back()}
      onSkip={handleSkip}
      onContinue={handleContinue}
      onExit={async () => {
        if (!user) return
        await (supabase.from('user_profiles') as any)
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq('user_id', user.id)
        router.replace('/(app)/dashboard' as any)
      }}
    >
      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Tipo de dieta</Text>
      <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
        {DIET_OPTIONS.map((opt) => {
          const sel = diet === opt.value
          return (
            <Pressable
              key={opt.value}
              onPress={() => setDiet(opt.value)}
              className={`px-4 py-2.5 rounded-full ${sel ? 'bg-ink' : 'bg-paper-2'}`}
              style={sel ? undefined : { borderWidth: 1, borderColor: '#e5e5e5' }}
            >
              <Text className={`text-sm ${sel ? 'text-paper font-medium' : 'text-ink'}`}>{opt.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Alergias / lo que no comes</Text>
      <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
        {ALLERGY_OPTIONS.map((a) => {
          const sel = allergies.has(a)
          return (
            <Pressable
              key={a}
              onPress={() => {
                setAllergies((prev) => {
                  const next = new Set(prev)
                  if (next.has(a)) next.delete(a)
                  else next.add(a)
                  return next
                })
              }}
              className={`px-3 py-2 rounded-full ${sel ? 'bg-ink' : 'bg-paper-2'}`}
              style={sel ? undefined : { borderWidth: 1, borderColor: '#e5e5e5' }}
            >
              <Text className={`text-xs ${sel ? 'text-paper' : 'text-ink-3'}`}>{a}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text className="text-[10px] uppercase text-ink-4 mb-2" style={{ fontFamily: 'ui-monospace', letterSpacing: 1.2 }}>Comidas que típicamente haces</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {MEAL_OPTIONS.map((m) => {
          const on = meals[m.key]
          return (
            <Pressable
              key={m.key}
              onPress={() => setMeals((prev) => ({ ...prev, [m.key]: !prev[m.key] }))}
              className={`px-3 py-2 rounded-full ${on ? 'bg-ink' : 'bg-paper-2'}`}
              style={on ? undefined : { borderWidth: 1, borderColor: '#e5e5e5' }}
            >
              <Text className={`text-xs ${on ? 'text-paper' : 'text-ink-3'}`}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </OnboardingStep>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/diet.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 4 diet (skippable)"
```

---

## Task 13: Step 5 — `app/onboarding/habits.tsx`

**Files:**
- Create: `fitkis-mobile/app/onboarding/habits.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/onboarding/habits.tsx
//
// Step 5 of 7. Optional. User picks any number of predefined habits;
// each selection becomes a row in `habits`.

import { useState } from 'react'
import { Text } from 'react-native'
import { router } from 'expo-router'
import { useUser } from '../../lib/hooks/useUser'
import { useToast } from '../../lib/hooks/useToast'
import { supabase } from '../../lib/supabase'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'
import { HabitPickerGrid, HABIT_TEMPLATES } from '../../components/onboarding/HabitPickerGrid'

export default function HabitsScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleContinue = async () => {
    if (!user) return
    setSaving(true)
    try {
      if (selected.size > 0) {
        const rows = HABIT_TEMPLATES
          .filter((t) => selected.has(t.key))
          .map((t) => ({
            user_id: user.id,
            name: t.name,
            type: t.type,
            target_value: t.target_value,
            unit: t.unit,
            active: true,
          }))
        await (supabase.from('habits') as any).insert(rows)
      }
      router.push('/onboarding/gym' as any)
    } catch {
      showToast('No pudimos guardar, intenta de nuevo')
    }
    setSaving(false)
  }

  const handleSkip = () => router.push('/onboarding/gym' as any)

  return (
    <OnboardingStep
      step={5}
      total={7}
      eyebrow="Tus hábitos"
      title={<>Lo que quieres <Text className="italic">sostener</Text>.</>}
      explanation="Escoge los que importan ahora. Empieza con 2-3, agrega más después."
      canContinue={!saving}
      skippable
      showExit
      onBack={() => router.back()}
      onSkip={handleSkip}
      onContinue={handleContinue}
      onExit={async () => {
        if (!user) return
        await (supabase.from('user_profiles') as any)
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq('user_id', user.id)
        router.replace('/(app)/dashboard' as any)
      }}
      continueLabel={selected.size > 0 ? `Agregar ${selected.size}` : 'Saltar'}
    >
      <HabitPickerGrid selected={selected} onToggle={toggle} />
    </OnboardingStep>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/habits.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 5 habits picker (skippable)"
```

---

## Task 14: Refactor step 6 — `app/onboarding/gym.tsx` into the shell

**Files:**
- Modify: `fitkis-mobile/app/onboarding/gym.tsx`

This task is the heaviest. The current gym wizard is a self-contained multi-question screen with its own header, progress, validation, AI call, and write-back logic. We keep all of that **logic** but render the visible UI inside `OnboardingStep` so it stops feeling generic, and we wire the routes so the user lands here from `/onboarding/habits` and proceeds to `/onboarding/done`.

- [ ] **Step 1: Read the current `gym.tsx`**

Open `C:\Users\Rafae\Projects\fitkis-mobile\app\onboarding\gym.tsx`. Note three things:
1. The internal `step` state (the wizard already has its own multi-question page-flip).
2. The final action that writes `gym_onboarding_completed_at = now()` and seeds `user_exercise_weights`.
3. Where it currently `router.replace('/(app)/dashboard')`.

- [ ] **Step 2: Adjust the file**

Make the following edits to `app/onboarding/gym.tsx`:

a. **Replace the file's outer SafeAreaView + custom header with `OnboardingStep`.** The component continues to track its own internal `step` state for the question-by-question flow inside the wizard, but its OUTER chrome becomes:

```tsx
return (
  <OnboardingStep
    step={6}
    total={7}
    eyebrow="Tu entreno"
    title={<>Cómo <Text className="italic">entrenas</Text>.</>}
    explanation="La AI arma tu rutina y te recomienda pesos iniciales basados en tu nivel y tu cuerpo."
    canContinue={internalCanContinue}
    skippable={internalStep === 0}      // skip only allowed at the first sub-question
    showExit
    onBack={internalStep === 0 ? () => router.back() : () => setInternalStep((s) => s - 1)}
    onSkip={() => router.push('/onboarding/done' as any)}
    onContinue={internalHandleContinue}
    onExit={async () => {
      if (!user) return
      await (supabase.from('user_profiles') as any)
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
      router.replace('/(app)/dashboard' as any)
    }}
    continueLabel={internalStep === LAST_INTERNAL_STEP ? 'Recomendar' : 'Siguiente'}
  >
    {/* whatever sub-question UI corresponds to internalStep */}
  </OnboardingStep>
)
```

Replace the variable names (`internalStep`, `internalCanContinue`, `internalHandleContinue`, `LAST_INTERNAL_STEP`) with whatever the existing wizard already calls them. Do NOT rewrite the wizard logic — only the chrome.

b. **At the end of the AI-recommendation success path, replace `router.replace('/(app)/dashboard')` with `router.push('/onboarding/done')`.** The "done" screen will set `onboarding_completed_at` and route to dashboard.

c. **Remove the previous `gym_onboarding_completed_at = new Date().toISOString()` write** from inside this screen. The `done` screen owns finalizing onboarding now. (We keep `active_template_key` and the `user_exercise_weights` upserts here — those still belong to this step.)

- [ ] **Step 3: Smoke test**

In the simulator: navigate from a fresh signup through steps 1-5, land on step 6, complete the gym wizard. After the AI step, the screen should route to `/onboarding/done` (not the dashboard).

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/gym.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 6 gym wizard wrapped in shell + routes to done"
```

---

## Task 15: Step 7 — `app/onboarding/done.tsx`

**Files:**
- Create: `fitkis-mobile/app/onboarding/done.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/onboarding/done.tsx
//
// Step 7 of 7. Recap of what was configured + Entrar button. Sets
// onboarding_completed_at = now() and routes to the dashboard.

import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { useUser } from '../../lib/hooks/useUser'
import { useToast } from '../../lib/hooks/useToast'
import { supabase } from '../../lib/supabase'
import { OnboardingStep } from '../../components/onboarding/OnboardingStep'

type Recap = {
  display_name?: string | null
  goal_weight_kg?: number | null
  diet_type?: string | null
  habit_count?: number
  template_key?: string | null
}

export default function DoneScreen() {
  const { user } = useUser()
  const { showToast } = useToast()
  const [recap, setRecap] = useState<Recap | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [profileRes, habitsRes] = await Promise.all([
        (supabase as any)
          .from('user_profiles')
          .select('display_name, goal_weight_kg, diet_type, active_template_key')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('habits')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('active', true),
      ])
      setRecap({
        display_name: profileRes.data?.display_name,
        goal_weight_kg: profileRes.data?.goal_weight_kg,
        diet_type: profileRes.data?.diet_type,
        template_key: profileRes.data?.active_template_key,
        habit_count: habitsRes.count ?? 0,
      })
    })()
  }, [user])

  const handleContinue = async () => {
    if (!user) return
    setSaving(true)
    try {
      await (supabase.from('user_profiles') as any)
        .update({
          onboarding_completed_at: new Date().toISOString(),
          gym_onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      router.replace('/(app)/dashboard' as any)
    } catch {
      showToast('No pudimos terminar, intenta de nuevo')
    }
    setSaving(false)
  }

  return (
    <OnboardingStep
      step={7}
      total={7}
      eyebrow="Listo"
      title={<><Text className="italic">Vamos.</Text></>}
      explanation="Lo que configuraste:"
      canContinue={!saving}
      showBack={false}
      onContinue={handleContinue}
      continueLabel="Entrar"
    >
      <View className="bg-paper-2 rounded-2xl p-5" style={{ gap: 12 }}>
        {recap?.display_name && (
          <Text className="text-sm text-ink-3">
            Te llamamos <Text className="font-medium text-ink">{recap.display_name}</Text>.
          </Text>
        )}
        {recap?.goal_weight_kg != null && (
          <Text className="text-sm text-ink-3">
            Meta: <Text className="font-medium text-ink">{recap.goal_weight_kg} kg</Text>.
          </Text>
        )}
        {recap?.diet_type && (
          <Text className="text-sm text-ink-3">
            Dieta: <Text className="font-medium text-ink capitalize">{recap.diet_type}</Text>.
          </Text>
        )}
        {recap?.habit_count !== undefined && recap.habit_count > 0 && (
          <Text className="text-sm text-ink-3">
            Hábitos activos: <Text className="font-medium text-ink">{recap.habit_count}</Text>.
          </Text>
        )}
        {recap?.template_key && (
          <Text className="text-sm text-ink-3">
            Rutina: <Text className="font-medium text-ink">{recap.template_key}</Text>.
          </Text>
        )}
      </View>
    </OnboardingStep>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/onboarding/done.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(onboarding): step 7 done (recap + finalize)"
```

---

## Task 16: Wire the dashboard auth gate

**Files:**
- Modify: `fitkis-mobile/app/(app)/dashboard.tsx`

- [ ] **Step 1: Find the existing auth gate**

In `app/(app)/dashboard.tsx`, search for `gym_onboarding_completed_at`. There's a block that reads the profile and conditionally returns `<Redirect href={'/onboarding/gym' as any} />`.

- [ ] **Step 2: Replace the gate logic**

Update the profile load to also pull the new fields, and use the helper:

```tsx
import { nextOnboardingRoute } from '../../lib/onboarding-state'

// inside load(), update the user_profiles select to include the new fields:
(supabase as any)
  .from('user_profiles')
  .select('goal_weight_kg, gym_onboarding_completed_at, onboarding_completed_at, display_name, height_cm')
  .eq('user_id', user.id)
  .maybeSingle(),

// then where the redirect logic was:
const profile = (profileRes.data as any) ?? null
const route = nextOnboardingRoute(profile)
if (route) {
  setNeedsOnboardingRoute(route)
  setLoading(false)
  return
}

// ...later in render:
if (needsOnboardingRoute) {
  return <Redirect href={needsOnboardingRoute as any} />
}
```

Replace the previous `needsOnboarding` boolean state with `needsOnboardingRoute: string | null`.

- [ ] **Step 3: Smoke-test the full flow on the simulator**

Sign out and sign back in (or apply migration 023 which already cleared your `onboarding_completed_at`). You should land on `/onboarding/welcome`. Walk through all 7 steps. After "Entrar" on step 7, you should land on the dashboard. Force-quit the app mid-flow (e.g., during step 4) and reopen — you should resume at step 4, not at step 1.

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\Rafae\Projects\fitkis-mobile" add app/'(app)'/dashboard.tsx
git -C "C:\Users\Rafae\Projects\fitkis-mobile" commit -m "feat(dashboard): use nextOnboardingRoute for auth gate"
```

---

## Final smoke test checklist

After all 16 tasks are committed, walk through this once on the simulator:

- [ ] Sign out, sign back in → lands on `/onboarding/welcome` with the animation.
- [ ] Tap "Empezar" → step 2. Type a name, pick a tone, "Siguiente".
- [ ] Step 3: pick sex, dob, type height/weights → "Siguiente".
- [ ] Step 4: pick diet, allergies, meals → "Siguiente". Verify the saved row in `diet_configs`.
- [ ] Step 5: pick 3 habits → "Agregar 3". Verify three new rows in `habits`.
- [ ] Step 6: complete the gym wizard normally.
- [ ] Step 7: see the recap, tap "Entrar" → land on dashboard.
- [ ] Verify `user_profiles.onboarding_completed_at` is set.
- [ ] Force-quit the app on step 4 mid-fill, reopen → resumes at step 4.
- [ ] Tap "[×]" on step 5 → confirms exit → dashboard. `onboarding_completed_at` is set.

If any of those fail, check which task introduced the gap.
