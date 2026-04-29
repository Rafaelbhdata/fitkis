# FitKis Mobile Migration — Plan 3: Weight Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the patient weight module — hero stat with comparison delta, 4 metric cards (IMC / %Grasa / Masa Muscular / Masa Grasa) with traffic-light range meters and arrows, interactive line chart with axes/dots/tooltip, comparison-record dropdown, edit/delete from history, and photo gallery with side-by-side compare-mode — preserving the Paper & Pulse design pixel-perfect.

**Architecture:** Single screen (`app/(app)/weight/index.tsx`) that orchestrates ~10 presentational components. All data lives in `weight_logs` (with composition fields) and `progress_photos` tables on Supabase. Custom SVG charts via `react-native-svg` (no Recharts). Photo upload uses `expo-image-picker` and Supabase Storage's `progress-photos` bucket. All bottom sheets reuse the `BottomSheet` component built in Plan 2. `expo-image` powers the photo gallery and viewer for fast caching.

**Tech Stack:** Existing Expo SDK 54 + Expo Router 5 + NativeWind 4 + react-native-svg + lucide-react-native + Supabase JS. NEW: `expo-image-picker`, `expo-image`.

**Repos & paths:**
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (branch `master`)
- Reference (read-only): `C:\Users\Rafae\Projects\fitkis\app\(app)\weight\page.tsx` (1245 lines — the canonical implementation)

**Spec reference:** `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

**Roadmap reference:** `docs/superpowers/plans/2026-04-27-roadmap-plans-2-to-7.md` (Plan 3 section)

**Builds on Plan 2:** `BottomSheet`, `ConfirmDialog`, `useToast`. Same patterns for CRUD modal and delete confirmation.

---

## Decisions Resolved (open questions from the roadmap)

1. **Comparison-against picker UX.** Web uses a native `<select>`. Mobile uses a `BottomSheet` listing past records with date + weight + a checkmark on the current selection. Tapping a row picks it and closes the sheet. More native-feeling than a tiny dropdown.

2. **Photo compression.** `expo-image-picker` `quality: 0.7` (matches the spec's recommendation). `allowsEditing: false` — no in-app crop in v1; users can crop in their phone's gallery before picking if needed.

3. **Compare-mode UX.** Web has a fixed-overlay full-screen comparison. Mobile uses the same approach: a `Modal` with two `<Image>`s side-by-side, dates labeled at the bottom, X to dismiss. No swipe-slider gestures in v1 — that's polish for Plan 7.

4. **Date picker for measurement form.** `@react-native-community/datetimepicker` for native iOS spinner / Android calendar. Default to today. No custom calendar component needed in v1.

5. **Weight tab visibility.** Weight is NOT a tab — it's reached via the dashboard's "Peso Actual" card (which becomes tappable). Add `<Tabs.Screen name="weight/index" options={{ href: null }} />` to keep it hidden from the tab bar (same pattern as `habits/progress`).

---

## File Structure

### New files

```
fitkis-mobile/
├── app/
│   └── (app)/
│       ├── weight/
│       │   └── index.tsx                ← new (main screen)
│       └── _layout.tsx                  ← modified (hide weight from tabs)
├── app/(app)/dashboard.tsx              ← modified (PESO card → tappable, links to /weight)
├── components/
│   └── weight/
│       ├── HeroStat.tsx                 ← large weight + delta pill
│       ├── RangeMeter.tsx               ← 3-bar traffic-light + arrow + scale
│       ├── MetricStatCard.tsx           ← card with value + delta + RangeMeter (clickable)
│       ├── MetricChart.tsx              ← interactive line chart (axes/dots/tooltip)
│       ├── CompareSelector.tsx          ← bottom sheet for picking comparison record
│       ├── WeightFormSheet.tsx          ← add/edit measurement form
│       ├── HistoryRow.tsx               ← single row in history list (clickable)
│       ├── PhotoGallery.tsx             ← grid of photos + compare button
│       ├── PhotoCaptureSheet.tsx        ← bottom sheet to choose front/side + launch picker
│       └── PhotoCompareModal.tsx        ← side-by-side comparison view
├── lib/
│   └── weight.ts                        ← calculateBMI, METRIC_RANGES, statusFns, types
└── package.json                         ← new deps: expo-image-picker, expo-image
```

### File responsibilities

| File | Responsibility |
|---|---|
| `lib/weight.ts` | BMI math + range-meter config + zone helpers (pure) |
| `components/weight/HeroStat.tsx` | Big weight number + signed delta pill vs comparison |
| `components/weight/RangeMeter.tsx` | 3 colored segments + arrow + axis labels |
| `components/weight/MetricStatCard.tsx` | Card with value + delta + RangeMeter, calls onSelect when tapped |
| `components/weight/MetricChart.tsx` | SVG line chart: axes, grid, dots, tooltip |
| `components/weight/CompareSelector.tsx` | List of past logs in a sheet; selecting changes comparison |
| `components/weight/WeightFormSheet.tsx` | Form: date picker + weight + composition + notes |
| `components/weight/HistoryRow.tsx` | Single log row showing date + weight + diff badge + composition summary |
| `components/weight/PhotoGallery.tsx` | 2-col grid of photos with overlay metadata + "Comparar" button |
| `components/weight/PhotoCaptureSheet.tsx` | Picks front/side then launches camera or gallery |
| `components/weight/PhotoCompareModal.tsx` | Full-screen side-by-side viewer |
| `app/(app)/weight/index.tsx` | Top-level orchestrator screen |

---

# TASKS

### Task 1: Install dependencies

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\package.json` (via npm/expo install)

- [ ] **Step 1: Install expo-image-picker, expo-image, datetimepicker**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo install expo-image-picker expo-image @react-native-community/datetimepicker
```

`npx expo install` selects SDK-54-compatible versions automatically. If it fails with React 19 peer conflict, fall back to:

```bash
npm install expo-image-picker expo-image @react-native-community/datetimepicker --legacy-peer-deps
```

Then ask Expo to update `app.json` plugins:

- [ ] **Step 2: Add `expo-image-picker` plugin to `app.config.ts`**

Open `app.config.ts`. The plugins line currently looks like:
```ts
plugins: [...(config.plugins ?? []), 'expo-secure-store'],
```

Update to:
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
],
```

This plugin entry generates the proper `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription` entries in iOS Info.plist when EAS builds.

- [ ] **Step 3: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit + push**

```bash
git add package.json package-lock.json app.config.ts
git commit -m "chore: install expo-image-picker, expo-image, datetimepicker for weight module"
git push
```

---

### Task 2: `lib/weight.ts` — pure helpers

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\weight.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/weight.ts
//
// Pure helpers for the weight module. No DOM, no Supabase, no React.

export type ZoneColor = 'green' | 'yellow' | 'red'
export type Zone = { color: ZoneColor; to: number; label: string }
export type RangeMeterConfig = { min: number; max: number; zones: Zone[] }
export type MetricKey = 'weight' | 'bmi' | 'bf_pct' | 'muscle' | 'fat_mass'

// Reference ranges (adult male, orientative — not medical advice).
// Each metric has 3 zones; bar widths are proportional to each zone's span.
export const METRIC_RANGES: Record<Exclude<MetricKey, 'weight'>, RangeMeterConfig> = {
  bmi: {
    min: 15,
    max: 40,
    zones: [
      { color: 'yellow', to: 18.5, label: 'Bajo peso' },
      { color: 'green', to: 25, label: 'Normal' },
      { color: 'red', to: 40, label: 'Sobrepeso' },
    ],
  },
  bf_pct: {
    min: 5,
    max: 35,
    zones: [
      { color: 'green', to: 18, label: 'Saludable' },
      { color: 'yellow', to: 25, label: 'Elevado' },
      { color: 'red', to: 35, label: 'Alto' },
    ],
  },
  muscle: {
    min: 25,
    max: 45,
    zones: [
      { color: 'red', to: 30, label: 'Bajo' },
      { color: 'yellow', to: 35, label: 'Medio' },
      { color: 'green', to: 45, label: 'Alto' },
    ],
  },
  fat_mass: {
    min: 5,
    max: 30,
    zones: [
      { color: 'green', to: 15, label: 'Saludable' },
      { color: 'yellow', to: 22, label: 'Elevado' },
      { color: 'red', to: 30, label: 'Alto' },
    ],
  },
}

