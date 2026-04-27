# FitKis Mobile Migration — Roadmap (Plans 2 → 7)

> **Purpose:** High-level outlines of the remaining plans so we don't lose
> context as months pass. Each outline is enough to know **what** the plan
> will do and **why**; the **how** (task-by-task code) is written using
> `superpowers:writing-plans` when that plan starts.
>
> **When you start writing a detailed plan, re-read:**
> 1. The spec: `2026-04-27-mobile-migration-design.md`
> 2. The relevant outline below (this document)
> 3. The completed Plan 1 (`2026-04-27-mobile-foundation.md`) to see how it actually shipped
> 4. The current state of `fitkis-mobile` repo (libs, components, conventions)
>
> If anything in the outline below contradicts what's actually been
> implemented, **trust the implemented code** and update the outline before
> writing the new plan.

---

## Plan 2 — Habits Module

**Why first after foundation:** Simplest CRUD module. Validates patterns
(form modals, list rendering, simple charts) that all subsequent modules reuse.

**Prerequisites:** Plan 1 complete. Mobile app installs on device, auth
works, Supabase queries work, design tokens render.

**Source web files (to port, not copy verbatim):**
- `app/(app)/habits/page.tsx` — main habits list + day view
- `app/(app)/habits/progress/page.tsx` — streak + monthly chart
- `components/habits/*.tsx` — any habit-specific components

**Mobile screens to build:**
- `app/(app)/habits/index.tsx` — replaces the WIP placeholder. Shows today's
  habits, allows checking off `daily_check`, entering `quantity`, marking
  `weekly_frequency` days. Add/edit/delete habits via bottom-sheet modal.
- `app/(app)/habits/progress.tsx` — per-habit detail: streak, % completion this
  month, weekly history bars.

**New patterns introduced:**
- **Bottom sheet modals** (decision deferred from Plan 1: native `presentation: 'modal'`
  via Expo Router vs `@gorhom/bottom-sheet` vs custom reanimated). Pick one,
  document the choice in `components/ui/BottomSheet.tsx`.
- **List CRUD pattern**: list + add button + tap-row-to-edit + swipe-to-delete (or
  delete inside edit modal). This pattern repeats in Weight, Food, Gym.
- **Custom SVG mini-charts**: weekly bars for `progress` screen. First port of a
  chart from web's react-native-svg. Reference `MetricChart` from web's weight page
  for math conventions.

**Open questions to resolve when writing the detailed plan:**
- Bottom sheet library choice (test native vs @gorhom/bottom-sheet on real iOS).
- Date picker for `weekly_frequency` (which days of week) — native picker or custom chip selector.

**Done when:**
- All habit operations available on mobile match web parity (add/edit/delete/log).
- Progress screen shows streak + monthly % + weekly history.
- TestFlight build distributed; you've used it for at least one full day to log habits.

**Estimated tasks:** ~15-20.

---

## Plan 3 — Weight Module

**Why next:** Builds on the chart patterns introduced in Plan 2. Most visually
complex piece (custom traffic-light meter, interactive line chart, photo
gallery). Worth knocking out before Gym to validate camera+upload patterns
that Food will reuse.

**Prerequisites:** Plan 2 complete. BottomSheet pattern validated; chart
SVG conventions established.

**Source web files:**
- `app/(app)/weight/page.tsx` — entire screen incl. `MetricStatCard`, `RangeMeter`,
  `MetricChart`, photo upload, comparison dropdown, edit/delete modal
- The custom helpers in that file (`statusForBMI`, `findPrevValue`,
  `parseLocalDate`, `calculateBMI`) — most live in `lib/utils.ts` already (synced
  in Plan 1)

**Mobile screens to build:**
- `app/(app)/weight/index.tsx` — replaces N/A in tabs (it's reachable via dashboard
  card, not as its own tab). Hero stat with comparison delta, 4 metric cards with
  range meters and arrows, interactive chart with axis + tooltip, history list with
  edit/delete, photos grid with compare-mode.

**New patterns introduced:**
- **Photo upload to Supabase Storage** via `expo-image-picker`. First time we touch
  storage; this same pattern is reused for plate-photo in Plan 5 (different bucket,
  same flow).
- **Native interactive SVG charts**: `MetricChart` is the canonical port. The
  hover-on-circle behavior becomes `onPressIn`/`onPressOut` on `<Circle>` from
  react-native-svg.
- **Range meter with proportional segments + arrow + axis labels**: pixel-perfect
  port of the existing semáforo from web. Test on real device — the small font
  sizes (8px) need to verify legibility on low-DPI Androids.

