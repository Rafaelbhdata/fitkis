# FitKis Mobile Migration — Plan 7: Polish + Closed Beta + Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap the migration. Phase 7a polish is the executable code work — safe-area edges on full-screen routes, keyboard handling on form screens, accessibility labels on icon-only buttons, network-error UX, sign-out cleanup, then a consolidated smoke test. Phase 7b/7c/8 are operational/asset work gated on Apple Dev approval — outlined here for reference but not executable as code tasks.

**Architecture:** No new modules. Audit + targeted fixes across existing screens. The biggest single change is converting `edges={['top']}` → `edges={['top','bottom']}` on full-screen routes that aren't tab screens, since those don't get bottom inset from the tab bar. Add `KeyboardAvoidingView` to the two screens that have form inputs but lack it. Sweep `accessibilityLabel` onto every icon-only `Pressable`.

**Tech Stack:** No new deps. Pure RN + Expo SDK 54.

**Repos & paths:**
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (branch `master`)
- Spec: `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

**Builds on Plans 1-6:** All patient features at parity with web.

---

## Audit findings (validated 2026-05-04)

| Concern | Status |
|---|---|
| `SafeAreaView edges` | 14 screens use `['top']` — 11 are non-tab routes that need `['top','bottom']` |
| `KeyboardAvoidingView` | Present in auth (3) + coach + BottomSheet (5 files). **Missing in journal + settings** despite both having text inputs |
| `accessibilityLabel` | **Zero files** — every icon-only `Pressable` (X, Trash, Chevrons, Plus, Send) is unlabeled for screen readers |
| `React.memo` | Zero — defer to v2 (no perceptible jank reported) |
| `console.log/warn/error` | Only 3 `console.error` calls in catch blocks of gym screens — keep, they help debug |

---

## Phase 7a — Polish (executable now)

### Task 1: Sweep `edges` on full-screen routes

The tab screens (`dashboard`, `gym/index`, `food/index`, `habits/index`) correctly use `edges={['top']}` because the bottom tab bar handles bottom inset.

The other screens are full-screen routes (hidden from tabs or modal routes) — they need `['top','bottom']` to avoid content disappearing under the home indicator on iOS.

**Files to modify:**
- `app/(app)/coach/index.tsx`
- `app/(app)/journal/index.tsx`
- `app/(app)/settings/index.tsx`
- `app/(app)/weight/index.tsx`
- `app/(app)/gym/session/[id].tsx` (3 occurrences — early returns + main return)
- `app/(app)/gym/history.tsx` (2)
- `app/(app)/gym/progress.tsx` (2)
- `app/(app)/habits/progress.tsx` (2)
- `app/(app)/food/favorites.tsx` (2)
- `app/(app)/food/_plate-photo.tsx` (1)

The `_barcode.tsx` modal is full-screen camera and uses an explicit `<View className="flex-1 bg-ink">` not SafeAreaView for the camera, with an absolute-positioned `<SafeAreaView>` overlay — leave as-is.

The dashboard, gym/index, food/index, habits/index — leave as `['top']`.

- [ ] **Step 1: Change edges on each non-tab route**

For each file in the list above, replace `edges={['top']}` with `edges={['top', 'bottom']}`. Use Grep to find each occurrence and confirm:

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
grep -rn "edges={\['top'\]}" 'app/(app)' | grep -v -E '(dashboard|gym/index|food/index|habits/index)\.tsx'
```

Each remaining match should be flipped to `['top', 'bottom']`.

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)'
git commit -m "fix(safe-area): use top+bottom edges on full-screen non-tab routes"
git push
```

---

### Task 2: Add KeyboardAvoidingView to journal + settings

Both screens have `<TextInput>` elements that get hidden by the on-screen keyboard. Coach already has a KAV at the root; journal + settings don't.

**Files:**
- Modify: `app/(app)/journal/index.tsx`
- Modify: `app/(app)/settings/index.tsx`

- [ ] **Step 1: Wrap journal's ScrollView with KAV**

In `app/(app)/journal/index.tsx`, find the main return's outer `SafeAreaView` and wrap the existing `<ScrollView>` block in a `<KeyboardAvoidingView>`:

```tsx
import { KeyboardAvoidingView, Platform, ... } from 'react-native'
// ...
return (
  <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* existing content */}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
)
```

- [ ] **Step 2: Same wrap for settings**

In `app/(app)/settings/index.tsx`, identical pattern. Wrap the main `<ScrollView>` in `<KeyboardAvoidingView>` inside the `<SafeAreaView>`.

- [ ] **Step 3: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/journal/index.tsx' 'app/(app)/settings/index.tsx'
git commit -m "fix(ux): KeyboardAvoidingView on journal + settings (forms)"
git push
```