// Active zone helper — used both for the meter and the subtitle label.
export function activeZoneIndex(value: number, config: RangeMeterConfig): number {
  for (let i = 0; i < config.zones.length; i++) {
    if (value <= config.zones[i].to) return i
  }
  return config.zones.length - 1
}

// BMI = kg / m². Height defaults to USER_PROFILE.height (163cm) — same as web.
import { USER_PROFILE } from './constants'

export function calculateBMI(weightKg: number, heightCm: number = USER_PROFILE.height): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty. Note: `lib/utils.ts` already has a `calculateBMI` (copied from web in Plan 1 / Task 15), but the web version takes only weight+height with no default. The version here adds the `heightCm` default — call this one from now on. The two coexist (different signatures); we'll deduplicate during Plan 7 polish.

If TS complains about the duplicate, rename this one to `calculateBMIDefault` or import the existing one and re-export. The simplest fix: just use the existing `calculateBMI` from `lib/utils.ts` and export it via re-export here:

```ts
// fallback if duplicate complaint:
import { calculateBMI as calculateBMIRaw } from './utils'
export function calculateBMI(weightKg: number, heightCm: number = USER_PROFILE.height): number {
  return calculateBMIRaw(weightKg, heightCm)
}
```

- [ ] **Step 3: Commit + push**

```bash
git add lib/weight.ts
git commit -m "feat(weight): pure helpers (BMI, range-meter config, zone math)"
git push
```

---

### Task 3: `components/weight/RangeMeter.tsx` — traffic-light meter

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\RangeMeter.tsx`

- [ ] **Step 1: Create directory + component**

```bash
mkdir -p components/weight
```

```tsx
// components/weight/RangeMeter.tsx
//
// 3-segment colored bar with proportional widths + arrow above pointing at
// the user's value. X-axis labels: min, internal thresholds, max.
// Traditional traffic-light palette (vivid green / amber / deep red).

import { View, Text } from 'react-native'
import { activeZoneIndex, type RangeMeterConfig, type ZoneColor } from '../../lib/weight'

const ZONE_BG: Record<ZoneColor, string> = {
  green: 'bg-green-600',
  yellow: 'bg-amber-500',
  red: 'bg-red-600',
}

type Props = { value?: number; config: RangeMeterConfig }

export function RangeMeter({ value, config }: Props) {
  const { min, max, zones } = config
  const hasValue = value != null
  const clamped = hasValue ? Math.max(min, Math.min(max, value!)) : min
  const arrowPct = hasValue ? ((clamped - min) / (max - min)) * 100 : 0
  const activeIdx = hasValue ? activeZoneIndex(value!, config) : -1

  return (
    <View className="relative mt-2 select-none">
      {/* Arrow (down-pointing triangle pointing at the bar) */}
      {hasValue && (
        <View
          className="absolute"
          style={{
            top: -7,
            left: `${arrowPct}%`,
            width: 0,
            height: 0,
            borderLeftWidth: 4,
            borderRightWidth: 4,
            borderTopWidth: 5,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#0a0a0a',
            transform: [{ translateX: -4 }],
          }}
        />
      )}

      {/* Bars (proportional widths, rounded ends) */}
      <View className="flex-row h-1.5 rounded-full bg-ink-7">
        {zones.map((z, i) => {
          const from = i === 0 ? min : zones[i - 1].to
          const isActive = activeIdx === i
          const isFirst = i === 0
          const isLast = i === zones.length - 1
          return (
            <View
              key={i}
              className={`${ZONE_BG[z.color]} ${isFirst ? 'rounded-l-full' : ''} ${isLast ? 'rounded-r-full' : ''}`}
              style={{
                flexGrow: z.to - from,
                flexBasis: 0,
                opacity: hasValue && !isActive ? 0.25 : 1,
              }}
            />
          )
        })}
      </View>

      {/* X-axis: min, internal thresholds, max */}
      <View className="relative h-3 mt-0.5">
        <Text
          className="absolute text-[8px] text-ink-5"
          style={{ left: 0, fontFamily: 'ui-monospace' }}
        >
          {min}
        </Text>
        {zones.slice(0, -1).map((z, i) => {
          const pct = ((z.to - min) / (max - min)) * 100
          return (
            <Text
              key={i}
              className="absolute text-[8px] text-ink-5"
              style={{ left: `${pct}%`, transform: [{ translateX: -8 }], fontFamily: 'ui-monospace' }}
            >
              {z.to}
            </Text>
          )
        })}
        <Text
          className="absolute text-[8px] text-ink-5"
          style={{ right: 0, fontFamily: 'ui-monospace' }}
        >
          {max}
        </Text>
      </View>
    </View>
  )
}
```

Note: the web's React translate `transform: 'translateX(-50%)'` doesn't work in RN. Use `transform: [{ translateX: -8 }]` (in points, ~half of the label width). This may need fine-tuning per metric — `-8` is a reasonable default for 4-character labels like "18.5".

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/RangeMeter.tsx
git commit -m "feat(weight): RangeMeter — 3-bar traffic-light meter with arrow + x-scale"
git push
```

---

### Task 4: `components/weight/MetricStatCard.tsx` — clickable metric card

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\MetricStatCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/MetricStatCard.tsx
//
// One of the 4 metric cards (IMC / %Grasa / Masa Muscular / Masa Grasa).
// Tap → calls onSelect, parent uses this to switch the chart below.
// Active state: 2px signal border. Inactive: thin ink-7 border.

import { View, Text, Pressable } from 'react-native'
import { RangeMeter } from './RangeMeter'
import { activeZoneIndex, METRIC_RANGES, type MetricKey } from '../../lib/weight'

type Props = {
  metricKey: Exclude<MetricKey, 'weight'>
  selected: boolean
  onSelect: (m: MetricKey) => void
  label: string
  value: string                  // pre-formatted ('--' if missing)
  numericValue?: number          // raw number for the meter
  unit?: string
  delta?: number
  deltaUnit: string
  deltaLowerIsBetter: boolean
}