**Open questions to resolve when writing the detailed plan:**
- Native date picker UX for the comparison-against dropdown (vs custom modal list).
- Photo compression: web uses raw upload; mobile should compress before upload to
  save bandwidth. Decide quality threshold (0.7? 0.5?).
- Compare-mode: web uses side-by-side image comparison. Native gestures might
  warrant a swipe-to-reveal slider — defer or implement v1?

**Done when:**
- Add / edit / delete weight log on mobile. Composition fields (muscle, fat mass, %fat) work.
- Range meter renders correctly across the 4 metrics with all states.
- Chart axis labels and points + hover tooltip work on iOS and Android.
- Photo upload + view + delete works against Supabase Storage `progress-photos` bucket.
- TestFlight build distributed.

**Estimated tasks:** ~25-30.

---

## Plan 4 — Gym Module

**Why next:** More complex local state (active workout session with multiple sets
and a running rest timer) but no new native APIs. Builds on patterns from Plans 2-3.

**Prerequisites:** Plan 3 complete. Charts, modals, and CRUD patterns proven on real device.

**Source web files:**
- `app/(app)/gym/page.tsx` — rutina del día / start session
- `app/(app)/gym/session/[id]/page.tsx` — active tracker (SetRow, RestTimer, ProgressionBanner)
- `app/(app)/gym/history/page.tsx`
- `app/(app)/gym/progress/page.tsx` — per-exercise progress chart
- `components/gym/*.tsx` — SetRow, RestTimer, ProgressionBanner

**Mobile screens to build:**
- `app/(app)/gym/index.tsx` — today's routine; "Iniciar sesión" CTA.
- `app/(app)/gym/session/[id].tsx` — active session: list of exercises, expandable to
  show set rows. Each set has lbs/reps/feeling inputs. Floating rest timer.
  Substitution sheet. Progression banner appears when rule triggered (+5 lbs).
- `app/(app)/gym/history.tsx` — list of past sessions with summary.
- `app/(app)/gym/progress.tsx` — per-exercise weight progression chart.

**New patterns introduced:**
- **Long-running timer** (RestTimer): use `setInterval` or `react-native-timer` —
  must survive screen lock and tab switches in v1 (background timing is v2).
- **Optimistic UI**: writing a set row should feel instant even with poor network.
  Use `supabase.from('session_sets').insert()` then update local state; if it
  fails, show toast and revert.
- **Routing with dynamic params**: `[id].tsx` first usage. Validate auth gate
  doesn't bounce mid-session.

**Open questions:**
- Keep-screen-on while session is active (`expo-keep-awake`)? Probably yes.
- Auto-progression rule (+5 lbs after 2 perfect sessions) — same logic as web,
  copy verbatim from web utils.
- Exercise substitution: bottom-sheet picker or push-screen?

**Done when:**
- Can complete a full upper/lower workout entirely on mobile, including substitutions.
- Rest timer counts down accurately. ProgressionBanner appears when applicable.
- History and progress charts render.
- TestFlight build distributed.

**Estimated tasks:** ~25-30.

---

## Plan 5 — Food Module (most complex)

**Why last among modules:** All the hard native pieces (camera, image picker,
AI calls). Patterns from Plans 1-4 (auth, modals, photo upload via expo-image-picker)
are all in place; only barcode scanner and AI streaming considerations are new.

**Prerequisites:** Plan 4 complete. apiFetch validated by Coach AI? No, Coach
ships in Plan 6 — but Plan 5 already uses apiFetch for `/api/barcode-lookup`
and `/api/plate-analysis` so this proves it works first.

**Source web files (heaviest port):**
- `app/(app)/food/page.tsx` — main day view + search + favorites + group bars
- `app/(app)/food/favorites/page.tsx` — favorites CRUD (might be modal in mobile)
- `components/food/BarcodeScannerModal.tsx`
- `components/food/PlatePhotoModal.tsx`
- `components/food/*.tsx` — any helpers

**Mobile screens to build:**
- `app/(app)/food/index.tsx` — replaces WIP. Day view with 4-6 meals, group bars
  per group (verdura/fruta/carb/leguminosa/proteina/grasa) with USER_PROFILE budget.
- `app/(app)/food/favorites.tsx` — list, add, edit, delete favorite meals.
- `app/(app)/food/_barcode-scanner.tsx` — modal route, full-screen camera with
  scan overlay, lookup result modal with editable equivalents.
- `app/(app)/food/_plate-photo.tsx` — modal route, image picker → analysis result
  with editable equivalents → save to log.

**New patterns introduced:**
- **Camera with barcode scanning** via `expo-camera`'s `<CameraView>` and
  `barcodeScannerSettings`. Replaces the BarcodeDetector + ZXing dual-strategy
  used on web. Single API, more reliable. First time we ask for camera permission
  (handle the not-granted state gracefully).