---

### Task 3: Add `accessibilityLabel` to icon-only Pressables

Every icon-only button without surrounding text needs an `accessibilityLabel` so VoiceOver/TalkBack can announce it. Pattern: `<Pressable accessibilityLabel="Cerrar">…</Pressable>`.

**Files:** All screens with icon buttons (X, Trash, ChevronLeft/Right, Plus, ArrowLeft, Send, RefreshCw, etc.). Approximately 18 files.

- [ ] **Step 1: Sweep approach**

Don't try to label every Pressable in one pass — focus on icon-only Pressables (those whose `children` is just an icon component). A practical heuristic:

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
grep -rn "Pressable" 'app' 'components' | wc -l
```

There are dozens. Do this systematically by file. For each file:

1. Open it.
2. For each `<Pressable>` whose first/only child is an icon (`X`, `Trash2`, `ChevronLeft`, `ChevronRight`, `Plus`, `Minus`, `ArrowLeft`, `Send`, `RefreshCw`, `Camera`, `Star`, etc.), add a Spanish `accessibilityLabel`.
3. Common labels:
   - `<X />` → `accessibilityLabel="Cerrar"`
   - `<Trash2 />` → `accessibilityLabel="Eliminar"`
   - `<ChevronLeft />` → `accessibilityLabel="Anterior"` or `"Día anterior"`
   - `<ChevronRight />` → `accessibilityLabel="Siguiente"` or `"Día siguiente"`
   - `<ArrowLeft />` → `accessibilityLabel="Volver"`
   - `<Plus />` → `accessibilityLabel="Agregar"` or context-specific (`"Agregar comida"`, `"Agregar serie"`)
   - `<Minus />` → `accessibilityLabel="Restar"`
   - `<Send />` → `accessibilityLabel="Enviar mensaje"`
   - `<RefreshCw />` → `accessibilityLabel="Cambiar pregunta"`
   - `<Camera />` → `accessibilityLabel="Tomar foto"`
   - `<Star />` (icon-only) → `accessibilityLabel="Favorito"`
4. Pressables that contain BOTH icon AND text label do NOT need `accessibilityLabel` — the text is read.

Files to sweep (by module):
- `app/(auth)/login.tsx`, `register.tsx`, `reset-password.tsx`
- `app/(app)/dashboard.tsx`
- `app/(app)/coach/index.tsx`
- `app/(app)/journal/index.tsx`
- `app/(app)/settings/index.tsx`
- `app/(app)/weight/index.tsx`
- `app/(app)/gym/index.tsx`, `session/[id].tsx`, `history.tsx`, `progress.tsx`
- `app/(app)/food/index.tsx`, `favorites.tsx`, `_barcode.tsx`, `_plate-photo.tsx`
- `app/(app)/habits/index.tsx`, `progress.tsx`
- `components/food/FoodLogItem.tsx`, `MealCard.tsx`, `QuickActionsRow.tsx`
- `components/gym/SetRow.tsx`, `RestTimer.tsx`, `ExerciseRowCard.tsx`
- `components/habits/HabitRow.tsx`, `WeekDots.tsx`
- `components/weight/HistoryRow.tsx`
- `components/journal/QuestionCard.tsx`
- `components/settings/DangerZone.tsx`, `DietConfigSection.tsx`
- `components/ui/ConfirmDialog.tsx` (probably already has labels — verify)

Conservative estimate: 60-100 individual additions across 25-30 files. This is mechanical but tedious — recommend a single subagent run-through.

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app' 'components'
git commit -m "fix(a11y): accessibilityLabel on icon-only Pressables (es-MX)"
git push
```

If `tsc` complains that `accessibilityLabel` isn't a valid prop on `Pressable`, double-check spelling — it IS standard. (RN docs: https://reactnative.dev/docs/accessibility#accessibilitylabel)

---

### Task 4: Empty state polish

Audit all "no data yet" copy across the app. Inconsistent today: some say "Sin registros aún", others "Sin favoritos", others "Sin configuraciones". Standardize the *visual treatment* — a consistent empty card with icon + line.