export function MetricStatCard({
  metricKey,
  selected,
  onSelect,
  label,
  value,
  numericValue,
  unit,
  delta,
  deltaUnit,
  deltaLowerIsBetter,
}: Props) {
  const showDelta = delta != null && Math.abs(delta) >= 0.05
  const deltaIsGood = showDelta && (deltaLowerIsBetter ? delta! < 0 : delta! > 0)
  const arrow = showDelta ? (delta! > 0 ? '↑' : '↓') : ''
  const config = METRIC_RANGES[metricKey]
  const activeZoneLabel =
    numericValue != null ? config.zones[activeZoneIndex(numericValue, config)].label : null

  return (
    <Pressable
      onPress={() => onSelect(metricKey)}
      className={`relative bg-white rounded-[14px] p-4 ${
        selected ? 'border-2 border-signal' : 'border border-ink-7'
      }`}
    >
      <Text
        className="text-[10px] text-ink-4 uppercase tracking-widest mb-1"
        style={{ fontFamily: 'ui-monospace' }}
      >
        {label}
      </Text>
      <View className="flex-row items-baseline gap-2 flex-wrap">
        <Text className="font-serif text-[28px] font-light text-signal">{value}</Text>
        {unit && <Text className="text-sm text-ink-4">{unit}</Text>}
        {showDelta && (
          <View
            className={`px-1.5 py-0.5 rounded-full ${
              deltaIsGood ? 'bg-leaf-soft' : 'bg-berry-soft'
            }`}
          >
            <Text
              className={`text-[10px] font-medium ${deltaIsGood ? 'text-leaf' : 'text-berry'}`}
              style={{ fontFamily: 'ui-monospace' }}
            >
              {arrow} {Math.abs(delta!).toFixed(1)}
              {deltaUnit}
            </Text>
          </View>
        )}
      </View>
      <RangeMeter value={numericValue} config={config} />
      {activeZoneLabel && (
        <Text className="text-[11px] text-ink-4 mt-0.5">{activeZoneLabel}</Text>
      )}
    </Pressable>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/MetricStatCard.tsx
git commit -m "feat(weight): MetricStatCard — value + delta pill + RangeMeter (clickable)"
git push
```

---

### Task 5: `components/weight/MetricChart.tsx` — interactive line chart

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\MetricChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/MetricChart.tsx
//
// Interactive line chart for the selected metric. Custom SVG with axes,
// data points, and a hover/tap tooltip. Y-axis: 3 ticks (max, mid, min)
// with 10-15% padding. X-axis: up to 4 evenly-spaced date labels.

import React, { useId, useState } from 'react'
import { View, Text } from 'react-native'
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import { parseLocalDate } from '../../lib/utils'

type DataPoint = { value: number; date: string }

type Props = {
  data: DataPoint[]
  unit: string
  color: string
  formatValue?: (v: number) => string
}

export function MetricChart({ data, unit, color, formatValue }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const gradId = useId()

  if (data.length === 0) {
    return (
      <View className="h-[180px] items-center justify-center">
        <Text className="text-xs text-ink-4">Sin datos suficientes</Text>
      </View>
    )
  }

  const W = 320
  const H = 180
  const padL = 32
  const padR = 12
  const padT = 12
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const baselineY = padT + plotH

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
      ? `M ${points[0].x},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${baselineY} Z`
      : ''

  const yTicks = [yMax, (yMin + yMax) / 2, yMin]

  const labelCount = Math.min(4, data.length)
  const xLabelIndices =
    data.length <= 4
      ? data.map((_, i) => i)
      : Array.from({ length: labelCount }, (_, k) =>
          Math.round((k * (data.length - 1)) / (labelCount - 1))
        )

  const fmt = formatValue ?? ((v: number) => v.toFixed(1))
  const hovered = hoverIdx != null ? points[hoverIdx] : null

  return (
    <View className="relative">
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Y grid + labels */}
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

        {/* X labels */}
        {xLabelIndices.map((i) => {
          const dateLabel = parseLocalDate(data[i].date).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
          })
          return (
            <SvgText
              key={i}
              x={xAt(i)}
              y={baselineY + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#a3a3a3"
            >
              {dateLabel}
            </SvgText>
          )
        })}

        {/* Area + line */}
        {areaPath && <Path d={areaPath} fill={`url(#${gradId})`} />}
        {points.length >= 2 && (
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Points (interactive) */}
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
              fill={hoverIdx === i ? color : 'white'}
              stroke={color}
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
            {fmt(hovered.value)}
            {unit}
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

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/MetricChart.tsx
git commit -m "feat(weight): MetricChart — line chart with axes, dots, tap tooltip"
git push
```

---

### Task 6: `components/weight/HeroStat.tsx` — large weight + delta

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\HeroStat.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/HeroStat.tsx
//
// Large weight number in serif extralight + signed delta pill below.
// "↓" green pill when negative (lost weight); "↑" red pill when positive.

import { View, Text } from 'react-native'

type Props = {
  weightKg: number
  deltaKg: number | null  // null = no comparison available
}

export function HeroStat({ weightKg, deltaKg }: Props) {
  const showDelta = deltaKg != null && Math.abs(deltaKg) >= 0.05
  const isLoss = (deltaKg ?? 0) < 0
  return (
    <View className="px-5 mt-6">
      <View className="flex-row items-baseline gap-3">
        <Text className="font-serif text-[88px] font-extralight tracking-tight text-signal" style={{ lineHeight: 88 }}>
          {weightKg.toFixed(1)}
        </Text>
        <Text className="text-sm text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
          kg
        </Text>
      </View>
      {showDelta && (
        <View className="flex-row items-center gap-2 mt-2">
          <View
            className={`px-2 py-1 rounded-full ${isLoss ? 'bg-leaf-soft' : 'bg-berry-soft'}`}
          >
            <Text
              className={`text-xs font-medium ${isLoss ? 'text-leaf' : 'text-berry'}`}
              style={{ fontFamily: 'ui-monospace' }}
            >
              {isLoss ? '↓' : '↑'} {Math.abs(deltaKg!).toFixed(1)} kg
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/HeroStat.tsx
git commit -m "feat(weight): HeroStat — 88pt weight + signed delta pill"
git push
```

---

### Task 7: `components/weight/CompareSelector.tsx` — bottom sheet

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\CompareSelector.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/CompareSelector.tsx
//
// Bottom sheet listing past weight logs. Tapping a row sets it as the
// comparison record (parent uses this to compute deltas across all metrics).

import { View, Text, Pressable, ScrollView } from 'react-native'
import { Check } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { parseLocalDate } from '../../lib/utils'
import type { WeightLog } from '../../types'

type Props = {
  visible: boolean
  onClose: () => void
  logs: WeightLog[]
  selectedLogId: string | null
  onSelect: (logId: string) => void
}

export function CompareSelector({ visible, onClose, logs, selectedLogId, onSelect }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="font-serif text-xl font-light mb-2">Comparar contra</Text>
      <Text className="text-xs text-ink-4 mb-4">Elige un registro previo para ver el cambio.</Text>
      <ScrollView style={{ maxHeight: 400 }}>
        <View className="gap-1">
          {logs.map((log) => {
            const isSelected = log.id === selectedLogId
            const dateLabel = parseLocalDate(log.date).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })
            return (
              <Pressable
                key={log.id}
                onPress={() => {
                  onSelect(log.id)
                  onClose()
                }}
                className={`p-3 rounded-lg flex-row items-center justify-between ${
                  isSelected ? 'bg-signal-soft border border-signal' : 'bg-paper-2'
                }`}
              >
                <View>
                  <Text className="font-medium text-sm text-ink capitalize">{dateLabel}</Text>
                  <Text className="text-xs text-ink-4 mt-0.5">
                    {log.weight_kg.toFixed(1)} kg
                  </Text>
                </View>
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

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/CompareSelector.tsx
git commit -m "feat(weight): CompareSelector — bottom sheet for picking comparison record"
git push
```

---

### Task 8: `components/weight/WeightFormSheet.tsx` — add/edit form

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\WeightFormSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/WeightFormSheet.tsx
//
// Bottom-sheet form for adding or editing a weight log.
// Fields: date (native picker), weight (required), composition (optional:
// muscle mass, fat mass, body fat %), notes. Auto-calculates BMI display.
// In edit mode, shows a Delete button alongside Save.

import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Platform } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Calendar, Trash2, X } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { calculateBMI } from '../../lib/weight'
import { parseLocalDate, formatDateISO } from '../../lib/utils'
import type { WeightLog } from '../../types'

type Props = {
  visible: boolean
  editingLog: WeightLog | null
  saving: boolean
  onClose: () => void
  onSave: (data: {
    date: string
    weight_kg: number
    muscle_mass_kg: number | null
    body_fat_mass_kg: number | null
    body_fat_percentage: number | null
    notes: string | null
  }) => void
  onDelete?: () => void
}

export function WeightFormSheet({ visible, editingLog, saving, onClose, onSave, onDelete }: Props) {
  const [date, setDate] = useState<string>(formatDateISO(new Date()))
  const [weight, setWeight] = useState('')
  const [muscle, setMuscle] = useState('')
  const [fatMass, setFatMass] = useState('')
  const [fatPct, setFatPct] = useState('')
  const [notes, setNotes] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (editingLog) {
      setDate(editingLog.date)
      setWeight(editingLog.weight_kg.toString())
      setMuscle(editingLog.muscle_mass_kg?.toString() ?? '')
      setFatMass(editingLog.body_fat_mass_kg?.toString() ?? '')
      setFatPct(editingLog.body_fat_percentage?.toString() ?? '')
      setNotes(editingLog.notes ?? '')
    } else if (visible) {
      setDate(formatDateISO(new Date()))
      setWeight('')
      setMuscle('')
      setFatMass('')
      setFatPct('')
      setNotes('')
    }
  }, [editingLog, visible])

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setDate(formatDateISO(selectedDate))
    }
  }

  const handleSave = () => {
    const w = parseFloat(weight)
    const mm = parseFloat(muscle)
    const fm = parseFloat(fatMass)
    const fp = parseFloat(fatPct)
    onSave({
      date,
      weight_kg: w,
      muscle_mass_kg: muscle && Number.isFinite(mm) && mm > 0 ? mm : null,
      body_fat_mass_kg: fatMass && Number.isFinite(fm) && fm > 0 ? fm : null,
      body_fat_percentage: fatPct && Number.isFinite(fp) && fp >= 0 && fp <= 70 ? fp : null,
      notes: notes.trim() || null,
    })
  }

  const weightNum = parseFloat(weight)
  const canSave =
    !!weight &&
    !saving &&
    Number.isFinite(weightNum) &&
    weightNum >= 20 &&
    weightNum <= 300

  const dateLabel = parseLocalDate(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding>
      <View className="flex-row items-center justify-between mb-5">
        <Text className="font-serif text-xl font-light">
          {editingLog ? 'Editar registro' : 'Nueva medición'}
        </Text>
        <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
          <X size={20} color="#0a0a0a" />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Date */}
        <View className="mb-4">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Fecha</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl border border-ink-7 bg-white"
          >
            <Calendar size={16} color="#737373" />
            <Text className="text-sm text-ink capitalize">{dateLabel}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={parseLocalDate(date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Weight */}
        <View className="mb-4">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Peso (kg) *</Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="80.0"
            placeholderTextColor="#a3a3a3"
            className="px-4 py-4 rounded-xl border border-ink-7 bg-white text-2xl font-serif text-center text-ink"
          />
          {weight && Number.isFinite(weightNum) && (
            <View className="mt-2 px-3 py-2 rounded-xl bg-paper-2">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-[11px] text-ink-4 uppercase tracking-wide"
                  style={{ fontFamily: 'ui-monospace' }}
                >
                  IMC calculado
                </Text>
                <Text className="font-serif text-lg text-ink">{calculateBMI(weightNum).toFixed(1)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Composition */}
        <View className="pt-2 mb-4">
          <Text
            className="text-[10px] text-ink-4 uppercase tracking-widest mb-3"
            style={{ fontFamily: 'ui-monospace' }}
          >
            Composición (opcional)
          </Text>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-[10px] text-ink-4 uppercase tracking-wide mb-1.5">Masa Muscular (kg)</Text>
              <TextInput
                value={muscle}
                onChangeText={setMuscle}
                keyboardType="decimal-pad"
                placeholder="35.0"
                placeholderTextColor="#a3a3a3"
                className="px-3 py-3 rounded-xl border border-ink-7 bg-white text-base font-serif text-center text-ink"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-ink-4 uppercase tracking-wide mb-1.5">Masa Grasa (kg)</Text>
              <TextInput
                value={fatMass}
                onChangeText={setFatMass}
                keyboardType="decimal-pad"
                placeholder="20.0"
                placeholderTextColor="#a3a3a3"
                className="px-3 py-3 rounded-xl border border-ink-7 bg-white text-base font-serif text-center text-ink"
              />
            </View>
          </View>
          <View>
            <Text className="text-[10px] text-ink-4 uppercase tracking-wide mb-1.5">% Grasa Corporal</Text>
            <TextInput
              value={fatPct}
              onChangeText={setFatPct}
              keyboardType="decimal-pad"
              placeholder="25.0"
              placeholderTextColor="#a3a3a3"
              className="px-3 py-3 rounded-xl border border-ink-7 bg-white text-base font-serif text-center text-ink"
            />
          </View>
        </View>

        {/* Notes */}
        <View className="mb-4">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Notas (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            placeholder="Observaciones..."
            placeholderTextColor="#a3a3a3"
            className="px-3 py-3 rounded-xl border border-ink-7 bg-white text-sm text-ink"
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 pt-2">
          {editingLog && onDelete ? (
            <Pressable
              onPress={onDelete}
              disabled={saving}
              className="px-4 py-3 rounded-xl border border-berry/30 flex-row items-center gap-2"
            >
              <Trash2 size={16} color="#c13b5a" />
              <Text className="text-sm font-medium text-berry">Eliminar</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-ink-7 items-center"
            >
              <Text className="text-sm font-medium text-ink">Cancelar</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            className={`flex-1 py-3 rounded-full items-center ${canSave ? 'bg-ink' : 'bg-ink opacity-50'}`}
          >
            <Text className="text-sm font-medium text-paper">
              {saving ? 'Guardando...' : editingLog ? 'Actualizar' : 'Guardar'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/WeightFormSheet.tsx
git commit -m "feat(weight): WeightFormSheet — add/edit form with date picker, composition, notes"
git push
```

---

### Task 9: `components/weight/HistoryRow.tsx` — clickable history row

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\HistoryRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/HistoryRow.tsx
//
// Single row in the weight history list. Tapping opens the form sheet in
// edit mode. Shows date + diff badge vs the previous chronological record
// + weight, with composition fields summary on a second line.

import { View, Text, Pressable } from 'react-native'
import { Pencil } from 'lucide-react-native'
import { parseLocalDate } from '../../lib/utils'
import type { WeightLog } from '../../types'

type Props = {
  log: WeightLog
  diff: number  // weight diff vs the previous record (0 if no previous)
  onPress: () => void
}

export function HistoryRow({ log, diff, onPress }: Props) {
  const dateLabel = parseLocalDate(log.date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
  const hasComposition =
    log.muscle_mass_kg != null || log.body_fat_mass_kg != null || log.body_fat_percentage != null

  return (
    <Pressable onPress={onPress} className="p-3 border-b border-ink-7">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Pencil size={12} color="#a3a3a3" />
          <Text className="text-sm text-ink-4">{dateLabel}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          {diff !== 0 && (
            <View
              className={`px-2 py-0.5 rounded-full ${diff < 0 ? 'bg-leaf-soft' : 'bg-berry-soft'}`}
            >
              <Text
                className={`text-[10px] font-medium ${diff < 0 ? 'text-leaf' : 'text-berry'}`}
                style={{ fontFamily: 'ui-monospace' }}
              >
                {diff > 0 ? '+' : ''}
                {diff.toFixed(1)}
              </Text>
            </View>
          )}
          <Text className="font-medium text-sm text-ink" style={{ fontFamily: 'ui-monospace' }}>
            {log.weight_kg} kg
          </Text>
        </View>
      </View>
      {hasComposition && (
        <View className="flex-row gap-3 mt-2">
          {log.muscle_mass_kg != null && (
            <Text className="text-[10px] text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
              Músculo: {log.muscle_mass_kg} kg
            </Text>
          )}
          {log.body_fat_mass_kg != null && (
            <Text className="text-[10px] text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
              Grasa: {log.body_fat_mass_kg} kg
            </Text>
          )}
          {log.body_fat_percentage != null && (
            <Text className="text-[10px] text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
              %Grasa: {log.body_fat_percentage}%
            </Text>
          )}
        </View>
      )}
    </Pressable>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/HistoryRow.tsx
git commit -m "feat(weight): HistoryRow — clickable row with date + diff + composition"
git push
```

---

### Task 10: `components/weight/PhotoCaptureSheet.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\PhotoCaptureSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/PhotoCaptureSheet.tsx
//
// Bottom sheet asking the user to pick photo type (front / side) and then
// launch the camera or photo library. The actual upload (to Supabase
// Storage) is handled by the parent's `onCapture` callback once
// expo-image-picker returns a result.

import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, ImageIcon, X } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import type { PhotoType } from '../../types'

type Props = {
  visible: boolean
  uploading: boolean
  onClose: () => void
  onCapture: (type: PhotoType, asset: ImagePicker.ImagePickerAsset) => void
}

export function PhotoCaptureSheet({ visible, uploading, onClose, onCapture }: Props) {
  const [selectedType, setSelectedType] = useState<PhotoType>('front')

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      onCapture(selectedType, result.assets[0])
    }
  }

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      onCapture(selectedType, result.assets[0])
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="flex-row items-center justify-between mb-5">
        <Text className="font-serif text-xl font-light">Nueva foto</Text>
        <Pressable
          onPress={onClose}
          disabled={uploading}
          className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center"
        >
          <X size={20} color="#0a0a0a" />
        </Pressable>
      </View>

      {/* Type picker */}
      <View className="mb-5">
        <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">Tipo de foto</Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setSelectedType('front')}
            className={`flex-1 py-4 rounded-xl border items-center ${
              selectedType === 'front' ? 'border-signal bg-signal-soft' : 'border-ink-7'
            }`}
          >
            <Text className="text-2xl mb-1">🧍</Text>
            <Text className={`text-sm font-medium ${selectedType === 'front' ? 'text-signal' : 'text-ink-4'}`}>
              Frontal
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedType('side')}
            className={`flex-1 py-4 rounded-xl border items-center ${
              selectedType === 'side' ? 'border-signal bg-signal-soft' : 'border-ink-7'
            }`}
          >
            <Text className="text-2xl mb-1">🚶</Text>
            <Text className={`text-sm font-medium ${selectedType === 'side' ? 'text-signal' : 'text-ink-4'}`}>
              Lateral
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Capture options */}
      <View className="gap-3">
        <Pressable
          onPress={launchCamera}
          disabled={uploading}
          className="py-4 rounded-full bg-ink flex-row items-center justify-center gap-2"
        >
          <Camera size={16} color="#fafaf7" />
          <Text className="text-paper text-sm font-medium">
            {uploading ? 'Subiendo...' : 'Tomar foto'}
          </Text>
        </Pressable>
        <Pressable
          onPress={launchLibrary}
          disabled={uploading}
          className="py-4 rounded-full border border-ink-7 flex-row items-center justify-center gap-2"
        >
          <ImageIcon size={16} color="#0a0a0a" />
          <Text className="text-ink text-sm font-medium">Elegir de galería</Text>
        </Pressable>
      </View>

      <Text className="text-[11px] text-ink-5 text-center mt-4">
        Las fotos son privadas y solo tú puedes verlas.
      </Text>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/PhotoCaptureSheet.tsx
git commit -m "feat(weight): PhotoCaptureSheet — pick type + launch camera/library"
git push
```

---

### Task 11: `components/weight/PhotoGallery.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\PhotoGallery.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/PhotoGallery.tsx
//
// 2-column grid showing up to 4 photos with overlay metadata + a "Comparar"
// button when ≥2 photos exist. Tapping a photo opens the parent's viewer.

import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Camera, ImageIcon } from 'lucide-react-native'
import { parseLocalDate } from '../../lib/utils'
import type { ProgressPhoto } from '../../types'

type Props = {
  photos: ProgressPhoto[]
  onAddPhoto: () => void
  onPhotoPress: (photo: ProgressPhoto) => void
  onCompare: () => void
}

export function PhotoGallery({ photos, onAddPhoto, onPhotoPress, onCompare }: Props) {
  if (photos.length === 0) {
    return (
      <Pressable
        onPress={onAddPhoto}
        className="bg-white border border-dashed border-ink-6 rounded-xl p-8 items-center"
      >
        <Camera size={36} color="#a3a3a3" />
        <Text className="text-sm text-ink-4 mt-3">Toma tu primera foto de progreso</Text>
        <Text className="text-xs text-ink-5 mt-1">Frontal o lateral</Text>
      </Pressable>
    )
  }

  return (
    <View className="gap-3">
      {/* Grid */}
      <View className="flex-row flex-wrap gap-3">
        {photos.slice(0, 4).map((photo) => {
          const dateLabel = parseLocalDate(photo.date).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
          })
          return (
            <Pressable
              key={photo.id}
              onPress={() => onPhotoPress(photo)}
              style={{ width: '48%', aspectRatio: 3 / 4 }}
              className="rounded-xl overflow-hidden bg-ink-7 relative"
            >
              <Image source={{ uri: photo.photo_url }} style={{ flex: 1 }} contentFit="cover" />
              <View className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between">
                <View className="bg-ink/50 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] text-paper" style={{ fontFamily: 'ui-monospace' }}>
                    {photo.photo_type === 'front' ? 'Frontal' : 'Lateral'}
                  </Text>
                </View>
                <Text className="text-[10px] text-paper/70" style={{ fontFamily: 'ui-monospace' }}>
                  {dateLabel}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Compare button */}
      {photos.length >= 2 && (
        <Pressable
          onPress={onCompare}
          className="py-3 rounded-xl border border-ink-7 flex-row items-center justify-center gap-2"
        >
          <ImageIcon size={16} color="#0a0a0a" />
          <Text className="text-sm font-medium text-ink">Comparar primera vs última</Text>
        </Pressable>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/PhotoGallery.tsx
git commit -m "feat(weight): PhotoGallery — 2-col grid + compare button (expo-image)"
git push
```

---

### Task 12: `components/weight/PhotoCompareModal.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\weight\PhotoCompareModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/weight/PhotoCompareModal.tsx
//
// Full-screen side-by-side comparison: two photos vertically split,
// each labeled with its date. Used to show before/after.

import { Modal, View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { parseLocalDate } from '../../lib/utils'
import type { ProgressPhoto } from '../../types'

type Props = {
  visible: boolean
  onClose: () => void
  before: ProgressPhoto | null
  after: ProgressPhoto | null
}

export function PhotoCompareModal({ visible, onClose, before, after }: Props) {
  if (!before || !after) return null

  const dateLabel = (p: ProgressPhoto) =>
    parseLocalDate(p.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink">
        {/* Header */}
        <View className="absolute top-12 left-4 right-4 flex-row items-center justify-between z-10">
          <Text className="text-paper font-serif text-lg">Comparación</Text>
          <Pressable onPress={onClose} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
            <X size={20} color="#fafaf7" />
          </Pressable>
        </View>

        {/* Side-by-side */}
        <View className="flex-1 flex-row mt-16">
          <View className="flex-1 relative">
            <Image source={{ uri: before.photo_url }} style={{ flex: 1 }} contentFit="contain" />
            <View className="absolute bottom-4 left-4 bg-ink/70 px-3 py-1.5 rounded-full">
              <Text className="text-paper text-xs" style={{ fontFamily: 'ui-monospace' }}>
                {dateLabel(before)}
              </Text>
            </View>
          </View>
          <View className="w-px bg-paper/30" />
          <View className="flex-1 relative">
            <Image source={{ uri: after.photo_url }} style={{ flex: 1 }} contentFit="contain" />
            <View className="absolute bottom-4 right-4 bg-signal px-3 py-1.5 rounded-full">
              <Text className="text-paper text-xs" style={{ fontFamily: 'ui-monospace' }}>
                {dateLabel(after)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add components/weight/PhotoCompareModal.tsx
git commit -m "feat(weight): PhotoCompareModal — full-screen side-by-side comparison"
git push
```

---

### Task 13: `app/(app)/weight/index.tsx` — main screen

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\weight\index.tsx`

- [ ] **Step 1: Create the directory + main screen**

```bash
mkdir -p 'app/(app)/weight'
```

```tsx
// app/(app)/weight/index.tsx
//
// Main weight screen: hero stat, comparison selector, 4 metric cards with
// RangeMeter, MetricChart for the selected metric, history list, photo
// gallery. Reachable from the dashboard's "Peso Actual" card.

import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Activity, ArrowLeft, ChevronRight, ChevronDown, Camera, Trash2 } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { calculateBMI, type MetricKey } from '../../../lib/weight'
import { USER_PROFILE } from '../../../lib/constants'
import { parseLocalDate } from '../../../lib/utils'
import { HeroStat } from '../../../components/weight/HeroStat'
import { MetricStatCard } from '../../../components/weight/MetricStatCard'
import { MetricChart } from '../../../components/weight/MetricChart'
import { CompareSelector } from '../../../components/weight/CompareSelector'
import { WeightFormSheet } from '../../../components/weight/WeightFormSheet'
import { HistoryRow } from '../../../components/weight/HistoryRow'
import { PhotoGallery } from '../../../components/weight/PhotoGallery'
import { PhotoCaptureSheet } from '../../../components/weight/PhotoCaptureSheet'
import { PhotoCompareModal } from '../../../components/weight/PhotoCompareModal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { WeightLog, ProgressPhoto, PhotoType } from '../../../types'

export default function WeightScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])

  const [compareToLogId, setCompareToLogId] = useState<string | null>(null)
  const [showCompareSelector, setShowCompareSelector] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight')

  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null)
  const [savingLog, setSavingLog] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [showCaptureSheet, setShowCaptureSheet] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)

  useEffect(() => {
    if (user) load()
  }, [user])

  // Default comparison = 2nd-most-recent log
  useEffect(() => {
    const stillExists = compareToLogId && logs.some((l) => l.id === compareToLogId)
    if (!stillExists && logs.length >= 2) {
      setCompareToLogId(logs[1].id)
    } else if (logs.length < 2 && compareToLogId) {
      setCompareToLogId(null)
    }
  }, [logs, compareToLogId])

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data: weightData } = await supabase
      .from('weight_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(90)
    setLogs((weightData as WeightLog[] | null) ?? [])

    const { data: photoData } = await (supabase.from('progress_photos') as any)
      .select('*')
      .order('date', { ascending: false })
      .limit(50)

    if (photoData && photoData.length > 0) {
      const withUrls = await Promise.all(
        (photoData as ProgressPhoto[]).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from('progress-photos')
            .createSignedUrl(p.photo_url, 3600)
          return { ...p, photo_url: signed?.signedUrl ?? p.photo_url }
        })
      )
      setPhotos(withUrls)
    } else {
      setPhotos([])
    }
    setLoading(false)
  }

  // ---------- Save / delete weight log ----------

  const saveLog = async (data: {
    date: string
    weight_kg: number
    muscle_mass_kg: number | null
    body_fat_mass_kg: number | null
    body_fat_percentage: number | null
    notes: string | null
  }) => {
    if (!user) return
    setSavingLog(true)
    try {
      if (editingLog) {
        await (supabase.from('weight_logs') as any).update(data).eq('id', editingLog.id)
        showToast('Registro actualizado')
      } else {
        await (supabase.from('weight_logs') as any).insert({ ...data, user_id: user.id })
        showToast('Composición corporal registrada')
      }
      await load()
      setShowForm(false)
      setEditingLog(null)
    } catch {
      showToast('Error al guardar')
    }
    setSavingLog(false)
  }

  const deleteLog = async () => {
    if (!editingLog) return
    setConfirmDeleteId(null)
    try {
      await supabase.from('weight_logs').delete().eq('id', editingLog.id)
      showToast('Registro eliminado')
      setShowForm(false)
      setEditingLog(null)
      await load()
    } catch {
      showToast('Error al eliminar')
    }
  }

  // ---------- Photo upload ----------

  const handleCapture = async (type: PhotoType, asset: ImagePicker.ImagePickerAsset) => {
    if (!user) return
    setUploadingPhoto(true)
    try {
      // Upload to Supabase Storage
      const today = new Date().toISOString().split('T')[0]
      const fileName = `${user.id}/${today}_${type}_${Date.now()}.jpg`
      // expo-image-picker returns a file:// URI; convert to blob via fetch
      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      // Insert metadata row
      await (supabase.from('progress_photos') as any).insert({
        user_id: user.id,
        date: today,
        photo_type: type,
        photo_url: fileName,
      })

      await load()
      setShowCaptureSheet(false)
      showToast(`Foto ${type === 'front' ? 'frontal' : 'lateral'} guardada`)
    } catch {
      showToast('Error al subir foto')
    }
    setUploadingPhoto(false)
  }

  // ---------- Computed: deltas + chart data ----------

  const latestLog = logs[0]
  const latestWeight = latestLog?.weight_kg ?? USER_PROFILE.initialWeight
  const latestBMI = calculateBMI(latestWeight)
  const compareToLog = compareToLogId ? logs.find((l) => l.id === compareToLogId) : undefined

  const heroDelta = compareToLog ? latestWeight - compareToLog.weight_kg : null
  const bmiDelta = compareToLog ? latestBMI - calculateBMI(compareToLog.weight_kg) : undefined
  const fatPctDelta =
    compareToLog?.body_fat_percentage != null && latestLog?.body_fat_percentage != null
      ? latestLog.body_fat_percentage - compareToLog.body_fat_percentage
      : undefined
  const muscleDelta =
    compareToLog?.muscle_mass_kg != null && latestLog?.muscle_mass_kg != null
      ? latestLog.muscle_mass_kg - compareToLog.muscle_mass_kg
      : undefined
  const fatMassDelta =
    compareToLog?.body_fat_mass_kg != null && latestLog?.body_fat_mass_kg != null
      ? latestLog.body_fat_mass_kg - compareToLog.body_fat_mass_kg
      : undefined

  const toggleMetric = (m: MetricKey) =>
    setSelectedMetric((prev) => (prev === m ? 'weight' : m))

  // Chart data per metric (full history, ascending order for chart)
  const metricMeta: Record<
    MetricKey,
    { label: string; unit: string; color: string; pick: (l: WeightLog) => number | undefined }
  > = {
    weight: { label: 'Peso', unit: 'kg', color: '#ff5a1f', pick: (l) => l.weight_kg },
    bmi: { label: 'IMC', unit: '', color: '#ff5a1f', pick: (l) => calculateBMI(l.weight_kg) },
    bf_pct: { label: '% Grasa', unit: '%', color: '#c13b5a', pick: (l) => l.body_fat_percentage },
    muscle: { label: 'Masa Muscular', unit: 'kg', color: '#4a7c3a', pick: (l) => l.muscle_mass_kg },
    fat_mass: { label: 'Masa Grasa', unit: 'kg', color: '#d4a017', pick: (l) => l.body_fat_mass_kg },
  }
  const activeMetric = metricMeta[selectedMetric]
  const chartData = [...logs]
    .reverse()
    .map((l) => ({ value: activeMetric.pick(l), date: l.date }))
    .filter((d): d is { value: number; date: string } => typeof d.value === 'number')
  const latestMetricValue = logs.map(activeMetric.pick).find((v): v is number => typeof v === 'number')

  // Compare-mode photo selection: same type front-front or side-side, oldest vs newest
  const frontPhotos = photos.filter((p) => p.photo_type === 'front')
  const sidePhotos = photos.filter((p) => p.photo_type === 'side')
  const compareSet = frontPhotos.length >= 2 ? frontPhotos : sidePhotos.length >= 2 ? sidePhotos : photos
  const before = compareSet[compareSet.length - 1] ?? null
  const after = compareSet[0] ?? null

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
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
            Composición Corporal
          </Text>
          <View style={{ width: 34 }} />
        </View>

        <HeroStat weightKg={latestWeight} deltaKg={heroDelta} />

        {/* Compare against */}
        {logs.length >= 2 && (
          <View className="px-5 mt-5 flex-row items-center gap-2">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest" style={{ fontFamily: 'ui-monospace' }}>
              Comparar contra
            </Text>
            <Pressable
              onPress={() => setShowCompareSelector(true)}
              className="ml-auto px-3 py-1.5 rounded-md bg-white border border-ink-7 flex-row items-center gap-1"
            >
              <Text className="text-[11px] text-ink" style={{ fontFamily: 'ui-monospace' }}>
                {compareToLog
                  ? `${parseLocalDate(compareToLog.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })} · ${compareToLog.weight_kg} kg`
                  : 'Elegir'}
              </Text>
              <ChevronDown size={14} color="#737373" />
            </Pressable>
          </View>
        )}

        {/* 4 metric cards */}
        <View className="px-5 mt-3 flex-row flex-wrap gap-3">
          <View style={{ width: '48%' }}>
            <MetricStatCard
              metricKey="bmi"
              selected={selectedMetric === 'bmi'}
              onSelect={toggleMetric}
              label="IMC"
              value={latestLog ? latestBMI.toFixed(1) : '--'}
              numericValue={latestLog ? latestBMI : undefined}
              delta={bmiDelta}
              deltaUnit=""
              deltaLowerIsBetter
            />
          </View>
          <View style={{ width: '48%' }}>
            <MetricStatCard
              metricKey="bf_pct"
              selected={selectedMetric === 'bf_pct'}
              onSelect={toggleMetric}
              label="% Grasa"
              value={latestLog?.body_fat_percentage != null ? latestLog.body_fat_percentage.toFixed(1) : '--'}
              numericValue={latestLog?.body_fat_percentage ?? undefined}
              unit="%"
              delta={fatPctDelta}
              deltaUnit="%"
              deltaLowerIsBetter
            />
          </View>
          <View style={{ width: '48%' }}>
            <MetricStatCard
              metricKey="muscle"
              selected={selectedMetric === 'muscle'}
              onSelect={toggleMetric}
              label="Masa Muscular"
              value={latestLog?.muscle_mass_kg != null ? latestLog.muscle_mass_kg.toFixed(1) : '--'}
              numericValue={latestLog?.muscle_mass_kg ?? undefined}
              unit="kg"
              delta={muscleDelta}
              deltaUnit="kg"
              deltaLowerIsBetter={false}
            />
          </View>
          <View style={{ width: '48%' }}>
            <MetricStatCard
              metricKey="fat_mass"
              selected={selectedMetric === 'fat_mass'}
              onSelect={toggleMetric}
              label="Masa Grasa"
              value={latestLog?.body_fat_mass_kg != null ? latestLog.body_fat_mass_kg.toFixed(1) : '--'}
              numericValue={latestLog?.body_fat_mass_kg ?? undefined}
              unit="kg"
              delta={fatMassDelta}
              deltaUnit="kg"
              deltaLowerIsBetter
            />
          </View>
        </View>

        {/* Chart */}
        <View className="mx-5 mt-6 bg-white border border-ink-7 rounded-2xl overflow-hidden">
          <View className="p-4">
            <Text
              className="text-[10px] text-ink-4 uppercase tracking-widest"
              style={{ fontFamily: 'ui-monospace' }}
            >
              {activeMetric.label} · actual
            </Text>
            <View className="flex-row items-baseline gap-1 mt-1">
              <Text className="font-serif text-[22px] font-light text-signal">
                {latestMetricValue != null ? latestMetricValue.toFixed(1) : '--'}
              </Text>
              {activeMetric.unit && (
                <Text className="text-sm text-ink-4 ml-1">{activeMetric.unit}</Text>
              )}
            </View>
          </View>
          <View className="px-3 pb-4">
            {chartData.length === 0 ? (
              <View className="h-[180px] items-center justify-center">
                <Text className="text-xs text-ink-4">
                  Sin registros de {activeMetric.label.toLowerCase()}
                </Text>
              </View>
            ) : (
              <MetricChart data={chartData} unit={activeMetric.unit} color={activeMetric.color} />
            )}
          </View>
        </View>

        {/* Quick log row */}
        <Pressable
          onPress={() => {
            setEditingLog(null)
            setShowForm(true)
          }}
          className="mx-5 mt-4 bg-ink rounded-[14px] p-4 flex-row items-center gap-3"
        >
          <View className="w-9 h-9 bg-signal rounded-[10px] items-center justify-center">
            <Activity size={16} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-paper text-[13px] font-medium">Registra hoy</Text>
            <Text className="text-ink-5 text-[11px] mt-0.5">Peso y composición corporal</Text>
          </View>
          <ChevronRight size={16} color="#fafaf7" />
        </Pressable>

        {/* History */}
        <View className="px-5 mt-6">
          <Text
            className="text-[10px] text-ink-4 uppercase tracking-widest mb-3"
            style={{ fontFamily: 'ui-monospace' }}
          >
            Historial reciente
          </Text>
          {logs.length > 0 ? (
            <View className="bg-white border border-ink-7 rounded-xl overflow-hidden">
              {logs.slice(0, 7).map((log, idx) => {
                const prev = logs[idx + 1]
                const diff = prev ? log.weight_kg - prev.weight_kg : 0
                return (
                  <HistoryRow
                    key={log.id}
                    log={log}
                    diff={diff}
                    onPress={() => {
                      setEditingLog(log)
                      setShowForm(true)
                    }}
                  />
                )
              })}
            </View>
          ) : (
            <View className="bg-white border border-ink-7 rounded-xl p-8 items-center">
              <Text className="text-sm text-ink-4">Sin registros aún</Text>
            </View>
          )}
        </View>

        {/* Photos */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-[10px] text-ink-4 uppercase tracking-widest"
              style={{ fontFamily: 'ui-monospace' }}
            >
              Fotos de progreso
            </Text>
            <Pressable onPress={() => setShowCaptureSheet(true)} className="flex-row items-center gap-1.5">
              <Camera size={14} color="#ff5a1f" />
              <Text className="text-xs text-signal font-medium">Añadir</Text>
            </Pressable>
          </View>
          <PhotoGallery
            photos={photos}
            onAddPhoto={() => setShowCaptureSheet(true)}
            onPhotoPress={(p) => {
              // Tapping single photo → just open capture sheet for now (full-screen
              // viewer is a polish-task future addition).
              setShowCompareModal(true)
            }}
            onCompare={() => setShowCompareModal(true)}
          />
        </View>
      </ScrollView>

      {/* Sheets */}
      <CompareSelector
        visible={showCompareSelector}
        onClose={() => setShowCompareSelector(false)}
        logs={logs.slice(1)} // exclude the latest (it IS the "current")
        selectedLogId={compareToLogId}
        onSelect={setCompareToLogId}
      />

      <WeightFormSheet
        visible={showForm}
        editingLog={editingLog}
        saving={savingLog}
        onClose={() => {
          setShowForm(false)
          setEditingLog(null)
        }}
        onSave={saveLog}
        onDelete={editingLog ? () => setConfirmDeleteId(editingLog.id) : undefined}
      />

      <ConfirmDialog
        visible={!!confirmDeleteId}
        title="¿Eliminar registro?"
        body="Esta acción no se puede deshacer."
        icon={<Trash2 size={28} color="#c13b5a" />}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={deleteLog}
      />

      <PhotoCaptureSheet
        visible={showCaptureSheet}
        uploading={uploadingPhoto}
        onClose={() => setShowCaptureSheet(false)}
        onCapture={handleCapture}
      />

      <PhotoCompareModal
        visible={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        before={before}
        after={after}
      />
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 3: Commit + push**

```bash
git add 'app/(app)/weight/index.tsx'
git commit -m "feat(weight): main screen — hero + metric cards + chart + history + photos"
git push
```

---

### Task 14: Hide weight from tab bar + dashboard link

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\_layout.tsx`
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\dashboard.tsx`

- [ ] **Step 1: Add hidden screen entry to tab layout**

Open `app/(app)/_layout.tsx`. After the existing `<Tabs.Screen name="habits/progress" options={{ href: null }} />` block (added in Plan 2), add another:

```tsx
<Tabs.Screen
  name="weight/index"
  options={{
    href: null,
  }}
/>
```

- [ ] **Step 2: Make the dashboard's "PESO ACTUAL" card tappable**

Open `app/(app)/dashboard.tsx`. The current code has:

```tsx
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
```

Wrap the `<Card>` in a `<Pressable>` that navigates to `/weight`. Add the import for `Pressable` if missing, and `Link` from `expo-router`. Replace the block above with:

```tsx
<View className="px-5">
  <Link href="/(app)/weight" asChild>
    <Pressable>
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest">PESO ACTUAL</Text>
          <ChevronRight size={14} color="#a3a3a3" />
        </View>
        {loading ? (
          <Text className="text-sm text-ink-4 mt-2">Cargando...</Text>
        ) : latestWeight ? (
          <View className="flex-row items-baseline gap-2 mt-2">
            <Text className="font-serif text-5xl font-light text-signal">
              {latestWeight.weight_kg.toFixed(1)}
            </Text>
            <Text className="text-sm text-ink-4">kg</Text>
          </View>
        ) : (
          <Text className="text-sm text-ink-4 mt-2">Sin registros aún</Text>
        )}
      </Card>
    </Pressable>
  </Link>
</View>
```

Add the imports at the top (if not already present): `Pressable` from `react-native`, `Link` from `expo-router`, `ChevronRight` from `lucide-react-native`.

If TS complains about the typed-routes path on the `Link href`, cast: `href={"/(app)/weight" as any}`.

- [ ] **Step 3: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit + push**

```bash
git add 'app/(app)/_layout.tsx' 'app/(app)/dashboard.tsx'
git commit -m "feat(weight): hide weight from tabs + tappable dashboard card to /weight"
git push
```

---

### Task 15: Smoke-test in Expo Go

**Files:**
- (No code changes — verification task; user task)

- [ ] **Step 1: Start the dev server**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo start --clear
```

Reload Expo Go on iPhone. Bundle takes 30-90s on first reload due to many new files.

- [ ] **Step 2: Navigate dashboard → weight**

Log in. The "PESO ACTUAL" card on the dashboard should now have a chevron and be tappable. Tap it → opens the weight screen.

- [ ] **Step 3: Verify the hero + metric cards**

- Hero shows current weight in 88pt serif extralight orange
- Below, a green "↓ X.X kg" or red "↑ X.X kg" pill if you have ≥2 records
- "Comparar contra" row with a button showing the comparison record (date + kg) — tap it → bottom sheet with all past records, tap one → updates deltas
- 4 cards (IMC / %Grasa / Masa Muscular / Masa Grasa) in a 2-col grid — each shows value + delta + RangeMeter (3 colored segments + arrow + scale labels)
- Tap a card → 2px signal border appears, chart below switches to that metric. Tap again → deselects (back to weight chart)

- [ ] **Step 4: Verify the chart**

- Y-axis labels (3 ticks) on left, X-axis dates on bottom
- Filled area + line between points
- Tap a point → tooltip with value + date

- [ ] **Step 5: Add / edit / delete a record**

- Tap "Registra hoy" — bottom sheet form opens
- Tap the date row → native date picker opens. Pick today.
- Enter weight (e.g., 80.5) → "IMC calculado" preview appears below
- Optionally enter muscle / fat mass / body fat %
- Tap "Guardar" → toast appears, list refreshes
- Tap a row in the history → form opens in edit mode with values pre-filled, Eliminar button visible
- Tap Eliminar → ConfirmDialog → tap "Eliminar" → row removed

- [ ] **Step 6: Photo upload + compare**

- Tap "Añadir" in Fotos de progreso → capture sheet opens
- Pick "Frontal", tap "Tomar foto" — the first time, iOS asks for camera permission. Allow.
- Take or pick a photo → it uploads, gallery refreshes
- Repeat with another photo (different date or type)
- Tap "Comparar primera vs última" → full-screen side-by-side viewer

- [ ] **Step 7: Confirm tab bar still has 4 tabs only**

The bottom tab bar should still show only Hoy / Gym / Comida / Hábitos. Weight is reachable only via the dashboard card (and via direct deep-link, but no UI surfaces it as a tab).

---

## Self-Review Checklist

### 1. Spec coverage

- ✅ Hero stat (Task 6) + comparison delta (computed in Task 13)
- ✅ Comparison dropdown (Task 7)
- ✅ 4 metric cards with RangeMeter (Tasks 3, 4, 13)
- ✅ Interactive MetricChart (Task 5)
- ✅ Add/edit measurement form with date picker (Task 8)
- ✅ History rows clickable for edit, delete from modal (Tasks 9, 13)
- ✅ Photo upload (Tasks 10, 13)
- ✅ Photo gallery (Task 11)
- ✅ Compare-mode full-screen (Task 12)
- ✅ Reachable from dashboard (Task 14)
- ✅ Hidden from tab bar (Task 14)

### 2. Placeholder scan

No "TBD", "TODO", "implement later" found. The "polish-task future addition" comment in Task 13 step about single-photo viewer is a forward note, not a placeholder for this plan.

### 3. Type consistency

- `MetricKey` defined in `lib/weight.ts` (Task 2), used in Tasks 4, 13.
- `RangeMeterConfig`, `Zone`, `ZoneColor` defined in Task 2, used in Task 3.
- Form sheet `onSave` data shape declared in Task 8, matches what `saveLog` expects in Task 13.
- Photo capture callback `onCapture(type, asset)` declared in Task 10, matches `handleCapture` in Task 13.

No drift detected.

---

## Summary

| Task | What | LOC |
|---|---|---|
| 1 | Install deps + plugin config | ~10 |
| 2 | `lib/weight.ts` | ~80 |
| 3 | RangeMeter | ~75 |
| 4 | MetricStatCard | ~70 |
| 5 | MetricChart | ~150 |
| 6 | HeroStat | ~40 |
| 7 | CompareSelector | ~55 |
| 8 | WeightFormSheet | ~210 |
| 9 | HistoryRow | ~70 |
| 10 | PhotoCaptureSheet | ~110 |
| 11 | PhotoGallery | ~75 |
| 12 | PhotoCompareModal | ~55 |
| 13 | weight/index.tsx | ~330 |
| 14 | tab + dashboard link | ~30 |
| 15 | smoke test | 0 |

Total: ~1360 LOC across 15 tasks. ~3-4 days of subagent execution.
