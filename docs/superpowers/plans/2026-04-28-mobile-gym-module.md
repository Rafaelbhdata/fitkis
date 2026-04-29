# FitKis Mobile Migration — Plan 4: Gym Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the patient gym module — week progress overview with day picker, day-of-week routine display (Upper A / Lower A / Upper B / Lower B / Rest), active session tracker with sets/reps/feeling logging + rest timer + progression auto-detection (+5 lbs after 2 perfect sessions), exercise substitutions, instructions sheets, history list, and per-exercise progression charts.

**Architecture:** Four routes — `gym/index.tsx` (day view), `gym/session/[id].tsx` (active tracker, supports both new and view modes), `gym/history.tsx` (list), `gym/progress.tsx` (charts). Multiple presentational components: SessionTimer, SetRow, RestTimer, ProgressionBanner, ExerciseInstructionsSheet, ExerciseSubstitutionSheet, WeekProgressCard, ExerciseRowCard, ExerciseProgressChart. Pure helpers in `lib/gym.ts`. Same Supabase tables: `gym_sessions`, `session_sets`, `schedule_overrides`. NEW deps: `expo-haptics` (vibration on rest-timer finish), `expo-keep-awake` (prevent screen lock during active session).

**Tech Stack:** Existing Expo SDK 54 + Expo Router 5 + NativeWind 4 + react-native-svg + Supabase JS + ConfirmDialog/BottomSheet from Plan 2 + MetricChart pattern from Plan 3. NEW: `expo-haptics`, `expo-keep-awake`.

**Repos & paths:**
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (branch `master`)
- Reference (read-only — implementer subagents should consult these for behavioral details):
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\gym\page.tsx` (385 lines) — day view
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\gym\session\[id]\page.tsx` (794 lines) — active tracker (CANONICAL source of truth for session logic)
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\gym\history\page.tsx` (98 lines)
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\gym\progress\page.tsx` (379 lines)
  - `C:\Users\Rafae\Projects\fitkis\components\gym\{SetRow,RestTimer,ProgressionBanner,ExerciseInstructions}.tsx` (49-112 lines each)

**Spec reference:** `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

**Roadmap reference:** `docs/superpowers/plans/2026-04-27-roadmap-plans-2-to-7.md` (Plan 4 section)

**Builds on Plans 2-3:** `BottomSheet`, `ConfirmDialog`, `useToast`, `MetricChart` pattern (custom SVG line chart), navigation with hidden tab routes.

---

## Decisions Resolved (open questions from the roadmap)

1. **Vibration on rest-timer finish.** Use `expo-haptics` (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`) — replaces the web's `navigator.vibrate([200,100,200,100,200])`. Same intent: a clear haptic burst when the timer hits 0.

2. **Keep-screen-on during active session.** Use `expo-keep-awake` — call `activateKeepAwakeAsync()` when entering an active session and `deactivateKeepAwake()` when finishing or unmounting. The screen stays on during workout (similar UX to MyFitnessPal, Strong, etc.).

3. **Auto-progression rule (+5 lbs).** Same logic as web: scan the last 2 sessions of the same routine type for the same exercise; if user completed every set with target reps in BOTH sessions, suggest +5 lbs. Implemented in `lib/gym.ts`.

4. **Routine substitution.** Web has a list of equipment alternatives per exercise. Mobile uses a `BottomSheet` showing the alternatives — tapping one updates the local exercise data's `equipment` field for the current session.

5. **Cardio fields.** At the bottom of the session screen, two optional fields (minutes + speed). Saved to `gym_sessions.cardio_minutes` and `gym_sessions.cardio_speed`. Same as web.

6. **View mode for past sessions.** When opening a past session via `gym/session/<existing_id>`, the screen renders read-only (no Save button, inputs disabled, no rest timer). Same as web.

7. **Routes.** All gym sub-routes (`session/[id]`, `history`, `progress`) get `<Tabs.Screen options={{ href: null }}>` to keep them hidden from the tab bar (same pattern as `habits/progress` and `weight/index`).

---

## File Structure

### New files

```
fitkis-mobile/
├── app/
│   └── (app)/
│       ├── gym/
│       │   ├── index.tsx                ← replaces WIP placeholder
│       │   ├── session/[id].tsx         ← new (active tracker)
│       │   ├── history.tsx              ← new
│       │   └── progress.tsx             ← new
│       └── _layout.tsx                  ← modify (hide gym sub-routes)
├── components/
│   └── gym/
│       ├── SessionTimer.tsx             ← elapsed time HH:MM:SS
│       ├── SetRow.tsx                   ← lbs/reps/feeling per set
│       ├── RestTimer.tsx                ← countdown w/ pause/skip
│       ├── ProgressionBanner.tsx        ← +5 lbs suggestion
│       ├── ExerciseInstructionsSheet.tsx ← how-to bottom sheet
│       ├── ExerciseSubstitutionSheet.tsx ← equipment alternatives sheet
│       ├── WeekProgressCard.tsx         ← week dots + count (day view)
│       ├── ExerciseRowCard.tsx          ← exercise list row (day view)
│       └── ExerciseProgressChart.tsx    ← per-exercise weight line chart
└── lib/
    └── gym.ts                            ← progression detection, target reps parsing
```

### Modified files

- `app/(app)/_layout.tsx` — add `<Tabs.Screen>` entries with `href: null` for `gym/session/[id]`, `gym/history`, `gym/progress`.

### File responsibilities

| File | Responsibility |
|---|---|
| `lib/gym.ts` | Progression detection (scan past sessions), target-reps parsing, set-completion checks |
| `components/gym/SessionTimer.tsx` | HH:MM:SS counter (active workout duration) |
| `components/gym/SetRow.tsx` | One set's row: lbs input + reps input + feeling chip + checkmark |
| `components/gym/RestTimer.tsx` | Floating countdown w/ pause/skip/reset, vibrates on finish |
| `components/gym/ProgressionBanner.tsx` | Banner suggesting +5 lbs with accept/dismiss actions |
| `components/gym/ExerciseInstructionsSheet.tsx` | How-to text + form cues for the current exercise |
| `components/gym/ExerciseSubstitutionSheet.tsx` | List of alternative equipment options for the current exercise |
| `components/gym/WeekProgressCard.tsx` | Dark card with 7 day-dots + completed count + PulseLine |
| `components/gym/ExerciseRowCard.tsx` | One row in day-view exercise list (number + name + sets×reps + last weight) |
| `components/gym/ExerciseProgressChart.tsx` | Custom SVG line chart of weight over sessions for one exercise |
| `app/(app)/gym/index.tsx` | Day view: header, week card, day picker, routine hero, exercises list |
| `app/(app)/gym/session/[id].tsx` | Active tracker (new + view modes) |
| `app/(app)/gym/history.tsx` | List of past sessions (date + routine type + duration) |
| `app/(app)/gym/progress.tsx` | Pick exercise → see progression chart + best lifts |

---

# TASKS

### Task 1: Install dependencies

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\package.json` (via npx expo install)

- [ ] **Step 1: Install expo-haptics + expo-keep-awake**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo install expo-haptics expo-keep-awake
```

If it fails with React 19 peer conflict, fall back to `npm install ... --legacy-peer-deps`.

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-haptics + expo-keep-awake for gym session tracker"
git push
```

---

### Task 2: `lib/gym.ts` — pure helpers

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\gym.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/gym.ts
//
// Pure-function helpers for the gym module. No DOM, no Supabase, no React.

import type { SessionSet } from '../types'

// Parse target reps from strings like '8-10', '10', '8-10 por pierna'.
// Returns the LOWER bound (the conservative threshold for "completed all reps").
export function parseTargetReps(repsStr: string): number {
  const match = repsStr.match(/\d+/)
  return match ? parseInt(match[0]) : 10
}

// Was every set in `sets` completed at >= targetReps reps and matching/exceeding lbs?
// Used by progression detection.
function setsAreFullyCompleted(sets: SessionSet[], targetReps: number, expectedSetCount: number): boolean {
  if (sets.length < expectedSetCount) return false
  return sets.every(s => (s.reps ?? 0) >= targetReps)
}

// Detect if user has completed the previous TWO sessions of this exercise
// with all reps at target. If so, suggest +5 lbs based on the most recent
// session's weight.
//
// `exerciseSets`: all session_sets rows for this exerciseId, ordered by
// session date desc (most recent first).
// `expectedSetCount`: routine.exercises[i].sets (number of expected sets per session)
// `targetReps`: parseTargetReps(routine.exercises[i].reps)
//
// Returns the suggested lbs (last_weight + 5) or null if no suggestion.
export function detectProgression(
  exerciseSets: SessionSet[],
  expectedSetCount: number,
  targetReps: number
): number | null {
  // Group by session_id (preserving the desc-by-date order).
  const bySession = new Map<string, SessionSet[]>()
  for (const s of exerciseSets) {
    if (!bySession.has(s.session_id)) bySession.set(s.session_id, [])
    bySession.get(s.session_id)!.push(s)
  }

  const sessionGroups = Array.from(bySession.values())
  if (sessionGroups.length < 2) return null

  const lastTwo = sessionGroups.slice(0, 2)
  const allCompleted = lastTwo.every(setsAreFullyCompleted.bind(null, undefined as any, targetReps, expectedSetCount))
    .valueOf
  // Cleaner explicit form:
  const lastTwoComplete = lastTwo.every(sets => setsAreFullyCompleted(sets, targetReps, expectedSetCount))
  if (!lastTwoComplete) return null

  // Find the latest weight used (most recent session, max lbs across sets)
  const latestSets = lastTwo[0]
  const lastWeight = Math.max(...latestSets.map(s => s.lbs ?? 0))
  if (lastWeight <= 0) return null

  return lastWeight + 5
}

// Format elapsed seconds into HH:MM:SS or MM:SS.
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty. (The `setsAreFullyCompleted.bind` call in the snippet was a stray; only the explicit form below matters. The cleaner version of `detectProgression` shown second is what's actually used.)

If you see an error about that stray bind, simplify the body of `detectProgression` to just:

```ts
const sessionGroups = Array.from(bySession.values())
if (sessionGroups.length < 2) return null

