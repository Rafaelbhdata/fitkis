# FitKis Mobile Migration — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the existing web app's API routes to accept bearer-token auth, then bootstrap a new Expo mobile app with Supabase auth, tab navigation, and a working dashboard, ending with the first build installable on a real iPhone via TestFlight.

**Architecture:** Two separate repos. The web repo (`fitkis`) gets a single auth helper added and the 5 API routes refactored to use it (no breaking change to web/clinic). A new mobile repo (`fitkis-mobile`) is initialized as an Expo managed-workflow TypeScript project, configured with Expo Router (file-based routing), NativeWind (Tailwind for React Native), and Supabase JS with `expo-secure-store` for session persistence. EAS Build handles iOS/Android builds and store submission.

**Tech Stack:**
- Web (existing): Next.js 14, `@supabase/ssr`, `@supabase/supabase-js`
- Mobile (new): Expo SDK 52+, Expo Router 4+, NativeWind 4+, `@supabase/supabase-js` 2+, `expo-secure-store`, `expo-linking`, `react-native-svg`, EAS Build/Submit

**Repos & paths:**
- Web: `C:\Users\Rafae\Projects\fitkis` (existing repo, branch `master`)
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (new repo, created in Task 9)

**Spec reference:** `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

---

## File Structure

### Web repo (`fitkis`) — modifications

| Path | Action | Purpose |
|---|---|---|
| `lib/api-auth.ts` | Create | `getAuthedUser(request)` — supports cookie SSR (web/clinic) and `Authorization: Bearer` (mobile) |
| `app/api/chat/route.ts` | Modify | Use `getAuthedUser` |
| `app/api/suggested-prompts/route.ts` | Modify | Use `getAuthedUser` |
| `app/api/plate-analysis/route.ts` | Modify | Use `getAuthedUser` |
| `app/api/barcode-lookup/route.ts` | Modify | Use `getAuthedUser` |
| `app/api/delete-account/route.ts` | Modify | Use `getAuthedUser` |
| `app/download/page.tsx` | Create | Marketing landing with App Store / Play Store badges |

### Mobile repo (`fitkis-mobile`) — new project

```
fitkis-mobile/
├── app.json                  Expo config: bundle id, scheme, splash, icon refs
├── app.config.ts             Expose env vars to runtime via expo-constants
├── eas.json                  EAS Build profiles: development / preview / production
├── package.json
├── tsconfig.json
├── tailwind.config.ts        Copied from web (DOM-free)
├── babel.config.js           Includes nativewind/babel preset
├── metro.config.js           Wraps Metro with NativeWind
├── global.css                Tailwind base directives
├── nativewind-env.d.ts       Type augmentation for className prop
├── .env                      SUPABASE_URL / SUPABASE_ANON_KEY / API_BASE_URL
├── .gitignore
│
├── app/
│   ├── _layout.tsx           Root layout: auth gate, providers, deep-link handler
│   ├── +not-found.tsx
│   ├── index.tsx             Initial redirect: (auth)/login or (app)/dashboard
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── reset-password.tsx
│   └── (app)/
│       ├── _layout.tsx       Tab navigator: Dashboard / Gym / Food / Hábitos
│       ├── dashboard.tsx
│       ├── gym/index.tsx     WIP placeholder
│       ├── food/index.tsx    WIP placeholder
│       └── habits/index.tsx  WIP placeholder
│
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── Toast.tsx
│       └── PulseLine.tsx
│
├── lib/
│   ├── supabase.ts           Supabase client + SecureStore adapter
│   ├── api-client.ts         apiFetch(path, opts) with bearer JWT injection
│   ├── utils.ts              Copy from web
│   ├── constants.ts          Copy from web
│   ├── smae-foods.json       Copy from web
│   └── hooks/
│       ├── useUser.ts
│       ├── useSupabase.ts
│       └── useToast.ts
│
├── types/
│   └── index.ts              Copy from web
│
└── assets/
    ├── icon.png              1024x1024 placeholder
    ├── splash.png            placeholder
    ├── adaptive-icon.png     Android adaptive icon
    └── favicon.png
```

---

# PART A — WEB PREPARATION (PHASE 0)

> All Part A tasks run in `C:\Users\Rafae\Projects\fitkis` on a new branch.

### Task 1: Create branch and add `getAuthedUser` helper

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis\lib\api-auth.ts`

- [ ] **Step 1: Create branch from master**

```bash
cd /c/Users/Rafae/Projects/fitkis
git checkout master
git pull
git checkout -b feat/api-bearer-auth
```

Expected: clean working tree on new branch.

- [ ] **Step 2: Create `lib/api-auth.ts`**

```ts
// lib/api-auth.ts
//
// Auth helper for API routes that supports BOTH:
//   1. Cookie-based SSR auth (web/clinic — same as before)
//   2. Authorization: Bearer <jwt> (mobile clients)
//
// Routes call getAuthedUser(request); if it returns { user, supabase }
// they're authenticated, otherwise return 401.

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getAuthedUser(
  request: Request
): Promise<{ user: User | null; supabase: SupabaseClient | null }> {
  // 1. Try cookie auth first (web/clinic).
  const cookieStore = cookies()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Middleware handles refresh — ignore.
        }
      },
    },
  })
  const { data: { user: cookieUser } } = await ssrClient.auth.getUser()
  if (cookieUser) return { user: cookieUser, supabase: ssrClient }

  // 2. Fallback: Bearer token (mobile clients).
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)
    const tokenClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user: tokenUser } } = await tokenClient.auth.getUser(token)
    if (tokenUser) return { user: tokenUser, supabase: tokenClient }
  }

  return { user: null, supabase: null }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lib/api-auth"
```

Expected: empty output (no errors specific to this file).

- [ ] **Step 4: Commit**

```bash
git add lib/api-auth.ts
git commit -m "feat(api): add getAuthedUser helper supporting cookie + bearer"
```

---

### Task 2: Update `/api/chat` route to use the helper

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Read current auth code**

```bash
grep -n "createServerClient\|getUser\|cookies()" app/api/chat/route.ts | head -20
```

Note the lines that do auth (typically near the top of POST/GET handlers).

- [ ] **Step 2: Replace inline auth with helper**

Open `app/api/chat/route.ts`. At the top of the POST handler, replace the existing `createServerClient(...)` setup and `supabase.auth.getUser()` call with:

```ts
import { getAuthedUser } from '@/lib/api-auth'

// ... inside POST handler ...

const { user, supabase } = await getAuthedUser(request)
if (!user || !supabase) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

// rest of handler uses `user` and `supabase` as before
```

Remove the now-unused imports: `createServerClient`, `cookies`, `CookieOptions`, and the `createRouteHandlerClient` helper if it was defined inline.

- [ ] **Step 3: Verify the build still passes**

```bash
npx tsc --noEmit 2>&1 | grep "app/api/chat" | head -10
```