- **Image to base64**: `expo-image-picker` with `base64: true`, then send to
  `/api/plate-analysis`. Same pattern works for any future "AI on photo" feature.
- **Search-as-you-type list filter**: efficient render of `lib/constants.ts`
  (~150 equivalentes) + `smae-foods.json` (~1000 entries). Use `<FlatList>` with
  `keyExtractor` and memoization.
- **Yogurt griego split logic** (1 proteína + 1 grasa) and alcohol-as-carb rule
  copy verbatim from web's `expandFoodLogEntry` (already in `lib/utils.ts`).

**Open questions:**
- Camera permission denied flow: redirect to settings? Show inline error?
- AI plate-analysis: typical time is ~3-5s. Show a loading state with progress —
  PulseLine animation as a "thinking" indicator?
- Favorites: bottom-sheet modal vs full screen? Web has its own page; mobile space
  is more constrained.

**Done when:**
- Can log a full day's food via search, favorites, barcode, and plate photo.
- Group budget bars update correctly with yogurt griego split rule.
- TestFlight build distributed.

**Estimated tasks:** ~35-40 (the largest module).

---

## Plan 6 — Coach + Journal + Settings

**Why last:** Smallest in scope; cleans up loose ends. Coach is its own beast
(chat UI patterns) but small; Journal and Settings are mostly form work.

**Prerequisites:** Plan 5 complete. apiFetch already exercised against `/api/chat`
needed for Coach.

**Source web files:**
- `app/(app)/coach/page.tsx` and `components/coach/*` — chat UI, suggested prompts
- `app/(app)/journal/page.tsx` — daily prompt + textarea
- `app/(app)/settings/page.tsx` — profile, current diet config, delete account modal

**Mobile screens to build:**
- `app/(app)/coach/index.tsx` — full-screen chat: FlatList (inverted) of messages,
  input + send button at bottom (KeyboardAvoidingView), suggested prompts row.
  Calls `/api/chat` with full response (no streaming — deferred to v2 per spec).
- `app/(app)/journal/index.tsx` — daily prompt rotation, textarea, save to
  `journal_entries`.
- `app/(app)/settings/index.tsx` — profile (display name, email read-only), current
  diet config display, delete account button → modal with "ELIMINAR MI CUENTA"
  confirmation phrase calling `/api/delete-account`.

**New patterns introduced:**
- **Chat UI** with inverted list, keyboard handling, and "AI thinking" indicator.
  No new native APIs — just careful UX.
- **Confirmation phrase modal** for destructive actions (account deletion).

**Open questions:**
- Coach AI without streaming: 5-15s wait for response is rough. Acceptable for v1?
- Journal: copy the rotating prompt logic from web verbatim.
- Settings — should we add a "Switch to clinic web" link for users who are
  practitioners? No — practitioners are blocked at login already (per Plan 1 Task 22).

