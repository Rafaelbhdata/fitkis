# FitKis Mobile Migration — Plan 5: Food Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the patient food module — daily view with date navigation, 6 group progress bars (verdura / fruta / carb / leguminosa / proteina / grasa), 4-6 configurable meals with food log items, search-as-you-type from SMAE equivalents + custom foods, favorites carousel + CRUD page, barcode scanner that hits Open Food Facts via the existing API, and AI plate-photo analysis via Claude Vision — preserving Paper & Pulse design pixel-perfect.

**Architecture:** Two routes — `food/index.tsx` (day view orchestrator, ~450 LOC) and `food/favorites.tsx` (favorites CRUD list). Heavy presentational decomposition: GroupBudgetBars, MealCard, FoodSearchSheet (the central sheet for adding food), BarcodeScannerScreen (full-screen modal route via expo-camera), PlatePhotoSheet, FavoritesCarousel, plus small sub-pieces. Pure helpers in `lib/food.ts`. Same Supabase tables (`food_logs`, `favorite_meals`, `custom_foods`, `food_equivalents`, `user_diet_configs`). API routes already accept bearer JWT (Plan 1).

**Tech Stack:** Existing Expo SDK 54 + Expo Router 5 + NativeWind 4 + Supabase + apiFetch + react-native-svg. NEW: `expo-camera` (barcode scanner). `expo-image-picker` already installed (Plan 3).

**Repos & paths:**
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (branch `master`)
- Reference (read-only):
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\food\page.tsx` (1050 lines — canonical orchestrator)
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\food\favorites\page.tsx` (463 lines)
  - `C:\Users\Rafae\Projects\fitkis\components\food\BarcodeScannerModal.tsx` (uses ZXing/browser — replaced by expo-camera in mobile)
  - `C:\Users\Rafae\Projects\fitkis\components\food\PlatePhotoModal.tsx` (uses File API + base64 — replaced by expo-image-picker in mobile)

**Spec reference:** `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

**Roadmap reference:** `docs/superpowers/plans/2026-04-27-roadmap-plans-2-to-7.md` (Plan 5 section)

**Builds on Plans 1-4:** `apiFetch` (with bearer JWT), `BottomSheet`, `ConfirmDialog`, `useToast`, `expandFoodLogEntry` from `lib/utils.ts`.

---

## Decisions Resolved (open questions from the roadmap)

1. **Barcode scanner.** `expo-camera`'s built-in barcode scanner via `<CameraView barcodeScannerSettings={{ barcodeTypes: [...] }} onBarcodeScanned={...}>`. Replaces the web's BarcodeDetector + ZXing dual-strategy with a single native API. Supports EAN-13/EAN-8/UPC-A/UPC-E/CODE-128 (same set the API understands).

2. **Plate photo.** `expo-image-picker` with `base64: true`, then `apiFetch('/api/plate-analysis', { body: JSON.stringify({ image, meal }) })`. The API route already accepts bearer JWT (Plan 1).

3. **Camera permission.** First-time the user opens the barcode scanner, iOS/Android requests camera permission. The plugin permission strings are configured (Plan 3 added them for `expo-image-picker`; we extend the `expo-camera` plugin to add another camera-permission string).

4. **Search performance.** FlatList with `keyExtractor` and `windowSize={5}` for the equivalents list (~150-200 items from `lib/constants.ts` + dynamic from `food_equivalents` table). Snappy on mid-range Android.

5. **Favorites UX.** Web has a separate `/food/favorites` page for CRUD. Mobile keeps the same — `food/favorites.tsx`. The horizontal carousel in the day view shows favorites for one-tap-add.

6. **Yogurt griego split + alcohol-as-carb.** Already in `lib/utils.ts` via `expandFoodLogEntry` (synced from web in Plan 1). Mobile imports and uses unchanged.

7. **Daily budget.** Loaded from `user_diet_configs` table; fallback to `DEFAULT_DAILY_BUDGET` constant from `lib/constants.ts`.

8. **Active meals (which of the 6 to show).** Loaded from `user_diet_configs.active_meals` (a JSONB column with `{desayuno: bool, snack1: bool, ...}`); fallback to a local `DEFAULT_ACTIVE_MEALS` constant (desayuno/snack1/comida/cena = true; snack2/snack3 = false).

9. **Plate photo loading state.** AI takes 3-5s. Show a centered PulseLine + "Analizando tu plato..." message while waiting.

---

## File Structure

### New files

```
fitkis-mobile/
├── app/
│   └── (app)/
│       ├── food/
│       │   ├── index.tsx                ← replaces WIP placeholder
│       │   ├── favorites.tsx            ← new
│       │   ├── _barcode.tsx             ← modal route, full-screen camera
│       │   └── _plate-photo.tsx         ← modal route, photo + AI result
│       └── _layout.tsx                  ← modify (hide food sub-routes)
├── components/
│   └── food/
│       ├── DateHeader.tsx               ← day picker (chevrons + label)
│       ├── GroupBudgetBars.tsx          ← 6 colored progress bars
│       ├── MealCard.tsx                 ← one meal section: header + items + add button
│       ├── FoodLogItem.tsx              ← single food entry row
│       ├── FoodSearchSheet.tsx          ← big bottom sheet: group / search / quantity
│       ├── FavoritesCarousel.tsx        ← horizontal scroll of favorites
│       └── QuickActionsRow.tsx          ← row with Camera + Barcode + Mic buttons
└── lib/
    └── food.ts                           ← compute group totals, normalize search
```

### Modified files

- `app/(app)/_layout.tsx` — add `<Tabs.Screen>` entries with `href: null` for `food/favorites`, `food/_barcode`, `food/_plate-photo`.
- `app.config.ts` — add `expo-camera` plugin entry alongside `expo-image-picker`.

### File responsibilities

| File | Responsibility |
|---|---|
| `lib/food.ts` | `getMealGroupTotals(logs)`, `getDayGroupTotals(logs)`, `searchFoodEquivalents(query, group)`, normalization helpers |
| `components/food/DateHeader.tsx` | Day picker (chevrons + capitalized label + "Hoy" link) |
| `components/food/GroupBudgetBars.tsx` | 6 colored bars showing X / Y per group + over-budget visual |
| `components/food/MealCard.tsx` | Meal label + emoji + items list + "+ Agregar" button |
| `components/food/FoodLogItem.tsx` | One food log row: group emoji + name + quantity pill + delete X |
| `components/food/FoodSearchSheet.tsx` | Bottom sheet for adding food: group picker → search → list → quantity stepper → save |
| `components/food/FavoritesCarousel.tsx` | Horizontal scroll of favorite meal pills (one-tap-add) |
| `components/food/QuickActionsRow.tsx` | Row of 3 buttons: Camera (plate AI), Barcode, Voice (placeholder) |
| `app/(app)/food/index.tsx` | Day view orchestrator |
| `app/(app)/food/favorites.tsx` | Favorites CRUD list |
| `app/(app)/food/_barcode.tsx` | Full-screen camera modal route |
| `app/(app)/food/_plate-photo.tsx` | Plate photo modal route (image picker + API call + result) |

---

# TASKS

### Task 1: Install expo-camera + configure plugin

**Files:**
- Modify: `package.json` (via npx expo install)
- Modify: `app.config.ts` (add plugin permission strings)

- [ ] **Step 1: Install expo-camera**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo install expo-camera
```