Expected: empty (no errors).

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "refactor(api): /api/chat uses getAuthedUser helper"
```

---

### Task 3: Update `/api/suggested-prompts` route

**Files:**
- Modify: `app/api/suggested-prompts/route.ts`

- [ ] **Step 1: Apply same refactor pattern**

In `app/api/suggested-prompts/route.ts`, replace the existing inline auth (likely a `createRouteHandlerClient` or `createServerClient` block) with:

```ts
import { getAuthedUser } from '@/lib/api-auth'

// ... inside the handler ...

const { user, supabase } = await getAuthedUser(request)
if (!user || !supabase) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

Remove unused imports.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "suggested-prompts" | head -10
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add app/api/suggested-prompts/route.ts
git commit -m "refactor(api): /api/suggested-prompts uses getAuthedUser helper"
```

---

### Task 4: Update `/api/plate-analysis` route

**Files:**
- Modify: `app/api/plate-analysis/route.ts`

- [ ] **Step 1: Apply same refactor**

In `app/api/plate-analysis/route.ts`, replace inline auth with:

```ts
import { getAuthedUser } from '@/lib/api-auth'

// ... inside POST handler ...

const { user, supabase } = await getAuthedUser(request)
if (!user || !supabase) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

Remove the inline `createRouteHandlerClient` function and unused imports.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "plate-analysis" | head -10
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add app/api/plate-analysis/route.ts
git commit -m "refactor(api): /api/plate-analysis uses getAuthedUser helper"
```

---

### Task 5: Update `/api/barcode-lookup` route

**Files:**
- Modify: `app/api/barcode-lookup/route.ts`

- [ ] **Step 1: Apply same refactor**

```ts
import { getAuthedUser } from '@/lib/api-auth'

// ... inside GET handler ...

const { user, supabase } = await getAuthedUser(request)
if (!user || !supabase) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "barcode-lookup" | head -10
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add app/api/barcode-lookup/route.ts
git commit -m "refactor(api): /api/barcode-lookup uses getAuthedUser helper"
```

---

### Task 6: Update `/api/delete-account` route

**Files:**
- Modify: `app/api/delete-account/route.ts`

- [ ] **Step 1: Apply same refactor (preserve service-role client for the actual deletion)**

This route does TWO things: authenticates the user, then uses a service-role client to perform the deletion. Keep the service-role logic intact.

```ts
import { getAuthedUser } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

// ... inside POST handler ...

const { user } = await getAuthedUser(request)
if (!user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

// Use the existing service-role client below for the actual delete operation.
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
// ... rest of route uses adminClient for the privileged delete
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "delete-account" | head -10
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add app/api/delete-account/route.ts
git commit -m "refactor(api): /api/delete-account uses getAuthedUser helper"
```

---

### Task 7: Add `/download` marketing page

**Files:**
- Create: `app/download/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/download/page.tsx
import Link from 'next/link'
import { PulseLine } from '@/components/ui/PulseLine'

export const metadata = {
  title: 'Descarga FitKis · iOS y Android',
  description: 'Lleva FitKis contigo. Disponible para iPhone y Android.',
}

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-1 mb-12">
        <span className="font-serif text-2xl italic tracking-tight">fitkis</span>
        <PulseLine w={28} h={12} color="var(--signal)" strokeWidth={2} active />
      </div>

      <div className="max-w-md text-center">
        <div className="fk-eyebrow mb-4">DESCARGA · MÓVIL</div>
        <h1 className="font-serif text-[42px] md:text-[56px] font-light leading-[1.05] tracking-tight mb-6">
          FitKis ahora<br />
          en tu <span className="italic text-signal">bolsillo</span>.
        </h1>
        <p className="text-ink-4 text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
          La experiencia de paciente vive ahora en una app nativa.
          Descárgala para iPhone o Android.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* App Store href: updated to https://apps.apple.com/app/id<ASC_APP_ID> in Task 31 */}
          <a
            href="#"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink-2 transition-colors"
          >
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.fitkis.app"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-ink-7 text-ink text-sm font-medium hover:bg-paper-2 transition-colors"
          >
            Google Play
          </a>
        </div>

        <p className="text-[11px] text-ink-5 mt-10">
          ¿Eres nutrióloga? Entra al panel desde{' '}
          <Link href="/login" className="underline">
            fitkis.app/login
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and visual rendering**

```bash
npm run dev
```

Open `http://localhost:3000/download` in browser. Expected: marketing page renders with FitKis branding, two buttons, and a link to /login. Stop the dev server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add app/download/page.tsx
git commit -m "feat(web): add /download landing page with store badge placeholders"
```

---

### Task 8: Smoke-test bearer-token auth manually

**Files:**
- (No code changes — verification task)

- [ ] **Step 1: Get a test JWT for an existing patient account**

In a browser, log in to `fitkis.app` (or `localhost:3000`) as a patient. Open DevTools → Application → Cookies. Find the cookie named `sb-<project-ref>-auth-token`. Copy its value (a long base64 JSON object). Decode it with:

```bash
echo '<pasted_cookie_value>' | base64 -d 2>/dev/null
```

Find the `access_token` field in the decoded JSON. Copy that value (a long JWT starting with `eyJ...`). Save it as an env var for the next step:

```bash
export TEST_JWT="eyJ...<your_full_jwt>"
```

- [ ] **Step 2: Hit `/api/barcode-lookup` with the bearer token**

With the dev server running (`npm run dev`):

```bash
curl -i -H "Authorization: Bearer $TEST_JWT" \
  "http://localhost:3000/api/barcode-lookup?barcode=7501055306053"
```

Expected: `HTTP/1.1 200 OK` with a JSON body (either `{success: true, found: ...}` or `{success: true, found: false, source: 'not_found'}`).

If you get `401 No autorizado`, the bearer auth path is broken. Check the Authorization header is being passed and the JWT isn't expired.

- [ ] **Step 3: Confirm cookie auth still works (regression check)**

In your browser (logged in), navigate to a patient page that triggers an API call (e.g., open the Coach chat). It should still work — no change for web users.

- [ ] **Step 4: Push branch and merge**

```bash
git push -u origin feat/api-bearer-auth
gh pr create --title "feat(api): bearer-token auth fallback for mobile clients" --body "$(cat <<'EOF'
## Summary
- New `lib/api-auth.ts` helper supporting both cookie SSR auth (web/clinic) and `Authorization: Bearer` (mobile)
- 5 API routes refactored to use it: chat, suggested-prompts, plate-analysis, barcode-lookup, delete-account
- New `/download` static landing page with App Store / Play Store badge placeholders

## Test plan
- [x] Cookie auth still works for logged-in web/clinic users (manual)
- [x] Bearer-token auth works for `/api/barcode-lookup` (curl with JWT)
- [ ] Verify build passes on Vercel preview
EOF
)"
```

After merging on GitHub, sync local:

```bash
git checkout master
git pull
```

---

# PART B — MOBILE PROJECT INITIALIZATION (PHASE 1 SETUP)

> All Part B tasks run in `C:\Users\Rafae\Projects\` (parent of both repos).

### Task 9: Initialize Expo TypeScript project

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\` (new directory + project)

- [ ] **Step 1: Create the Expo project**

```bash
cd /c/Users/Rafae/Projects
npx create-expo-app@latest fitkis-mobile -t expo-template-blank-typescript
```

Expected: prompt-free creation (template is specified). After ~1-2 min, you'll see "✅ Your project is ready!".

- [ ] **Step 2: Verify the project structure**

```bash
cd fitkis-mobile
ls
```

Expected: `App.tsx`, `app.json`, `package.json`, `tsconfig.json`, `assets/`, `node_modules/`.

- [ ] **Step 3: Boot the default app once to confirm it runs**

```bash
npx expo start --clear
```

Wait for Metro bundler to start. Press `Ctrl+C` to stop. (No need to scan the QR code — we just want to confirm the project boots.)

- [ ] **Step 4: Initialize git and first commit**

```bash
git init
git add .
git commit -m "chore: initial Expo blank TypeScript template"
```

- [ ] **Step 5: Create GitHub repo and push**

```bash
gh repo create fitkis-mobile --private --source=. --remote=origin --push
```

If you don't have `gh` set up, do it via the GitHub UI: create empty `fitkis-mobile` repo, then:

```bash
git remote add origin https://github.com/<your-username>/fitkis-mobile.git
git branch -M master
git push -u origin master
```

---

### Task 10: Install Expo Router and convert to file-based routing

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\package.json`
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app.json`
- Delete: `C:\Users\Rafae\Projects\fitkis-mobile\App.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\_layout.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\index.tsx`

- [ ] **Step 1: Install Expo Router and required dependencies**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo install expo-router react-native-screens react-native-safe-area-context expo-linking expo-constants expo-status-bar react-native-gesture-handler
```

