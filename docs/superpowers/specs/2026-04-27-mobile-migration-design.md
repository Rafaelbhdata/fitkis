# FitKis Mobile Migration — Design Spec

**Date:** 2026-04-27
**Author:** Rafael (with brainstorming assistance)
**Status:** Approved, ready for plan

---

## Problem & Goal

FitKis was originally built as a Next.js web app with a mobile-first design. After ~6 months of development, the patient module is mature and the consultation/clinic module (B2B) is in active development. The realization: patients use the app primarily from their phones — at the gym, in the kitchen, on the go. A native mobile app provides:

- Distribution via App Store and Google Play (discovery, trust, ratings).
- Better UX for the patient flow (gestures, performance, native camera/barcode).
- Eventually: push notifications, offline mode, native sensors.

**Goal:** Migrate the patient-facing experience to a React Native (Expo) mobile app. Keep the existing web app as the clinic/practitioner panel + landing site. Same Supabase backend, same data, same design.

**Non-goals (v1):** Push notifications, offline mode, OAuth providers, real-time updates, OTA updates, dark mode, response streaming for the Coach AI.

---

## High-Level Decisions

| Decision | Choice |
|---|---|
| Web app fate | Becomes clinic-only + landing. Patient routes frozen during migration. |
| Repos | Two separate repos: `fitkis` (web) + `fitkis-mobile` (new). |
| Patient web routes during migration | Frozen (bugfixes only, no new features). Cutover decision deferred to a separate spec post-launch. |
| Backend API location | Stays in `fitkis` (Vercel). Mobile calls them with `Authorization: Bearer <jwt>`. |
| Release strategy | Internal testing early via TestFlight + Play Console Internal Track. Closed beta before public release. |
| Migration sequence | Foundation → modules in increasing complexity (Habits → Weight → Gym → Food → Coach/Journal/Settings). |

---

## Tech Stack

### Mobile (`fitkis-mobile`)

- **Expo SDK 52+** (managed workflow — no Xcode/Android Studio required for daily development).
- **Expo Router v4** — file-based routing, mental parallel to Next.js App Router.
- **NativeWind v4** — Tailwind CSS compiled to React Native StyleSheet. Lets us reuse class names from the web codebase with minimal changes.
- **@supabase/supabase-js** — same client SDK as web. Configured with `expo-secure-store` for session persistence (not AsyncStorage — keeps JWT encrypted at rest).
- **react-native-svg** — required for porting the custom SVG charts (`MetricChart`, `Sparkline`, `RangeMeter`, `PulseLine`). Preserves 100% of the visual design.
- **expo-camera** + **expo-barcode-scanner** — native barcode scanning. More reliable than the web BarcodeDetector + ZXing fallback.
- **expo-image-picker** — photo selection/capture for plate analysis and progress photos.
- **expo-secure-store** — encrypted key/value storage for Supabase session.
- **expo-linking** — deep links for password reset (`fitkis://reset-password?token=...`).
- **EAS Build + EAS Submit** — build pipeline and store submission.

### Web (`fitkis`, existing)

No new tech. Two adjustments:

1. New helper `getAuthedUser(request)` on API routes that accepts both cookie SSR auth (web/clinic) and `Authorization: Bearer` (mobile).
2. New static page `app/download/page.tsx` (links to App Store and Play Store).

---

## Repo Layout

### `fitkis` (existing repo)

Mostly unchanged. Two new files, one modified middleware, five modified API routes:

```
app/
  (clinic)/...           # No changes
  (auth)/...             # No changes (login still works for both web and mobile)
  (app)/...              # FROZEN — bugfixes only, no new features. Eliminated in a future cutover spec.
  download/page.tsx      # NEW — marketing page with App Store and Play Store badges
  api/
    chat/route.ts            # Modified — add bearer-token auth fallback
    suggested-prompts/route.ts  # Modified — same
    plate-analysis/route.ts     # Modified — same
    barcode-lookup/route.ts     # Modified — same
    delete-account/route.ts     # Modified — same
lib/
  api-auth.ts            # NEW — getAuthedUser(request) helper
middleware.ts            # No changes (web auth flow stays as is)
```