**Files to audit:**
- `app/(app)/dashboard.tsx` — "Sin registros aún" for weight
- `app/(app)/food/favorites.tsx` — already has Star icon + "Sin favoritos aún" — ✅ template
- `app/(app)/food/index.tsx` — meals with 0 logs (handled by MealCard hiding the list)
- `app/(app)/gym/history.tsx` — empty state when no past sessions
- `app/(app)/habits/index.tsx` — empty state when no habits configured
- `app/(app)/weight/index.tsx` — empty state when no weight logs
- `components/settings/DietConfigSection.tsx` — already has "Sin configuraciones..."

- [ ] **Step 1: Use the food/favorites template as the canonical empty state**

```tsx
<View className="bg-white border border-ink-7 rounded-xl p-8 items-center">
  <SomeIcon size={32} color="#a3a3a3" />
  <Text className="text-sm text-ink-4 mt-3 text-center">
    {emptyMessage}
  </Text>
</View>
```

- [ ] **Step 2: Update each non-conformant screen**

Concretely:
- `dashboard.tsx`: replace inline "Sin registros aún" with the empty card template (or leave; it's already inside the card with chevron — judgment call, leave for now if it looks intentional).
- `gym/history.tsx`: add the empty card.
- `habits/index.tsx`: add the empty card with `<CheckCircle2>` icon if no habits exist (Plan 2 may already have this — verify before duplicating).
- `weight/index.tsx`: empty card with `<Scale>` icon if no logs (Plan 3 may already have this — verify).

If the screen already shows a usable empty state, skip it. Don't break working UX for consistency's sake.

- [ ] **Step 3: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)'
git commit -m "fix(ux): standardize empty state cards (icon + helper text)"
git push
```

---

### Task 5: Network error wrapper

Today, when Supabase is unreachable or `apiFetch` times out, the user sees stale state or a generic error toast. We can do better: a tiny retry helper.

**Files:**
- Create: `lib/with-retry.ts`

- [ ] **Step 1: Create the helper**

```ts
// lib/with-retry.ts
//
// Wraps a Supabase/apiFetch call with a single retry on network failure.
// Use sparingly — only on critical reads where stale state would confuse.

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  const { retries = 1, delayMs = 600 } = options
  let lastErr: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
  }
  throw lastErr
}
```

- [ ] **Step 2: Don't sprinkle this everywhere**

Only wrap reads where the user would otherwise see a frozen screen on transient failure. Initial candidates:
- Dashboard's weight load (the user expects to see their weight when opening the app).
- Coach `/api/chat` call (it already has its own try/catch — leave).

For now, just commit the helper. Wiring it is opt-in; we'll add usages only when smoke tests reveal a real flake.

- [ ] **Step 3: Verify TS + commit**

```bash
npx tsc --noEmit
git add lib/with-retry.ts
git commit -m "feat(util): withRetry helper for transient network reads"
git push
```

---

### Task 6: Sign-out cleanup

Today `handleSignOut` in `dashboard.tsx` only calls `supabase.auth.signOut()`. The `AuthGate` then redirects to login, but the SecureStore session may persist briefly. Verify the signout drops everything cleanly.

**Files:**
- Modify (if needed): `app/(app)/dashboard.tsx`

- [ ] **Step 1: Verify the current behavior**

Read the existing `handleSignOut`:

```bash
grep -A 5 "handleSignOut" 'app/(app)/dashboard.tsx'
```

If it's just `await supabase.auth.signOut()` — that's fine for v1. Supabase clears its persisted session via the SecureStore adapter. The AuthGate redirect handles the navigation.

If you observe any issue during smoke test (e.g., dashboard flashes briefly after signout), wrap with `router.replace('/(auth)/login' as any)`:

```tsx
const handleSignOut = async () => {
  await supabase.auth.signOut()
  router.replace('/(auth)/login' as any)
}
```

- [ ] **Step 2: Skip commit if no change needed**

If the current signout is fine, this task is a no-op. Document the decision in the commit message of the next task or skip entirely.

---

### Task 7: Consolidated smoke test (USER ACTION)

The previous smoke tests (Plans 2-6, tasks 54/69/86/100/112) are still `in_progress`. Rather than running 5 separate sessions, do one consolidated 30-min pass on a real device through every module.

**Files:** None — verification task.

- [ ] **Step 1: Boot and warm-up**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo start --clear
```

Reload Expo Go on your phone (real device, not simulator). Allow ~90s for first bundle.

- [ ] **Step 2: Run the path through each module**