- [ ] **Step 2: Update `package.json` `main` entry**

Open `package.json`. Change:

```json
"main": "node_modules/expo/AppEntry.js"
```

…to:

```json
"main": "expo-router/entry"
```

- [ ] **Step 3: Update `app.json` with scheme and plugin**

Open `app.json`. Replace its contents with:

```json
{
  "expo": {
    "name": "FitKis",
    "slug": "fitkis-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "fitkis",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#fafaf7"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fitkis.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#fafaf7"
      },
      "package": "com.fitkis.app"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Delete `App.tsx`**

```bash
rm App.tsx
```

- [ ] **Step 5: Create `app/_layout.tsx`**

```bash
mkdir -p app
```

Create `app/_layout.tsx`:

```tsx
// app/_layout.tsx
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  )
}
```

- [ ] **Step 6: Create `app/index.tsx`**

```tsx
// app/index.tsx
import { View, Text } from 'react-native'

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>FitKis Mobile — bootstrap OK</Text>
    </View>
  )
}
```

- [ ] **Step 7: Boot the app to verify routing works**

```bash
npx expo start --clear
```

Open the Expo Go app on your phone (install from App Store / Play Store first), scan the QR code. You should see "FitKis Mobile — bootstrap OK". If you don't have a phone handy, press `w` to open in web browser.

Press `Ctrl+C` to stop.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: install expo-router and convert to file-based routing"
git push
```

---

### Task 11: Install and configure NativeWind

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\package.json` (via npm install)
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\global.css`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\babel.config.js`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\metro.config.js`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\nativewind-env.d.ts`
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\_layout.tsx`

- [ ] **Step 1: Install NativeWind v4 + Tailwind**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npm install nativewind react-native-reanimated
npm install --save-dev tailwindcss@^3.4.0 prettier-plugin-tailwindcss
```

- [ ] **Step 2: Create `babel.config.js`**

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  }
}
```

- [ ] **Step 3: Create `metro.config.js`**

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
```

- [ ] **Step 4: Create `global.css`**

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create `nativewind-env.d.ts`**

```ts
// nativewind-env.d.ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Import `global.css` in root layout**

Update `app/_layout.tsx`:

```tsx
// app/_layout.tsx
import '../global.css'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  )
}
```

- [ ] **Step 7: Test NativeWind by adding a styled element**

Update `app/index.tsx`:

```tsx
// app/index.tsx
import { View, Text } from 'react-native'

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-orange-500">
        NativeWind works!
      </Text>
    </View>
  )
}
```

- [ ] **Step 8: Boot and verify the styles render**

```bash
npx expo start --clear
```

You should see "NativeWind works!" in orange text on a white background. If you see plain unstyled black text on a default background, NativeWind isn't compiling — review steps 2-6.

Press `Ctrl+C` to stop.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: install and configure NativeWind v4"
git push
```

---

### Task 12: Port Tailwind config from web

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\tailwind.config.ts`

- [ ] **Step 1: Create `tailwind.config.ts` adapted for NativeWind**

```ts
// tailwind.config.ts
//
// Mirrors fitkis (web) tailwind.config.ts. Differences:
// - content globs point at the mobile project structure
// - boxShadow values omitted (RN uses elevation/shadow* props differently;
//   we add shadow utilities manually if needed via Card components)
// - keyframes/animation omitted (use react-native-reanimated for motion in v2)
// - screens omitted (no media-query breakpoints in RN)

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          2: '#1a1a1a',
          3: '#404040',
          4: '#737373',
          5: '#a3a3a3',
          6: '#d4d4d4',
          7: '#e5e5e5',
        },
        paper: {
          DEFAULT: '#fafaf7',
          2: '#f5f4ef',
          3: '#eceae2',
        },
        cream: '#f8f3e8',
        signal: {
          DEFAULT: '#ff5a1f',
          2: '#ff7a44',
          soft: '#ffe8dd',
        },
        leaf: { DEFAULT: '#4a7c3a', soft: '#e4ecd6' },
        berry: { DEFAULT: '#c13b5a', soft: '#f6dde2' },
        honey: { DEFAULT: '#d4a017', soft: '#f5ead0' },
        sky: { DEFAULT: '#3a6b8c', soft: '#dbe6ef' },
        food: {
          verdura: '#4a7c3a',
          fruta: '#ff5a1f',
          carb: '#d4a017',
          leguminosa: '#3a6b8c',
          proteina: '#c13b5a',
          grasa: '#737373',
        },
      },
      fontFamily: {
        serif: ['Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
        display: ['Times New Roman', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Update `app/index.tsx` to test custom tokens**

```tsx
// app/index.tsx
import { View, Text } from 'react-native'

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-paper">
      <Text className="text-2xl font-serif text-ink">
        FitKis tokens compile
      </Text>
      <Text className="text-sm text-signal mt-2">signal accent</Text>
    </View>
  )
}
```

- [ ] **Step 3: Boot and verify custom tokens**

```bash
npx expo start --clear
```

Expected: cream background (`bg-paper` → `#fafaf7`), dark text "FitKis tokens compile" in serif, orange "signal accent" beneath. If colors are missing, the config didn't load — restart Metro with `--clear`.