### `fitkis-mobile` (new repo)

```
fitkis-mobile/
  app.json               # Expo config: bundle id com.fitkis.app, scheme fitkis
  app.config.ts          # Reads env vars from EAS secrets
  eas.json               # EAS Build profiles: development / preview / production
  package.json
  tsconfig.json
  tailwind.config.ts     # Copied from web (preserves all custom tokens)
  babel.config.js        # NativeWind plugin
  metro.config.js        # NativeWind metro integration

  app/
    _layout.tsx          # Root layout: auth gate + theme
    +not-found.tsx       # 404
    (auth)/
      _layout.tsx
      login.tsx
      register.tsx
      reset-password.tsx
    (app)/
      _layout.tsx        # Tab navigator (Dashboard / Gym / Food / Hábitos)
      dashboard.tsx
      gym/
        index.tsx
        session/[id].tsx
        history.tsx
        progress.tsx
      food/
        index.tsx
        favorites.tsx
        _barcode-scanner.tsx   # Modal route
        _plate-photo.tsx       # Modal route
      weight/
        index.tsx
      habits/
        index.tsx
        progress.tsx
      coach/
        index.tsx
      settings/
        index.tsx

  components/
    ui/                  # Button, Input, Card, Modal, BottomSheet, Toast, PulseLine
    gym/                 # SetRow, RestTimer, ProgressionBanner
    food/                # FoodSearchModal, BarcodeResult, PlateResult, FavoritesList
    weight/              # MetricStatCard, RangeMeter, MetricChart
    habits/              # HabitRow, HabitChart
    coach/               # ChatMessage, CoachInput, SuggestedPrompts

  lib/
    supabase.ts          # Supabase client + session config
    utils.ts             # Copy from web (formatDate, parseLocalDate, getToday, calculateBMI, etc.)
    constants.ts         # Copy from web (USER_PROFILE, ROUTINE_SCHEDULE, FOOD_GROUP_LABELS, equivalentes)
    smae-foods.json      # Copy from web
    api-client.ts        # apiFetch(path, options) — wraps fetch, injects bearer JWT
    hooks/
      useUser.ts
      useSupabase.ts
      useToast.ts

  types/
    index.ts             # Copy from web
```

### Shared code (manually synced)

The following files exist in both repos and must be kept in sync:

| File | Lives in | Notes |
|---|---|---|
| `types/index.ts` | both | DB row interfaces (WeightLog, FoodLog, etc.) |
| `lib/utils.ts` | both | Date helpers, BMI calc, etc. — DOM-free functions only |
| `lib/constants.ts` | both | USER_PROFILE, equivalentes SMAE, ROUTINE_SCHEDULE |
| `lib/smae-foods.json` | both | Food database |

**Sync convention:** When changing any of these in one repo, the PR description must include "needs sync to mobile/web" and an issue is opened in the other repo to mirror the change. Manual discipline; no automation in v1. If divergence becomes painful, evaluate monorepo migration as a separate spec.

---

## Auth Flow

### Mobile session lifecycle

1. **Cold start**: `_layout.tsx` calls `supabase.auth.getSession()`. Reads from `expo-secure-store`.
2. **No session**: navigate to `(auth)/login`.
3. **Active session**: navigate to `(app)/dashboard`.
4. **Login**: `supabase.auth.signInWithPassword({email, password})`. On success, session auto-persists to SecureStore. Navigation flips to `(app)`.
5. **Logout**: `supabase.auth.signOut()`. Session removed. Navigate to `(auth)/login`.
6. **Token refresh**: handled automatically by Supabase SDK; no manual logic needed.

### Password reset (deep linking)

1. User taps "Olvidé mi contraseña" → enters email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'fitkis://reset-password' })`.
2. User receives email with link `fitkis://reset-password?access_token=...&refresh_token=...`.
3. iOS/Android opens the FitKis app, `expo-linking` parses the URL, navigates to `(auth)/reset-password` with the token.
4. Reset screen calls `supabase.auth.setSession({access_token, refresh_token})` then `supabase.auth.updateUser({password: newPassword})`.