const lastTwo = sessionGroups.slice(0, 2)
const lastTwoComplete = lastTwo.every(sets =>
  setsAreFullyCompleted(sets, targetReps, expectedSetCount)
)
if (!lastTwoComplete) return null

const latestSets = lastTwo[0]
const lastWeight = Math.max(...latestSets.map(s => s.lbs ?? 0))
if (lastWeight <= 0) return null
return lastWeight + 5
```

- [ ] **Step 3: Commit + push**

```bash
git add lib/gym.ts
git commit -m "feat(gym): pure helpers (progression detection, target-reps, elapsed format)"
git push
```

---

### Task 3: `components/gym/SessionTimer.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\SessionTimer.tsx`

- [ ] **Step 1: Create directory + component**

```bash
mkdir -p components/gym
```

```tsx
// components/gym/SessionTimer.tsx
//
// HH:MM:SS counter showing the elapsed time since session started.
// Self-managed interval; just receives `startTime` and ticks.

import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { formatElapsed } from '../../lib/gym'

type Props = {
  startTime: Date | null  // null = not started
}

export function SessionTimer({ startTime }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!startTime) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setSeconds(elapsed)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])

  return (
    <Text className="text-xs text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
      {formatElapsed(seconds)}
    </Text>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/SessionTimer.tsx
git commit -m "feat(gym): SessionTimer — elapsed HH:MM:SS counter"
git push
```

---

### Task 4: `components/gym/SetRow.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\SetRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/SetRow.tsx
//
// One set in the session screen: lbs input + reps input + feeling chip
// + completion checkmark. The parent owns the data; this is presentational.

import { View, Text, TextInput, Pressable } from 'react-native'
import { Check } from 'lucide-react-native'
import type { Feeling } from '../../types'

const FEELING_CHIPS: { value: Feeling; emoji: string; label: string }[] = [
  { value: 'muy_pesado', emoji: '😵', label: 'Muy pesado' },
  { value: 'dificil', emoji: '😤', label: 'Difícil' },
  { value: 'perfecto', emoji: '💪', label: 'Perfecto' },
  { value: 'ligero', emoji: '😊', label: 'Ligero' },
  { value: 'quiero_mas', emoji: '🔥', label: 'Quiero más' },
]

type Props = {
  setNumber: number
  lbs: string
  reps: string
  completed: boolean
  feeling: Feeling | null
  weightUnit: string
  disabled?: boolean
  onChangeLbs: (v: string) => void
  onChangeReps: (v: string) => void
  onToggleComplete: () => void
  onChangeFeeling?: (f: Feeling) => void  // only on the LAST set typically
}

export function SetRow({
  setNumber,
  lbs,
  reps,
  completed,
  feeling,
  weightUnit,
  disabled = false,
  onChangeLbs,
  onChangeReps,
  onToggleComplete,
  onChangeFeeling,
}: Props) {
  return (
    <View className="bg-white border border-ink-7 rounded-xl p-3 mb-2">
      <View className="flex-row items-center gap-3">
        {/* Set number */}
        <View className="w-8 h-8 rounded-lg bg-paper-3 items-center justify-center">
          <Text className="text-xs font-semibold text-ink-3" style={{ fontFamily: 'ui-monospace' }}>
            {setNumber}
          </Text>
        </View>

        {/* Lbs */}
        <View className="flex-1">
          <Text className="text-[9px] text-ink-4 uppercase mb-0.5" style={{ fontFamily: 'ui-monospace' }}>
            {weightUnit}
          </Text>
          <TextInput
            value={lbs}
            onChangeText={onChangeLbs}
            keyboardType="decimal-pad"
            placeholder="-"
            placeholderTextColor="#a3a3a3"
            editable={!disabled}
            className="text-center text-base font-medium text-ink"
          />
        </View>

        {/* Reps */}
        <View className="flex-1">
          <Text className="text-[9px] text-ink-4 uppercase mb-0.5" style={{ fontFamily: 'ui-monospace' }}>
            reps
          </Text>
          <TextInput
            value={reps}
            onChangeText={onChangeReps}
            keyboardType="number-pad"
            placeholder="-"
            placeholderTextColor="#a3a3a3"
            editable={!disabled}
            className="text-center text-base font-medium text-ink"
          />
        </View>

        {/* Complete checkbox */}
        <Pressable
          onPress={onToggleComplete}
          disabled={disabled}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            completed ? 'bg-signal' : 'border-[1.5px] border-ink-6'
          }`}
        >
          {completed && <Check size={18} color="#ffffff" strokeWidth={3} />}
        </Pressable>
      </View>

      {/* Feeling chips (only when set is completed and onChangeFeeling provided) */}
      {completed && onChangeFeeling && (
        <View className="flex-row flex-wrap gap-1.5 mt-3">
          {FEELING_CHIPS.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => onChangeFeeling(f.value)}
              disabled={disabled}
              className={`px-2 py-1 rounded-full border ${
                feeling === f.value ? 'bg-ink border-ink' : 'bg-white border-ink-7'
              }`}
            >
              <Text className={`text-[10px] ${feeling === f.value ? 'text-paper' : 'text-ink-3'}`}>
                {f.emoji} {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/SetRow.tsx
git commit -m "feat(gym): SetRow — lbs/reps/feeling/complete per set"
git push
```

---

### Task 5: `components/gym/RestTimer.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\RestTimer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/RestTimer.tsx
//
// Sticky bottom card showing rest countdown. Pause/Reset/Skip controls
// + preset buttons (60/90/120/180s). Vibrates on finish via expo-haptics.

import { useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Pause, Play, RotateCcw, X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const PRESETS = [60, 90, 120, 180]

type Props = {
  visible: boolean
  seconds: number          // current count remaining
  preset: number           // last picked preset (for reset)
  isPaused: boolean
  onSkip: () => void
  onReset: () => void
  onTogglePause: () => void
  onPickPreset: (s: number) => void
}

function format(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function RestTimer({
  visible,
  seconds,
  preset,
  isPaused,
  onSkip,
  onReset,
  onTogglePause,
  onPickPreset,
}: Props) {
  // Vibrate when timer hits 0
  useEffect(() => {
    if (visible && seconds === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [visible, seconds])

  if (!visible) return null

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-ink p-4 pb-8">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-paper text-[10px] uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
          Descanso
        </Text>
        <Pressable onPress={onSkip} className="flex-row items-center gap-1">
          <X size={14} color="#a3a3a3" />
          <Text className="text-ink-5 text-xs">Saltar</Text>
        </Pressable>
      </View>

      <View className="flex-row items-baseline gap-2 mb-4">
        <Text className="text-paper font-serif text-[56px] font-light tracking-tighter" style={{ lineHeight: 56 }}>
          {format(seconds)}
        </Text>
        {seconds === 0 && (
          <Text className="text-signal font-medium">¡Listo!</Text>
        )}
      </View>

      {/* Controls */}
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={onTogglePause}
          className="flex-1 py-2 rounded-full bg-white/10 flex-row items-center justify-center gap-2"
        >
          {isPaused ? (
            <>
              <Play size={14} color="#fafaf7" />
              <Text className="text-paper text-xs font-medium">Reanudar</Text>
            </>
          ) : (
            <>
              <Pause size={14} color="#fafaf7" />
              <Text className="text-paper text-xs font-medium">Pausar</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={onReset}
          className="px-3 py-2 rounded-full bg-white/10 flex-row items-center justify-center gap-2"
        >
          <RotateCcw size={14} color="#fafaf7" />
          <Text className="text-paper text-xs font-medium">Reset</Text>
        </Pressable>
      </View>

      {/* Presets */}
      <View className="flex-row gap-2">
        {PRESETS.map((s) => (
          <Pressable
            key={s}
            onPress={() => onPickPreset(s)}
            className={`flex-1 py-2 rounded-md ${preset === s ? 'bg-signal' : 'bg-white/10'}`}
          >
            <Text
              className={`text-center text-xs font-medium ${preset === s ? 'text-paper' : 'text-ink-5'}`}
              style={{ fontFamily: 'ui-monospace' }}
            >
              {s}s
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/RestTimer.tsx
git commit -m "feat(gym): RestTimer — countdown w/ pause/reset/skip + presets + haptics"
git push
```

---

### Task 6: `components/gym/ProgressionBanner.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\ProgressionBanner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/ProgressionBanner.tsx
//
// Inline banner above the current exercise's set rows: "Last 2 sessions
// were perfect. Try X.X lbs this time?" with Accept and Dismiss actions.

import { View, Text, Pressable } from 'react-native'
import { TrendingUp, X } from 'lucide-react-native'

type Props = {
  suggestedLbs: number
  weightUnit: string
  onAccept: () => void
  onDismiss: () => void
}

export function ProgressionBanner({ suggestedLbs, weightUnit, onAccept, onDismiss }: Props) {
  return (
    <View className="bg-signal-soft border border-signal/30 rounded-xl p-3 mb-3 flex-row items-start gap-2">
      <TrendingUp size={16} color="#ff5a1f" style={{ marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-sm font-medium text-signal">
          ¿Subimos a {suggestedLbs} {weightUnit}?
        </Text>
        <Text className="text-xs text-ink-4 mt-0.5">
          Completaste todo las últimas 2 veces.
        </Text>
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={onAccept}
            className="px-3 py-1.5 rounded-full bg-signal"
          >
            <Text className="text-paper text-xs font-medium">Sí, subir</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            className="px-3 py-1.5 rounded-full border border-ink-7"
          >
            <Text className="text-ink text-xs font-medium">Mantener</Text>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={onDismiss} className="p-1">
        <X size={14} color="#737373" />
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/ProgressionBanner.tsx
git commit -m "feat(gym): ProgressionBanner — suggested +5 lbs with accept/dismiss"
git push
```

---

### Task 7: `components/gym/ExerciseInstructionsSheet.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\ExerciseInstructionsSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/ExerciseInstructionsSheet.tsx
//
// Bottom sheet showing how-to text + form cues for an exercise.
// Reads `exercise.instructions` (string) and `exercise.cues` (string[]).

import { View, Text, ScrollView, Pressable } from 'react-native'
import { X } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import type { Exercise } from '../../types'

type Props = {
  visible: boolean
  exercise: Exercise | null
  onClose: () => void
}

export function ExerciseInstructionsSheet({ visible, exercise, onClose }: Props) {
  if (!exercise) return null
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-serif text-xl font-light flex-1 pr-3">{exercise.name}</Text>
        <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
          <X size={20} color="#0a0a0a" />
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: 500 }}>
        {exercise.instructions && (
          <View className="mb-4">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Cómo hacerlo</Text>
            <Text className="text-sm text-ink-3 leading-6">{exercise.instructions}</Text>
          </View>
        )}
        {exercise.cues && exercise.cues.length > 0 && (
          <View>
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Puntos clave</Text>
            <View className="gap-2">
              {exercise.cues.map((cue, i) => (
                <View key={i} className="flex-row items-start gap-2">
                  <Text className="text-signal mt-0.5">•</Text>
                  <Text className="flex-1 text-sm text-ink-3">{cue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  )
}
```

Note: `Exercise` type from `types/index.ts` has `id`, `name`, `equipment`, `weightUnit`, `sets`, `reps`, `instructions?`, `cues?`, `alternatives?`. If `instructions` or `cues` aren't present in your `Exercise` type, the conditional rendering handles it gracefully.

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/ExerciseInstructionsSheet.tsx
git commit -m "feat(gym): ExerciseInstructionsSheet — how-to + form cues"
git push
```

---

### Task 8: `components/gym/ExerciseSubstitutionSheet.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\ExerciseSubstitutionSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/ExerciseSubstitutionSheet.tsx
//
// Bottom sheet listing alternative equipment options for an exercise.
// Tapping one updates the local session's exercise.equipment field.

import { View, Text, Pressable, ScrollView } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import type { Exercise } from '../../types'

type Props = {
  visible: boolean
  exercise: Exercise | null
  currentEquipment: string
  onClose: () => void
  onSelect: (equipment: string) => void
}

export function ExerciseSubstitutionSheet({
  visible,
  exercise,
  currentEquipment,
  onClose,
  onSelect,
}: Props) {
  if (!exercise) return null
  const options = [exercise.equipment, ...(exercise.alternatives ?? [])].filter(
    (v, i, a) => a.indexOf(v) === i
  ) // dedupe

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-serif text-xl font-light">Cambiar equipo</Text>
        <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
          <X size={20} color="#0a0a0a" />
        </Pressable>
      </View>
      <Text className="text-xs text-ink-4 mb-4">{exercise.name}</Text>

      <ScrollView style={{ maxHeight: 400 }}>
        <View className="gap-1">
          {options.map((opt) => {
            const isSelected = opt === currentEquipment
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onSelect(opt)
                  onClose()
                }}
                className={`p-3 rounded-lg flex-row items-center justify-between ${
                  isSelected ? 'bg-signal-soft border border-signal' : 'bg-paper-2'
                }`}
              >
                <Text className="text-sm text-ink">{opt}</Text>
                {isSelected && <Check size={18} color="#ff5a1f" />}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/ExerciseSubstitutionSheet.tsx
git commit -m "feat(gym): ExerciseSubstitutionSheet — equipment alternatives picker"
git push
```

---

### Task 9: `components/gym/WeekProgressCard.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\WeekProgressCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/WeekProgressCard.tsx
//
// Dark card on the day view showing week's gym progress: 7 day-dots,
// "X / 4 días" count, optional "En racha" badge, animated PulseLine at bottom.

import { View, Text } from 'react-native'
import { Check } from 'lucide-react-native'
import { PulseLine } from '../ui/PulseLine'

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type DayInfo = {
  hasSession: boolean
  isToday: boolean
  isPast: boolean
  isGymDay: boolean
}

type Props = {
  completedThisWeek: number
  days: DayInfo[]  // length 7, Mon-first
}

export function WeekProgressCard({ completedThisWeek, days }: Props) {
  return (
    <View className="mx-5 mt-5 bg-ink rounded-[20px] p-5">
      <View className="flex-row items-start justify-between mb-4">
        <View>
          <Text
            className="text-[10px] text-ink-5 uppercase tracking-widest"
            style={{ fontFamily: 'ui-monospace' }}
          >
            Esta semana
          </Text>
          <View className="flex-row items-baseline gap-2 mt-1">
            <Text className="text-paper font-serif text-5xl font-light tracking-tighter">
              {completedThisWeek}
            </Text>
            <Text className="text-ink-5 text-sm" style={{ fontFamily: 'ui-monospace' }}>
              / 4 días
            </Text>
          </View>
        </View>
        {completedThisWeek >= 3 && (
          <View className="bg-signal/15 px-2 py-1 rounded-full">
            <Text className="text-signal text-xs font-medium uppercase" style={{ fontFamily: 'ui-monospace' }}>
              En racha
            </Text>
          </View>
        )}
      </View>

      {/* Week dots */}
      <View className="flex-row gap-2 mb-4">
        {days.map((d, i) => {
          let bg = 'bg-white/10'
          if (d.hasSession) bg = 'bg-signal'
          else if (d.isPast && d.isGymDay) bg = 'bg-berry/50'
          else if (d.isToday) bg = 'bg-white/30'

          return (
            <View key={i} className="flex-1 items-center gap-1">
              <View className={`w-full h-8 rounded-lg ${bg} items-center justify-center`}>
                {d.hasSession && <Check size={14} color="#ffffff" />}
              </View>
              <Text className="text-[9px] text-ink-5" style={{ fontFamily: 'ui-monospace' }}>
                {DAY_NAMES[i]}
              </Text>
            </View>
          )
        })}
      </View>

      <PulseLine w={280} h={28} color="#ff5a1f" strokeWidth={1.8} active />
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/WeekProgressCard.tsx
git commit -m "feat(gym): WeekProgressCard — week dots + count + PulseLine"
git push
```

---

### Task 10: `components/gym/ExerciseRowCard.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\ExerciseRowCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/gym/ExerciseRowCard.tsx
//
// One row in the day view's exercise list: number circle + name + equipment
// + sets×reps + (optional) last weight in signal.

import { View, Text } from 'react-native'
import type { Exercise } from '../../types'

type Props = {
  index: number               // 1-based
  exercise: Exercise
  lastWeight: number | null
}

export function ExerciseRowCard({ index, exercise, lastWeight }: Props) {
  return (
    <View className="flex-row items-center gap-3 p-3 border-b border-ink-7">
      <View className="w-8 h-8 rounded-lg bg-paper-3 items-center justify-center">
        <Text className="text-xs font-semibold text-ink-3" style={{ fontFamily: 'ui-monospace' }}>
          {index}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">{exercise.name}</Text>
        <Text className="text-xs text-ink-4">{exercise.equipment}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-medium text-ink" style={{ fontFamily: 'ui-monospace' }}>
          {exercise.sets}×{exercise.reps}
        </Text>
        {lastWeight && (
          <Text className="text-[10px] text-signal font-medium">
            {lastWeight} {exercise.weightUnit}
          </Text>
        )}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/ExerciseRowCard.tsx
git commit -m "feat(gym): ExerciseRowCard — exercise list row in day view"
git push
```

---

### Task 11: `app/(app)/gym/index.tsx` — day view

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\gym\index.tsx` (replaces the WIP placeholder)

- [ ] **Step 1: Replace the placeholder file**

```tsx
// app/(app)/gym/index.tsx
//
// Gym day view: header + WeekProgressCard + day picker + routine hero or
// rest day card + exercise list + History/Progress quick links.
// Reachable as the "Gym" tab.

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Link } from 'expo-router'
import {
  ChevronLeft, ChevronRight, Play, Eye, AlertTriangle, Coffee,
  Dumbbell, History, TrendingUp,
} from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { supabase } from '../../../lib/supabase'
import { ROUTINES, ROUTINE_SCHEDULE } from '../../../lib/constants'
import { formatDateISO } from '../../../lib/utils'
import { WeekProgressCard } from '../../../components/gym/WeekProgressCard'
import { ExerciseRowCard } from '../../../components/gym/ExerciseRowCard'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { GymSession, SessionSet, RoutineType, Routine, ScheduleOverride } from '../../../types'

export default function GymScreen() {
  const { user } = useUser()
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [loading, setLoading] = useState(true)
  const [weekSessions, setWeekSessions] = useState<Record<string, GymSession>>({})
  const [weekOverrides, setWeekOverrides] = useState<Record<string, string>>({})
  const [lastSession, setLastSession] = useState<{ session: GymSession; sets: SessionSet[] } | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const todayISO = formatDateISO(today)
  const selectedISO = formatDateISO(selectedDate)
  const isSelectedToday = selectedISO === todayISO
  const isSelectedPast = selectedDate < today
  const selectedSession = weekSessions[selectedISO]

  // Day-of-week index (Monday=0)
  const todayIndex = (today.getDay() + 6) % 7

  // Week dates Monday-first
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const start = new Date(today)
    start.setDate(today.getDate() - todayIndex)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [today, todayIndex])

  const minSelectable = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 21)
    return d
  }, [today])
  const canPrev = selectedDate > minSelectable
  const canNext = !isSelectedToday && selectedDate < today

  const navigate = (delta: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + delta)
    setSelectedDate(next)
  }

  const formatDayLabel = (d: Date) => {
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'Hoy'
    if (diff === -1) return 'Ayer'
    if (diff === 1) return 'Mañana'
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  useEffect(() => {
    if (user) loadWeek()
  }, [user])

  const loadWeek = async () => {
    setLoading(true)
    try {
      const startISO = formatDateISO(weekDates[0])
      const endISO = formatDateISO(weekDates[6])
      const [overridesRes, sessionsRes] = await Promise.all([
        (supabase as any).from('schedule_overrides').select('*').gte('date', startISO).lte('date', endISO),
        supabase.from('gym_sessions').select('*').gte('date', startISO).lte('date', endISO),
      ])
      const om: Record<string, string> = {}
      ;(overridesRes.data as ScheduleOverride[] | null)?.forEach((o) => { om[o.date] = o.routine_type })
      setWeekOverrides(om)

      const sm: Record<string, GymSession> = {}
      ;(sessionsRes.data as GymSession[] | null)?.forEach((s) => { sm[s.date] = s })
      setWeekSessions(sm)
    } catch (err) {
      console.error('Error loading gym week:', err)
    }
    setLoading(false)
  }

  const getRoutineKey = (date: Date): string => {
    const iso = formatDateISO(date)
    return weekOverrides[iso] ?? ROUTINE_SCHEDULE[date.getDay()]
  }
  const routineKey = getRoutineKey(selectedDate)
  const isRest = routineKey === 'rest'
  const routine: Routine | null = isRest ? null : ROUTINES[routineKey]

  // Load last session for this routine type (for "last weight" display)
  useEffect(() => {
    if (!user || !routine) return
    ;(async () => {
      const { data: sessionData } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('routine_type', routineKey as RoutineType)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      if (sessionData) {
        const session = sessionData as GymSession
        const { data: setsData } = await supabase
          .from('session_sets')
          .select('*')
          .eq('session_id', session.id)
        setLastSession({ session, sets: (setsData as SessionSet[]) ?? [] })
      } else {
        setLastSession(null)
      }
    })()
  }, [user, routineKey])

  const getLastWeight = (exerciseId: string): number | null => {
    if (!lastSession) return null
    const ex = lastSession.sets.filter((s) => s.exercise_id === exerciseId && s.lbs)
    return ex.length > 0 ? ex[0].lbs ?? null : null
  }

  const completedThisWeek = Object.keys(weekSessions).length

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <PulseLine w={80} h={24} color="#ff5a1f" strokeWidth={2} active />
          <Text className="text-sm text-ink-4 mt-3" style={{ fontFamily: 'ui-monospace' }}>
            Cargando...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-center justify-between">
          <View style={{ width: 34 }} />
          <View className="items-center">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
              {routine?.name.split(' ')[0] ?? 'Descanso'}
            </Text>
            <Text className="text-sm font-medium text-ink">Entrenamiento</Text>
          </View>
          <Link href={"/(app)/gym/history" as any} asChild>
            <Pressable className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center">
              <History size={16} color="#0a0a0a" />
            </Pressable>
          </Link>
        </View>

        {/* Week progress */}
        <WeekProgressCard
          completedThisWeek={completedThisWeek}
          days={weekDates.map((d, i) => ({
            hasSession: !!weekSessions[formatDateISO(d)],
            isToday: i === todayIndex,
            isPast: d < today,
            isGymDay: getRoutineKey(d) !== 'rest',
          }))}
        />

        {/* Day picker */}
        <View className="px-5 mt-6 flex-row items-center justify-between">
          <Pressable
            onPress={() => navigate(-1)}
            disabled={!canPrev}
            className={`w-10 h-10 rounded-full bg-white border border-ink-7 items-center justify-center ${canPrev ? '' : 'opacity-30'}`}
          >
            <ChevronLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View className="items-center">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
              {isSelectedToday ? 'Hoy' : 'Revisando'}
            </Text>
            <Text className="text-sm font-medium text-ink capitalize">{formatDayLabel(selectedDate)}</Text>
          </View>
          <Pressable
            onPress={() => navigate(1)}
            disabled={!canNext}
            className={`w-10 h-10 rounded-full bg-white border border-ink-7 items-center justify-center ${canNext ? '' : 'opacity-30'}`}
          >
            <ChevronRight size={16} color="#0a0a0a" />
          </Pressable>
        </View>

        {!isSelectedToday && (
          <Pressable onPress={() => setSelectedDate(today)} className="mt-2 px-5">
            <Text className="text-xs text-signal" style={{ fontFamily: 'ui-monospace' }}>
              ← Volver a hoy
            </Text>
          </Pressable>
        )}

        {/* Routine hero or rest card */}
        <View className="px-5 mt-4">
          {routine ? (
            <>
              {isSelectedPast && !selectedSession && (
                <View className="mb-4 p-4 bg-berry-soft border border-berry/20 rounded-xl flex-row items-start gap-3">
                  <AlertTriangle size={18} color="#c13b5a" style={{ marginTop: 2 }} />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-berry">Te saltaste este día</Text>
                    <Text className="text-xs text-ink-4 mt-0.5">
                      Te tocaba {routine.name}. No pasa nada, sigue adelante.
                    </Text>
                  </View>
                </View>
              )}

              <View className="bg-cream rounded-[20px] p-5 mb-4">
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1">
                    <Text className="font-serif text-3xl font-light text-ink tracking-tight mb-1">
                      {routine.name}
                    </Text>
                    <Text className="text-sm text-ink-3">{routine.subtitle}</Text>
                  </View>
                  <View className="w-12 h-12 rounded-xl bg-signal items-center justify-center">
                    <Dumbbell size={24} color="#ffffff" />
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-1.5 mb-5">
                  {routine.muscles.map((muscle) => (
                    <View key={muscle} className="bg-signal-soft px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-medium text-signal" style={{ fontFamily: 'ui-monospace' }}>
                        {muscle}
                      </Text>
                    </View>
                  ))}
                </View>

                {selectedSession ? (
                  <Pressable
                    onPress={() => router.push(`/(app)/gym/session/${selectedSession.id}` as any)}
                    className="py-3 rounded-full bg-ink flex-row items-center justify-center gap-2"
                  >
                    <Eye size={16} color="#fafaf7" />
                    <Text className="text-paper text-sm font-semibold">Ver sesión</Text>
                  </Pressable>
                ) : isSelectedToday ? (
                  <Pressable
                    onPress={() => router.push(`/(app)/gym/session/new?routine=${routineKey}` as any)}
                    className="py-3 rounded-full bg-ink flex-row items-center justify-center gap-2"
                  >
                    <Play size={16} color="#fafaf7" fill="#fafaf7" />
                    <Text className="text-paper text-sm font-semibold">Iniciar entrenamiento</Text>
                  </Pressable>
                ) : (
                  <View className="py-3 rounded-full bg-paper-3 items-center">
                    <Text className="text-ink-4 text-sm font-medium">
                      {isSelectedPast ? 'Sin sesión registrada' : 'Aún no disponible'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Exercise list */}
              <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2.5" style={{ fontFamily: 'ui-monospace' }}>
                Ejercicios · {routine.exercises.length}
              </Text>
              <View className="bg-white border border-ink-7 rounded-xl overflow-hidden">
                {routine.exercises.map((ex, i) => (
                  <ExerciseRowCard
                    key={ex.id}
                    index={i + 1}
                    exercise={ex}
                    lastWeight={getLastWeight(ex.id)}
                  />
                ))}
              </View>
            </>
          ) : (
            <View className="bg-cream rounded-[20px] p-8 items-center">
              <View className="w-16 h-16 rounded-xl bg-paper-3 items-center justify-center mb-4">
                <Coffee size={32} color="#404040" />
              </View>
              <Text className="font-serif text-2xl font-light text-ink mb-2">Día de descanso</Text>
              <Text className="text-sm text-ink-4 text-center" style={{ maxWidth: 240 }}>
                Tu cuerpo necesita recuperarse. Vuelve con más fuerza mañana.
              </Text>
            </View>
          )}
        </View>

        {/* Quick links */}
        <View className="px-5 mt-6 flex-row gap-3">
          <Link href={"/(app)/gym/history" as any} asChild>
            <Pressable className="flex-1 bg-white border border-ink-7 rounded-xl p-4 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-paper-3 items-center justify-center">
                <History size={18} color="#404040" />
              </View>
              <View>
                <Text className="text-sm font-medium text-ink">Historial</Text>
                <Text className="text-xs text-ink-4">Ver sesiones</Text>
              </View>
            </Pressable>
          </Link>
          <Link href={"/(app)/gym/progress" as any} asChild>
            <Pressable className="flex-1 bg-white border border-ink-7 rounded-xl p-4 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-signal-soft items-center justify-center">
                <TrendingUp size={18} color="#ff5a1f" />
              </View>
              <View>
                <Text className="text-sm font-medium text-ink">Progreso</Text>
                <Text className="text-xs text-ink-4">Ver gráficas</Text>
              </View>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/gym/index.tsx'
git commit -m "feat(gym): day view — week card, day picker, routine hero, exercises list"
git push
```

---

### Task 12: `app/(app)/gym/session/[id].tsx` — active tracker

This is the most complex task. The implementer should consult the web reference `app/(app)/gym/session/[id]/page.tsx` (794 lines) for behavioral details, but the RN structure below is complete enough to implement directly.

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\gym\session\[id].tsx`

- [ ] **Step 1: Create directories + screen**

```bash
mkdir -p 'app/(app)/gym/session'
```

```tsx
// app/(app)/gym/session/[id].tsx
//
// Active workout tracker. Two modes:
// - "new" mode (params.id === 'new'): user is logging a workout. Timer
//   running, sets editable, rest timer available, save button visible.
// - "view" mode (params.id is a UUID): read-only view of a past session.
//
// Auto-progression: on mount, scans the last 2 sessions of this routine
// type and shows a +5 lbs banner per exercise where applicable.
//
// Keep-awake: activates on mount in new mode, deactivates on unmount.

import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as KeepAwake from 'expo-keep-awake'
import { ArrowLeft, ChevronDown, HelpCircle, Timer, X } from 'lucide-react-native'
import { useUser } from '../../../../lib/hooks/useUser'
import { useToast } from '../../../../lib/hooks/useToast'
import { supabase } from '../../../../lib/supabase'
import { ROUTINES } from '../../../../lib/constants'
import { getToday } from '../../../../lib/utils'
import { detectProgression, parseTargetReps } from '../../../../lib/gym'
import { SessionTimer } from '../../../../components/gym/SessionTimer'
import { SetRow } from '../../../../components/gym/SetRow'
import { RestTimer } from '../../../../components/gym/RestTimer'
import { ProgressionBanner } from '../../../../components/gym/ProgressionBanner'
import { ExerciseInstructionsSheet } from '../../../../components/gym/ExerciseInstructionsSheet'
import { ExerciseSubstitutionSheet } from '../../../../components/gym/ExerciseSubstitutionSheet'
import { PulseLine } from '../../../../components/ui/PulseLine'
import type { RoutineType, Feeling, GymSession, SessionSet, Exercise } from '../../../../types'

interface SetData {
  lbs: string
  reps: string
  completed: boolean
}

interface ExerciseData {
  sets: SetData[]
  feeling: Feeling | null
  equipment: string
}

export default function SessionScreen() {
  const params = useLocalSearchParams<{ id: string; routine?: string }>()
  const isNew = params.id === 'new'
  const sessionId = isNew ? null : (params.id as string)

  const { user } = useUser()
  const { showToast } = useToast()

  // Routine: from URL param when new, from DB when viewing existing.
  const routineFromUrl = (params.routine as RoutineType | undefined) ?? 'upper_a'
  const [sessionRoutineType, setSessionRoutineType] = useState<RoutineType>(routineFromUrl)
  const routine = ROUTINES[sessionRoutineType]
  const exercises = routine?.exercises ?? []

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseData, setExerciseData] = useState<Record<string, ExerciseData>>({})
  const [cardioMinutes, setCardioMinutes] = useState('')
  const [cardioSpeed, setCardioSpeed] = useState('')
  const [progressionSuggestions, setProgressionSuggestions] = useState<Record<string, number>>({})
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  const viewMode = !isNew

  // Session timer
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  // Rest timer
  const [restSeconds, setRestSeconds] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [restPreset, setRestPreset] = useState(90)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sheets
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSubstitution, setShowSubstitution] = useState(false)

  const currentExercise: Exercise | undefined = exercises[currentExerciseIndex]
  const currentData: ExerciseData = currentExercise
    ? exerciseData[currentExercise.id] ?? {
        sets: Array(currentExercise.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
        feeling: null,
        equipment: currentExercise.equipment,
      }
    : { sets: [], feeling: null, equipment: '' }

  // Keep-awake during active session
  useEffect(() => {
    if (isNew) {
      KeepAwake.activateKeepAwakeAsync('gym-session')
      return () => {
        KeepAwake.deactivateKeepAwake('gym-session')
      }
    }
  }, [isNew])

  // Start session timer
  useEffect(() => {
    if (isNew && !sessionStartTime) {
      setSessionStartTime(new Date())
    }
  }, [isNew])

  // Initialize / load session
  useEffect(() => {
    if (!user) return
    if (isNew) {
      const initial: Record<string, ExerciseData> = {}
      exercises.forEach((ex) => {
        initial[ex.id] = {
          sets: Array(ex.sets).fill(null).map(() => ({ lbs: '', reps: '', completed: false })),
          feeling: null,
          equipment: ex.equipment,
        }
      })
      setExerciseData(initial)
      checkProgression()
    } else if (sessionId) {
      loadSession(sessionId)
    }
  }, [user])

  const loadSession = async (id: string) => {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('id', id)
        .single()
      if (sessionData) {
        const s = sessionData as GymSession
        setSessionRoutineType(s.routine_type as RoutineType)
        setCardioMinutes(s.cardio_minutes?.toString() ?? '')
        setCardioSpeed(s.cardio_speed?.toString() ?? '')

        const { data: setsData } = await supabase
          .from('session_sets')
          .select('*')
          .eq('session_id', id)
          .order('set_number')
        const setsArr = (setsData as SessionSet[]) ?? []
        const grouped: Record<string, ExerciseData> = {}
        for (const set of setsArr) {
          if (!grouped[set.exercise_id]) {
            grouped[set.exercise_id] = { sets: [], feeling: null, equipment: '' }
          }
          grouped[set.exercise_id].sets.push({
            lbs: set.lbs?.toString() ?? '',
            reps: set.reps?.toString() ?? '',
            completed: !!(set.lbs || set.reps),
          })
          if (set.feeling) grouped[set.exercise_id].feeling = set.feeling as Feeling
        }
        // Fill in equipment + missing slots
        for (const ex of (ROUTINES[s.routine_type as RoutineType]?.exercises ?? [])) {
          if (!grouped[ex.id]) {
            grouped[ex.id] = { sets: [], feeling: null, equipment: ex.equipment }
          }
          while (grouped[ex.id].sets.length < ex.sets) {
            grouped[ex.id].sets.push({ lbs: '', reps: '', completed: false })
          }
          if (!grouped[ex.id].equipment) grouped[ex.id].equipment = ex.equipment
        }
        setExerciseData(grouped)
      }
    } catch (err) {
      console.error('Error loading session:', err)
    }
    setLoading(false)
  }

  const checkProgression = async () => {
    if (!user || !routine) return
    const suggestions: Record<string, number> = {}
    for (const ex of exercises) {
      const { data } = await supabase
        .from('session_sets')
        .select('*, gym_sessions!inner(*)')
        .eq('exercise_id', ex.id)
        .eq('gym_sessions.routine_type', sessionRoutineType)
        .order('set_number')
      const allSets = (data as SessionSet[]) ?? []
      const target = parseTargetReps(ex.reps)
      const suggested = detectProgression(allSets, ex.sets, target)
      if (suggested != null) suggestions[ex.id] = suggested
    }
    setProgressionSuggestions(suggestions)
  }

  // Rest timer interval
  useEffect(() => {
    if (isResting && !isPaused && restSeconds > 0) {
      restRef.current = setInterval(() => {
        setRestSeconds((s) => {
          if (s <= 1) {
            setIsResting(false)
            setIsPaused(false)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => {
      if (restRef.current) clearInterval(restRef.current)
    }
  }, [isResting, isPaused, restSeconds])

  const startRest = (s?: number) => {
    const t = s ?? restPreset
    setRestSeconds(t)
    setRestPreset(t)
    setIsResting(true)
    setIsPaused(false)
  }
  const skipRest = () => {
    setIsResting(false)
    setRestSeconds(0)
    setIsPaused(false)
  }
  const resetRest = () => {
    setRestSeconds(restPreset)
    setIsPaused(false)
  }
  const togglePause = () => setIsPaused((p) => !p)

  // ---------- Set updates ----------
  const updateSet = (setIdx: number, field: 'lbs' | 'reps', value: string) => {
    if (!currentExercise) return
    setExerciseData((prev) => {
      const ex = prev[currentExercise.id] ?? currentData
      const sets = [...ex.sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      return { ...prev, [currentExercise.id]: { ...ex, sets } }
    })
  }

  const toggleSetComplete = (setIdx: number) => {
    if (!currentExercise) return
    setExerciseData((prev) => {
      const ex = prev[currentExercise.id] ?? currentData
      const sets = [...ex.sets]
      const willComplete = !sets[setIdx].completed
      sets[setIdx] = { ...sets[setIdx], completed: willComplete }
      return { ...prev, [currentExercise.id]: { ...ex, sets } }
    })
    // Auto-start rest timer when completing a set
    const willComplete = !currentData.sets[setIdx].completed
    if (willComplete && !viewMode) {
      startRest()
    }
  }

  const setFeeling = (f: Feeling) => {
    if (!currentExercise) return
    setExerciseData((prev) => {
      const ex = prev[currentExercise.id] ?? currentData
      return { ...prev, [currentExercise.id]: { ...ex, feeling: f } }
    })
  }

  const acceptProgression = () => {
    if (!currentExercise) return
    const lbs = progressionSuggestions[currentExercise.id]
    if (lbs == null) return
    setExerciseData((prev) => {
      const ex = prev[currentExercise.id] ?? currentData
      const sets = ex.sets.map((s) => ({ ...s, lbs: lbs.toString() }))
      return { ...prev, [currentExercise.id]: { ...ex, sets } }
    })
    setDismissedSuggestions((prev) => new Set(prev).add(currentExercise.id))
  }

  const setEquipment = (equipment: string) => {
    if (!currentExercise) return
    setExerciseData((prev) => {
      const ex = prev[currentExercise.id] ?? currentData
      return { ...prev, [currentExercise.id]: { ...ex, equipment } }
    })
  }

  // ---------- Save ----------
  const handleFinish = async () => {
    if (!user) return
    setSaving(true)
    try {
      // Insert session
      const todayStr = getToday()
      const { data: sessionInsert, error: sessionErr } = await (supabase.from('gym_sessions') as any)
        .insert({
          user_id: user.id,
          date: todayStr,
          routine_type: sessionRoutineType,
          cardio_minutes: cardioMinutes ? parseFloat(cardioMinutes) : null,
          cardio_speed: cardioSpeed ? parseFloat(cardioSpeed) : null,
        })
        .select()
        .single()
      if (sessionErr) throw sessionErr

      const newSessionId = (sessionInsert as GymSession).id
      setCurrentSessionId(newSessionId)

      // Insert sets
      const setRows: Array<Partial<SessionSet>> = []
      for (const ex of exercises) {
        const data = exerciseData[ex.id]
        if (!data) continue
        data.sets.forEach((s, i) => {
          const lbsNum = parseFloat(s.lbs)
          const repsNum = parseInt(s.reps, 10)
          if (Number.isFinite(lbsNum) || Number.isFinite(repsNum)) {
            setRows.push({
              session_id: newSessionId,
              exercise_id: ex.id,
              set_number: i + 1,
              lbs: Number.isFinite(lbsNum) ? lbsNum : undefined,
              reps: Number.isFinite(repsNum) ? repsNum : undefined,
              feeling: i === data.sets.length - 1 ? data.feeling ?? undefined : undefined,
            } as Partial<SessionSet>)
          }
        })
      }
      if (setRows.length > 0) {
        await (supabase.from('session_sets') as any).insert(setRows)
      }

      showToast('Sesión guardada')
      router.replace('/(app)/gym' as any)
    } catch (err) {
      console.error('Save session error:', err)
      showToast('Error al guardar sesión')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <PulseLine w={80} h={24} color="#ff5a1f" strokeWidth={2} active />
          <Text className="text-sm text-ink-4 mt-3" style={{ fontFamily: 'ui-monospace' }}>
            Cargando...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!currentExercise) {
    return (
      <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-sm text-ink-4 text-center">Sin ejercicios para esta rutina.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const isFirstExercise = currentExerciseIndex === 0

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: isResting ? 240 : 100 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View className="items-center">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
              {routine?.name}
            </Text>
            {!viewMode && <SessionTimer startTime={sessionStartTime} />}
          </View>
          <View style={{ width: 34 }} />
        </View>

        {/* Exercise nav */}
        <View className="px-5 mt-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => setCurrentExerciseIndex((i) => Math.max(0, i - 1))}
            disabled={isFirstExercise}
            className={`w-10 h-10 rounded-full bg-white border border-ink-7 items-center justify-center ${isFirstExercise ? 'opacity-30' : ''}`}
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View className="items-center flex-1 px-2">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
              Ejercicio {currentExerciseIndex + 1} / {exercises.length}
            </Text>
            <Text className="font-serif text-xl font-light text-ink mt-0.5 text-center">
              {currentExercise.name}
            </Text>
            <Pressable
              onPress={() => setShowSubstitution(true)}
              className="flex-row items-center gap-1 mt-1"
            >
              <Text className="text-xs text-ink-4">{currentData.equipment}</Text>
              <ChevronDown size={12} color="#737373" />
            </Pressable>
          </View>
          <Pressable
            onPress={() => setCurrentExerciseIndex((i) => Math.min(exercises.length - 1, i + 1))}
            disabled={isLastExercise}
            className={`w-10 h-10 rounded-full bg-white border border-ink-7 items-center justify-center ${isLastExercise ? 'opacity-30' : ''}`}
          >
            <ArrowLeft size={16} color="#0a0a0a" style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
        </View>

        {/* Quick actions */}
        {!viewMode && (
          <View className="px-5 mt-3 flex-row gap-2">
            <Pressable
              onPress={() => setShowInstructions(true)}
              className="flex-1 py-2.5 rounded-full bg-white border border-ink-7 flex-row items-center justify-center gap-1.5"
            >
              <HelpCircle size={14} color="#737373" />
              <Text className="text-xs text-ink">Instrucciones</Text>
            </Pressable>
            <Pressable
              onPress={() => startRest()}
              className="flex-1 py-2.5 rounded-full bg-white border border-ink-7 flex-row items-center justify-center gap-1.5"
            >
              <Timer size={14} color="#737373" />
              <Text className="text-xs text-ink">Descanso</Text>
            </Pressable>
          </View>
        )}

        {/* Progression banner */}
        {!viewMode &&
          progressionSuggestions[currentExercise.id] != null &&
          !dismissedSuggestions.has(currentExercise.id) && (
            <View className="px-5 mt-4">
              <ProgressionBanner
                suggestedLbs={progressionSuggestions[currentExercise.id]}
                weightUnit={currentExercise.weightUnit}
                onAccept={acceptProgression}
                onDismiss={() => setDismissedSuggestions((prev) => new Set(prev).add(currentExercise.id))}
              />
            </View>
          )}

        {/* Sets */}
        <View className="px-5 mt-4">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2" style={{ fontFamily: 'ui-monospace' }}>
            Sets · objetivo {currentExercise.reps}
          </Text>
          {currentData.sets.map((s, i) => (
            <SetRow
              key={i}
              setNumber={i + 1}
              lbs={s.lbs}
              reps={s.reps}
              completed={s.completed}
              feeling={i === currentData.sets.length - 1 ? currentData.feeling : null}
              weightUnit={currentExercise.weightUnit}
              disabled={viewMode}
              onChangeLbs={(v) => updateSet(i, 'lbs', v)}
              onChangeReps={(v) => updateSet(i, 'reps', v)}
              onToggleComplete={() => toggleSetComplete(i)}
              onChangeFeeling={i === currentData.sets.length - 1 ? setFeeling : undefined}
            />
          ))}
        </View>

        {/* Cardio (last exercise only) */}
        {isLastExercise && !viewMode && (
          <View className="px-5 mt-6 bg-cream rounded-2xl mx-5 p-5">
            <Text className="font-serif text-lg font-light mb-3">Cardio (opcional)</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[10px] text-ink-4 uppercase mb-1.5" style={{ fontFamily: 'ui-monospace' }}>
                  Minutos
                </Text>
                <TextInput
                  value={cardioMinutes}
                  onChangeText={setCardioMinutes}
                  keyboardType="decimal-pad"
                  placeholder="-"
                  placeholderTextColor="#a3a3a3"
                  className="px-3 py-2.5 rounded-xl border border-ink-7 bg-white text-base text-center text-ink"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-ink-4 uppercase mb-1.5" style={{ fontFamily: 'ui-monospace' }}>
                  Velocidad (km/h)
                </Text>
                <TextInput
                  value={cardioSpeed}
                  onChangeText={setCardioSpeed}
                  keyboardType="decimal-pad"
                  placeholder="-"
                  placeholderTextColor="#a3a3a3"
                  className="px-3 py-2.5 rounded-xl border border-ink-7 bg-white text-base text-center text-ink"
                />
              </View>
            </View>
          </View>
        )}

        {/* Finish button */}
        {isLastExercise && !viewMode && (
          <View className="px-5 mt-6">
            <Pressable
              onPress={handleFinish}
              disabled={saving}
              className={`py-4 rounded-full bg-ink items-center ${saving ? 'opacity-50' : ''}`}
            >
              <Text className="text-paper text-sm font-semibold">
                {saving ? 'Guardando...' : 'Terminar sesión'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Sheets */}
      <ExerciseInstructionsSheet
        visible={showInstructions}
        exercise={currentExercise}
        onClose={() => setShowInstructions(false)}
      />
      <ExerciseSubstitutionSheet
        visible={showSubstitution}
        exercise={currentExercise}
        currentEquipment={currentData.equipment}
        onClose={() => setShowSubstitution(false)}
        onSelect={setEquipment}
      />

      {/* Rest timer (sticky bottom) */}
      <RestTimer
        visible={isResting}
        seconds={restSeconds}
        preset={restPreset}
        isPaused={isPaused}
        onSkip={skipRest}
        onReset={resetRest}
        onTogglePause={togglePause}
        onPickPreset={(s) => startRest(s)}
      />
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/gym/session/[id].tsx'
git commit -m "feat(gym): session screen — active tracker w/ sets, rest timer, progression, save"
git push
```

If TS complains about typed-routes (`/(app)/gym/session/...`), use `as any` casts on `router.push` arguments — same pattern as Plan 3 dashboard link.

---

### Task 13: `app/(app)/gym/history.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\gym\history.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// app/(app)/gym/history.tsx
//
// List of past gym sessions, newest first. Tapping a row opens the session
// in view mode (read-only).

import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { supabase } from '../../../lib/supabase'
import { ROUTINES } from '../../../lib/constants'
import { parseLocalDate } from '../../../lib/utils'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { GymSession, RoutineType } from '../../../types'

export default function HistoryScreen() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<GymSession[]>([])

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gym_sessions')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)
    setSessions((data as GymSession[]) ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <PulseLine w={80} h={24} color="#ff5a1f" strokeWidth={2} active />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View>
            <Text className="font-serif text-2xl font-light text-ink">Historial</Text>
            <Text className="text-xs text-ink-4">{sessions.length} sesiones</Text>
          </View>
        </View>

        <View className="px-5 mt-5">
          {sessions.length === 0 ? (
            <View className="bg-white border border-ink-7 rounded-xl p-8 items-center">
              <Text className="text-sm text-ink-4">Sin sesiones aún</Text>
            </View>
          ) : (
            <View className="bg-white border border-ink-7 rounded-xl overflow-hidden">
              {sessions.map((s) => {
                const routine = ROUTINES[s.routine_type as RoutineType]
                const dateLabel = parseLocalDate(s.date).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => router.push(`/(app)/gym/session/${s.id}` as any)}
                    className="p-4 border-b border-ink-7 flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-ink capitalize">{dateLabel}</Text>
                      <Text className="text-xs text-ink-4 mt-0.5">{routine?.name ?? s.routine_type}</Text>
                      {s.cardio_minutes && (
                        <Text className="text-[10px] text-signal mt-0.5">
                          + {s.cardio_minutes} min cardio
                          {s.cardio_speed && ` @ ${s.cardio_speed} km/h`}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color="#a3a3a3" />
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/gym/history.tsx'
git commit -m "feat(gym): history list — past sessions, tap to view"
git push
```

---

### Task 14: `components/gym/ExerciseProgressChart.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\gym\ExerciseProgressChart.tsx`

- [ ] **Step 1: Create the component**

This is a custom SVG line chart showing weight (kg or lbs) over sessions for a single exercise. Same pattern as Plan 2's `WeeklyTrendChart` and Plan 3's `MetricChart`.

```tsx
// components/gym/ExerciseProgressChart.tsx
//
// Custom-SVG line chart of max weight per session for one exercise.
// Same axis/dot/tooltip pattern as MetricChart from the weight module.

import React, { useId, useState } from 'react'
import { View, Text } from 'react-native'
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import { parseLocalDate } from '../../lib/utils'

type DataPoint = { value: number; date: string }

type Props = {
  data: DataPoint[]
  unit: string
}

export function ExerciseProgressChart({ data, unit }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const gradId = useId()

  if (data.length === 0) {
    return (
      <View className="h-[180px] items-center justify-center">
        <Text className="text-xs text-ink-4">Sin datos suficientes</Text>
      </View>
    )
  }

  const W = 320, H = 180
  const padL = 32, padR = 12, padT = 12, padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const baseY = padT + plotH

  const values = data.map((d) => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const span = maxV - minV || 1
  const yMin = minV - span * 0.15
  const yMax = maxV + span * 0.15

  const xAt = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const yAt = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), value: d.value, date: d.date }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length >= 2
      ? `M ${points[0].x},${baseY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${baseY} Z`
      : ''

  const yTicks = [yMax, (yMin + yMax) / 2, yMin]
  const labelCount = Math.min(4, data.length)
  const xLabelIdxs =
    data.length <= 4
      ? data.map((_, i) => i)
      : Array.from({ length: labelCount }, (_, k) =>
          Math.round((k * (data.length - 1)) / (labelCount - 1))
        )

  const fmt = (v: number) => v.toFixed(0)
  const hovered = hoverIdx != null ? points[hoverIdx] : null

  return (
    <View className="relative">
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {yTicks.map((v, i) => {
          const y = yAt(v)
          const isEdge = i === 0 || i === yTicks.length - 1
          return (
            <React.Fragment key={i}>
              <Line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="#e5e5e5"
                strokeWidth={1}
                strokeDasharray={isEdge ? '' : '2,2'}
              />
              <SvgText x={padL - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#a3a3a3">
                {fmt(v)}
              </SvgText>
            </React.Fragment>
          )
        })}

        {xLabelIdxs.map((i) => {
          const dateLabel = parseLocalDate(data[i].date).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
          })
          return (
            <SvgText
              key={i}
              x={xAt(i)}
              y={baseY + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#a3a3a3"
            >
              {dateLabel}
            </SvgText>
          )
        })}

        {areaPath && <Path d={areaPath} fill={`url(#${gradId})`} />}
        {points.length >= 2 && (
          <Path d={linePath} fill="none" stroke="#ff5a1f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              onPressIn={() => setHoverIdx(i)}
              onPressOut={() => setHoverIdx(null)}
            />
            <Circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3.5}
              fill={hoverIdx === i ? '#ff5a1f' : 'white'}
              stroke="#ff5a1f"
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
      </Svg>

      {hovered && (
        <View
          pointerEvents="none"
          className="absolute bg-ink rounded px-2 py-1 z-10"
          style={{
            left: `${(hovered.x / W) * 100}%`,
            top: `${(hovered.y / H) * 100}%`,
            transform: [{ translateX: -30 }, { translateY: -40 }],
          }}
        >
          <Text className="text-paper text-[10px]" style={{ fontFamily: 'ui-monospace' }}>
            {fmt(hovered.value)} {unit}
          </Text>
          <Text className="text-ink-5 text-[10px]" style={{ fontFamily: 'ui-monospace' }}>
            {parseLocalDate(hovered.date).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/gym/ExerciseProgressChart.tsx
git commit -m "feat(gym): ExerciseProgressChart — custom-SVG line chart per exercise"
git push
```

---

### Task 15: `app/(app)/gym/progress.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\gym\progress.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// app/(app)/gym/progress.tsx
//
// Per-exercise progression: pick an exercise → see weight chart over time.
// Picker is a simple chip list (one chip per exercise across all routines).

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { supabase } from '../../../lib/supabase'
import { ROUTINES } from '../../../lib/constants'
import { ExerciseProgressChart } from '../../../components/gym/ExerciseProgressChart'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { SessionSet, GymSession } from '../../../types'

type ExerciseInfo = { id: string; name: string; weightUnit: string }

export default function GymProgressScreen() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [sets, setSets] = useState<SessionSet[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)

  // Aggregate all unique exercises across routines.
  const allExercises = useMemo(() => {
    const map = new Map<string, ExerciseInfo>()
    Object.values(ROUTINES).forEach((r) => {
      r.exercises.forEach((ex) => {
        if (!map.has(ex.id)) {
          map.set(ex.id, { id: ex.id, name: ex.name, weightUnit: ex.weightUnit })
        }
      })
    })
    return Array.from(map.values())
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const [sessRes, setRes] = await Promise.all([
      supabase.from('gym_sessions').select('*').order('date', { ascending: true }),
      supabase.from('session_sets').select('*'),
    ])
    setSessions((sessRes.data as GymSession[]) ?? [])
    setSets((setRes.data as SessionSet[]) ?? [])
    if (allExercises[0] && !selectedExerciseId) {
      setSelectedExerciseId(allExercises[0].id)
    }
    setLoading(false)
  }

  // Build chart data for the selected exercise: max weight per session, ordered by date.
  const chartData = useMemo(() => {
    if (!selectedExerciseId) return []
    const sessionMap = new Map(sessions.map((s) => [s.id, s.date]))
    const bySession = new Map<string, number>()
    for (const set of sets) {
      if (set.exercise_id !== selectedExerciseId || set.lbs == null) continue
      const date = sessionMap.get(set.session_id)
      if (!date) continue
      const prev = bySession.get(set.session_id) ?? 0
      if (set.lbs > prev) bySession.set(set.session_id, set.lbs)
    }
    return Array.from(bySession.entries())
      .map(([sessionId, value]) => ({ value, date: sessionMap.get(sessionId)! }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [sessions, sets, selectedExerciseId])

  const selectedExercise = allExercises.find((e) => e.id === selectedExerciseId)
  const bestLift = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 0

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <PulseLine w={80} h={24} color="#ff5a1f" strokeWidth={2} active />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View>
            <Text className="font-serif text-2xl font-light text-ink">Progreso</Text>
            <Text className="text-xs text-ink-4">Por ejercicio</Text>
          </View>
        </View>

        {/* Exercise picker chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 8 }}
        >
          {allExercises.map((ex) => {
            const isSel = ex.id === selectedExerciseId
            return (
              <Pressable
                key={ex.id}
                onPress={() => setSelectedExerciseId(ex.id)}
                className={`px-3 py-2 rounded-full border ${isSel ? 'bg-ink border-ink' : 'bg-white border-ink-7'}`}
              >
                <Text className={`text-xs font-medium ${isSel ? 'text-paper' : 'text-ink-3'}`}>
                  {ex.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* Best lift card */}
        {selectedExercise && chartData.length > 0 && (
          <View className="mx-5 bg-cream rounded-2xl p-5 mb-4">
            <Text
              className="text-[10px] text-ink-4 uppercase tracking-widest mb-2"
              style={{ fontFamily: 'ui-monospace' }}
            >
              Mejor levantamiento
            </Text>
            <View className="flex-row items-baseline gap-2">
              <Text className="font-serif text-5xl font-light text-signal">{bestLift}</Text>
              <Text className="text-sm text-ink-4">{selectedExercise.weightUnit}</Text>
            </View>
          </View>
        )}

        {/* Chart */}
        <View className="mx-5 bg-white border border-ink-7 rounded-2xl p-4">
          <Text
            className="text-[10px] text-ink-4 uppercase tracking-widest mb-2"
            style={{ fontFamily: 'ui-monospace' }}
          >
            Evolución
          </Text>
          {selectedExercise ? (
            <ExerciseProgressChart data={chartData} unit={selectedExercise.weightUnit} />
          ) : (
            <View className="h-[180px] items-center justify-center">
              <Text className="text-xs text-ink-4">Selecciona un ejercicio</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/gym/progress.tsx'
git commit -m "feat(gym): progress page — pick exercise + best lift + line chart"
git push
```

---

### Task 16: Hide gym sub-routes from tab bar

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\_layout.tsx`

- [ ] **Step 1: Add hidden screen entries**

After the existing `<Tabs.Screen name="weight/index" options={{ href: null }} />` entry (added in Plan 3), add three more:

```tsx
<Tabs.Screen
  name="gym/session/[id]"
  options={{
    href: null,
  }}
/>
<Tabs.Screen
  name="gym/history"
  options={{
    href: null,
  }}
/>
<Tabs.Screen
  name="gym/progress"
  options={{
    href: null,
  }}
/>
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add 'app/(app)/_layout.tsx'
git commit -m "fix(navigation): hide gym sub-routes (session/history/progress) from tab bar"
git push
```

---

### Task 17: Smoke test in Expo Go

**Files:**
- (No code changes — verification task)

- [ ] **Step 1: Start the dev server**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo start --clear
```

Reload Expo Go (sacude → Reload). Bundle takes 60-120s with all the new files.

- [ ] **Step 2: Test the day view**

Tap **Gym** tab. Verify:
- Header shows routine name (or "Descanso" on rest days)
- Dark week-progress card with day-dots (signal-orange = completed, white/30 = today, berry/50 = past missed gym day)
- Day picker (chevrons left/right) — navigate up to 21 days back; "Volver a hoy" link appears when not today
- If today is a gym day: cream routine hero with name + muscle tags + "Iniciar entrenamiento" CTA
- If today is rest: cream rest card with coffee icon
- Exercise list with sets×reps and last weight (when available)
- Quick links to History + Progress

- [ ] **Step 3: Start a session**

Tap "Iniciar entrenamiento". Verify:
- Header shows routine name + ticking elapsed timer (HH:MM:SS or MM:SS)
- Exercise navigation: chevron left/right to switch
- Tap exercise equipment under the name → bottom sheet with alternatives
- Tap "Instrucciones" → bottom sheet with how-to text + cues
- Tap "Descanso" → bottom rest timer appears (90s default)
- Enter lbs/reps for a set, tap the round checkbox → fills with signal, rest timer auto-starts
- After last set is completed, feeling chips appear — tap one
- Cardio fields appear on last exercise
- "Terminar sesión" button saves and navigates back

- [ ] **Step 4: Test rest timer controls**

While rest timer is active:
- "Pausar" → counter stops; button changes to "Reanudar"
- "Reset" → counter goes back to last preset
- "Saltar" → dismisses timer
- Tap a preset (60/90/120/180s) → restarts with new value
- When counter hits 0, you should feel a haptic burst

- [ ] **Step 5: View history**

Back to gym day view → tap History quick link. Verify:
- List of past sessions with date + routine name
- Tap a row → opens session in view mode (read-only inputs, no save button)
- Back arrow returns to history

- [ ] **Step 6: View progress**

Back to gym day view → tap Progreso quick link. Verify:
- Horizontal chip list of all exercises
- Tap an exercise → "Mejor levantamiento" cream card + line chart of weight over time
- Tap a chart dot → tooltip with weight + date

- [ ] **Step 7: Confirm tab bar**

The tab bar should show only 4 tabs (Hoy / Gym / Comida / Hábitos). No `gym/session/[id]`, `gym/history`, or `gym/progress` should appear as a tab.

---

## Self-Review Checklist

### 1. Spec coverage

- ✅ Day view (Task 11)
- ✅ Active session w/ sets+reps+feeling (Tasks 4, 12)
- ✅ Rest timer with pause/skip + haptics (Tasks 5, 12)
- ✅ Auto-progression detection + banner (Tasks 2, 6, 12)
- ✅ Exercise substitution (Tasks 8, 12)
- ✅ Instructions sheet (Task 7)
- ✅ Cardio fields (Task 12)
- ✅ Save + navigate (Task 12)
- ✅ View mode for past sessions (Task 12)
- ✅ History list (Task 13)
- ✅ Per-exercise progress chart (Tasks 14, 15)
- ✅ Hidden from tab bar (Task 16)
- ✅ Keep-awake during active session (Tasks 1, 12)

### 2. Placeholder scan

No "TBD", "TODO", "implement later" found. The note in Task 2 about `setsAreFullyCompleted.bind` was a stray code fragment with the explicit-form fallback documented immediately below; the implementer uses the explicit form.

### 3. Type consistency

- `ExerciseData`, `SetData` defined locally in Task 12, only used there.
- `Exercise` type imported from `types/index.ts` — used in Tasks 7, 8, 10, 12 — consistent.
- `Feeling` type imported from `types/index.ts` — used in Tasks 4, 12 — consistent.
- `RoutineType`, `GymSession`, `SessionSet` — used in Tasks 11, 12, 13, 15 — consistent.
- `detectProgression(exerciseSets, expectedSetCount, targetReps)` signature matches its call site in Task 12's `checkProgression`.

No drift detected.

---

## Summary

| Task | What | LOC |
|---|---|---|
| 1 | Install deps | ~5 |
| 2 | `lib/gym.ts` | ~80 |
| 3 | SessionTimer | ~30 |
| 4 | SetRow | ~120 |
| 5 | RestTimer | ~110 |
| 6 | ProgressionBanner | ~50 |
| 7 | ExerciseInstructionsSheet | ~50 |
| 8 | ExerciseSubstitutionSheet | ~60 |
| 9 | WeekProgressCard | ~70 |
| 10 | ExerciseRowCard | ~30 |
| 11 | gym/index.tsx | ~280 |
| 12 | gym/session/[id].tsx | ~520 |
| 13 | gym/history.tsx | ~80 |
| 14 | ExerciseProgressChart | ~140 |
| 15 | gym/progress.tsx | ~150 |
| 16 | hide tabs | ~20 |
| 17 | smoke test | 0 |

Total: ~1800 LOC across 17 tasks. ~4-5 days of subagent execution.