If peer conflict: `npm install expo-camera --legacy-peer-deps`.

- [ ] **Step 2: Update `app.config.ts` plugins**

Find the existing `plugins: [...]` block. Add the `expo-camera` plugin entry (similar to how `expo-image-picker` was added in Plan 3):

```ts
plugins: [
  ...(config.plugins ?? []),
  'expo-secure-store',
  [
    'expo-image-picker',
    {
      photosPermission: 'FitKis necesita acceso a tu galería para subir fotos de progreso.',
      cameraPermission: 'FitKis necesita acceso a la cámara para tomar fotos de progreso.',
    },
  ],
  [
    'expo-camera',
    {
      cameraPermission: 'FitKis necesita acceso a la cámara para escanear códigos de barras.',
    },
  ],
],
```

(If `expo-image-picker` already declared a `cameraPermission` and adding `expo-camera` causes a conflict, both plugins can coexist — they each contribute distinct entries. If iOS rejects, consolidate by leaving only one camera-permission string.)

- [ ] **Step 3: Verify TS + commit**

```bash
npx tsc --noEmit
git add package.json package-lock.json app.config.ts
git commit -m "chore: install expo-camera + configure permissions for food barcode scanner"
git push
```

---

### Task 2: `lib/food.ts` — pure helpers

**Files:**
- Create: `lib/food.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/food.ts
//
// Pure-function helpers for the food module. No DOM, no React, no Supabase.

import type { FoodLog, FoodGroup, DailyBudget, MealType } from '../types'

// Group totals across an array of food logs (e.g., one meal or whole day).
export function getGroupTotals(logs: FoodLog[]): Record<FoodGroup, number> {
  const totals: Record<FoodGroup, number> = {
    verdura: 0,
    fruta: 0,
    carb: 0,
    leguminosa: 0,
    proteina: 0,
    grasa: 0,
  }
  for (const log of logs) {
    if (log.group_type in totals) {
      totals[log.group_type] += log.quantity
    }
  }
  return totals
}

// Logs filtered to a specific meal.
export function getMealLogs(logs: FoodLog[], meal: MealType): FoodLog[] {
  return logs.filter((l) => l.meal === meal)
}

// Returns 0..1 progress fraction for a group (1 = at budget, >1 = over).
export function getGroupProgress(consumed: number, budget: number): number {
  if (budget <= 0) return 0
  return consumed / budget
}

// Case- and accent-insensitive substring match.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true
  return normalize(target).includes(normalize(query))
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add lib/food.ts
git commit -m "feat(food): pure helpers (group totals, meal filter, fuzzy search)"
git push
```

---

### Task 3: `components/food/FoodLogItem.tsx`

**Files:**
- Create: `components/food/FoodLogItem.tsx`

- [ ] **Step 1: Create directory + component**

```bash
mkdir -p components/food
```

```tsx
// components/food/FoodLogItem.tsx
//
// One food entry row inside a MealCard: group color dot + name + quantity
// pill + delete X. Tappable for nothing (delete via the X button).

import { View, Text, Pressable } from 'react-native'
import { X } from 'lucide-react-native'
import type { FoodLog, FoodGroup } from '../../types'

const GROUP_COLOR: Record<FoodGroup, string> = {
  verdura: '#4a7c3a',
  fruta: '#ff5a1f',
  carb: '#d4a017',
  leguminosa: '#3a6b8c',
  proteina: '#c13b5a',
  grasa: '#737373',
}

const GROUP_EMOJI: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

type Props = {
  log: FoodLog
  onDelete: () => void
}

export function FoodLogItem({ log, onDelete }: Props) {
  const name = log.food_name || ''
  return (
    <View className="flex-row items-center gap-2 py-2">
      <View
        className="w-6 h-6 rounded-full items-center justify-center"
        style={{ backgroundColor: GROUP_COLOR[log.group_type] + '20' }}
      >
        <Text className="text-xs">{GROUP_EMOJI[log.group_type]}</Text>
      </View>
      <Text className="flex-1 text-sm text-ink" numberOfLines={1}>
        {name}
      </Text>
      <View className="px-2 py-0.5 rounded-full bg-paper-2">
        <Text className="text-[10px] text-ink-3" style={{ fontFamily: 'ui-monospace' }}>
          {log.quantity}
        </Text>
      </View>
      <Pressable onPress={onDelete} className="p-1.5">
        <X size={14} color="#a3a3a3" />
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/food/FoodLogItem.tsx
git commit -m "feat(food): FoodLogItem — single food entry row"
git push
```

---

### Task 4: `components/food/MealCard.tsx`

**Files:**
- Create: `components/food/MealCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/food/MealCard.tsx
//
// One meal section: header (emoji + label + items count) + list of FoodLogItem
// + "+ Agregar" button that opens FoodSearchSheet pre-filtered to this meal.

import { View, Text, Pressable } from 'react-native'
import { Plus } from 'lucide-react-native'
import type { FoodLog, MealType } from '../../types'
import { FoodLogItem } from './FoodLogItem'

type Props = {
  meal: MealType
  label: string
  emoji: string
  logs: FoodLog[]
  onAdd: () => void
  onDeleteLog: (logId: string) => void
}

export function MealCard({ meal, label, emoji, logs, onAdd, onDeleteLog }: Props) {
  return (
    <View className="bg-white border border-ink-7 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-base">{emoji}</Text>
          <Text className="text-sm font-medium text-ink">{label}</Text>
          {logs.length > 0 && (
            <Text className="text-xs text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
              · {logs.length}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onAdd}
          className="w-8 h-8 rounded-full bg-paper-2 items-center justify-center"
        >
          <Plus size={14} color="#0a0a0a" />
        </Pressable>
      </View>

      {logs.length > 0 && (
        <View className="border-t border-ink-7 pt-1">
          {logs.map((log) => (
            <FoodLogItem key={log.id} log={log} onDelete={() => onDeleteLog(log.id)} />
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
git add components/food/MealCard.tsx
git commit -m "feat(food): MealCard — meal section with items + add button"
git push
```

---

### Task 5: `components/food/GroupBudgetBars.tsx`