Walk this exact path. After each step note any issue in a single Notes app entry; fix afterwards in batch.

1. **Auth**: log out → log in. Confirm navigation lands on dashboard.
2. **Dashboard**: see latest weight. Tap "Coach Fit" row → coach screen. Back. Tap "Journal" → journal screen. Back. Tap "Configuración" → settings. Back.
3. **Gym**: open Gym tab. See today's routine. Tap an exercise → see instructions sheet. Close. Tap "Iniciar sesión". Add a set with weight + reps + feeling. Tap "Terminar y guardar". Confirm session appears in History.
4. **Food**:
   - Open Comida tab. See 6 group bars + meal cards.
   - Tap "+" on Desayuno → group picker → pick Frutas → search "manz" → tap Manzana → quantity stepper → "Agregar 1 porción" → confirm bar updates.
   - Tap "Foto del plato" → tomar foto → "Analizar con AI" → see ~3-5s spinner → see detected items → "Guardar todo" → confirm meal updates.
   - Tap "Escanear" → permission grant → point at any product barcode → confirm result toast.
   - Tap "Administrar favoritos" → see list (empty if none) → back.
5. **Hábitos**: open Hábitos tab. Tap a habit → toggle. Tap "+" → form sheet → save a new habit → see it in the list.
6. **Weight**: from dashboard, tap weight card → weight screen. Tap "+ Agregar" → form sheet → save a new weight → see chart update.
7. **Settings**: open via dashboard. Edit name → "Guardar perfil". Tap "+ Nueva" in dieta → fill form → save. Confirm new config appears at top with "Activa" badge.
8. **Edge cases**: turn off Wi-Fi → try to send a coach message → confirm graceful error toast (not a crash). Turn Wi-Fi back on.
9. **Tab bar**: confirm only 4 tabs visible (Hoy / Gym / Comida / Hábitos).

- [ ] **Step 3: Triage findings**

Categorize each issue into:
- **P0 (blocks ship)**: crash, data loss, can't sign in.
- **P1 (must fix before public release)**: visual bugs on common screens, typos, small UX papercuts.
- **P2 (nice-to-have)**: performance polish, more empty states.

Log P0/P1 as new tasks to fix in this branch before Phase 7b. Defer P2 to post-launch.

- [ ] **Step 4: Mark P5 / P6 smoke tests complete**

After this consolidated pass, we can mark tasks #54, #69, #86, #100, #112 (Plans 2-6 smoke tests) as completed — the same path covers all of them.

---

### Task 8: Update README + context.md

**Files:**
- Modify: `README.md` (mobile repo)
- Modify: `context.md` (web repo) — keep web context aware of mobile state

- [ ] **Step 1: Mobile README**

Replace any placeholder content with:
- Project description ("FitKis mobile — Expo app for patient experience")
- Setup steps: `npm install --legacy-peer-deps`, `.env.local` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `npx expo start`
- Deploy: `eas build --profile production`, link to TestFlight URL placeholder
- Key dependencies: Expo SDK 54, React Native 0.79, NativeWind 4, Supabase JS, expo-router 5
- Architecture summary: tab nav (4 tabs) + hidden routes (modals + sub-screens), bearer-JWT auth via `/api/*` routes hosted on Vercel

- [ ] **Step 2: Web context.md update**

In the web repo, add a section to `context.md`:
- Mobile app: feature parity reached (2026-05-04)
- Mobile repo: `https://github.com/Rafaelbhdata/fitkis-mobile`
- Patient routes on web are frozen but live (not deleted) until mobile proves itself in production for 2-4 weeks
- API routes on web continue to serve mobile (bearer JWT)

- [ ] **Step 3: Verify + commit (one in each repo)**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
git add README.md
git commit -m "docs: update README with setup, deploy, architecture"
git push