**Done when:**
- Can have a full Coach chat conversation on mobile.
- Can write a journal entry.
- Can delete your account with the confirmation phrase.
- TestFlight build distributed (this is the LAST module — we're parity).

**Estimated tasks:** ~15-20.

---

## Plan 7 — Polish + Closed Beta + Public Release

**Why this is one plan and not two:** Phases 7 and 8 from the spec are
collapsed here because Phase 8 ("submit to stores") is operationally simple
once Phase 7 (polish + beta) is done.

**Prerequisites:** Plan 6 complete. Feature parity with web's patient experience.

**Scope (no new feature work — pure polish and process):**

### Phase 7a — Polish

- **Edge cases pass**: keyboard avoidance on every form, safe-area insets on every
  screen (notches), error states ("¿se cayó el internet?"), loading skeletons,
  cold-start vs background-resume behavior.
- **QA on real devices**: at least one iOS device + one Android device (borrow if
  needed). Different screen sizes (iPhone SE / Pro Max, small Android).
- **Accessibility pass**: minimum 44×44 touch targets, contrast checks, screen
  reader smoke test (VoiceOver on iOS).
- **Performance**: open profiler, check for jank on scroll-heavy screens (Food
  search list, History). Add `React.memo` where needed.
- **Analytics decision**: do we add analytics in v1? If yes, `expo-analytics-amplitude`
  or PostHog. If no, defer — but resolve before public release.

### Phase 7b — Store assets

- **App icon (final)** — 1024×1024, designed (not placeholder). Adaptive icon for Android.
- **Splash screen (final)**.
- **Screenshots** (5-10 per device size: iPhone 6.7", 6.5", 5.5", iPad 12.9", Android
  phone, Android tablet). Generate with real data from a demo account.
- **App Store description** in Spanish (es-MX) and English (en-US fallback). Title,
  subtitle, keywords, full description, what's new (for first version: "Versión
  inicial").
- **Play Store equivalent**: short description (80 chars), full description, feature
  graphic (1024×500).
- **Privacy policy URL** — host at `fitkis.app/privacy` (write the doc).
- **Terms of service URL** — host at `fitkis.app/terms`.
- **App Store privacy nutrition labels**: declare data collection (Supabase email,
  weight logs, food logs, etc.). Apple form is detailed; allow ~half a day.
- **Play Store data safety form**: equivalent to Apple's privacy.

### Phase 7c — Closed beta

- Run `eas build --profile production` for both platforms.
- Submit to TestFlight external testing (max 10,000 testers; we'll have 5-10).
- Submit to Play Console closed track (5-10 testers).
- TestFlight external testing requires Apple's beta review (~24 hours).
- Recruit 5-10 patients from the existing web app — invite via email.
- Iterate on feedback for ~1 week. Critical bugs only — no scope creep.

### Phase 8 — Public release

- Submit to App Store Review (~1-3 days).
- Submit to Play Console production track (~hours).
- When both approve, push the release toggle.
- Add a banner on `fitkis.app` patient routes: "📱 Ya estamos en App Store y Play
  Store — descarga la app".
- Patient routes on web stay alive (frozen) — cutover decision is a separate
  spec post-launch (let mobile prove itself for 2-4 weeks first).

**Open questions to resolve when writing the detailed plan:**
- App icon design: hire freelance ($100-300)? Use existing PulseLine motif?
- Screenshots: stage with real-looking demo data, screenshot on simulator, or use
  a tool like Fastlane Screengrab? Or design mockups in Figma?
- Privacy policy / terms — write from scratch, use a generator (Termly,
  iubenda), or hire a lawyer? The Mexican market has specific data protection
  regulations (LFPDPPP).
- Pricing: free? Subscription? In v1 default to free, decide monetization later.

**Done when:**
- App is live on App Store and Play Store. Anyone can download FitKis on iOS or
  Android. The web banner directs patients there.
- Internal docs updated (README, CLAUDE.md, context.md) reflecting live state.
- Migration officially complete.

**Estimated tasks:** ~20-25 across the three sub-phases. Plan will spell out
which are time-bounded (e.g., "Apple review: 24-72h, set notification") vs
async (you do other work while waiting).

---

## Cross-Plan Considerations (apply to every future plan)

### When you start a new plan
1. **Run `git pull` on both repos.**
2. **Re-read the spec** (`2026-04-27-mobile-migration-design.md`).
3. **Re-read this roadmap** for the relevant section.
4. **Audit what's actually shipped** in the mobile repo — components, hooks,
   conventions. Update this roadmap if the actual state differs from outline.
5. **Use `superpowers:writing-plans`** to draft the detailed task-by-task plan.

### Sync discipline (shared files between web and mobile)
Each plan adds new "synced" code (e.g., a new util in `lib/utils.ts`, a new
type in `types/index.ts`). When you finish a plan, the PR description must
include:

```
Synced files (mirror in fitkis-mobile / fitkis):
- types/index.ts (added: <new types>)
- lib/utils.ts (added: <new functions>)
```

Open an issue in the OTHER repo titled "Sync from <plan name>" with the diff to
copy. This is the discipline mentioned in the spec; if it gets painful, that's
the trigger to convert to a monorepo (separate spec).

### Where new things land
- **New API route on web** (e.g., a new AI feature) → in `fitkis`, must use
  `getAuthedUser` from day 1 (see Plan 1 / Task 1).
- **New screen on mobile** → in `fitkis-mobile/app/(app)/...`. Follow existing
  conventions (SafeAreaView wrapper, NativeWind classes, hooks for data).
- **New shared code** (utility, type, constant) → write in **both** repos as
  part of the same plan. Note in PR description.

### When mobile diverges from web
The spec says "funcionalidades funcionen exactamente igual". When you find a
case where mobile genuinely needs to differ (e.g., camera permissions, native
modal style), document it in the relevant plan's "Open questions" and pick the
mobile-natural choice. Don't fight the platform.

### Versioning / release notes
- Mobile app version follows semver in `app.json`. Plan 1 = `1.0.0`.
- Each subsequent module ships a new minor version: Plan 2 = `1.1.0`, Plan 3 =
  `1.2.0`, etc. Up to public release at `1.6.0` (after Plan 7).
- Build numbers auto-increment via EAS.
- Each plan ends with a release note line in `CHANGELOG.md` (TBD: create in Plan 2
  or skip until Plan 7).