**Files:**
- Create: `components/food/GroupBudgetBars.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/food/GroupBudgetBars.tsx
//
// 6 horizontal bars showing consumed/budget per group. Each bar is filled
// proportionally; over-budget shows a thin berry overlay past 100%.

import { View, Text } from 'react-native'
import type { FoodGroup, DailyBudget } from '../../types'

type Props = {
  totals: Record<FoodGroup, number>
  budget: DailyBudget
}

const ORDER: FoodGroup[] = ['verdura', 'fruta', 'carb', 'leguminosa', 'proteina', 'grasa']

const META: Record<FoodGroup, { label: string; color: string; emoji: string }> = {
  verdura: { label: 'Verduras', color: '#4a7c3a', emoji: '🥬' },
  fruta: { label: 'Frutas', color: '#ff5a1f', emoji: '🍎' },
  carb: { label: 'Cereales', color: '#d4a017', emoji: '🍞' },
  leguminosa: { label: 'Legumin.', color: '#3a6b8c', emoji: '🫘' },
  proteina: { label: 'Proteína', color: '#c13b5a', emoji: '🥩' },
  grasa: { label: 'Grasas', color: '#737373', emoji: '🥑' },
}

export function GroupBudgetBars({ totals, budget }: Props) {
  return (
    <View className="bg-white border border-ink-7 rounded-2xl p-4">
      <Text
        className="text-[10px] text-ink-4 uppercase tracking-widest mb-3"
        style={{ fontFamily: 'ui-monospace' }}
      >
        Hoy
      </Text>
      <View className="gap-3">
        {ORDER.map((g) => {
          const consumed = totals[g] ?? 0
          const target = budget[g] ?? 0
          const pct = target > 0 ? Math.min(consumed / target, 1) : 0
          const over = target > 0 && consumed > target
          const meta = META[g]
          return (
            <View key={g}>
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs">{meta.emoji}</Text>
                  <Text className="text-xs text-ink-3">{meta.label}</Text>
                </View>
                <Text
                  className={`text-[10px] ${over ? 'text-berry' : 'text-ink-4'}`}
                  style={{ fontFamily: 'ui-monospace' }}
                >
                  {consumed} / {target}
                </Text>
              </View>
              <View className="h-1.5 rounded-full bg-paper-2 overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${pct * 100}%`, backgroundColor: meta.color }}
                />
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/food/GroupBudgetBars.tsx
git commit -m "feat(food): GroupBudgetBars — 6 progress bars with over-budget visual"
git push
```

---

### Task 6: `components/food/FavoritesCarousel.tsx`

**Files:**
- Create: `components/food/FavoritesCarousel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/food/FavoritesCarousel.tsx
//
// Horizontal scroll of favorite meal pills. Tap → call onPick (parent inserts
// the favorite's items into the active meal as one-tap-add).

import { View, Text, Pressable, ScrollView } from 'react-native'
import { Star } from 'lucide-react-native'
import type { FavoriteMeal } from '../../types'

type Props = {
  favorites: FavoriteMeal[]
  onPick: (favorite: FavoriteMeal) => void
}