URL scheme `fitkis` is registered in `app.json` for both iOS (`CFBundleURLTypes`) and Android (`intentFilters`).

### Practitioner accounts on mobile

Mobile is patient-only. If a practitioner logs in on mobile, after `signInWithPassword` we check the `practitioners` table (same query as web middleware). If they're a practitioner, sign them out and show "Esta app es para pacientes — usa fitkis.app desde tu computadora".

---

## Data Layer

### Supabase client

`lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  Constants.expoConfig!.extra!.supabaseUrl,
  Constants.expoConfig!.extra!.supabaseAnonKey,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // mobile uses deep links instead
    },
  }
)
```

### Query patterns

Same as web — `supabase.from('table').select(...).eq(...).order(...)`. RLS policies already enforce per-user data access.

### Caching strategy (v1)

None custom. Each screen `useEffect` re-fetches on mount. If UX feels stale, v2 evaluates React Query with persist. The current web doesn't cache either — parity preserved.

### Calling Vercel API routes

`lib/api-client.ts`:

```ts
import { supabase } from './supabase'

const BASE_URL = 'https://fitkis.app' // or read from Constants

export async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(`${BASE_URL}${path}`, { ...options, headers })
}
```

Used for: `/api/chat`, `/api/suggested-prompts`, `/api/plate-analysis`, `/api/barcode-lookup`, `/api/delete-account`.

### Web API routes — bearer auth fallback

`lib/api-auth.ts` (new file in `fitkis` repo):

```ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function getAuthedUser(request: Request) {
  // Try cookie auth first (web/clinic).
  const cookieStore = cookies()
  const ssrClient = createServerClient(/* ... */)
  const { data: { user: cookieUser } } = await ssrClient.auth.getUser()
  if (cookieUser) return { user: cookieUser, supabase: ssrClient }

  // Fallback: bearer token (mobile).
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const tokenClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user: tokenUser } } = await tokenClient.auth.getUser(token)
    if (tokenUser) return { user: tokenUser, supabase: tokenClient }
  }

  return { user: null, supabase: null }
}
```

Each of the 5 API routes is updated to:

```ts
const { user, supabase } = await getAuthedUser(request)
if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
// ... rest of route uses `user` and `supabase` as before
```

---

## UI Strategy

### Design tokens

`tailwind.config.ts` is **copied verbatim** from `fitkis` to `fitkis-mobile`. Includes all the custom tokens:
- Colors: `paper`, `paper-2`, `paper-3`, `ink`, `ink-2..ink-7`, `signal`, `signal-soft`, `leaf`, `leaf-soft`, `honey`, `honey-soft`, `berry`, `berry-soft`, `sky`, `sky-soft`.
- Custom utilities: `fk-mono`, `fk-eyebrow`, `fk-display`.
- Font families: Barlow Condensed (display), Barlow (body).

### Component mapping (web → mobile)

| Web (HTML/Tailwind) | Mobile (RN/NativeWind) |
|---|---|
| `<div>` | `<View>` |
| `<p>`, `<span>`, `<h1>` | `<Text>` (RN requires text wrapped in `<Text>`) |
| `<button>` | `<Pressable>` (preferred over `<TouchableOpacity>`) |
| `<input type="text">` | `<TextInput>` |
| `<input type="number">` | `<TextInput>` with `keyboardType="numeric"` |
| `<input type="date">` | Custom date picker (`@react-native-community/datetimepicker`) |
| `<input type="file">` | `expo-image-picker` |
| `<select>` | Native `<Picker>` from `@react-native-picker/picker` |
| `<textarea>` | `<TextInput multiline>` |
| `<svg>` | `<Svg>` from react-native-svg |
| `<Image src/>` (Next) | `<Image>` from `expo-image` (better caching) |
| `onClick` | `onPress` |
| `onMouseEnter`/`onMouseLeave` | `onPressIn`/`onPressOut` (or `onTouchStart` for SVG circles) |
| Modal as fixed bottom-sheet | Expo Router modal route (`presentation: 'modal'`) or custom with `react-native-reanimated` |