Press `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/index.tsx
git commit -m "feat: port FitKis design tokens (Paper & Pulse) to NativeWind"
git push
```

---

### Task 13: Configure environment variables and `app.config.ts`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\.env`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\.env.example`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app.config.ts`
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\.gitignore`

- [ ] **Step 1: Create `.env` (NOT committed)**

```bash
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=https://fitkis.app
EOF
```

Replace the placeholder values with the same values from your `fitkis` web `.env.local` (Supabase URL and ANON key — never the service-role key on mobile). For development against `localhost:3000`, set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000` (e.g., `http://192.168.1.10:3000`) so the device can reach your local web dev server.

- [ ] **Step 2: Create `.env.example` (committed)**

```bash
cat > .env.example << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=https://fitkis.app
EOF
```

- [ ] **Step 3: Confirm `.env` is in `.gitignore`**

```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
grep -q "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 4: Create `app.config.ts`**

```ts
// app.config.ts
//
// Wraps app.json so we can read env vars at runtime via expo-constants.
// Anything under `expo.extra` is exposed as `Constants.expoConfig.extra.*`.

import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'FitKis',
  slug: config.slug ?? 'fitkis-mobile',
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://fitkis.app',
  },
})
```

- [ ] **Step 5: Verify env vars load**

Update `app/index.tsx` temporarily:

```tsx
// app/index.tsx
import { View, Text } from 'react-native'
import Constants from 'expo-constants'

export default function Index() {
  const url = Constants.expoConfig?.extra?.supabaseUrl
  return (
    <View className="flex-1 items-center justify-center bg-paper px-6">
      <Text className="text-sm text-ink">
        Supabase URL: {url ? '✓ loaded' : '✗ missing'}
      </Text>
      <Text className="text-xs text-ink-4 mt-2">{url}</Text>
    </View>
  )
}
```

```bash
npx expo start --clear
```

Expected: "Supabase URL: ✓ loaded" with the URL displayed below. If "✗ missing", `.env` isn't being read — restart with `--clear` and confirm the file exists.

Press `Ctrl+C` to stop.

- [ ] **Step 6: Commit**

```bash
git add .env.example app.config.ts .gitignore app/index.tsx
git commit -m "feat: load env vars (Supabase, API base) via app.config.ts"
git push
```

---

# PART C — SHARED INFRASTRUCTURE

### Task 14: Copy `types/index.ts` from web

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\types\index.ts`

- [ ] **Step 1: Copy the file verbatim**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
mkdir -p types
cp /c/Users/Rafae/Projects/fitkis/types/index.ts types/index.ts
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: empty output. If errors mention missing types (e.g., `User_metadata`), the type file may have web-specific imports — open it and remove any browser-DOM imports if present.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: copy types/index.ts from web (DB row interfaces)"
git push
```

---

### Task 15: Copy `lib/utils.ts` from web

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\utils.ts`

- [ ] **Step 1: Copy verbatim**

```bash
mkdir -p lib
cp /c/Users/Rafae/Projects/fitkis/lib/utils.ts lib/utils.ts
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: errors about missing `clsx` and `tailwind-merge` (used by `cn()` helper). Install them:

```bash
npm install clsx tailwind-merge
```

Re-verify:

```bash
npx tsc --noEmit
```

Expected: empty (or unrelated errors). The `cn()` function uses `twMerge` which works fine in RN — NativeWind's class strings are still text.

- [ ] **Step 3: Commit**

```bash
git add lib/utils.ts package.json package-lock.json
git commit -m "feat: copy lib/utils.ts (date helpers, BMI, streaks, cn)"
git push
```

---

### Task 16: Copy `lib/constants.ts` and `lib/smae-foods.json` from web

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\constants.ts`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\smae-foods.json`

- [ ] **Step 1: Copy both files**

```bash
cp /c/Users/Rafae/Projects/fitkis/lib/constants.ts lib/constants.ts
cp /c/Users/Rafae/Projects/fitkis/lib/smae-foods.json lib/smae-foods.json
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts lib/smae-foods.json
git commit -m "feat: copy lib/constants.ts + smae-foods.json (SMAE database, routines)"
git push
```

---

### Task 17: Create `lib/supabase.ts` (Supabase client + SecureStore adapter)

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\supabase.ts`

- [ ] **Step 1: Install Supabase + SecureStore**

```bash
npx expo install @supabase/supabase-js expo-secure-store
```

- [ ] **Step 2: Create `lib/supabase.ts`**

```ts
// lib/supabase.ts
//
// Single Supabase client instance for the entire mobile app.
// Session is persisted to expo-secure-store (encrypted on iOS keychain
// and Android keystore) — not AsyncStorage, which is plain text.

import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

- [ ] **Step 3: Install URL polyfill (required by Supabase JS in RN)**

```bash
npm install react-native-url-polyfill
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts package.json package-lock.json
git commit -m "feat: Supabase client with expo-secure-store session persistence"
git push
```

---

### Task 18: Create `lib/api-client.ts` (bearer JWT injection)

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\api-client.ts`

- [ ] **Step 1: Create the wrapper**

```ts
// lib/api-client.ts
//
// Wraps fetch() to call the web API routes (fitkis.app/api/*) with the
// current Supabase session JWT injected as Authorization: Bearer <jwt>.
// The web side reads this in lib/api-auth.ts (cookie + bearer fallback).

import Constants from 'expo-constants'
import { supabase } from './supabase'

const BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) || 'https://fitkis.app'

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = new Headers(options.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${BASE_URL}${path}`, { ...options, headers })
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add lib/api-client.ts
git commit -m "feat: apiFetch wrapper injects Supabase JWT bearer header"
git push
```

---

### Task 19: Create `useUser` and `useSupabase` hooks

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\hooks\useUser.ts`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\hooks\useSupabase.ts`

- [ ] **Step 1: Create `lib/hooks/useSupabase.ts`**

```bash
mkdir -p lib/hooks
```

```ts
// lib/hooks/useSupabase.ts
//
// Convenience re-export. The web app has equivalent hooks; this matches
// the API so screens copied from web read identically.

import { supabase } from '../supabase'

export function useSupabase() {
  return supabase
}
```

- [ ] **Step 2: Create `lib/hooks/useUser.ts`**

```ts
// lib/hooks/useUser.ts
//
// Subscribes to Supabase auth state and exposes the current User and a
// loading flag. Re-renders when the user logs in / out / token refreshes.

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useUser.ts lib/hooks/useSupabase.ts
git commit -m "feat: useUser and useSupabase hooks (parallel to web API)"
git push
```

---

### Task 20: Create Toast provider and `useToast` hook

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\Toast.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\hooks\useToast.ts`
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\_layout.tsx`

- [ ] **Step 1: Create the Toast component + provider**

```bash
mkdir -p components/ui
```

```tsx
// components/ui/Toast.tsx
//
// Simple toast: a single message that fades in at the top, fades out
// after 2.5s. Provider holds queue state; useToast() exposes showToast().