export function FavoritesCarousel({ favorites, onPick }: Props) {
  if (favorites.length === 0) return null
  return (
    <View>
      <Text
        className="text-[10px] text-ink-4 uppercase tracking-widest mb-2 px-5"
        style={{ fontFamily: 'ui-monospace' }}
      >
        Favoritos
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {favorites.map((fav) => (
          <Pressable
            key={fav.id}
            onPress={() => onPick(fav)}
            className="px-3 py-2 rounded-full bg-cream flex-row items-center gap-1.5"
          >
            <Star size={12} color="#d4a017" fill="#d4a017" />
            <Text className="text-xs text-ink font-medium">{fav.name}</Text>
            <Text className="text-[10px] text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
              · {fav.items.length}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/food/FavoritesCarousel.tsx
git commit -m "feat(food): FavoritesCarousel — horizontal scroll of favorite pills"
git push
```

---

### Task 7: `components/food/QuickActionsRow.tsx`

**Files:**
- Create: `components/food/QuickActionsRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/food/QuickActionsRow.tsx
//
// Three quick-action buttons row in the day view: Camera (plate AI),
// Barcode, Voice (placeholder for v2). Voice is disabled visually but
// kept here so the layout matches the web.

import { View, Text, Pressable } from 'react-native'
import { Camera, Barcode, Mic } from 'lucide-react-native'

type Props = {
  onCamera: () => void
  onBarcode: () => void
}

export function QuickActionsRow({ onCamera, onBarcode }: Props) {
  return (
    <View className="px-5 flex-row gap-2">
      <Pressable
        onPress={onCamera}
        className="flex-1 py-3 rounded-xl bg-white border border-ink-7 flex-row items-center justify-center gap-2"
      >
        <Camera size={14} color="#0a0a0a" />
        <Text className="text-xs text-ink font-medium">Foto del plato</Text>
      </Pressable>
      <Pressable
        onPress={onBarcode}
        className="flex-1 py-3 rounded-xl bg-white border border-ink-7 flex-row items-center justify-center gap-2"
      >
        <Barcode size={14} color="#0a0a0a" />
        <Text className="text-xs text-ink font-medium">Escanear</Text>
      </Pressable>
      <Pressable
        disabled
        className="w-12 py-3 rounded-xl bg-paper-2 border border-ink-7 items-center justify-center opacity-40"
      >
        <Mic size={14} color="#737373" />
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/food/QuickActionsRow.tsx
git commit -m "feat(food): QuickActionsRow — camera + barcode + voice (disabled) buttons"
git push
```

---

### Task 8: `components/food/FoodSearchSheet.tsx` — central add-food sheet

This is the most substantial component in the food module. It's a bottom sheet that handles:
1. Group picker (6 chips)
2. Search input (filters across SMAE equivalents from `lib/constants.ts` + custom foods + db `food_equivalents`)
3. List of matching foods (FlatList for perf)
4. Selected food → quantity stepper
5. Save → calls onSave with `{group, name, quantity, portion}`

**Files:**
- Create: `components/food/FoodSearchSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/food/FoodSearchSheet.tsx
//
// Bottom-sheet for adding a food entry. Flow:
// 1. User picks a group (or comes in with a pre-selected one).
// 2. Searches by name; the list filters across constants + DB equivalents.
// 3. Selects a food → quantity stepper (default 1, ±0.5 increments).
// 4. Saves → parent inserts into food_logs with onSave callback.

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, FlatList } from 'react-native'
import { Plus, Minus, Search, X } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { fuzzyMatch } from '../../lib/food'
import { FOOD_EQUIVALENTS, FOOD_GROUP_LABELS } from '../../lib/constants'
import type { FoodGroup, MealType, CustomFood, FoodEquivalent } from '../../types'

const GROUPS: { key: FoodGroup; label: string; color: string; emoji: string }[] = [
  { key: 'verdura', label: 'Verduras', color: '#4a7c3a', emoji: '🥬' },
  { key: 'fruta', label: 'Frutas', color: '#ff5a1f', emoji: '🍎' },
  { key: 'carb', label: 'Cereales', color: '#d4a017', emoji: '🍞' },
  { key: 'leguminosa', label: 'Legumin.', color: '#3a6b8c', emoji: '🫘' },
  { key: 'proteina', label: 'Proteína', color: '#c13b5a', emoji: '🥩' },
  { key: 'grasa', label: 'Grasas', color: '#737373', emoji: '🥑' },
]

type FoodOption = {
  id: string  // synthetic key
  name: string
  portion?: string
  note?: string
  source: 'static' | 'custom' | 'db'
}

type Props = {
  visible: boolean
  initialMeal: MealType
  initialGroup: FoodGroup | null
  customFoods: CustomFood[]
  dbFoods: FoodEquivalent[]
  saving: boolean
  onClose: () => void
  onSave: (data: {
    group: FoodGroup
    name: string
    portion: string | null
    quantity: number
  }) => void
}

export function FoodSearchSheet({
  visible,
  initialMeal,
  initialGroup,
  customFoods,
  dbFoods,
  saving,
  onClose,
  onSave,
}: Props) {
  const [group, setGroup] = useState<FoodGroup | null>(initialGroup)
  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodOption | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (visible) {
      setGroup(initialGroup)
      setQuery('')
      setSelectedFood(null)
      setQuantity(1)
    }
  }, [visible, initialGroup])

  // Build the food options list for the chosen group (group must be set)
  const options = useMemo<FoodOption[]>(() => {
    if (!group) return []
    const out: FoodOption[] = []

    // Static SMAE equivalents (from lib/constants.ts FOOD_EQUIVALENTS)
    // FOOD_EQUIVALENTS is structured as: Record<FoodGroup, Array<{name, portion}>>
    const staticForGroup = (FOOD_EQUIVALENTS as any)[group] as
      | Array<{ name: string; portion: string; note?: string }>
      | undefined
    if (staticForGroup) {
      staticForGroup.forEach((f, i) => {
        out.push({
          id: `static-${group}-${i}`,
          name: f.name,
          portion: f.portion,
          note: f.note,
          source: 'static',
        })
      })
    }

    // User's custom foods filtered to this group
    customFoods.forEach((cf) => {
      // CustomFood has a `groups` field (Record<FoodGroup, number>) showing equivalents per group
      const qty = (cf as any).groups?.[group]
      if (typeof qty === 'number' && qty > 0) {
        out.push({
          id: `custom-${cf.id}`,
          name: cf.name,
          portion: (cf as any).portion ?? undefined,
          source: 'custom',
        })
      }
    })

    // Database food_equivalents
    dbFoods.forEach((df) => {
      const qty = (df as any)[group]
      if (typeof qty === 'number' && qty > 0) {
        out.push({
          id: `db-${df.id}`,
          name: df.name,
          portion: (df as any).portion ?? undefined,
          source: 'db',
        })
      }
    })

    // Filter by query
    return query ? out.filter((o) => fuzzyMatch(query, o.name)) : out
  }, [group, query, customFoods, dbFoods])

  const handleSave = () => {
    if (!group || !selectedFood) return
    onSave({
      group,
      name: selectedFood.name,
      portion: selectedFood.portion ?? null,
      quantity,
    })
  }

  // Group picker view (when no group selected yet)
  if (!group) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="font-serif text-xl font-light">Agregar a {FOOD_GROUP_LABELS[initialMeal as any] ?? initialMeal}</Text>
          <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
            <X size={20} color="#0a0a0a" />
          </Pressable>
        </View>
        <Text className="text-xs text-ink-4 mb-4">¿De qué grupo es?</Text>
        <View className="flex-row flex-wrap gap-2">
          {GROUPS.map((g) => (
            <Pressable
              key={g.key}
              onPress={() => setGroup(g.key)}
              className="px-4 py-3 rounded-xl border border-ink-7 bg-white flex-row items-center gap-2"
              style={{ minWidth: '47%' }}
            >
              <Text className="text-base">{g.emoji}</Text>
              <Text className="text-sm font-medium text-ink">{g.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    )
  }

  // Selected food → quantity view
  if (selectedFood) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => setSelectedFood(null)} className="flex-row items-center gap-1">
            <Text className="text-sm text-ink-4">‹ Cambiar</Text>
          </Pressable>
          <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
            <X size={20} color="#0a0a0a" />
          </Pressable>
        </View>

        <Text className="font-serif text-2xl font-light text-ink text-center mb-1">{selectedFood.name}</Text>
        {selectedFood.portion && (
          <Text className="text-xs text-ink-4 text-center mb-6">{selectedFood.portion}</Text>
        )}

        <View className="flex-row items-center justify-center gap-6 mb-8">
          <Pressable
            onPress={() => setQuantity((q) => Math.max(0.5, q - 0.5))}
            className="w-12 h-12 rounded-full bg-paper-2 items-center justify-center"
          >
            <Minus size={20} color="#0a0a0a" />
          </Pressable>
          <Text className="font-serif text-5xl font-light text-signal" style={{ minWidth: 80, textAlign: 'center' }}>
            {quantity}
          </Text>
          <Pressable
            onPress={() => setQuantity((q) => q + 0.5)}
            className="w-12 h-12 rounded-full bg-signal items-center justify-center"
          >
            <Plus size={20} color="#ffffff" />
          </Pressable>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className={`py-3 rounded-full bg-ink items-center ${saving ? 'opacity-50' : ''}`}
        >
          <Text className="text-paper text-sm font-medium">
            {saving ? 'Guardando...' : `Agregar ${quantity} ${quantity === 1 ? 'porción' : 'porciones'}`}
          </Text>
        </Pressable>
      </BottomSheet>
    )
  }

  // Search view
  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding>
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={() => setGroup(null)} className="flex-row items-center gap-1">
          <Text className="text-sm text-ink-4">‹ Grupo</Text>
        </Pressable>
        <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
          <X size={20} color="#0a0a0a" />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl bg-paper-2 mb-3">
        <Search size={16} color="#737373" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Buscar en ${GROUPS.find((g) => g.key === group)?.label}...`}
          placeholderTextColor="#a3a3a3"
          className="flex-1 text-sm text-ink"
          autoFocus
        />
      </View>

      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        windowSize={5}
        style={{ maxHeight: 400 }}
        ItemSeparatorComponent={() => <View className="h-px bg-paper-2" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSelectedFood(item)
              setQuantity(1)
            }}
            className="py-3 px-2 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-sm text-ink">{item.name}</Text>
              {item.portion && <Text className="text-xs text-ink-4">{item.portion}</Text>}
            </View>
            {item.source === 'custom' && (
              <Text className="text-[10px] text-signal" style={{ fontFamily: 'ui-monospace' }}>
                custom
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="py-8 items-center">
            <Text className="text-sm text-ink-4">Sin resultados</Text>
          </View>
        }
      />
    </BottomSheet>
  )
}
```

Important notes:
- `FOOD_EQUIVALENTS` from `lib/constants.ts` may be structured differently than the snippet assumes. Inspect with `grep -A 5 "FOOD_EQUIVALENTS\b" lib/constants.ts` to confirm the shape. If it's `Record<FoodGroup, Array<{name, portion}>>`, the snippet is correct. If it's a flat list with a `group` field, adapt the indexing.
- `CustomFood`'s `groups` field naming may be `groups` or `equivalents` — verify in `types/index.ts`.
- `FoodEquivalent`'s group columns are individual `verdura`, `fruta`, etc. integer columns — same as web.

If the field shapes differ, adjust the option-building logic (the search/render UI stays the same).

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/food/FoodSearchSheet.tsx
git commit -m "feat(food): FoodSearchSheet — group picker + search + quantity stepper"
git push
```

---

### Task 9: `app/(app)/food/_barcode.tsx` — full-screen barcode scanner modal

**Files:**
- Create: `app/(app)/food/_barcode.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p 'app/(app)/food'
```

- [ ] **Step 2: Create the modal route**

```tsx
// app/(app)/food/_barcode.tsx
//
// Full-screen camera modal for barcode scanning. Uses expo-camera's
// CameraView with built-in barcode scanner. On scan, navigates back
// with the scanned code in URL params (consumed by food/index.tsx
// which then calls /api/barcode-lookup and shows the result).
//
// File starts with `_` so Expo Router treats it as a non-tab route;
// also explicitly hidden in (app)/_layout.tsx.

import { useRef, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { X, Camera } from 'lucide-react-native'

export default function BarcodeScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const handledRef = useRef(false)

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center">
        <Text className="text-paper text-sm">Solicitando permisos...</Text>
      </SafeAreaView>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-ink items-center justify-center px-5">
        <Camera size={48} color="#fafaf7" />
        <Text className="text-paper font-serif text-2xl mt-4 mb-2 text-center">
          Permiso de cámara
        </Text>
        <Text className="text-ink-5 text-sm text-center mb-6">
          Para escanear códigos de barras, FitKis necesita acceso a tu cámara.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="px-6 py-3 rounded-full bg-signal"
        >
          <Text className="text-paper font-medium">Permitir cámara</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (handledRef.current) return
    handledRef.current = true
    setScanned(true)
    // Navigate back with the code; food/index.tsx reads it via useLocalSearchParams
    router.replace(`/(app)/food?barcode=${encodeURIComponent(data)}` as any)
  }

  return (
    <View className="flex-1 bg-ink">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Overlay */}
      <SafeAreaView className="absolute top-0 left-0 right-0">
        <View className="flex-row items-center justify-between p-4">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full bg-ink/60 items-center justify-center"
          >
            <X size={20} color="#fafaf7" />
          </Pressable>
          <Text className="text-paper text-sm font-medium">Escanea un código</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      {/* Scan reticle */}
      <View
        pointerEvents="none"
        className="absolute top-1/2 left-1/2"
        style={{
          width: 240,
          height: 140,
          marginLeft: -120,
          marginTop: -70,
          borderColor: '#ff5a1f',
          borderWidth: 2,
          borderRadius: 12,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  )
}
```

- [ ] **Step 3: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/food/_barcode.tsx'
git commit -m "feat(food): _barcode.tsx — full-screen camera scanner modal route"
git push
```

If TS complains about `useLocalSearchParams` typed-routes for `/(app)/food?barcode=...`, cast `as any` on the router.replace href.

---

### Task 10: `app/(app)/food/_plate-photo.tsx` — plate AI modal

**Files:**
- Create: `app/(app)/food/_plate-photo.tsx`

- [ ] **Step 1: Create the modal route**

```tsx
// app/(app)/food/_plate-photo.tsx
//
// Plate-photo modal: pick image (camera or library) → base64 → POST to
// /api/plate-analysis (which uses Claude Vision) → show estimated SMAE
// equivalents → user can tweak quantities → save into food_logs.
//
// API expects: { image: 'data:image/jpeg;base64,...', meal: 'comida' }
// API returns: { items: [{food_name, group_type, quantity}], reasoning, ... }

import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ArrowLeft, Camera, ImageIcon, X, Plus, Minus, Check } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { apiFetch } from '../../../lib/api-client'
import { getToday, expandFoodLogEntry } from '../../../lib/utils'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { MealType, FoodGroup } from '../../../types'

type AnalysisItem = {
  food_name: string
  group_type: FoodGroup
  quantity: number
}

const GROUP_EMOJI: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

export default function PlatePhotoScreen() {
  const params = useLocalSearchParams<{ meal?: string }>()
  const meal = (params.meal as MealType | undefined) ?? 'comida'
  const { user } = useUser()
  const { showToast } = useToast()

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [items, setItems] = useState<AnalysisItem[]>([])
  const [reasoning, setReasoning] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setImageBase64(result.assets[0].base64 ?? null)
    }
  }

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setImageBase64(result.assets[0].base64 ?? null)
    }
  }

  const analyze = async () => {
    if (!imageBase64) return
    setAnalyzing(true)
    try {
      const response = await apiFetch('/api/plate-analysis', {
        method: 'POST',
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${imageBase64}`,
          meal,
        }),
      })
      const json = await response.json()
      if (json?.success && Array.isArray(json.items)) {
        setItems(json.items as AnalysisItem[])
        setReasoning(json.reasoning ?? '')
      } else {
        showToast(json?.error ?? 'Error al analizar la imagen')
      }
    } catch {
      showToast('Error de red al analizar')
    }
    setAnalyzing(false)
  }

  const updateQuantity = (idx: number, delta: number) => {
    setItems((arr) =>
      arr.map((item, i) =>
        i === idx ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    )
  }

  const removeItem = (idx: number) => {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }

  const saveAll = async () => {
    if (!user || items.length === 0) return
    setSaving(true)
    try {
      const today = getToday()
      const rows = items.flatMap((item) =>
        expandFoodLogEntry(item.food_name, item.group_type, item.quantity).map((e) => ({
          user_id: user.id,
          date: today,
          meal,
          group_type: e.group_type,
          quantity: e.quantity,
          food_name: e.food_name ?? null,
        }))
      )
      const { error: insertError } = await (supabase.from('food_logs') as any).insert(rows)
      if (insertError) throw insertError
      showToast(`${items.length} alimento${items.length === 1 ? '' : 's'} agregado${items.length === 1 ? '' : 's'}`)
      router.back()
    } catch {
      showToast('Error al guardar')
    }
    setSaving(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <Text
            className="text-[10px] text-ink-4 uppercase tracking-widest"
            style={{ fontFamily: 'ui-monospace' }}
          >
            Foto del plato
          </Text>
          <View style={{ width: 34 }} />
        </View>

        {!imageUri ? (
          /* Initial state: pick image */
          <View className="px-5 mt-8">
            <Text className="font-serif text-2xl font-light text-ink mb-2 text-center">
              Toma o sube una foto
            </Text>
            <Text className="text-sm text-ink-4 text-center mb-8">
              La AI estima los equivalentes SMAE.
            </Text>
            <View className="gap-3">
              <Pressable
                onPress={launchCamera}
                className="py-4 rounded-full bg-ink flex-row items-center justify-center gap-2"
              >
                <Camera size={16} color="#fafaf7" />
                <Text className="text-paper text-sm font-medium">Tomar foto</Text>
              </Pressable>
              <Pressable
                onPress={launchLibrary}
                className="py-4 rounded-full border border-ink-7 flex-row items-center justify-center gap-2"
              >
                <ImageIcon size={16} color="#0a0a0a" />
                <Text className="text-ink text-sm font-medium">Elegir de galería</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Image picked: show + analyze + items */
          <View className="px-5 mt-4">
            <View className="rounded-2xl overflow-hidden bg-ink-7 mb-4" style={{ aspectRatio: 4 / 3 }}>
              <Image source={{ uri: imageUri }} style={{ flex: 1 }} contentFit="cover" />
            </View>

            {!analyzing && items.length === 0 && (
              <Pressable
                onPress={analyze}
                className="py-4 rounded-full bg-ink items-center"
              >
                <Text className="text-paper text-sm font-medium">Analizar con AI</Text>
              </Pressable>
            )}

            {analyzing && (
              <View className="items-center py-6">
                <PulseLine w={120} h={32} color="#ff5a1f" strokeWidth={2} active />
                <Text className="text-sm text-ink-4 mt-3">Analizando tu plato...</Text>
              </View>
            )}

            {items.length > 0 && (
              <>
                <Text
                  className="text-[10px] text-ink-4 uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'ui-monospace' }}
                >
                  Equivalentes detectados
                </Text>
                <View className="gap-2 mb-4">
                  {items.map((item, i) => (
                    <View
                      key={i}
                      className="bg-white border border-ink-7 rounded-xl p-3 flex-row items-center gap-2"
                    >
                      <Text className="text-base">{GROUP_EMOJI[item.group_type]}</Text>
                      <View className="flex-1">
                        <Text className="text-sm text-ink">{item.food_name}</Text>
                        <Text className="text-[10px] text-ink-4">{item.group_type}</Text>
                      </View>
                      <Pressable
                        onPress={() => updateQuantity(i, -0.5)}
                        className="w-8 h-8 rounded-full bg-paper-2 items-center justify-center"
                      >
                        <Minus size={14} color="#0a0a0a" />
                      </Pressable>
                      <Text
                        className="text-sm font-medium text-ink"
                        style={{ fontFamily: 'ui-monospace', minWidth: 30, textAlign: 'center' }}
                      >
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateQuantity(i, 0.5)}
                        className="w-8 h-8 rounded-full bg-signal items-center justify-center"
                      >
                        <Plus size={14} color="#ffffff" />
                      </Pressable>
                      <Pressable onPress={() => removeItem(i)} className="p-1">
                        <X size={14} color="#a3a3a3" />
                      </Pressable>
                    </View>
                  ))}
                </View>

                {reasoning && (
                  <View className="bg-paper-2 rounded-xl p-3 mb-4">
                    <Text className="text-[11px] text-ink-4 leading-5">{reasoning}</Text>
                  </View>
                )}

                <Pressable
                  onPress={saveAll}
                  disabled={saving || items.length === 0}
                  className={`py-4 rounded-full bg-ink flex-row items-center justify-center gap-2 ${saving ? 'opacity-50' : ''}`}
                >
                  <Check size={16} color="#fafaf7" />
                  <Text className="text-paper text-sm font-medium">
                    {saving ? 'Guardando...' : 'Guardar todo'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/food/_plate-photo.tsx'
git commit -m "feat(food): _plate-photo.tsx — image picker + AI analysis + save"
git push
```

---

### Task 11: `app/(app)/food/index.tsx` — main day view

**Files:**
- Create: `app/(app)/food/index.tsx` (replaces WIP placeholder)

- [ ] **Step 1: Replace the placeholder file**

```tsx
// app/(app)/food/index.tsx
//
// Food day view: date header + group budget bars + favorites carousel +
// quick-actions row + 4-6 meal cards + add-food sheet. Reads barcode result
// from URL params if returned from the scanner.

import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, Link } from 'expo-router'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { apiFetch } from '../../../lib/api-client'
import { getToday, formatDateISO, expandFoodLogEntry } from '../../../lib/utils'
import { DEFAULT_DAILY_BUDGET } from '../../../lib/constants'
import { getGroupTotals, getMealLogs } from '../../../lib/food'
import { GroupBudgetBars } from '../../../components/food/GroupBudgetBars'
import { MealCard } from '../../../components/food/MealCard'
import { FoodSearchSheet } from '../../../components/food/FoodSearchSheet'
import { FavoritesCarousel } from '../../../components/food/FavoritesCarousel'
import { QuickActionsRow } from '../../../components/food/QuickActionsRow'
import { PulseLine } from '../../../components/ui/PulseLine'
import type {
  DailyBudget, FoodLog, FoodGroup, MealType, FavoriteMeal, CustomFood,
  FoodEquivalent, ActiveMeals,
} from '../../../types'

const DEFAULT_ACTIVE_MEALS: ActiveMeals = {
  desayuno: true,
  snack1: true,
  comida: true,
  snack2: false,
  cena: true,
  snack3: false,
}

const ALL_MEALS: { key: MealType; label: string; emoji: string }[] = [
  { key: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { key: 'snack1', label: 'Snack 1', emoji: '🍌' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'snack2', label: 'Snack 2', emoji: '🍎' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
  { key: 'snack3', label: 'Snack 3', emoji: '🥜' },
]

export default function FoodScreen() {
  const params = useLocalSearchParams<{ barcode?: string }>()
  const { user } = useUser()
  const { showToast } = useToast()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const dateStr = formatDateISO(selectedDate)
  const isToday = dateStr === getToday()

  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [dbFoods, setDbFoods] = useState<FoodEquivalent[]>([])
  const [budget, setBudget] = useState<DailyBudget>(DEFAULT_DAILY_BUDGET)
  const [activeMeals, setActiveMeals] = useState<ActiveMeals>(DEFAULT_ACTIVE_MEALS)

  const [showSearchSheet, setShowSearchSheet] = useState(false)
  const [activeMeal, setActiveMeal] = useState<MealType>('desayuno')
  const [activeGroup, setActiveGroup] = useState<FoodGroup | null>(null)
  const [savingFood, setSavingFood] = useState(false)

  const meals = useMemo(
    () => ALL_MEALS.filter((m) => activeMeals[m.key]),
    [activeMeals]
  )

  const dateLabel = (() => {
    if (isToday) return 'Hoy'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sd = new Date(selectedDate)
    sd.setHours(0, 0, 0, 0)
    const diff = Math.round((sd.getTime() - today.getTime()) / 86400000)
    if (diff === -1) return 'Ayer'
    if (diff === 1) return 'Mañana'
    const s = selectedDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  const goPrev = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const goNext = () => {
    if (isToday) return
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }

  useEffect(() => {
    if (user) load()
  }, [user, dateStr])

  const load = async () => {
    if (!user) return
    setLoading(true)

    const [logsRes, favsRes, customsRes, dbRes, dietRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('date', dateStr).order('created_at'),
      supabase.from('favorite_meals').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('custom_foods').select('*').eq('user_id', user.id).order('name'),
      (supabase as any).from('food_equivalents').select('*'),
      (supabase as any)
        .from('user_diet_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    setLogs((logsRes.data as FoodLog[]) ?? [])
    setFavorites((favsRes.data as FavoriteMeal[]) ?? [])
    setCustomFoods((customsRes.data as CustomFood[]) ?? [])
    setDbFoods((dbRes.data as FoodEquivalent[]) ?? [])

    if (dietRes.data) {
      const cfg = dietRes.data as any
      const b: DailyBudget = {
        verdura: cfg.verdura ?? DEFAULT_DAILY_BUDGET.verdura,
        fruta: cfg.fruta ?? DEFAULT_DAILY_BUDGET.fruta,
        carb: cfg.carb ?? DEFAULT_DAILY_BUDGET.carb,
        leguminosa: cfg.leguminosa ?? DEFAULT_DAILY_BUDGET.leguminosa,
        proteina: cfg.proteina ?? DEFAULT_DAILY_BUDGET.proteina,
        grasa: cfg.grasa ?? DEFAULT_DAILY_BUDGET.grasa,
      }
      setBudget(b)
      if (cfg.active_meals) {
        setActiveMeals(cfg.active_meals as ActiveMeals)
      }
    }

    setLoading(false)
  }

  // ---------- Handle barcode result from camera modal ----------
  useEffect(() => {
    if (params.barcode && user) {
      handleBarcode(params.barcode as string)
      // Clear the param so revisits don't re-trigger
      router.setParams({ barcode: undefined } as any)
    }
  }, [params.barcode, user])

  const handleBarcode = async (code: string) => {
    try {
      const res = await apiFetch(`/api/barcode-lookup?barcode=${encodeURIComponent(code)}`)
      const json = await res.json()
      if (json?.product?.estimated_equivalents?.length > 0) {
        // For v1, save all suggested equivalents directly. Future: show review sheet.
        const today = getToday()
        const rows = (json.product.estimated_equivalents as Array<{
          group_type: FoodGroup
          quantity: number
        }>).flatMap((eq) =>
          expandFoodLogEntry(json.product.name, eq.group_type, eq.quantity).map((e) => ({
            user_id: user!.id,
            date: today,
            meal: activeMeal,
            group_type: e.group_type,
            quantity: e.quantity,
            food_name: e.food_name ?? null,
          }))
        )
        await (supabase.from('food_logs') as any).insert(rows)
        await load()
        showToast(`${json.product.name} agregado`)
      } else if (json?.found === false) {
        showToast('Producto no encontrado')
      }
    } catch {
      showToast('Error al buscar el producto')
    }
  }

  const openMealAdd = (meal: MealType) => {
    setActiveMeal(meal)
    setActiveGroup(null)
    setShowSearchSheet(true)
  }

  const handleSaveFood = async (data: {
    group: FoodGroup
    name: string
    portion: string | null
    quantity: number
  }) => {
    if (!user) return
    setSavingFood(true)
    try {
      const today = dateStr
      const rows = expandFoodLogEntry(data.name, data.group, data.quantity).map((e) => ({
        user_id: user.id,
        date: today,
        meal: activeMeal,
        group_type: e.group_type,
        quantity: e.quantity,
        food_name: e.food_name ?? null,
      }))
      const { error } = await (supabase.from('food_logs') as any).insert(rows)
      if (error) throw error
      await load()
      setShowSearchSheet(false)
      showToast(`${data.name} agregado`)
    } catch {
      showToast('Error al guardar')
    }
    setSavingFood(false)
  }

  const handleDeleteLog = async (logId: string) => {
    try {
      await supabase.from('food_logs').delete().eq('id', logId)
      await load()
    } catch {
      showToast('Error al eliminar')
    }
  }

  const handlePickFavorite = async (fav: FavoriteMeal) => {
    if (!user) return
    try {
      const today = dateStr
      const rows = (fav.items as Array<{
        food_name?: string
        group_type: FoodGroup
        quantity: number
      }>).flatMap((item) =>
        expandFoodLogEntry(item.food_name, item.group_type, item.quantity).map((e) => ({
          user_id: user.id,
          date: today,
          meal: fav.meal as MealType,
          group_type: e.group_type,
          quantity: e.quantity,
          food_name: e.food_name ?? null,
          favorite_name: fav.name,
        }))
      )
      await (supabase.from('food_logs') as any).insert(rows)
      await load()
      showToast(`${fav.name} agregado`)
    } catch {
      showToast('Error al agregar favorito')
    }
  }

  const totals = getGroupTotals(logs)

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
        {/* Date header */}
        <View className="px-5 pt-3 flex-row items-center justify-between">
          <Pressable
            onPress={goPrev}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ChevronLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View className="items-center">
            <Text
              className="text-[10px] text-ink-4 uppercase tracking-widest"
              style={{ fontFamily: 'ui-monospace' }}
            >
              {isToday ? 'Hoy' : 'Revisando'}
            </Text>
            <Text className="text-sm font-medium text-ink">{dateLabel}</Text>
          </View>
          <Pressable
            onPress={goNext}
            disabled={isToday}
            className={`w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center ${isToday ? 'opacity-30' : ''}`}
          >
            <ChevronRight size={16} color="#0a0a0a" />
          </Pressable>
        </View>

        {!isToday && (
          <Pressable onPress={() => setSelectedDate(new Date())} className="mt-2 px-5">
            <Text className="text-xs text-signal" style={{ fontFamily: 'ui-monospace' }}>
              ← Volver a hoy
            </Text>
          </Pressable>
        )}

        {/* Group budget bars */}
        <View className="px-5 mt-4">
          <GroupBudgetBars totals={totals} budget={budget} />
        </View>

        {/* Favorites carousel + Star link */}
        {favorites.length > 0 ? (
          <View className="mt-5">
            <FavoritesCarousel favorites={favorites} onPick={handlePickFavorite} />
          </View>
        ) : (
          <View className="px-5 mt-5">
            <Link href={"/(app)/food/favorites" as any} asChild>
              <Pressable className="py-3 rounded-xl bg-white border border-ink-7 flex-row items-center justify-center gap-2">
                <Star size={14} color="#d4a017" />
                <Text className="text-xs text-ink font-medium">Crear comida favorita</Text>
              </Pressable>
            </Link>
          </View>
        )}

        {/* Quick actions */}
        <View className="mt-5">
          <QuickActionsRow
            onCamera={() => router.push(`/(app)/food/_plate-photo?meal=${activeMeal}` as any)}
            onBarcode={() => router.push('/(app)/food/_barcode' as any)}
          />
        </View>

        {/* Meals */}
        <View className="px-5 mt-6">
          {meals.map((m) => (
            <MealCard
              key={m.key}
              meal={m.key}
              label={m.label}
              emoji={m.emoji}
              logs={getMealLogs(logs, m.key)}
              onAdd={() => openMealAdd(m.key)}
              onDeleteLog={handleDeleteLog}
            />
          ))}
        </View>

        {/* Manage favorites link */}
        <View className="px-5 mt-2">
          <Link href={"/(app)/food/favorites" as any} asChild>
            <Pressable className="flex-row items-center justify-center gap-2 py-3">
              <Star size={14} color="#d4a017" />
              <Text className="text-xs text-ink-4 underline">Administrar favoritos</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>

      <FoodSearchSheet
        visible={showSearchSheet}
        initialMeal={activeMeal}
        initialGroup={activeGroup}
        customFoods={customFoods}
        dbFoods={dbFoods}
        saving={savingFood}
        onClose={() => setShowSearchSheet(false)}
        onSave={handleSaveFood}
      />
    </SafeAreaView>
  )
}
```

Notes for the implementer:
- `user_diet_configs` table column names may vary; the snippet assumes `verdura`, `fruta`, `carb`, `leguminosa`, `proteina`, `grasa` columns plus `active_meals` JSONB. Inspect `supabase/migrations/` if anything looks off.
- If `router.setParams({ barcode: undefined })` errors out, pass empty string: `router.setParams({ barcode: '' } as any)`.
- The `FavoriteMeal.items` field is `FavoriteMealItem[]` — adjust if the type name differs.

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/food/index.tsx'
git commit -m "feat(food): main day view — date + bars + favs + meals + sheets"
git push
```

---

### Task 12: `app/(app)/food/favorites.tsx`

**Files:**
- Create: `app/(app)/food/favorites.tsx`

- [ ] **Step 1: Create the favorites screen**

```tsx
// app/(app)/food/favorites.tsx
//
// CRUD list of favorite meals. Favorites are pre-saved bundles of food
// items (e.g., "Avena con plátano y nueces" = 1 carb + 1 fruta + 1 grasa)
// that one-tap-add into the day view.

import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Star, Trash2 } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { FavoriteMeal, FoodGroup } from '../../../types'

const GROUP_EMOJI: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

export default function FavoritesScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('favorite_meals')
      .select('*')
      .order('created_at', { ascending: false })
    setFavorites((data as FavoriteMeal[]) ?? [])
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await supabase.from('favorite_meals').delete().eq('id', confirmDeleteId)
      showToast('Favorito eliminado')
      setConfirmDeleteId(null)
      await load()
    } catch {
      showToast('Error al eliminar')
    }
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
            <Text className="font-serif text-2xl font-light text-ink">Favoritos</Text>
            <Text className="text-xs text-ink-4">{favorites.length} comidas guardadas</Text>
          </View>
        </View>

        <View className="px-5 mt-5">
          {favorites.length === 0 ? (
            <View className="bg-white border border-ink-7 rounded-xl p-8 items-center">
              <Star size={32} color="#a3a3a3" />
              <Text className="text-sm text-ink-4 mt-3 text-center">
                Sin favoritos aún. Crea uno desde la vista de comida.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {favorites.map((fav) => {
                const items = fav.items as Array<{
                  food_name?: string
                  group_type: FoodGroup
                  quantity: number
                }>
                return (
                  <View key={fav.id} className="bg-white border border-ink-7 rounded-2xl p-4">
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5 mb-0.5">
                          <Star size={12} color="#d4a017" fill="#d4a017" />
                          <Text className="font-medium text-sm text-ink">{fav.name}</Text>
                        </View>
                        <Text
                          className="text-[10px] text-ink-4 uppercase"
                          style={{ fontFamily: 'ui-monospace' }}
                        >
                          {fav.meal} · {items.length} alimentos
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setConfirmDeleteId(fav.id)}
                        className="p-2"
                      >
                        <Trash2 size={16} color="#a3a3a3" />
                      </Pressable>
                    </View>
                    <View className="border-t border-ink-7 pt-2 gap-1">
                      {items.map((item, i) => (
                        <View key={i} className="flex-row items-center gap-2 py-0.5">
                          <Text className="text-base">{GROUP_EMOJI[item.group_type]}</Text>
                          <Text className="flex-1 text-xs text-ink-3">{item.food_name ?? item.group_type}</Text>
                          <Text
                            className="text-[10px] text-ink-4"
                            style={{ fontFamily: 'ui-monospace' }}
                          >
                            {item.quantity}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!confirmDeleteId}
        title="¿Eliminar favorito?"
        body="Se quita de tu lista de favoritos. No afecta los registros existentes."
        icon={<Trash2 size={28} color="#c13b5a" />}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  )
}
```

Note: this is a v1 favorites list — only delete is supported here. Creation happens implicitly via "save as favorite" actions in the day view (a future feature). For v1, users can create favorites via the web; mobile shows them. Adding a "Create favorite" form here is a future enhancement (Plan 7 polish).

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/food/favorites.tsx'
git commit -m "feat(food): favorites list — view + delete (creation deferred to v2)"
git push
```

---

### Task 13: Hide food sub-routes from tab bar

**Files:**
- Modify: `app/(app)/_layout.tsx`

- [ ] **Step 1: Add hidden screen entries**

Open `app/(app)/_layout.tsx`. After the existing `<Tabs.Screen name="gym/progress" options={{ href: null }} />` (or whichever was the last hidden entry from Plan 4), add:

```tsx
<Tabs.Screen
  name="food/favorites"
  options={{
    href: null,
  }}
/>
<Tabs.Screen
  name="food/_barcode"
  options={{
    href: null,
  }}
/>
<Tabs.Screen
  name="food/_plate-photo"
  options={{
    href: null,
  }}
/>
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/_layout.tsx'
git commit -m "fix(navigation): hide food sub-routes (favorites, _barcode, _plate-photo) from tab bar"
git push
```

---

### Task 14: Smoke test in Expo Go

**Files:**
- (No code — verification task)

- [ ] **Step 1: Boot the app**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo start --clear
```

Reload Expo Go. Bundle takes ~60-90s.

- [ ] **Step 2: Navigate to Comida tab**

- Date header with chevrons. Today selected. Past navigation works.
- Group budget bars (6 colored, with labels and % progress)
- If favorites exist: horizontal carousel
- Quick actions row: Camera + Barcode + (disabled) Voice
- Meal cards (4-6 depending on user_diet_configs.active_meals)

- [ ] **Step 3: Add food via search**

- Tap "+" on a meal → group picker sheet
- Pick a group (e.g., Frutas) → search input + list
- Type "manz" → filtered to "Manzana"
- Tap → quantity stepper (default 1)
- Tap "Agregar 1 porción" → toast + meal card refreshes with the new item
- Group budget bar updates

- [ ] **Step 4: Test barcode scanner**

- Tap "Escanear" → camera modal opens
- First time: permission request — Allow
- Point at a barcode (any product). On scan → modal closes → item added to active meal
- If product unknown: "Producto no encontrado" toast

- [ ] **Step 5: Test plate AI**

- Tap "Foto del plato" → modal opens
- Tap "Tomar foto" or "Elegir de galería" → permission request, then take/pick a photo
- Photo preview appears + "Analizar con AI" button
- Tap → PulseLine spinner + "Analizando tu plato..." → ~3-5s → list of detected equivalents with quantity steppers
- Adjust quantities, remove unwanted items
- Tap "Guardar todo" → toast + redirect to food day view with items added

- [ ] **Step 6: Yogurt griego split rule**

- Add a food named "Yogurt griego" (custom or via search)
- After save, the meal card shows TWO entries: 1 proteína + 1 grasa (per `expandFoodLogEntry`)

- [ ] **Step 7: Favorites view**

- From day view, tap "Administrar favoritos" link at the bottom
- See list of favorites (if any from web)
- Tap trash icon → ConfirmDialog → delete works

- [ ] **Step 8: Confirm tab bar**

The tab bar should still show only 4 tabs (Hoy / Gym / Comida / Hábitos). No `food/favorites`, `food/_barcode`, or `food/_plate-photo` should appear as a tab.

---

## Self-Review Checklist

### 1. Spec coverage
- ✅ Day view with date nav (Task 11)
- ✅ Group budget bars (Tasks 5, 11)
- ✅ Meals list with items + add button (Tasks 4, 11)
- ✅ Search across SMAE/custom/db foods (Tasks 8, 11)
- ✅ Favorites carousel + CRUD list (Tasks 6, 12)
- ✅ Barcode scanner (Tasks 1, 9)
- ✅ Plate AI (Task 10)
- ✅ Yogurt griego split (via expandFoodLogEntry — already in lib/utils.ts)
- ✅ Hide sub-routes from tabs (Task 13)
- ✅ User smoke test (Task 14)

### 2. Placeholder scan
No "TBD", "TODO", "implement later" found. The favorites-creation feature is explicitly scoped out as v2 polish (acknowledged in Task 12 description).

### 3. Type consistency
- `FoodOption` defined in Task 8, used only there.
- `AnalysisItem` defined in Task 10, only used there.
- `FoodLog`, `FoodGroup`, `MealType`, `FavoriteMeal`, `CustomFood`, `FoodEquivalent`, `DailyBudget`, `ActiveMeals` — all imported from `types/index.ts` consistently.
- `expandFoodLogEntry` signature: `(name?, group, quantity)` returns `Array<{group_type, quantity, food_name}>` — matches usage in Tasks 10 and 11.
- `apiFetch(path, options)` from Plan 1 — matches usage in Tasks 10 and 11.

No drift detected.

---

## Summary

| Task | What | LOC |
|---|---|---|
| 1 | Install expo-camera | ~10 |
| 2 | `lib/food.ts` | ~50 |
| 3 | FoodLogItem | ~50 |
| 4 | MealCard | ~45 |
| 5 | GroupBudgetBars | ~70 |
| 6 | FavoritesCarousel | ~40 |
| 7 | QuickActionsRow | ~40 |
| 8 | FoodSearchSheet | ~250 |
| 9 | _barcode.tsx | ~80 |
| 10 | _plate-photo.tsx | ~250 |
| 11 | food/index.tsx | ~330 |
| 12 | food/favorites.tsx | ~120 |
| 13 | hide tabs | ~20 |
| 14 | smoke test | 0 |

Total: ~1355 LOC across 14 tasks. ~3-5 days of subagent execution.
