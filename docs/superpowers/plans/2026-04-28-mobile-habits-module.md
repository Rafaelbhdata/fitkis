# FitKis Mobile Migration — Plan 2: Habits Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the patient habits module from `fitkis` web to `fitkis-mobile` (React Native / Expo) — full CRUD with daily check-in view (stats cards + habit rows + week dots + create/edit modal with template picker) plus an analytics screen (streaks + weekly trend chart + 30-day calendar + habit comparison chart) — preserving the Paper & Pulse design pixel-perfect.

**Architecture:** Two screens — `habits/index.tsx` (main day view) and `habits/progress.tsx` (analytics). Both depend on shared pure-function helpers (`lib/habits.ts`) for streak/completion math. Custom SVG charts via `react-native-svg` (no Recharts). A reusable `BottomSheet` component is introduced and used by the habit-form modal, delete-confirm, and habit-picker — replaces the web's fixed-position div sheets. Same Supabase queries (`habits` + `habit_logs` tables, RLS scoped to user).

**Tech Stack:** Existing Expo SDK 54 + Expo Router 5 + NativeWind 4 + react-native-svg + lucide-react-native. No new dependencies.

**Repos & paths:**
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (branch `master`)
- Reference (read-only): `C:\Users\Rafae\Projects\fitkis\app\(app)\habits\page.tsx` and `.../habits/progress/page.tsx`

**Spec reference:** `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

**Roadmap reference:** `docs/superpowers/plans/2026-04-27-roadmap-plans-2-to-7.md` (Plan 2 section)

---

## Decisions Resolved (open questions from the roadmap)

1. **Bottom sheet implementation.** Use React Native's built-in `<Modal animationType="slide" transparent>` + absolutely-positioned content `View`. No new library, no reanimated complexity. The slide-up animation is free and works on both iOS and Android. If gesture polish (swipe-to-dismiss) is requested later, swap to `@gorhom/bottom-sheet` as a Plan 7 polish task.

2. **Week-day chip selector for `weekly_frequency`.** Not needed. The web stores only a number (e.g., "4 days/week") — the user hits it on whatever days they want. Same UX on mobile: a single numeric input.

3. **Date navigation in habits/index.** The web has a `navigateDate` function but it's never called in the JSX (dead code). Mobile drops the unused state and always shows today.

---

## File Structure

### New files

```
fitkis-mobile/
├── app/
│   └── (app)/
│       ├── habits/
│       │   ├── index.tsx          ← replaces WIP placeholder
│       │   └── progress.tsx       ← new
│       └── _layout.tsx            ← modified to hide /habits/progress from tabs
├── components/
│   ├── ui/
│   │   ├── BottomSheet.tsx        ← reusable
│   │   └── ConfirmDialog.tsx      ← reusable
│   └── habits/
│       ├── WeekDots.tsx           ← 7-day mini chart
│       ├── HabitRow.tsx           ← single habit list item
│       ├── HabitFormSheet.tsx     ← create/edit form with template picker
│       ├── HabitPickerSheet.tsx   ← progress page habit selector
│       ├── WeeklyTrendChart.tsx   ← 12-week area chart (custom SVG)
│       ├── MonthCalendar.tsx      ← 30-day grid
│       └── HabitComparisonChart.tsx ← horizontal bar chart (custom SVG)
└── lib/
    └── habits.ts                   ← pure helpers: getStreak, get7DayData, getWeeklyData, etc.
```

### Modified files

- `app/(app)/_layout.tsx` — add `<Tabs.Screen name="habits/progress" options={{ href: null }} />` to keep the progress route accessible via navigation but NOT visible as a tab.

### File responsibilities (one-liner each)

| File | Responsibility |
|---|---|
| `lib/habits.ts` | Pure date/log math: streak, 7-day data, weekly data, 30-day calendar |
| `components/ui/BottomSheet.tsx` | Slide-up modal sheet with backdrop + close on tap-outside |
| `components/ui/ConfirmDialog.tsx` | Centered confirmation modal (icon + title + body + Cancel/Confirm) |
| `components/habits/WeekDots.tsx` | 7 small squares showing past 7 days completion |
| `components/habits/HabitRow.tsx` | Habit row: checkbox/qty controls + name + week dots + edit/delete buttons |
| `components/habits/HabitFormSheet.tsx` | Create/edit habit form (template picker + name + type + target/unit) |
| `components/habits/HabitPickerSheet.tsx` | Sheet listing all habits to pick which one progress page shows |
| `components/habits/WeeklyTrendChart.tsx` | 12-week area chart of completion % (axis + tooltip + dots) |
| `components/habits/MonthCalendar.tsx` | 30-day grid showing completion per day |
| `components/habits/HabitComparisonChart.tsx` | Horizontal bar chart comparing 90-day completion across habits |
| `app/(app)/habits/index.tsx` | Day view orchestrating stats cards + HabitRow list + add button + form sheet + delete confirm |
| `app/(app)/habits/progress.tsx` | Analytics view orchestrating habit picker + stats grid + weekly trend + calendar + comparison + streaks ranking |

---

# TASKS

### Task 1: `lib/habits.ts` — pure helpers

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\lib\habits.ts`

- [ ] **Step 1: Confirm the source helpers in web**

The web has these calculations inline in `app/(app)/habits/page.tsx` (lines 283-325) and `app/(app)/habits/progress/page.tsx` (lines 92-228). We extract them into one shared module.

- [ ] **Step 2: Create `lib/habits.ts`**