### Charts (preserves design exactly)

The custom SVG charts in `app/(app)/weight/page.tsx` are reimplemented with `react-native-svg`. The math is identical; only the JSX tags change:

| Web | Mobile |
|---|---|
| `<svg viewBox=...>` | `<Svg viewBox=...>` |
| `<path d=...>` | `<Path d=...>` |
| `<circle cx cy r>` | `<Circle cx cy r>` |
| `<text>` | `<SvgText>` |
| `<line>` | `<Line>` |
| `<linearGradient>` + `<stop>` | `<Defs>` + `<LinearGradient>` + `<Stop>` |

Hover interactivity (`onMouseEnter`/`onMouseLeave` on circles) becomes `onPressIn`/`onPressOut`. Tooltip rendered as absolutely-positioned `<View>` over the chart.

The semáforo `RangeMeter` component is similar — proportional bar segments become `<View>` with `flexGrow`, threshold labels become absolutely-positioned `<Text>`, the arrow becomes a small triangle `<View>` with `borderLeft/borderRight transparent + borderTop colored` (works in RN identically to CSS).

### Tab navigator

`app/(app)/_layout.tsx` uses Expo Router's `<Tabs>` component with 4 tabs:

```tsx
<Tabs screenOptions={{ tabBarStyle: { /* paper bg, ink text */ } }}>
  <Tabs.Screen name="dashboard" options={{ title: 'Hoy', icon: <HomeIcon /> }} />
  <Tabs.Screen name="gym" options={{ title: 'Gym', icon: <DumbellIcon /> }} />
  <Tabs.Screen name="food" options={{ title: 'Comida', icon: <UtensilsIcon /> }} />
  <Tabs.Screen name="habits" options={{ title: 'Hábitos', icon: <CheckIcon /> }} />
</Tabs>
```

`weight`, `coach`, `settings` are accessed from inside `dashboard` (cards/buttons), not as top-level tabs — same as the current web design.

---

## Native Features

### Barcode scanning

`expo-camera`'s `<CameraView>` with `barcodeScannerSettings` prop. On `onBarCodeScanned` callback:

```tsx
<CameraView
  facing="back"
  barcodeScannerSettings={{
    barcodeTypes: ['ean13', 'ean8', 'upca', 'upce', 'code128']
  }}
  onBarcodeScanned={(result) => {
    if (handledRef.current) return
    handledRef.current = true
    handleCode(result.data)
  }}
/>
```

Replaces the BarcodeDetector + ZXing dual-strategy of the web. Single, reliable native API.

### Plate photo

`expo-image-picker.launchImageLibraryAsync` (or `launchCameraAsync` for camera direct):