import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { Animated, View, Text } from 'react-native'

type ToastContextValue = {
  showToast: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (m: string) => {
      setMessage(m)
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          () => setMessage(null)
        )
      }, 2500)
    },
    [opacity]
  )

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <Animated.View
          pointerEvents="none"
          style={{ opacity }}
          className="absolute top-16 left-5 right-5 z-50"
        >
          <View className="bg-ink rounded-xl px-4 py-3">
            <Text className="text-paper text-sm text-center">{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}
```

- [ ] **Step 2: Create `useToast` hook**

```ts
// lib/hooks/useToast.ts
import { useContext } from 'react'
import { ToastContext } from '../../components/ui/Toast'

export function useToast() {
  return useContext(ToastContext)
}
```

- [ ] **Step 3: Wrap root layout with `ToastProvider`**

Update `app/_layout.tsx`:

```tsx
// app/_layout.tsx
import '../global.css'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ToastProvider } from '../components/ui/Toast'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Slot />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Toast.tsx lib/hooks/useToast.ts app/_layout.tsx
git commit -m "feat: ToastProvider + useToast hook + safe-area + gesture root"
git push
```

---

### Task 21: Create base UI components (Button, Input, Card, PulseLine)

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\Button.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\Input.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\Card.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\PulseLine.tsx`

- [ ] **Step 1: Create `Button.tsx`**

```tsx
// components/ui/Button.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native'

type Variant = 'primary' | 'secondary' | 'danger'

type Props = {
  onPress: () => void
  children: string
  variant?: Variant
  disabled?: boolean
  loading?: boolean
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: 'bg-ink', text: 'text-paper' },
  secondary: { bg: 'bg-paper-2 border border-ink-7', text: 'text-ink' },
  danger: { bg: 'bg-berry', text: 'text-paper' },
}

export function Button({ onPress, children, variant = 'primary', disabled, loading }: Props) {
  const styles = VARIANT_STYLES[variant]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${styles.bg} rounded-full px-5 py-3.5 flex-row items-center justify-center ${
        disabled || loading ? 'opacity-50' : ''
      }`}
    >
      {loading && <ActivityIndicator size="small" color="white" className="mr-2" />}
      <Text className={`${styles.text} text-sm font-medium`}>{children}</Text>
    </Pressable>
  )
}
```

- [ ] **Step 2: Create `Input.tsx`**

```tsx
// components/ui/Input.tsx
import { TextInput, View, Text } from 'react-native'
import type { TextInputProps } from 'react-native'

type Props = TextInputProps & {
  label?: string
  error?: string | null
}

export function Input({ label, error, ...rest }: Props) {
  return (
    <View>
      {label && (
        <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">{label}</Text>
      )}
      <TextInput
        {...rest}
        placeholderTextColor="#a3a3a3"
        className={`px-4 py-3.5 rounded-xl border bg-white text-sm text-ink ${
          error ? 'border-berry' : 'border-ink-6'
        }`}
      />
      {error && <Text className="text-xs text-berry mt-1">{error}</Text>}
    </View>
  )
}
```

- [ ] **Step 3: Create `Card.tsx`**

```tsx
// components/ui/Card.tsx
import { View } from 'react-native'
import type { ViewProps } from 'react-native'

type Props = ViewProps & {
  children: React.ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className = '', ...rest }: Props & { className?: string }) {
  return (
    <View
      {...rest}
      className={`bg-white rounded-2xl border border-ink-7 ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </View>
  )
}
```

- [ ] **Step 4: Install react-native-svg + create `PulseLine.tsx`**

```bash
npx expo install react-native-svg
```

```tsx
// components/ui/PulseLine.tsx
//
// Animated EKG line (visual signature of the design system).
// Web version uses SVG with CSS animation; here we use react-native-svg
// with Animated for the dash offset.

import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import Svg, { Path } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)

type Props = {
  w?: number
  h?: number
  color?: string
  strokeWidth?: number
  active?: boolean
}

export function PulseLine({ w = 60, h = 24, color = '#ff5a1f', strokeWidth = 2, active = true }: Props) {
  const dashOffset = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!active) return
    const animation = Animated.loop(
      Animated.timing(dashOffset, {
        toValue: -200,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    animation.start()
    return () => animation.stop()
  }, [active, dashOffset])

  // EKG path: flat → spike → flat
  const d = `M0 ${h / 2} L${w * 0.3} ${h / 2} L${w * 0.4} ${h * 0.2} L${w * 0.5} ${h * 0.85} L${w * 0.6} ${h / 2} L${w} ${h / 2}`

  return (
    <Svg width={w} height={h}>
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="200"
        strokeDashoffset={dashOffset}
      />
    </Svg>
  )
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 6: Commit**

```bash
git add components/ui package.json package-lock.json
git commit -m "feat: base UI components (Button, Input, Card, PulseLine)"
git push
```

---

# PART D — AUTH SCREENS

### Task 22: Create auth route group + login screen

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(auth)\_layout.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(auth)\login.tsx`
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\index.tsx`

- [ ] **Step 1: Create the auth group layout**

```bash
mkdir -p 'app/(auth)'
```

```tsx
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fafaf7' },
      }}
    />
  )
}
```

- [ ] **Step 2: Create the login screen**

```tsx
// app/(auth)/login.tsx
import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router, Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PulseLine } from '../../components/ui/PulseLine'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : authError.message
      )
      setLoading(false)
      return
    }

    // Block practitioners from mobile (mobile is patient-only).
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (practitioner) {
        await supabase.auth.signOut()
        setError('Esta app es para pacientes. Usa fitkis.app desde tu computadora.')
        setLoading(false)
        return
      }
    }

    router.replace('/(app)/dashboard')
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-12 justify-center">
            <View className="flex-row items-center gap-1 mb-12">
              <Text className="font-serif text-2xl italic">fitkis</Text>
              <PulseLine w={28} h={12} color="#ff5a1f" strokeWidth={2} active />
            </View>

            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">
              01 · BIENVENIDA
            </Text>
            <Text className="font-serif text-[42px] font-light leading-tight mb-6">
              Un pulso{'\n'}para tu <Text className="italic text-signal">vida</Text>{'\n'}diaria.
            </Text>

            <View className="space-y-4 mt-6">
              <Input
                label="EMAIL"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Input
                label="CONTRASEÑA"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />

              {error && (
                <View className="bg-berry-soft border border-berry/20 rounded-xl p-3">
                  <Text className="text-berry text-sm">{error}</Text>
                </View>
              )}

              <Button onPress={handleLogin} loading={loading} disabled={!email || !password}>
                Continuar
              </Button>

              <View className="flex-row items-center justify-center gap-1 mt-4">
                <Text className="text-sm text-ink-4">¿No tienes cuenta? </Text>
                <Link href="/(auth)/register" asChild>
                  <Text className="text-sm text-ink font-medium underline">Regístrate</Text>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 3: Make `app/index.tsx` redirect to login**