```ts
// lib/habits.ts
//
// Pure-function helpers for habit analytics. No DOM, no Supabase, no React.
// Both habits/index.tsx and habits/progress.tsx use these.

import { formatDateISO } from './utils'
import type { HabitLog } from '../types'

// Return Set of date strings (YYYY-MM-DD) where the habit was "completed"
// (either daily_check completed=true OR quantity/freq value > 0).
function completedDates(habitId: string, logs: HabitLog[]): Set<string> {
  const dates = new Set<string>()
  for (const log of logs) {
    if (log.habit_id !== habitId) continue
    if (log.completed || (typeof log.value === 'number' && log.value > 0)) {
      dates.add(log.date)
    }
  }
  return dates
}

// Current streak: consecutive completed days ending today (or yesterday if today
// hasn't been logged). Mirrors web's getStreak in habits/page.tsx.
export function getStreak(habitId: string, logs: HabitLog[], todayStr: string): number {
  const dates = completedDates(habitId, logs)
  let streak = 0
  const today = new Date(todayStr + 'T12:00:00')
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = formatDateISO(d)
    if (dates.has(ds)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

// Best (longest) streak in the supplied log range. Mirrors progress page's
// calculateStreaks (best portion).
export function getBestStreak(habitId: string, logs: HabitLog[]): number {
  const dates = Array.from(completedDates(habitId, logs)).sort()
  let best = 0
  let temp = 0
  let prev: Date | null = null
  for (const ds of dates) {
    const d = new Date(ds + 'T12:00:00')
    if (prev) {
      const diff = Math.round((d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 1) temp++
      else {
        best = Math.max(best, temp)
        temp = 1
      }
    } else {
      temp = 1
    }
    prev = d
  }
  return Math.max(best, temp)
}

// Returns 7 numbers (0 or 1) for the past 7 days (oldest first, today last).
export function get7DayData(habitId: string, logs: HabitLog[]): number[] {
  const dates = completedDates(habitId, logs)
  const today = new Date()
  const out: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(dates.has(formatDateISO(d)) ? 1 : 0)
  }
  return out
}

// Number of completed days in the past 7 (sum of get7DayData).
export function getWeekCompletions(habitId: string, logs: HabitLog[]): number {
  return get7DayData(habitId, logs).filter(Boolean).length
}

export type WeekData = {
  week: string         // ISO date of week start
  weekLabel: string    // "21 abr" formatted
  completionRate: number  // 0..100
  totalDays: number
  completedDays: number
}

// 12 weeks of completion %. Mirrors progress page's getWeeklyData.
export function getWeeklyData(habitId: string, logs: HabitLog[], todayStr: string): WeekData[] {
  const dates = completedDates(habitId, logs)
  const out: WeekData[] = []
  const today = new Date(todayStr + 'T12:00:00')
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (w * 7) - today.getDay())
    let total = 0
    let completed = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      const ds = formatDateISO(day)
      if (ds > todayStr) continue
      total++
      if (dates.has(ds)) completed++
    }
    out.push({
      week: formatDateISO(weekStart),
      weekLabel: weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalDays: total,
      completedDays: completed,
    })
  }
  return out
}

export type CalendarDay = {
  date: string
  dayNum: number
  completed: boolean
  isToday: boolean
  isWeekend: boolean
}

// 30 days ending today (oldest first).
export function get30DayCalendar(habitId: string, logs: HabitLog[]): CalendarDay[] {
  const dates = completedDates(habitId, logs)
  const today = new Date()
  const todayStr = formatDateISO(today)
  const out: CalendarDay[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = formatDateISO(d)
    out.push({
      date: ds,
      dayNum: d.getDate(),
      completed: dates.has(ds),
      isToday: ds === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }
  return out
}

// Overall completion rate (0..100) over the last N days.
export function getCompletionRate(habitId: string, logs: HabitLog[], days: number): number {
  const dates = completedDates(habitId, logs)
  return Math.round((dates.size / days) * 100)
}
```

- [ ] **Step 3: Verify TS**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit + push**

```bash
git add lib/habits.ts
git commit -m "feat(habits): pure-function helpers (streak, weekly, calendar, completion)"
git push
```

---

### Task 2: `components/ui/BottomSheet.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\BottomSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/BottomSheet.tsx
//
// Slide-up sheet from bottom of screen, with backdrop. Tap-outside or
// `onClose` to dismiss. Uses RN's built-in <Modal animationType="slide"
// transparent> — no extra deps. The Pressable backdrop closes the sheet;
// the inner content is rendered above it and absorbs presses (KeyboardAvoiding
// is opt-in via `keyboardAvoiding` prop for sheets with inputs).

import { Modal, Pressable, View, KeyboardAvoidingView, Platform } from 'react-native'

type Props = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  keyboardAvoiding?: boolean
}