cd /c/Users/Rafae/Projects/fitkis
git add context.md
git commit -m "docs: note mobile feature parity reached + repo link"
git push
```

---

## Phase 7b — Store assets (deferred — gated on Apple Dev approval + design)

**Why deferred:** Apple Developer account is still pending approval (~24-72h typical, sometimes longer). Most of these assets also need a design decision (icon, screenshots aesthetic) the user wants to make personally.

**Tasks (will become a follow-up plan when ready):**

1. **App icon** — design 1024×1024 master + adaptive icon for Android (background + foreground SVG). Use the PulseLine motif from the web design or commission a freelance designer ($100-300).
2. **Splash screen** — final design (today is Expo's default).
3. **Screenshots** — 5-10 per device size (iPhone 6.7", 6.5", 5.5", iPad 12.9", Android phone, Android tablet). Stage with real-looking demo data; capture on simulator or real device.
4. **Store descriptions**:
   - App Store: title, subtitle, keywords, full description (es-MX + en-US fallback), what's new ("Versión inicial").
   - Play Store: short description (80 chars), full description, feature graphic (1024×500).
5. **Privacy policy + Terms of service** — host at `fitkis.app/privacy` and `fitkis.app/terms`. Decision: write from scratch, use Termly/iubenda generator (~$10/mo), or hire a lawyer. Mexican market specifics: LFPDPPP compliance.
6. **App Store privacy nutrition labels** — declare data collection (auth email, weight logs, food logs, photos uploaded for plate AI, etc.). Apple's form is detailed; allow ~half a day.
7. **Play Store data safety form** — equivalent to Apple's privacy nutrition labels.

These are all asset/copy work — when ready, write a follow-up plan with concrete tasks per asset.

---

## Phase 7c — Closed beta (deferred — gated on 7b)

**Why deferred:** Needs assets ready and Apple Dev approved. Cannot run `eas build --profile production` without an Apple Dev team ID configured.

**Outline of tasks:**

1. `eas build --profile production --platform all` (both iOS + Android).
2. Submit iOS to TestFlight external testing — `eas submit -p ios --latest`.
3. Submit Android to Play Console closed track — `eas submit -p android --latest`.
4. TestFlight external review takes ~24h. Plan accordingly.
5. Recruit 5-10 patients from existing web app — invite via email with TestFlight link + Play Console invite.
6. Iterate on feedback for ~1 week. P0/P1 only — no scope creep.

---

## Phase 8 — Public release (deferred — gated on 7c green-light)

**Outline of tasks:**

1. Submit to App Store Review (~1-3 days).
2. Submit to Play Console production track (~hours).
3. When both approve, push the release toggle.
4. Add a banner on `fitkis.app` patient routes: "📱 Ya estamos en App Store y Play Store — descarga la app". Link to App Store + Play Store badges.
5. Patient routes on web stay alive (frozen) — cutover to mobile-only is a separate decision after 2-4 weeks of mobile in production.
6. Final docs sweep: update CLAUDE.md, context.md, README to reflect live state.

---

## Self-Review Checklist

### 1. Spec coverage (Phase 7a only — 7b/7c/8 covered as outlines)
- ✅ Edge cases: safe-area edges (Task 1), keyboard handling (Task 2), network errors (Task 5), sign-out cleanup (Task 6)
- ✅ Accessibility: labels on icon-only Pressables (Task 3), 44×44 touch targets — already mostly satisfied (existing components use `w-11 h-11` on icon buttons; Task 3 sweep should flag any smaller)
- ✅ Empty states (Task 4)
- ✅ QA via consolidated smoke test (Task 7)
- ✅ Docs (Task 8)
- ⚠️ Performance / `React.memo` — explicitly deferred until profiler shows hot spots
- ⚠️ Analytics — explicitly deferred to v2

### 2. Placeholder scan
No "TBD", "TODO", or "implement later" in Phase 7a tasks. Phase 7b/7c/8 are explicitly outlined as deferred — those will become their own plans when their gates clear.

### 3. Type consistency
- `withRetry<T>` signature consistent (Task 5).
- No new types or breaking interface changes.

---

## Summary

### Phase 7a (executable now)

| Task | What | Expected work |
|---|---|---|
| 1 | Safe-area edges sweep | ~10 file edits |
| 2 | KAV on journal + settings | 2 file edits |
| 3 | accessibilityLabel sweep | ~25 file edits, 60-100 additions |
| 4 | Empty state polish | ~3 file edits |
| 5 | withRetry helper | 1 new file |
| 6 | Sign-out audit | maybe 1 edit |
| 7 | Consolidated smoke test | USER ACTION |
| 8 | README + context.md | 2 doc files |

Total: ~1-2 days of subagent execution + 30-60 min of user smoke test.

### Phase 7b/7c/8 (deferred)

Tracked here as outlines. Will become 1-2 follow-up plans when:
- Apple Developer account is approved (waiting)
- Asset design direction is set (user decision)
- 7a smoke test passes cleanly (no P0/P1 blockers)

After Phase 7a + cleanup, the codebase is **ready for store submission** the moment assets and account are in place.