```tsx
// app/index.tsx
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/(auth)/login" />
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 5: Test login flow on device**

```bash
npx expo start --clear
```

Open Expo Go, scan QR. The app should land on the login screen. Try logging in with a real patient account from your `fitkis` web. Expected: it returns no error but doesn't navigate yet (the `(app)/dashboard` route doesn't exist — that's Task 27). For now, verify there's no error message.

Press `Ctrl+C` to stop.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "feat: login screen + practitioner block + landing redirect"
git push
```

---

### Task 23: Create register screen

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(auth)\register.tsx`

- [ ] **Step 1: Create register screen**

```tsx
// app/(auth)/register.tsx
import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router, Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    if (password.length < 6) {
      setError('Mínimo 6 caracteres')
      return
    }
    setLoading(true)
    setError(null)

    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    router.replace('/(app)/dashboard')
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-12 justify-center">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">
              02 · CUENTA NUEVA
            </Text>
            <Text className="font-serif text-[42px] font-light leading-tight mb-6">
              Comienza{'\n'}tu <Text className="italic text-signal">ritmo</Text>.
            </Text>

            <View className="space-y-4 mt-6">
              <Input
                label="EMAIL"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Input
                label="CONTRASEÑA (mín. 6)"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />

              {error && (
                <View className="bg-berry-soft border border-berry/20 rounded-xl p-3">
                  <Text className="text-berry text-sm">{error}</Text>
                </View>
              )}

              <Button onPress={handleRegister} loading={loading} disabled={!email || !password}>
                Crear cuenta
              </Button>

              <View className="flex-row items-center justify-center gap-1 mt-4">
                <Text className="text-sm text-ink-4">¿Ya tienes cuenta? </Text>
                <Link href="/(auth)/login" asChild>
                  <Text className="text-sm text-ink font-medium underline">Inicia sesión</Text>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add 'app/(auth)/register.tsx'
git commit -m "feat: register screen"
git push
```

---

### Task 24: Create reset-password screen with deep link

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(auth)\reset-password.tsx`

- [ ] **Step 1: Create the reset screen**

```tsx
// app/(auth)/reset-password.tsx
//
// Handles two cases:
// 1. User typed their email → we trigger the password-reset email
//    (links back to fitkis://reset-password with tokens).
// 2. User opened the deep link → URL params contain access_token +
//    refresh_token, we set the session and let user pick a new password.

import { useState, useEffect } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router, useLocalSearchParams, Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>()
  const hasTokens = !!params.access_token && !!params.refresh_token

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // If we got tokens via deep link, set the session immediately.
  useEffect(() => {
    if (hasTokens) {
      supabase.auth.setSession({
        access_token: params.access_token!,
        refresh_token: params.refresh_token!,
      })
    }
  }, [hasTokens])

  const requestReset = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'fitkis://reset-password',
    })
    if (e) {
      setError(e.message)
    } else {
      setInfo('Revisa tu email para continuar.')
    }
    setLoading(false)
  }

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      setError('Mínimo 6 caracteres')
      return
    }
    setLoading(true)
    setError(null)
    const { error: e } = await supabase.auth.updateUser({ password: newPassword })
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    router.replace('/(app)/dashboard')
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-12 justify-center">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">
              RECUPERAR ACCESO
            </Text>
            <Text className="font-serif text-[42px] font-light leading-tight mb-6">
              {hasTokens ? 'Nueva contraseña' : 'Olvidé mi contraseña'}
            </Text>

            <View className="space-y-4 mt-6">
              {hasTokens ? (
                <Input
                  label="NUEVA CONTRASEÑA"
                  placeholder="••••••••"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              ) : (
                <Input
                  label="EMAIL"
                  placeholder="tu@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}

              {error && (
                <View className="bg-berry-soft border border-berry/20 rounded-xl p-3">
                  <Text className="text-berry text-sm">{error}</Text>
                </View>
              )}
              {info && (
                <View className="bg-leaf-soft border border-leaf/20 rounded-xl p-3">
                  <Text className="text-leaf text-sm">{info}</Text>
                </View>
              )}

              <Button
                onPress={hasTokens ? updatePassword : requestReset}
                loading={loading}
                disabled={hasTokens ? !newPassword : !email}
              >
                {hasTokens ? 'Actualizar contraseña' : 'Enviar email de recuperación'}
              </Button>

              <Link href="/(auth)/login" asChild>
                <Text className="text-sm text-ink font-medium underline text-center mt-4">
                  Volver
                </Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Add a "Olvidé mi contraseña" link to login screen**

Edit `app/(auth)/login.tsx`. Inside the form, just below the password input, add:

```tsx
<Link href="/(auth)/reset-password" asChild>
  <Text className="text-xs text-ink-4 text-right -mt-2">¿Olvidaste tu contraseña?</Text>
</Link>
```

- [ ] **Step 3: Verify deep-link handling locally**

```bash
npx expo start --clear
```

In Expo Go, the deep link won't dispatch automatically without configuring native bundles, but the form-only path should work: log in screen → "¿Olvidaste tu contraseña?" → email input → send reset email → check your inbox. The link in the email won't open the app yet (that requires a development build, set up in Task 30); for now just verify the email arrives.

Press `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

```bash
git add 'app/(auth)/reset-password.tsx' 'app/(auth)/login.tsx'
git commit -m "feat: reset-password screen with deep-link token handling"
git push
```

---

# PART E — TAB NAV + DASHBOARD

### Task 25: Create the auth gate in root layout

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\_layout.tsx`

- [ ] **Step 1: Update root layout to redirect based on auth state**

```tsx
// app/_layout.tsx
import '../global.css'
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ToastProvider } from '../components/ui/Toast'
import { useUser } from '../lib/hooks/useUser'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'

    if (!user && inAppGroup) {
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      router.replace('/(app)/dashboard')
    }
  }, [user, loading, segments])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <Slot />
          </AuthGate>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 2: Update `app/index.tsx` to be a simple loader (gate handles routing)**

```tsx
// app/index.tsx
import { View, Text } from 'react-native'

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-paper">
      <Text className="text-sm text-ink-4">Cargando...</Text>
    </View>
  )
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx app/index.tsx
git commit -m "feat: auth gate redirects between (auth) and (app) groups"
git push
```

---