export function BottomSheet({ visible, onClose, children, keyboardAvoiding = false }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-ink/40 justify-end"
      >
        {/* Pressable here absorbs presses on the sheet itself so they don't bubble to the backdrop */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          {keyboardAvoiding ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View className="bg-paper rounded-t-[24px] p-5 max-h-[90%]">
                <View className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />
                {children}
              </View>
            </KeyboardAvoidingView>
          ) : (
            <View className="bg-paper rounded-t-[24px] p-5 max-h-[90%]">
              <View className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />
              {children}
            </View>
          )}
        </Pressable>
      </Pressable>
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
git add components/ui/BottomSheet.tsx
git commit -m "feat(ui): BottomSheet — slide-up modal with backdrop and grab handle"
git push
```

---

### Task 3: `components/ui/ConfirmDialog.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\ui\ConfirmDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/ConfirmDialog.tsx
//
// Centered confirmation modal: icon + title + body + Cancel/Confirm buttons.
// Used for destructive actions (delete habit, delete weight log, etc.).

import { Modal, Pressable, View, Text } from 'react-native'

type Props = {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  body?: string
  icon?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export function ConfirmDialog({
  visible,
  onCancel,
  onConfirm,
  title,
  body,
  icon,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 bg-ink/40 items-center justify-center px-5">
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full">
          <View className="bg-white rounded-2xl p-5 items-center">
            {icon && (
              <View className={`w-14 h-14 mb-4 rounded-2xl items-center justify-center ${destructive ? 'bg-berry-soft' : 'bg-paper-2'}`}>
                {icon}
              </View>
            )}
            <Text className="font-serif text-xl font-light mb-2 text-center">{title}</Text>
            {body && <Text className="text-sm text-ink-4 mb-5 text-center">{body}</Text>}
            <View className="flex-row gap-3 w-full">
              <Pressable
                onPress={onCancel}
                className="flex-1 py-3 rounded-xl border border-ink-7 items-center"
              >
                <Text className="text-sm font-medium text-ink">{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                className={`flex-1 py-3 rounded-xl items-center ${destructive ? 'bg-berry' : 'bg-ink'}`}
              >
                <Text className="text-sm font-medium text-paper">{confirmLabel}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
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
git add components/ui/ConfirmDialog.tsx
git commit -m "feat(ui): ConfirmDialog — centered modal for destructive confirmations"
git push
```

---

### Task 4: `components/habits/WeekDots.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\WeekDots.tsx`

- [ ] **Step 1: Create the directory + component**

```bash
mkdir -p components/habits
```

```tsx
// components/habits/WeekDots.tsx
//
// 7 small squares (one per past day, oldest first). Filled signal-color
// when completed; paper-3 when not. Used in HabitRow.

import { View } from 'react-native'

type Props = { values: number[] /* length 7, 0 or 1 */ }

export function WeekDots({ values }: Props) {
  return (
    <View className="flex-row gap-[3px]">
      {values.map((v, i) => (
        <View
          key={i}
          className={`w-[14px] h-[14px] rounded-[3px] ${v ? 'bg-signal' : 'bg-paper-3'}`}
        />
      ))}
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
git add components/habits/WeekDots.tsx
git commit -m "feat(habits): WeekDots — 7-square mini chart"
git push
```

---

### Task 5: `components/habits/HabitRow.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\HabitRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/habits/HabitRow.tsx
//
// Single habit row in the day-view list:
// - Left: round checkbox (or for 'quantity' type, a placeholder dot showing
//   "in progress" / "done")
// - Middle: name + WeekDots
// - Right: type-specific controls (qty +/- buttons OR week-count text)
// - Far right: edit + delete pencil/trash icons
//
// All actions are passed in as callbacks — this component is presentational
// only. Streak / week math is computed by the parent.

import { View, Text, Pressable } from 'react-native'
import { Plus, Minus, Check, Pencil, Trash2 } from 'lucide-react-native'
import type { Habit } from '../../types'
import { WeekDots } from './WeekDots'

export type HabitRowProps = {
  habit: Habit
  completed: boolean              // current day's completion state (or qty>=target)
  currentValue: number            // for quantity type
  weekData: number[]              // length 7
  weekCompletions: number
  onToggle: () => void            // for daily_check; for quantity, no-op
  onIncrement: () => void         // for quantity
  onDecrement: () => void         // for quantity
  onEdit: () => void
  onDelete: () => void
}

export function HabitRow({
  habit,
  completed,
  currentValue,
  weekData,
  weekCompletions,
  onToggle,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
}: HabitRowProps) {
  const weekTarget =
    habit.type === 'weekly_frequency' && habit.target_value ? habit.target_value : 7

  return (
    <View className="bg-white border border-ink-7 rounded-xl p-4 flex-row items-center gap-3">
      {/* Checkbox (always rendered; for quantity it's just status display) */}
      <Pressable
        onPress={habit.type !== 'quantity' ? onToggle : undefined}
        disabled={habit.type === 'quantity'}
        className={`w-6 h-6 rounded-full border-[1.5px] items-center justify-center ${
          completed ? 'bg-ink border-ink' : 'border-ink-6'
        }`}
      >
        {completed && <Check size={12} color="#fafaf7" strokeWidth={3} />}
      </Pressable>

      {/* Content */}
      <View className="flex-1">
        <Text className={`text-[13px] font-medium ${completed ? 'text-ink' : 'text-ink-3'}`}>
          {habit.name}
        </Text>
        <View className="mt-2">
          <WeekDots values={weekData} />
        </View>
      </View>

      {/* Quantity controls */}
      {habit.type === 'quantity' && (
        <View className="flex-row items-center gap-2 mr-2">
          <Pressable
            onPress={onDecrement}
            className="w-10 h-10 rounded-lg bg-paper-3 items-center justify-center"
          >
            <Minus size={18} color="#0a0a0a" />
          </Pressable>
          <Text className="w-8 text-center text-sm font-medium" style={{ fontFamily: 'ui-monospace' }}>
            {currentValue}
          </Text>
          <Pressable
            onPress={onIncrement}
            className="w-10 h-10 rounded-lg bg-signal items-center justify-center"
          >
            <Plus size={18} color="#ffffff" />
          </Pressable>
        </View>
      )}

      {/* Week count */}
      <Text className="text-[10px] text-ink-4 tracking-wide" style={{ fontFamily: 'ui-monospace' }}>
        {weekCompletions}/{weekTarget}
      </Text>

      {/* Edit/Delete */}
      <View className="flex-row items-center gap-1">
        <Pressable onPress={onEdit} className="p-1.5 rounded-lg">
          <Pencil size={14} color="#737373" />
        </Pressable>
        <Pressable onPress={onDelete} className="p-1.5 rounded-lg">
          <Trash2 size={14} color="#737373" />
        </Pressable>
      </View>
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
git add components/habits/HabitRow.tsx
git commit -m "feat(habits): HabitRow component (checkbox / qty controls / week dots / edit-delete)"
git push
```

---

### Task 6: `components/habits/HabitFormSheet.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\HabitFormSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/habits/HabitFormSheet.tsx
//
// Bottom-sheet form for creating or editing a habit.
// - Template picker (only when creating, only shows templates not already used)
// - Name (text input)
// - Type selector: 3 buttons (daily_check / quantity / weekly_frequency)
// - Conditional: target_value + unit (for quantity), days/week (for weekly_frequency)
// - Save button
//
// Pure presentational shell; persistence (insert/update on Supabase) lives
// in the parent screen.

import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Platform } from 'react-native'
import { Check, Plus, Target, X } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { HABIT_TEMPLATES, type HabitTemplate } from '../../lib/constants'
import type { Habit, HabitType } from '../../types'

type Props = {
  visible: boolean
  editingHabit: Habit | null
  existingNames: string[]              // to filter templates
  saving: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    type: HabitType
    target_value: number | null
    unit: string | null
  }) => void
}

export function HabitFormSheet({
  visible,
  editingHabit,
  existingNames,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<HabitType>('daily_check')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name)
      setType(editingHabit.type as HabitType)
      setTarget(editingHabit.target_value?.toString() ?? '')
      setUnit(editingHabit.unit ?? '')
    } else if (visible) {
      setName('')
      setType('daily_check')
      setTarget('')
      setUnit('')
    }
  }, [editingHabit, visible])

  const applyTemplate = (tpl: HabitTemplate) => {
    setName(tpl.name)
    setType(tpl.type)
    setTarget(tpl.target_value?.toString() ?? '')
    setUnit(tpl.unit ?? '')
  }

  const handleSave = () => {
    onSave({
      name,
      type,
      target_value: type !== 'daily_check' ? parseFloat(target) : null,
      unit: type === 'quantity' ? unit : null,
    })
  }

  const canSave = !!name && !saving && (type === 'daily_check' || !!target)

  // Filter templates already in use (only when creating)
  const lowerExisting = new Set(existingNames.map((n) => n.toLowerCase()))
  const availableTemplates = HABIT_TEMPLATES.filter((t) => !lowerExisting.has(t.name.toLowerCase()))
  const byCategory = availableTemplates.reduce<Record<string, HabitTemplate[]>>((acc, t) => {
    ;(acc[t.category] ||= []).push(t)
    return acc
  }, {})

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding>
      <View className="flex-row items-center justify-between mb-5">
        <Text className="font-serif text-xl font-light">
          {editingHabit ? 'Editar hábito' : 'Nuevo hábito'}
        </Text>
        <Pressable onPress={onClose} className="w-11 h-11 rounded-full bg-paper-3 items-center justify-center">
          <X size={20} color="#0a0a0a" />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Templates (create only) */}
        {!editingHabit && availableTemplates.length > 0 && (
          <View className="mb-5">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Elige uno rápido</Text>
            {Object.entries(byCategory).map(([cat, tpls]) => (
              <View key={cat} className="mb-3">
                <Text className="text-[10px] text-ink-4 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'ui-monospace' }}>
                  {cat}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {tpls.map((tpl) => (
                    <Pressable
                      key={tpl.name}
                      onPress={() => applyTemplate(tpl)}
                      className={`px-3 py-2 rounded-full border flex-row items-center gap-1.5 ${
                        name === tpl.name ? 'bg-ink border-ink' : 'bg-white border-ink-7'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${name === tpl.name ? 'text-paper' : 'text-ink'}`}>
                        {tpl.emoji} {tpl.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <View className="flex-row items-center gap-2 mt-1">
              <View className="flex-1 h-px bg-ink-7" />
              <Text className="text-[10px] text-ink-4 uppercase tracking-wider" style={{ fontFamily: 'ui-monospace' }}>
                o crea uno personalizado
              </Text>
              <View className="flex-1 h-px bg-ink-7" />
            </View>
          </View>
        )}

        {/* Name */}
        <View className="mb-4">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Meditación"
            placeholderTextColor="#a3a3a3"
            className="px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm text-ink"
          />
        </View>

        {/* Type selector */}
        <View className="mb-4">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Tipo de seguimiento</Text>
          <View className="flex-row gap-2">
            {(
              [
                { t: 'daily_check' as HabitType, label: 'Sí/No', Icon: Check },
                { t: 'quantity' as HabitType, label: 'Cantidad', Icon: Plus },
                { t: 'weekly_frequency' as HabitType, label: 'Días/sem', Icon: Target },
              ]
            ).map(({ t, label, Icon }) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                className={`flex-1 p-3 rounded-xl items-center ${
                  type === t ? 'bg-ink' : 'bg-paper-3 border border-ink-7'
                }`}
              >
                <Icon size={16} color={type === t ? '#fafaf7' : '#0a0a0a'} />
                <Text className={`text-xs font-medium mt-1 ${type === t ? 'text-paper' : 'text-ink'}`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Conditional fields */}
        {type === 'quantity' && (
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Meta diaria</Text>
              <TextInput
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                placeholder="Ej: 2"
                placeholderTextColor="#a3a3a3"
                className="px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm text-ink"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Unidad</Text>
              <TextInput
                value={unit}
                onChangeText={setUnit}
                placeholder="Ej: litros"
                placeholderTextColor="#a3a3a3"
                className="px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm text-ink"
              />
            </View>
          </View>
        )}

        {type === 'weekly_frequency' && (
          <View className="mb-4">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Días por semana</Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              keyboardType="number-pad"
              placeholder="Ej: 3"
              placeholderTextColor="#a3a3a3"
              className="px-4 py-3 rounded-xl border border-ink-7 bg-white text-sm text-ink"
            />
          </View>
        )}

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          className={`py-3 rounded-full items-center mt-2 ${canSave ? 'bg-ink' : 'bg-ink opacity-50'}`}
        >
          <Text className="text-paper text-sm font-medium">
            {saving ? 'Guardando...' : editingHabit ? 'Guardar cambios' : 'Crear hábito'}
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty. If `HabitType` is not exported from `@/types`, see Task 6b note below.

**Note on `HabitType`:** if `types/index.ts` (copied from web in Plan 1 / Task 14) doesn't export a standalone `HabitType` type, the import will fail. In that case, derive it locally:

```ts
type HabitType = Habit['type']
```

Use this fallback inside `HabitFormSheet.tsx` if needed.

- [ ] **Step 3: Commit + push**

```bash
git add components/habits/HabitFormSheet.tsx
git commit -m "feat(habits): HabitFormSheet — create/edit form with template picker"
git push
```

---

### Task 7: `app/(app)/habits/index.tsx` — main day view

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\habits\index.tsx` (replaces current WIP placeholder)

- [ ] **Step 1: Replace the WIP placeholder**

```tsx
// app/(app)/habits/index.tsx
//
// Habits day view: stats cards + habit list + add button + form sheet
// + delete confirm. Optimistic toggle (UI updates immediately, reverts on
// error). Auto-seeds DEFAULT_HABITS on first load if user has none.

import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { Plus, TrendingUp, Trash2 } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { getToday } from '../../../lib/utils'
import { DEFAULT_HABITS } from '../../../lib/constants'
import { get7DayData, getWeekCompletions, getStreak } from '../../../lib/habits'
import { HabitRow } from '../../../components/habits/HabitRow'
import { HabitFormSheet } from '../../../components/habits/HabitFormSheet'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { Habit, HabitLog, HabitType } from '../../../types'

interface HabitWithLog extends Habit {
  logId?: string
  completed: boolean
  currentValue: number
}

export default function HabitsScreen() {
  const todayStr = getToday()
  const { user } = useUser()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [monthLogs, setMonthLogs] = useState<HabitLog[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [savingHabit, setSavingHabit] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    if (!user) return
    setLoading(true)

    let { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at')

    let typed = habitsData as Habit[] | null

    // First-time seed.
    if (!typed || typed.length === 0) {
      const seed = DEFAULT_HABITS.map((h) => ({
        user_id: user.id,
        name: h.name,
        type: h.type,
        target_value: h.target_value,
        unit: h.unit,
      }))
      await (supabase.from('habits') as any).insert(seed)
      const { data } = await supabase.from('habits').select('*').eq('active', true).order('created_at')
      typed = data as Habit[] | null
    }

    // Today's logs.
    const { data: todayLogs } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('date', todayStr)

    // Last 30 days of logs.
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`
    const { data: monthData } = await supabase
      .from('habit_logs')
      .select('*')
      .gte('date', monthAgoStr)
      .order('date', { ascending: false })

    if (monthData) setMonthLogs(monthData as HabitLog[])

    const todayLogsTyped = (todayLogs as HabitLog[] | null) ?? []

    // Dedupe habits by name (paranoia from web — same habit inserted twice).
    const seen = new Set<string>()
    const unique = (typed ?? []).filter((h) => {
      if (seen.has(h.name)) return false
      seen.add(h.name)
      return true
    })

    setHabits(
      unique.map((h) => {
        const log = todayLogsTyped.find((l) => l.habit_id === h.id)
        return {
          ...h,
          logId: log?.id,
          completed: log?.completed ?? false,
          currentValue: log?.value ?? 0,
        }
      })
    )
    setLoading(false)
  }

  const toggleHabit = async (h: HabitWithLog) => {
    if (!user) return
    const newCompleted = !h.completed
    const prev = h.completed
    setHabits((arr) => arr.map((x) => (x.id === h.id ? { ...x, completed: newCompleted } : x)))
    try {
      if (h.logId) {
        await (supabase.from('habit_logs') as any).update({ completed: newCompleted }).eq('id', h.logId)
      } else {
        const { data } = await (supabase.from('habit_logs') as any)
          .insert({ habit_id: h.id, user_id: user.id, date: todayStr, completed: newCompleted })
          .select()
          .single()
        if (data) {
          setHabits((arr) => arr.map((x) => (x.id === h.id ? { ...x, logId: (data as any).id } : x)))
        }
      }
      if (newCompleted) showToast(`${h.name} completado`)
    } catch {
      setHabits((arr) => arr.map((x) => (x.id === h.id ? { ...x, completed: prev } : x)))
      showToast('Error al actualizar hábito')
    }
  }

  const updateValue = async (h: HabitWithLog, newValue: number) => {
    if (!user) return
    const prev = h.currentValue
    setHabits((arr) => arr.map((x) => (x.id === h.id ? { ...x, currentValue: newValue } : x)))
    try {
      if (h.logId) {
        await (supabase.from('habit_logs') as any).update({ value: newValue }).eq('id', h.logId)
      } else {
        const { data } = await (supabase.from('habit_logs') as any)
          .insert({ habit_id: h.id, user_id: user.id, date: todayStr, value: newValue })
          .select()
          .single()
        if (data) {
          setHabits((arr) => arr.map((x) => (x.id === h.id ? { ...x, logId: (data as any).id } : x)))
        }
      }
    } catch {
      setHabits((arr) => arr.map((x) => (x.id === h.id ? { ...x, currentValue: prev } : x)))
      showToast('Error al actualizar hábito')
    }
  }

  const handleSaveForm = async (data: {
    name: string
    type: HabitType
    target_value: number | null
    unit: string | null
  }) => {
    if (!user) return
    setSavingHabit(true)
    try {
      if (editingHabit) {
        await (supabase.from('habits') as any).update(data).eq('id', editingHabit.id)
        showToast(`"${data.name}" actualizado`)
      } else {
        await (supabase.from('habits') as any).insert({ ...data, user_id: user.id, active: true })
        showToast(`"${data.name}" creado`)
      }
      await load()
      setShowForm(false)
      setEditingHabit(null)
    } catch {
      showToast('Error al guardar hábito')
    }
    setSavingHabit(false)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await (supabase.from('habits') as any).update({ active: false }).eq('id', confirmDeleteId)
      showToast('Hábito eliminado')
      setConfirmDeleteId(null)
      await load()
    } catch {
      showToast('Error al eliminar hábito')
    }
  }

  // Computed
  const totalStreak = habits.length > 0 ? Math.max(...habits.map((h) => getStreak(h.id, monthLogs, todayStr))) : 0
  const totalHabitDays = habits.length * 7
  const completedHabitDays = habits.reduce((sum, h) => sum + getWeekCompletions(h.id, monthLogs), 0)
  const weeklyRate = totalHabitDays > 0 ? Math.round((completedHabitDays / totalHabitDays) * 100) : 0
  const completedCount = habits.filter((h) => {
    if (h.type === 'quantity') return h.currentValue >= (h.target_value ?? 0)
    if (h.type === 'weekly_frequency') return getWeekCompletions(h.id, monthLogs) >= (h.target_value ?? 0)
    return h.completed
  }).length

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
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-end justify-between">
          <View>
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-1">Ritual diario</Text>
            <Text className="font-serif text-[28px] font-light tracking-tight">
              Pequeñas <Text className="italic">constantes</Text>.
            </Text>
          </View>
          <Link href="/(app)/habits/progress" asChild>
            <Pressable className="w-10 h-10 rounded-full bg-white border border-ink-7 items-center justify-center">
              <TrendingUp size={16} color="#0a0a0a" />
            </Pressable>
          </Link>
        </View>

        {/* Stats Cards */}
        <View className="px-5 mt-5 flex-row gap-3">
          {/* Streak */}
          <View className="flex-1 bg-ink rounded-[14px] p-4">
            <Text className="text-[10px] text-ink-5 uppercase tracking-widest mb-2">Racha</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-paper font-serif text-4xl font-light tracking-tight">{totalStreak}</Text>
              <Text className="text-ink-5 text-[10px]" style={{ fontFamily: 'ui-monospace' }}>días</Text>
            </View>
            <View className="flex-row gap-[3px] mt-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <View
                  key={i}
                  className={`flex-1 h-[6px] rounded-sm ${i < totalStreak % 8 ? 'bg-signal' : 'bg-white/15'}`}
                />
              ))}
            </View>
          </View>

          {/* Weekly rate */}
          <View className="flex-1 bg-cream rounded-[14px] p-4">
            <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2">Esta semana</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-serif text-4xl font-light tracking-tight text-ink">{weeklyRate}</Text>
              <Text className="font-serif text-xl text-ink">%</Text>
            </View>
            <Text className="text-[10px] text-ink-4 mt-3" style={{ fontFamily: 'ui-monospace' }}>
              {completedHabitDays} / {totalHabitDays} hábitos
            </Text>
          </View>
        </View>

        {/* List */}
        <View className="px-5 mt-6">
          <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-3">
            Hoy · {completedCount} de {habits.length}
          </Text>

          <View className="gap-2">
            {habits.map((h) => {
              const weekData = get7DayData(h.id, monthLogs)
              const wc = getWeekCompletions(h.id, monthLogs)
              const isCompleted =
                h.type === 'quantity'
                  ? h.currentValue >= (h.target_value ?? 0)
                  : h.completed
              return (
                <HabitRow
                  key={h.id}
                  habit={h}
                  completed={isCompleted}
                  currentValue={h.currentValue}
                  weekData={weekData}
                  weekCompletions={wc}
                  onToggle={() => toggleHabit(h)}
                  onIncrement={() => updateValue(h, h.currentValue + 0.5)}
                  onDecrement={() => updateValue(h, Math.max(0, h.currentValue - 0.5))}
                  onEdit={() => {
                    setEditingHabit(h)
                    setShowForm(true)
                  }}
                  onDelete={() => setConfirmDeleteId(h.id)}
                />
              )
            })}
          </View>

          {/* Add button */}
          <Pressable
            onPress={() => {
              setEditingHabit(null)
              setShowForm(true)
            }}
            className="mt-4 py-3 rounded-xl border border-ink-7 flex-row items-center justify-center gap-2"
          >
            <Plus size={16} color="#0a0a0a" />
            <Text className="text-sm font-medium text-ink">Agregar hábito</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Form sheet */}
      <HabitFormSheet
        visible={showForm}
        editingHabit={editingHabit}
        existingNames={habits.map((h) => h.name)}
        saving={savingHabit}
        onClose={() => {
          setShowForm(false)
          setEditingHabit(null)
        }}
        onSave={handleSaveForm}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        visible={!!confirmDeleteId}
        title="¿Eliminar hábito?"
        body="Esta acción no se puede deshacer."
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

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty. If `HabitType` import fails, replace with `type HabitType = Habit['type']` locally.

- [ ] **Step 3: Commit + push**

```bash
git add 'app/(app)/habits/index.tsx'
git commit -m "feat(habits): day view with stats cards, list, CRUD modal, delete confirm"
git push
```

---

### Task 8: `components/habits/WeeklyTrendChart.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\WeeklyTrendChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/habits/WeeklyTrendChart.tsx
//
// 12-week area chart of completion rate (0-100%). Custom SVG (no Recharts).
// Tap a point → tooltip with week label + %. Pattern mirrors MetricChart
// from the weight module (will be ported in Plan 3).

import { useId, useState } from 'react'
import { View, Text } from 'react-native'
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import type { WeekData } from '../../lib/habits'

type Props = { data: WeekData[] }

export function WeeklyTrendChart({ data }: Props) {
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
  const baseY = padT + plotH

  const yMin = 0
  const yMax = 100

  const xAt = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const yAt = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const points = data.map((d, i) => ({
    x: xAt(i),
    y: yAt(d.completionRate),
    value: d.completionRate,
    label: d.weekLabel,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length >= 2
      ? `M ${points[0].x},${baseY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${baseY} Z`
      : ''

  const yTicks = [100, 50, 0]
  const labelCount = Math.min(4, data.length)
  const xLabelIdxs =
    data.length <= 4
      ? data.map((_, i) => i)
      : Array.from({ length: labelCount }, (_, k) =>
          Math.round((k * (data.length - 1)) / (labelCount - 1))
        )
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
                {v}%
              </SvgText>
            </React.Fragment>
          )
        })}

        {/* X labels */}
        {xLabelIdxs.map((i) => (
          <SvgText
            key={i}
            x={xAt(i)}
            y={baseY + 14}
            textAnchor="middle"
            fontSize={9}
            fill="#a3a3a3"
          >
            {data[i].weekLabel}
          </SvgText>
        ))}

        {/* Area + line */}
        {areaPath && <Path d={areaPath} fill={`url(#${gradId})`} />}
        {points.length >= 2 && (
          <Path d={linePath} fill="none" stroke="#ff5a1f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
            {hovered.value}%
          </Text>
          <Text className="text-ink-5 text-[10px]" style={{ fontFamily: 'ui-monospace' }}>
            {hovered.label}
          </Text>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Add the missing React import**

The component uses `<React.Fragment>` directly. Add `import React from 'react'` at the top of the file (after the `useId, useState` import).

```ts
import React, { useId, useState } from 'react'
```

- [ ] **Step 3: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit + push**

```bash
git add components/habits/WeeklyTrendChart.tsx
git commit -m "feat(habits): WeeklyTrendChart — 12-week area chart with axis + tooltip (custom SVG)"
git push
```

---

### Task 9: `components/habits/MonthCalendar.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\MonthCalendar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/habits/MonthCalendar.tsx
//
// 30-day grid (10 cols x 3 rows). Each cell shows day number. Background:
// - signal if completed
// - paper-2 if today (with dashed-equivalent border via inner View)
// - paper-3 if weekend not completed
// - paper-2 if weekday not completed.

import { View, Text } from 'react-native'
import type { CalendarDay } from '../../lib/habits'

type Props = { days: CalendarDay[] }

export function MonthCalendar({ days }: Props) {
  return (
    <View className="flex-row flex-wrap gap-[3px]">
      {days.map((d, i) => {
        const bg = d.completed
          ? 'bg-signal'
          : d.isToday
          ? 'bg-paper-2 border border-signal'
          : d.isWeekend
          ? 'bg-paper-3'
          : 'bg-paper-2'
        const text = d.completed ? 'text-paper' : 'text-ink-4'
        return (
          <View
            key={i}
            className={`${bg} rounded-sm items-center justify-center`}
            style={{ width: '9.4%', aspectRatio: 1 }}
          >
            <Text className={`text-[9px] font-medium ${text}`}>{d.dayNum}</Text>
          </View>
        )
      })}
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
git add components/habits/MonthCalendar.tsx
git commit -m "feat(habits): MonthCalendar — 30-day completion grid (10x3)"
git push
```

---

### Task 10: `components/habits/HabitComparisonChart.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\HabitComparisonChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/habits/HabitComparisonChart.tsx
//
// Horizontal bar chart comparing 90-day completion rate across all habits.
// Selected habit (the one shown on progress page) is highlighted in signal;
// others are ink-6.

import { View, Text } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'

export type ComparisonItem = {
  habitId: string
  name: string
  completionRate: number
}

type Props = {
  items: ComparisonItem[]
  selectedHabitId: string | null
}

export function HabitComparisonChart({ items, selectedHabitId }: Props) {
  if (items.length < 2) return null

  const W = 320
  const rowHeight = 28
  const padTop = 4
  const labelCol = 90      // width reserved for habit name on the left
  const trackR = 8 / 2     // half height of the track bar
  const padRight = 32      // room for percent text

  const H = padTop + items.length * rowHeight + 8
  const trackX = labelCol
  const trackW = W - labelCol - padRight

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {items.map((item, i) => {
        const cy = padTop + i * rowHeight + rowHeight / 2
        const fill = item.habitId === selectedHabitId ? '#ff5a1f' : '#d4d4d4'
        const filledW = (item.completionRate / 100) * trackW
        return (
          <React.Fragment key={item.habitId}>
            {/* Habit name */}
            <SvgText x={labelCol - 6} y={cy + 4} textAnchor="end" fontSize={11} fill="#404040">
              {item.name.length > 12 ? item.name.slice(0, 11) + '…' : item.name}
            </SvgText>
            {/* Track */}
            <Rect x={trackX} y={cy - trackR} width={trackW} height={trackR * 2} rx={trackR} fill="#eceae2" />
            {/* Filled bar */}
            <Rect x={trackX} y={cy - trackR} width={filledW} height={trackR * 2} rx={trackR} fill={fill} />
            {/* % label */}
            <SvgText
              x={trackX + trackW + 4}
              y={cy + 4}
              textAnchor="start"
              fontSize={10}
              fill="#a3a3a3"
            >
              {item.completionRate}%
            </SvgText>
          </React.Fragment>
        )
      })}
    </Svg>
  )
}
```

- [ ] **Step 2: Add React import**

```ts
import React from 'react'
import { View, Text } from 'react-native'
```

(Remove the unused `View, Text` if eslint complains — they're left in case the empty-state branch is added later.)

- [ ] **Step 3: Verify TS**

```bash
npx tsc --noEmit
```

Expected: empty.

- [ ] **Step 4: Commit + push**

```bash
git add components/habits/HabitComparisonChart.tsx
git commit -m "feat(habits): HabitComparisonChart — horizontal bars (custom SVG)"
git push
```

---

### Task 11: `components/habits/HabitPickerSheet.tsx`

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\components\habits\HabitPickerSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/habits/HabitPickerSheet.tsx
//
// Sheet for selecting which habit the progress page shows. Tap a row →
// onSelect + close. Each row shows habit name + 90-day completion % + current streak.

import { View, Text, Pressable, ScrollView } from 'react-native'
import { Flame } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import type { Habit } from '../../types'

export type PickerStat = {
  habit: Habit
  currentStreak: number
  completionRate: number
}

type Props = {
  visible: boolean
  onClose: () => void
  selectedHabitId: string | null
  onSelect: (habitId: string) => void
  stats: PickerStat[]
}

export function HabitPickerSheet({ visible, onClose, selectedHabitId, onSelect, stats }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="font-serif text-xl font-light mb-4">Seleccionar hábito</Text>
      <ScrollView style={{ maxHeight: 400 }}>
        <View className="gap-1">
          {stats.map((s) => {
            const isSelected = s.habit.id === selectedHabitId
            return (
              <Pressable
                key={s.habit.id}
                onPress={() => {
                  onSelect(s.habit.id)
                  onClose()
                }}
                className={`p-3 rounded-lg ${isSelected ? 'bg-signal-soft border border-signal' : 'bg-paper-2'}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-medium text-sm text-ink">{s.habit.name}</Text>
                    <Text className="text-xs text-ink-4 mt-0.5">
                      {s.habit.type === 'daily_check'
                        ? 'Diario'
                        : s.habit.type === 'quantity'
                        ? `${s.habit.target_value} ${s.habit.unit}/día`
                        : `${s.habit.target_value} días/sem`}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="bg-signal-soft px-2 py-0.5 rounded">
                      <Text className="text-xs text-signal">{s.completionRate}%</Text>
                    </View>
                    {s.currentStreak > 0 && (
                      <View className="bg-honey-soft px-2 py-0.5 rounded flex-row items-center gap-1">
                        <Flame size={10} color="#d4a017" />
                        <Text className="text-xs text-honey">{s.currentStreak}</Text>
                      </View>
                    )}
                  </View>
                </View>
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
git add components/habits/HabitPickerSheet.tsx
git commit -m "feat(habits): HabitPickerSheet — sheet for selecting which habit to view in progress"
git push
```

---

### Task 12: `app/(app)/habits/progress.tsx` — analytics screen

**Files:**
- Create: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\habits\progress.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// app/(app)/habits/progress.tsx
//
// Analytics: pick a habit → see streak / best streak / 90-day rate / weekly
// trend / 30-day calendar / comparison vs other habits / streak ranking.

import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, ChevronDown, Flame, Award, Target, TrendingUp, Calendar, Zap } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { supabase } from '../../../lib/supabase'
import { getToday, formatDateISO } from '../../../lib/utils'
import {
  getStreak,
  getBestStreak,
  getWeeklyData,
  get30DayCalendar,
  getCompletionRate,
} from '../../../lib/habits'
import { WeeklyTrendChart } from '../../../components/habits/WeeklyTrendChart'
import { MonthCalendar } from '../../../components/habits/MonthCalendar'
import { HabitComparisonChart, type ComparisonItem } from '../../../components/habits/HabitComparisonChart'
import { HabitPickerSheet, type PickerStat } from '../../../components/habits/HabitPickerSheet'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { Habit, HabitLog } from '../../../types'

export default function HabitsProgressScreen() {
  const { user } = useUser()
  const todayStr = getToday()

  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at')

    const seen = new Set<string>()
    const unique = ((habitsData as Habit[] | null) ?? []).filter((h) => {
      if (seen.has(h.name)) return false
      seen.add(h.name)
      return true
    })
    setHabits(unique)
    if (unique.length > 0 && !selectedHabitId) {
      setSelectedHabitId(unique[0].id)
    }

    const ninety = new Date()
    ninety.setDate(ninety.getDate() - 90)
    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .gte('date', formatDateISO(ninety))
      .order('date', { ascending: true })

    setLogs((logsData as HabitLog[] | null) ?? [])
    setLoading(false)
  }

  // Stats derivations
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null
  const currentStreak = selectedHabitId ? getStreak(selectedHabitId, logs, todayStr) : 0
  const bestStreak = selectedHabitId ? getBestStreak(selectedHabitId, logs) : 0
  const completionRate90 = selectedHabitId ? getCompletionRate(selectedHabitId, logs, 90) : 0
  const weeklyData = useMemo(
    () => (selectedHabitId ? getWeeklyData(selectedHabitId, logs, todayStr) : []),
    [selectedHabitId, logs, todayStr]
  )
  const calendarDays = useMemo(
    () => (selectedHabitId ? get30DayCalendar(selectedHabitId, logs) : []),
    [selectedHabitId, logs]
  )
  const comparisonItems: ComparisonItem[] = habits.map((h) => ({
    habitId: h.id,
    name: h.name,
    completionRate: getCompletionRate(h.id, logs, 90),
  }))
  const pickerStats: PickerStat[] = habits.map((h) => ({
    habit: h,
    currentStreak: getStreak(h.id, logs, todayStr),
    completionRate: getCompletionRate(h.id, logs, 90),
  }))
  const ranking = [...pickerStats].sort((a, b) => b.currentStreak - a.currentStreak)

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
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="px-5 pt-3 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-ink-7 items-center justify-center">
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View>
            <Text className="font-serif text-2xl font-light leading-tight">Progreso</Text>
            <Text className="text-xs text-ink-4">Análisis de tus hábitos</Text>
          </View>
        </View>

        {/* Habit picker button */}
        <View className="px-5 mt-5">
          <Pressable
            onPress={() => setShowPicker(true)}
            className="bg-white border border-ink-7 rounded-xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-xl bg-signal-soft items-center justify-center">
                <Target size={18} color="#ff5a1f" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-sm text-ink">{selectedHabit?.name ?? 'Seleccionar'}</Text>
                <Text className="text-xs text-ink-4 mt-0.5">
                  {selectedHabit?.type === 'daily_check'
                    ? 'Diario'
                    : selectedHabit?.type === 'quantity'
                    ? `${selectedHabit.target_value} ${selectedHabit.unit}/día`
                    : selectedHabit?.type === 'weekly_frequency'
                    ? `${selectedHabit.target_value} días/sem`
                    : ''}
                </Text>
              </View>
            </View>
            <ChevronDown size={20} color="#737373" />
          </Pressable>
        </View>

        {/* Stats grid */}
        <View className="px-5 mt-4 flex-row gap-3">
          <View className="flex-1 bg-white border border-ink-7 rounded-xl p-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Flame size={14} color="#ff5a1f" />
              <Text className="text-[10px] text-ink-4 uppercase tracking-wider">Racha</Text>
            </View>
            <Text className="font-serif text-2xl font-light text-signal">
              {currentStreak}
              <Text className="text-sm text-ink-4"> días</Text>
            </Text>
          </View>
          <View className="flex-1 bg-white border border-ink-7 rounded-xl p-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Award size={14} color="#d4a017" />
              <Text className="text-[10px] text-ink-4 uppercase tracking-wider">Mejor</Text>
            </View>
            <Text className="font-serif text-2xl font-light text-honey">
              {bestStreak}
              <Text className="text-sm text-ink-4"> días</Text>
            </Text>
          </View>
          <View className="flex-1 bg-white border border-ink-7 rounded-xl p-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Target size={14} color="#0a0a0a" />
              <Text className="text-[10px] text-ink-4 uppercase tracking-wider">90 días</Text>
            </View>
            <Text className="font-serif text-2xl font-light text-ink">
              {completionRate90}
              <Text className="text-sm text-ink-4"> %</Text>
            </Text>
          </View>
        </View>

        {/* Weekly trend */}
        {weeklyData.length > 0 && (
          <View className="mx-5 mt-5 bg-white border border-ink-7 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <TrendingUp size={16} color="#ff5a1f" />
                <Text className="text-sm font-medium text-ink">Tendencia semanal</Text>
              </View>
              <Text className="text-xs text-ink-4">12 semanas</Text>
            </View>
            <WeeklyTrendChart data={weeklyData} />
          </View>
        )}

        {/* 30-day calendar */}
        <View className="mx-5 mt-5 bg-white border border-ink-7 rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Calendar size={16} color="#ff5a1f" />
              <Text className="text-sm font-medium text-ink">Últimos 30 días</Text>
            </View>
            <Text className="text-xs text-ink-4">
              {calendarDays.filter((d) => d.completed).length}/30 completados
            </Text>
          </View>
          <MonthCalendar days={calendarDays} />
          <View className="flex-row items-center justify-center gap-4 mt-3 pt-3 border-t border-ink-7">
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-sm bg-signal" />
              <Text className="text-[10px] text-ink-4">Completado</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-sm bg-paper-2" />
              <Text className="text-[10px] text-ink-4">No completado</Text>
            </View>
          </View>
        </View>

        {/* Comparison */}
        {comparisonItems.length > 1 && (
          <View className="mx-5 mt-5 bg-white border border-ink-7 rounded-2xl p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Zap size={16} color="#ff5a1f" />
              <Text className="text-sm font-medium text-ink">Comparación de hábitos</Text>
            </View>
            <HabitComparisonChart items={comparisonItems} selectedHabitId={selectedHabitId} />
          </View>
        )}

        {/* Streaks ranking */}
        <View className="mx-5 mt-5 bg-white border border-ink-7 rounded-2xl p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Flame size={16} color="#ff5a1f" />
            <Text className="text-sm font-medium text-ink">Rachas actuales</Text>
          </View>
          <View className="gap-3">
            {ranking.map((stat, idx) => {
              const medal =
                idx === 0
                  ? 'bg-honey-soft'
                  : idx === 1
                  ? 'bg-paper-3'
                  : idx === 2
                  ? 'bg-signal-soft'
                  : 'bg-paper-2'
              const medalText =
                idx === 0
                  ? 'text-honey'
                  : idx === 1
                  ? 'text-ink-3'
                  : idx === 2
                  ? 'text-signal'
                  : 'text-ink-4'
              const isSel = stat.habit.id === selectedHabitId
              return (
                <View
                  key={stat.habit.id}
                  className={`flex-row items-center justify-between p-3 rounded-lg ${
                    isSel ? 'bg-signal-soft border border-signal' : 'bg-paper-2'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center ${medal}`}>
                      <Text className={`text-sm font-bold ${medalText}`}>{idx + 1}</Text>
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-ink">{stat.habit.name}</Text>
                      <Text className="text-xs text-ink-4">
                        Mejor: {getBestStreak(stat.habit.id, logs)} días
                      </Text>
                    </View>
                  </View>
                  <View className="bg-signal-soft px-3 py-1.5 rounded-lg flex-row items-center gap-1.5">
                    <Flame size={14} color="#ff5a1f" />
                    <Text className="font-bold text-signal">{stat.currentStreak}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>

      {/* Picker sheet */}
      <HabitPickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        selectedHabitId={selectedHabitId}
        onSelect={setSelectedHabitId}
        stats={pickerStats}
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
git add 'app/(app)/habits/progress.tsx'
git commit -m "feat(habits): progress screen — picker / stats grid / weekly chart / calendar / comparison / ranking"
git push
```

---

### Task 13: Hide `habits/progress` from the tab bar

**Files:**
- Modify: `C:\Users\Rafae\Projects\fitkis-mobile\app\(app)\_layout.tsx`

The progress route is reachable via navigation (Link from habits/index, plus router.back()). Without an explicit Tabs.Screen entry, Expo Router may auto-add it as a tab. Hide it by adding `<Tabs.Screen name="habits/progress" options={{ href: null }} />`.

- [ ] **Step 1: Open `app/(app)/_layout.tsx` and add the hidden screen entry**

After the existing `<Tabs.Screen name="habits/index" ... />` block, add:

```tsx
<Tabs.Screen
  name="habits/progress"
  options={{
    href: null, // hide from tab bar — only reachable via navigation
  }}
/>
```

The full file should look like (showing only the JSX block — preserve the existing imports and outer structure):

```tsx
<Tabs.Screen
  name="habits/index"
  options={{
    title: 'Hábitos',
    tabBarIcon: ({ color, size }) => <CheckCircle color={color} size={size - 2} />,
  }}
/>
<Tabs.Screen
  name="habits/progress"
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
git commit -m "fix(navigation): hide habits/progress from tab bar (reachable via Link only)"
git push
```

---

### Task 14: Smoke-test in Expo Go

**Files:**
- (No code changes — verification task)

- [ ] **Step 1: Start the dev server**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo start --clear
```

Wait for Metro to bundle. Open Expo Go on iPhone, scan the QR.

- [ ] **Step 2: Test the day view**

Tap the **Hábitos** tab. Verify:
- "Ritual diario" eyebrow + "Pequeñas constantes." serif heading
- Two stats cards (dark Racha + cream Esta semana)
- Three default habits (Agua, Lectura, Creatina) listed with WeekDots
- Tap the checkbox of "Creatina" → it fills, toast appears, week-count increases on refresh
- Tap +/- buttons of "Agua" → counter updates
- Tap pencil on a habit → form sheet slides up with current values pre-filled → modify name → tap "Guardar cambios" → list updates
- Tap "+ Agregar hábito" → form sheet slides up empty → tap a template chip ("💧 Agua") — but if Agua already exists it should be hidden from templates → pick another like "🧘 Meditación" → tap "Crear hábito" → new habit appears in list
- Tap trash on a habit → confirm dialog appears → tap "Eliminar" → habit disappears
- Toggle the dark/cream cards' streak number — it should reflect the longest streak among visible habits

- [ ] **Step 3: Test the progress page**

Tap the trending-up icon button in the day-view header. Verify:
- Page slides in (or appears via push navigation)
- Habit picker shows the first habit by default
- Three stats cards (Racha / Mejor / 90 días)
- Tap habit picker → sheet shows all habits with completion % and streak — tap one → page updates
- Weekly trend chart renders with 12 dots; tap a dot → tooltip with % + week label
- 30-day calendar grid renders; today's cell has a signal-colored border
- If 2+ habits exist, comparison bar chart shows; selected habit's bar is signal-colored, others ink-6
- Streaks ranking lists all habits with medals + flame badge
- Tap back arrow → returns to day view

- [ ] **Step 4: Confirm no `habits/progress` tab in the tab bar**

The bottom tab bar must only show the 4 original tabs (Hoy / Gym / Comida / Hábitos). If a 5th "habits/progress" tab is visible, Task 13 didn't apply correctly — re-verify the `<Tabs.Screen name="habits/progress" options={{ href: null }} />` entry.

- [ ] **Step 5: Push final state if any in-flight commits**

If anything still uncommitted: `git status`. Should be clean. If not:

```bash
git add -A
git commit -m "chore(habits): final smoke-test polish"
git push
```

---

## Self-Review Checklist (after writing the plan)

### 1. Spec coverage
- ✅ Source web files identified: `app/(app)/habits/page.tsx`, `app/(app)/habits/progress/page.tsx`
- ✅ Mobile screens covered: `habits/index.tsx` (Task 7), `habits/progress.tsx` (Task 12)
- ✅ Bottom-sheet decision: native RN `<Modal>` (resolved at top of plan)
- ✅ List CRUD pattern: implemented in HabitRow + HabitFormSheet + ConfirmDialog
- ✅ Mini-charts: WeekDots (Task 4), WeeklyTrendChart (Task 8), MonthCalendar (Task 9), HabitComparisonChart (Task 10)
- ✅ "Done when" criteria: smoke-tested in Task 14

### 2. Placeholder scan
No "TBD", "TODO", "implement later" found. The note about `HabitType` falling back to `Habit['type']` (Task 6 / Task 7) is a defensive fallback, not an unfilled gap.

### 3. Type consistency
- `HabitWithLog` defined in Task 7 — only used inside that file, no cross-file type drift.
- `WeekData`, `CalendarDay` defined in `lib/habits.ts` (Task 1), imported by Task 8 and Task 9 — names match.
- `ComparisonItem` defined in Task 10, imported by Task 12 — match.
- `PickerStat` defined in Task 11, imported by Task 12 — match.
- `HabitFormSheet` `onSave` signature `({ name, type, target_value, unit })` — matches what the parent screen (Task 7) passes.
- `HabitRow` callbacks (`onToggle`, `onIncrement`, etc.) — wired up in Task 7 to the corresponding handlers.

No issues found.

---

## Summary

| Task | What | Lines |
|---|---|---|
| 1 | `lib/habits.ts` | ~150 |
| 2 | `BottomSheet` | ~40 |
| 3 | `ConfirmDialog` | ~50 |
| 4 | `WeekDots` | ~15 |
| 5 | `HabitRow` | ~80 |
| 6 | `HabitFormSheet` | ~180 |
| 7 | `habits/index.tsx` | ~250 |
| 8 | `WeeklyTrendChart` | ~120 |
| 9 | `MonthCalendar` | ~30 |
| 10 | `HabitComparisonChart` | ~50 |
| 11 | `HabitPickerSheet` | ~60 |
| 12 | `habits/progress.tsx` | ~250 |
| 13 | hide progress from tab bar | ~10 |
| 14 | smoke test | 0 |

Total: ~1300 LOC across 14 tasks. Estimated 2-4 days of subagent execution.