```tsx
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: false,
  quality: 0.7,
  base64: true,
})
if (!result.canceled) {
  const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`
  await apiFetch('/api/plate-analysis', {
    method: 'POST',
    body: JSON.stringify({ image: dataUrl, meal: selectedMeal }),
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### Progress photos (Weight module)

Identical pattern: `expo-image-picker` to capture, `supabase.storage.from('progress-photos').upload(...)` to store. Works the same as web.

### Coach AI

No streaming. `apiFetch('/api/chat', { method: 'POST', body: ... })`, await full response, render. If perceived latency is an issue, v2 evaluates `react-native-sse`.

---

## Migration Phases

Each phase ends with an EAS Build to TestFlight (iOS) and Play Console Internal Track (Android) so the build is testable on real devices.

### Phase 0 — Web preparation (~1 day)

In `fitkis` repo:
- Add `lib/api-auth.ts` with `getAuthedUser()` helper (cookie + bearer fallback).
- Update 5 API routes to use the helper.
- Manual test with curl + bearer JWT.
- Add `app/download/page.tsx` (static marketing page).
- Merge to master, deploy to Vercel.

### Phase 1 — Mobile skeleton (~3-5 days)

- `npx create-expo-app fitkis-mobile` with TypeScript template.
- Install: Expo Router, NativeWind, react-native-svg, expo-secure-store, @supabase/supabase-js, expo-linking, expo-camera, expo-image-picker, expo-image, @react-native-community/datetimepicker.
- Configure NativeWind: copy `tailwind.config.ts` from web, set up `babel.config.js` and `metro.config.js`.
- Set up `app.json`: bundle id `com.fitkis.app`, URL scheme `fitkis`, splash screen, placeholder icon.
- Copy shared files: `types/index.ts`, `lib/utils.ts`, `lib/constants.ts`, `lib/smae-foods.json` from web.
- Implement `lib/supabase.ts`, `lib/api-client.ts`, `lib/hooks/{useUser,useSupabase,useToast}.ts`.
- Implement base UI components: `Button`, `Input`, `Card`, `Modal` (bottom sheet), `Toast`, `PulseLine`.
- Implement auth screens: login, register, reset-password (with deep link handling).
- Implement tab navigator with 4 tabs (Dashboard, Gym, Food, Hábitos), each rendering "WIP".
- Implement basic Dashboard: fetch latest `weight_logs`, show current weight. Validates end-to-end data flow.
- Set up EAS: `eas.json` with development/preview/production profiles. Run first build to TestFlight.

### Phase 2 — Habits (~2-3 days)

- Habits list screen: read `habits` table, show daily check items.
- Add/edit/delete habits modal.
- Daily log screen: checkbox/inputs per habit type (`daily_check`, `quantity`, `weekly_frequency`).
- Progress screen: streak count, monthly %, weekly history chart (react-native-svg).
- Build to TestFlight.

### Phase 3 — Weight (~3-4 days)

- Hero stat: current weight + delta vs comparison log.
- Comparison dropdown: select past log.
- 4 metric cards (IMC, %Grasa, Masa Muscular, Masa Grasa) with `RangeMeter` (3-segment traffic-light bar with arrow + x-scale).
- `MetricChart` with axes, data points, tap-tooltip.
- Add measurement modal (date, weight, composition, notes).
- Tap row to edit, delete from modal.
- Progress photos: capture/select, upload to Supabase Storage, display grid, compare-mode (before/after).
- Build to TestFlight.

### Phase 4 — Gym (~4-5 days)

- "Rutina del día" screen: read `ROUTINE_SCHEDULE`, show today's exercises.
- Active session screen: SetRow (lbs/reps/feeling), RestTimer, exercise substitution UI.
- ProgressionBanner: detect "completed all sets last 2 sessions" and suggest +5 lbs.
- History screen: list past sessions with summary.
- Progress screen: per-exercise weight progression chart.
- Build to TestFlight.

### Phase 5 — Food (~5-7 days, the most complex)

- Daily view: 4-6 meals (desayuno, snack1, comida, snack2, cena, snack3).
- Group progress bars (verdura/fruta/carb/leguminosa/proteina/grasa) with budget per group from `USER_PROFILE`.
- Search modal: filter `lib/constants.ts` equivalentes + `smae-foods.json`. Tap to add.
- Favorites: CRUD + one-tap-add.
- Yogurt griego split (1 proteína + 1 grasa), alcohol counts as carb (per CLAUDE.md food rules).
- **Barcode scanner modal**: `expo-camera` + `BarCodeScanner` settings, `onBarcodeScanned` → call `/api/barcode-lookup` → show product modal with editable equivalents → save to `food_logs`.
- **Plate photo modal**: `expo-image-picker` → base64 → call `/api/plate-analysis` → show estimated equivalents modal → save.
- Build to TestFlight.

### Phase 6 — Coach + Journal + Settings (~3-4 days)

- Coach screen: chat list (FlatList of messages), input + send button, suggested prompts row. Calls `/api/chat` and `/api/suggested-prompts` (no streaming).
- Journal screen: daily prompt rotation + textarea, save to `journal_entries`.
- Settings screen: profile, current diet config, logout, **delete account** (modal with "ELIMINAR MI CUENTA" confirmation phrase, calls `/api/delete-account`).
- Build to TestFlight.

### Phase 7 — Polish + Closed Beta (~1 week)

- QA on real iOS and Android devices.
- Edge cases: keyboard avoidance (KeyboardAvoidingView), safe area insets (notches), error states, loading skeletons, network failure handling, cold start vs background.
- App Store Connect setup: app icon (final), splash, descriptions in es-MX, screenshots (5-10 per device size), privacy policy URL, terms of service URL.
- Play Console setup: same metadata + content rating questionnaire.
- Production builds via EAS; submit to TestFlight external testers and Play Console closed track (~5-10 testers).
- Iterate on bugs reported during closed beta.

### Phase 8 — Public release

- Submit to App Store Review (~1-3 day wait) and Play Console production track (~hours).
- When both approve, release publicly.
- In `fitkis` web: add a banner on patient routes: "📱 Descarga FitKis para iOS y Android — [App Store badge] [Play Store badge]". Patient routes remain functional (frozen state).
- Cutover decision (eliminate patient routes from web, replace with `/download` redirect) → separate spec, after weeks of mobile stability.

---

## Build & Distribution

### EAS Build profiles (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": {"appleId": "...", "ascAppId": "..."},
      "android": {"serviceAccountKeyPath": "..."}
    }
  }
}
```

### Versioning

`expo-updates` runtime version + auto-increment via EAS. Build numbers always go up; no manual bumps required.

### Required accounts (cost)

- **Apple Developer Program**: $99 USD/year. Required for TestFlight + App Store.
- **Google Play Console**: $25 USD one-time. Required for Internal Track + Play Store.

### Release process per phase

1. Land changes for the phase.
2. `eas build --platform all --profile preview`.
3. Builds appear in TestFlight (iOS) and Play Console Internal Track (Android) within ~15-30 min.
4. Install on personal device, test the new module + smoke-test previously-shipped modules.
5. Fix bugs, repeat.

For Phase 7+ public release: `eas build --platform all --profile production` then `eas submit -p ios && eas submit -p android`.

---

## Out of Scope (v1)

Explicitly deferred. Each is a candidate for v2 specs:

- **Push notifications** (`expo-notifications`) — defined use cases first (e.g., "nutrióloga subió tu plan", "registra tu peso", "se acerca tu cita"), then implement.
- **Offline mode** — no local query cache. Network failures show error state. v2 evaluates React Query + persist plugin.
- **OAuth** (Sign in with Apple, Google) — requires Apple Sign-In if Google is added. Email/password only in v1.
- **Coach response streaming** — full response awaited. v2 if latency feels poor in production.
- **OTA updates with `expo-updates`** — v2, after release cycle stabilizes.
- **Dark mode** — current "Paper & Pulse" design system has no dark variant on web; design that out separately.
- **Realtime subscriptions** (`supabase.channel`) — not used on web either; v2 if a use case appears.
- **Web app patient route cutover** — separate spec post-launch, after we're confident mobile handles all use cases.

---

## Open questions (for the implementation plan)

The following need clarification or further research during implementation but don't block the spec:

- **Date picker UX**: `@react-native-community/datetimepicker` shows native iOS spinner / Android calendar. Verify it matches the design language; if not, evaluate a custom calendar component or `react-native-calendars`.
- **Bottom sheet implementation**: Expo Router's modal route vs `@gorhom/bottom-sheet` vs custom with reanimated. Decide in Phase 1 based on which gives the closest match to current web modal behavior (slide up from bottom, overlay backdrop, swipe-to-dismiss).
- **App icon and splash design**: TBD before Phase 7 (closed beta). Out of scope for engineering, but blocking for store submission.
- **Privacy policy and terms of service URLs**: required by both stores. TBD before Phase 7. Hosted at `fitkis.app/privacy` and `fitkis.app/terms`.