### Task 26: Create tab navigator layout

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\_layout.tsx`

- [ ] **Step 1: Install lucide-react-native for icons**

```bash
npm install lucide-react-native
```

- [ ] **Step 2: Create the tab navigator**

```bash
mkdir -p 'app/(app)'
```

```tsx
// app/(app)/_layout.tsx
import { Tabs } from 'expo-router'
import { Home, Dumbbell, Utensils, CheckCircle } from 'lucide-react-native'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a0a0a',
        tabBarInactiveTintColor: '#a3a3a3',
        tabBarStyle: {
          backgroundColor: '#fafaf7',
          borderTopColor: '#e5e5e5',
          height: 70,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="gym/index"
        options={{
          title: 'Gym',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="food/index"
        options={{
          title: 'Comida',
          tabBarIcon: ({ color, size }) => <Utensils color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="habits/index"
        options={{
          title: 'Hábitos',
          tabBarIcon: ({ color, size }) => <CheckCircle color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: empty (the screens referenced don't exist yet — that's the next 2 tasks; Expo Router will only complain at runtime if a screen is missing, not at compile time).

- [ ] **Step 4: Commit**

```bash
git add 'app/(app)/_layout.tsx' package.json package-lock.json
git commit -m "feat: tab navigator (Hoy / Gym / Comida / Hábitos)"
git push
```

---

### Task 27: Create dashboard screen with weight fetch

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\dashboard.tsx`

- [ ] **Step 1: Create the dashboard**

```tsx
// app/(app)/dashboard.tsx
//
// Minimum viable dashboard: greets the user, shows the latest weight log.
// Validates end-to-end data flow (auth → Supabase query → render).
// Full dashboard with all modules comes later (Phase 2+).

import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useUser } from '../../lib/hooks/useUser'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import type { WeightLog } from '../../types'

export default function Dashboard() {
  const { user } = useUser()
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    if (!user) return
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLatestWeight((data as WeightLog) ?? null)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load()
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
          />
        }
      >
        <View className="px-5 pt-4 pb-8">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-1">HOY</Text>
          <Text className="font-serif text-3xl font-light text-ink">
            Hola{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </Text>
        </View>

        <View className="px-5">
          <Card>
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">PESO ACTUAL</Text>
            {loading ? (
              <Text className="text-sm text-ink-4">Cargando...</Text>
            ) : latestWeight ? (
              <View className="flex-row items-baseline gap-2">
                <Text className="font-serif text-5xl font-light text-signal">
                  {latestWeight.weight_kg.toFixed(1)}
                </Text>
                <Text className="text-sm text-ink-4">kg</Text>
              </View>
            ) : (
              <Text className="text-sm text-ink-4">Sin registros aún</Text>
            )}
          </Card>
        </View>

        <View className="px-5 mt-6">
          <Button onPress={handleSignOut} variant="secondary">
            Cerrar sesión
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Test end-to-end on device**

```bash
npx expo start --clear
```

In Expo Go: login screen → enter real patient credentials → should land on dashboard → see your latest weight (or "Sin registros aún" if none) → "Cerrar sesión" returns to login.

If you see auth-related errors: confirm `.env` has the right Supabase URL and anon key.

Press `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

```bash
git add 'app/(app)/dashboard.tsx'
git commit -m "feat: dashboard fetches latest weight (validates auth + RLS + fetch end-to-end)"
git push
```

---

### Task 28: Create WIP placeholder screens for other tabs

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\gym\index.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\food\index.tsx`
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\habits\index.tsx`

- [ ] **Step 1: Create gym placeholder**

```bash
mkdir -p 'app/(app)/gym' 'app/(app)/food' 'app/(app)/habits'
```

```tsx
// app/(app)/gym/index.tsx
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function GymPlaceholder() {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">GYM · WIP</Text>
        <Text className="font-serif text-2xl text-ink text-center">Próximamente</Text>
        <Text className="text-sm text-ink-4 text-center mt-2">Phase 4 del plan de migración.</Text>
      </View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Create food placeholder**

```tsx
// app/(app)/food/index.tsx
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function FoodPlaceholder() {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">COMIDA · WIP</Text>
        <Text className="font-serif text-2xl text-ink text-center">Próximamente</Text>
        <Text className="text-sm text-ink-4 text-center mt-2">Phase 5 del plan de migración.</Text>
      </View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 3: Create habits placeholder**

```tsx
// app/(app)/habits/index.tsx
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HabitsPlaceholder() {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">HÁBITOS · WIP</Text>
        <Text className="font-serif text-2xl text-ink text-center">Próximamente</Text>
        <Text className="text-sm text-ink-4 text-center mt-2">Phase 2 del plan de migración.</Text>
      </View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 5: Test tab navigation on device**

```bash
npx expo start --clear
```

Login → Dashboard. Tap "Gym" tab → "GYM · WIP" Próximamente screen. Tap "Comida", "Hábitos" — each shows its placeholder. Return to "Hoy" — dashboard renders with latest weight.

Press `Ctrl+C` to stop.

- [ ] **Step 6: Commit**

```bash
git add 'app/(app)/gym' 'app/(app)/food' 'app/(app)/habits'
git commit -m "feat: WIP placeholders for gym/food/habits tabs"
git push
```

---

# PART F — EAS BUILD + FIRST DEVICE INSTALL

### Task 29: Set up EAS account and project

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\eas.json`

- [ ] **Step 1: Install EAS CLI globally**

```bash
npm install -g eas-cli
```

- [ ] **Step 2: Login to Expo**

```bash
eas login
```

Enter your Expo account credentials (create a free account at expo.dev if you don't have one). Verify with:

```bash
eas whoami
```

Expected: your Expo username.

- [ ] **Step 3: Initialize EAS in the project**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
eas init
```

This will create the project on Expo's servers and add `expo.extra.eas.projectId` to `app.json` (or `app.config.ts`). Confirm "Yes" when prompted.

- [ ] **Step 4: Create `eas.json`**

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "REPLACE_WITH_YOUR_APPLE_ID@example.com",
        "ascAppId": "REPLACE_AFTER_APP_STORE_CONNECT_REGISTRATION",
        "appleTeamId": "REPLACE_WITH_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

The `submit.production` section has placeholders that get filled in Task 32 (after Apple Developer / Play Console accounts are set up). The `build` section is fully ready.

- [ ] **Step 5: Commit**

```bash
git add eas.json app.json app.config.ts
git commit -m "chore: EAS init + eas.json profiles (development / preview / production)"
git push
```

---

### Task 30: Create the first iOS development build

**Files:**
- (No code — runs EAS Build)

**Prereqs:**
- Apple Developer Program account ($99/year) — sign up at developer.apple.com if you haven't.
- iPhone running iOS 16+ ready to receive a TestFlight invite.

- [ ] **Step 1: Configure iOS credentials**

```bash
eas credentials
```

Choose: `iOS` → `production` (it'll set up everything for development too) → `Set up a new keychain & provisioning`. EAS will prompt you to log in to your Apple Developer account and will auto-create the iOS Distribution Certificate, App Store provisioning profile, and APNs key.

If this is your first time, EAS handles all the certificate creation through Fastlane. It takes ~5 min.

- [ ] **Step 2: Run the development build for iOS**

```bash
eas build --platform ios --profile development
```

You'll be asked:
- "What would you like your iOS bundle identifier to be?" → `com.fitkis.app` (matches `app.json`).
- "What would you like your iOS distribution certificate to be?" → use the one you set up in Step 1.

The build runs on EAS servers (~10-20 min). When complete, you'll get a URL like `https://expo.dev/.../builds/<build_id>`.

- [ ] **Step 3: Install the build on your iPhone**

EAS will email you a link, or visit the build URL on your iPhone. Tap "Install" on the page, allow the configuration profile, and trust the developer certificate in **Settings → General → VPN & Device Management**.

The "FitKis" app icon should now appear on your home screen.

- [ ] **Step 4: Run a development server pointing to this build**

```bash
npx expo start --dev-client
```

Open the FitKis app on your phone (it's a dev client, not Expo Go), and it should auto-connect to your dev server. Test the full login flow → dashboard → tabs.

If it doesn't auto-connect, scan the QR code from the dev server.

- [ ] **Step 5: Confirm deep links work in the dev client**

In Safari on your iPhone, navigate to `fitkis://reset-password?access_token=test&refresh_token=test`. Expected: the FitKis dev client opens to the reset-password screen with "Nueva contraseña" header. (The tokens are bogus so updating won't work, but the deep link routing is what we're verifying.)

- [ ] **Step 6: No commit needed — this is a build task. Just confirm builds work.**

---

### Task 31: Submit the first internal build to TestFlight

**Files:**
- (No code — runs EAS Build + EAS Submit)

- [ ] **Step 1: Register the app in App Store Connect**

Go to https://appstoreconnect.apple.com → My Apps → "+" → New App.
- Platform: iOS
- Name: FitKis
- Primary language: Spanish (Mexico)
- Bundle ID: select `com.fitkis.app` (created automatically when EAS made the cert)
- SKU: `fitkis-ios` (unique to your account)
- User Access: Full Access

After creation, copy the "Apple ID" (a number like `1234567890`) from the App Information page.

- [ ] **Step 2: Update `eas.json` with your Apple credentials**

Edit `eas.json`, replace the placeholders in `submit.production.ios`:

```json
"ios": {
  "appleId": "your_apple_id@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABCDE12345"
}
```

(Find your Team ID at https://developer.apple.com/account → Membership.)

- [ ] **Step 3: Build a preview (TestFlight-ready) version**

```bash
eas build --platform ios --profile preview
```

This is a release-style build, signed for distribution, but staying in TestFlight (not the public store). ~10-20 min.

- [ ] **Step 4: Submit it to TestFlight**

```bash
eas submit --platform ios --latest
```

EAS uploads the build to App Store Connect. After ~5-15 min, the build appears in your App Store Connect → TestFlight tab as "Processing", then "Ready to Test".

- [ ] **Step 5: Add yourself as an internal tester**

In App Store Connect → TestFlight → Internal Testing → "+" → Create a group "Dev" → add your Apple ID email → assign the build to the group.

- [ ] **Step 6: Install via TestFlight on your iPhone**

Install the TestFlight app from the App Store if you haven't. You'll get an email with a redeem code, or the build appears automatically in TestFlight. Install it.

The TestFlight build is now installed alongside your dev build. This is what your closed beta testers will use in Phase 7.

- [ ] **Step 7: Smoke-test the production build**

Open FitKis (TestFlight version) on your phone. Go through: login → dashboard → tabs → logout. Confirm it works without a dev server connection.

- [ ] **Step 8: Update the `/download` page App Store URL with the real App ID**

In the **web repo** (`fitkis`), edit `app/download/page.tsx`. Replace:

```tsx
href="#"
```

…with the real URL using the `ascAppId` you put in `eas.json`:

```tsx
href="https://apps.apple.com/app/id1234567890"
```

(Use your actual ascAppId number, not `1234567890`.)

```bash
cd /c/Users/Rafae/Projects/fitkis
git add app/download/page.tsx
git commit -m "feat(web): real App Store URL on /download page"
git push
cd /c/Users/Rafae/Projects/fitkis-mobile
```

- [ ] **Step 9: Commit `eas.json` updates in mobile repo**

```bash
git add eas.json
git commit -m "chore: fill in Apple Developer credentials for EAS Submit"
git push
```

---

### Task 32: Final smoke test + Phase 1 wrap-up

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\README.md`
- Modify: `C:\Users\Rafae\Projects\fitkis\context.md` (note Phase 0+1 complete)

- [ ] **Step 1: Create README in mobile repo**

```md
# FitKis Mobile

React Native / Expo app for FitKis patients. The clinic side lives in the [`fitkis`](https://github.com/Rafaelbhdata/fitkis) repo.

## Quick start

```bash
npm install
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_BASE_URL
npx expo start --dev-client
```

Open the dev build on your iPhone (installed via Task 30).

## Builds

```bash
# Development (for use with --dev-client)
eas build --platform ios --profile development

# TestFlight / Play Internal (closed testing)
eas build --platform all --profile preview

# Production (App Store / Play Store)
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

## Phases

This repo follows the migration plan in
`fitkis/docs/superpowers/specs/2026-04-27-mobile-migration-design.md`.
Plans for each phase live in `fitkis/docs/superpowers/plans/`.
```

- [ ] **Step 2: Update web `context.md` to record Phase 0+1 done**

In `C:\Users\Rafae\Projects\fitkis\context.md`, prepend a new section under "Ultimo agente":

```md
## Ultimo agente
Agente: Plan 1 — Mobile Foundation
Fecha: <YYYY-MM-DD>
Que hizo:
- Web: añadido `lib/api-auth.ts` con cookie + bearer fallback. 5 API routes refactored.
  Nueva ruta `/download` con badges placeholder de App Store / Play Store.
- Mobile (`fitkis-mobile`): nuevo repo. Expo SDK 52 + Expo Router 4 + NativeWind 4 +
  Supabase JS + expo-secure-store. Auth completo (login/register/reset-password con deep link),
  tab nav, dashboard que lee `weight_logs`. Primer build en TestFlight.

Commits clave (web):
- `feat(api): add getAuthedUser helper`
- `refactor(api): N routes use getAuthedUser`
- `feat(web): /download landing`
```

- [ ] **Step 3: Commit and push**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
git add README.md
git commit -m "docs: README with quick-start and phase pointers"
git push

cd /c/Users/Rafae/Projects/fitkis
git add context.md
git commit -m "docs(context): mark Phase 0+1 of mobile migration complete"
git push
```

- [ ] **Step 4: Sanity check — TestFlight build matches what you expected**

Open TestFlight on your phone, launch FitKis. Confirm:
- Splash with cream background
- Login screen with FitKis branding + animated PulseLine
- Login with patient creds → dashboard with your latest weight
- 4 tabs all work (Hoy / Gym / Comida / Hábitos)
- "Cerrar sesión" returns to login
- Logout + try practitioner creds → blocked with "Esta app es para pacientes…"

If everything works, **Plan 1 is done.** You're ready to move to Plan 2 (Habits module).

---

## What's Next

This plan ends here. To continue:

1. Use `superpowers:writing-plans` again to draft **Plan 2: Habits module**.
2. The plan should reference this completed foundation; no need to re-establish Supabase or NativeWind.
3. Each subsequent plan ends with a TestFlight build that adds one more module.

After Plan 6 (Coach + Journal + Settings) is shipped, Plan 7 covers polish + closed beta + public release.
