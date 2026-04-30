# FitKis Mobile Migration — Plan 6: Coach + Journal + Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the three remaining patient screens — Coach (AI chat), Journal (rotating prompts + free text), Settings (profile + diet config CRUD + delete account) — at parity with web functionality, in Paper & Pulse design.

**Architecture:** Three flat routes under `app/(app)/`:
- `coach/index.tsx` — full-screen chat: inverted `FlatList`, `KeyboardAvoidingView` input bar, suggested-prompts row, `/api/chat` call via `apiFetch` (no streaming — full response in 5–15s).
- `journal/index.tsx` — date nav, free-text textarea, 3 rotating questions with skip, persistence to `journal_entries` + `journal_used_questions`.
- `settings/index.tsx` — composes 3 sections: profile form, diet-config list with Add modal sheet, danger-zone delete-account flow with phrase confirmation. Delete calls `/api/delete-account` (already accepts bearer JWT per Plan 1).

All three are **hidden tab routes** (`href: null`) reached from new entry rows on the Dashboard.

**Tech Stack:** Existing Expo SDK 54 + Expo Router 5 + NativeWind 4 + Supabase. NO new native deps. Reuses `BottomSheet`, `ConfirmDialog`, `useToast`, `apiFetch`.

**Repos & paths:**
- Mobile: `C:\Users\Rafae\Projects\fitkis-mobile` (branch `master`)
- Web reference (read-only):
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\coach\page.tsx` (190 LOC)
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\journal\page.tsx` (418 LOC)
  - `C:\Users\Rafae\Projects\fitkis\app\(app)\settings\page.tsx` (587 LOC)
  - `C:\Users\Rafae\Projects\fitkis\lib\journal-questions.ts` (289 LOC — 200 questions + helpers)
  - `C:\Users\Rafae\Projects\fitkis\components\coach\ChatMessage.tsx`

**Spec reference:** `docs/superpowers/specs/2026-04-27-mobile-migration-design.md`

**Builds on Plans 1-5:** `apiFetch` (with bearer JWT), `BottomSheet`, `ConfirmDialog`, `useToast`, `useUser`, `formatDateISO`, `getToday`, `DEFAULT_DAILY_BUDGET`.

---

## Decisions Resolved (open questions from the roadmap)

1. **Streaming vs non-streaming chat.** v1: full-response (no streaming). Acceptable: spinner + "Pensando..." while waiting. Streaming via Server-Sent Events on RN is fiddly (no native EventSource); deferred to v2.

2. **Where does Settings/Coach/Journal live in nav?** Mobile tab bar stays at 4 tabs (Hoy / Gym / Comida / Hábitos). Coach + Journal + Ajustes are reachable as **hidden routes** from new dashboard rows. This avoids a 5th/6th/7th tab and keeps the bottom bar uncluttered.

3. **Account deletion confirmation phrase.** Same as web: user must type `ELIMINAR MI CUENTA` exactly. After success → `supabase.auth.signOut()` → `router.replace('/(auth)/login?deleted=true')`.

4. **Journal "skip question" UX.** Match web: max 2 skips per day. After skip, immediately persist the new question to the row.

5. **Diet config delete on mobile.** Use `ConfirmDialog` instead of `window.confirm()`. Same wording.

6. **Keyboard handling on Coach.** `KeyboardAvoidingView behavior="padding"` on iOS, `"height"` on Android. The inverted `FlatList` keeps the most recent message above the keyboard.

7. **Coach welcome message.** Same intro text as web (Spanish copy preserved verbatim).

8. **Journal "future date" guard.** Match web: the date picker can't go past `today`. Shows a warning card if somehow rendered.

---

## File Structure

### New files

```
fitkis-mobile/
├── app/
│   └── (app)/
│       ├── coach/
│       │   └── index.tsx          ← new
│       ├── journal/
│       │   └── index.tsx          ← new
│       └── settings/
│           └── index.tsx          ← new
├── components/
│   ├── coach/
│   │   └── ChatBubble.tsx         ← new
│   ├── journal/
│   │   └── QuestionCard.tsx       ← new
│   └── settings/
│       ├── ProfileSection.tsx     ← new
│       ├── DietConfigSection.tsx  ← new (composes list + Add sheet)
│       ├── DietConfigSheet.tsx    ← new (the Add sheet)
│       └── DangerZone.tsx         ← new
└── lib/
    └── journal-questions.ts       ← copied from web (200 questions + helpers)
```

### Modified files

- `app/(app)/_layout.tsx` — add `<Tabs.Screen>` entries with `href: null` for `coach/index`, `journal/index`, `settings/index`.
- `app/(app)/dashboard.tsx` — append three entry rows below the weight card: Coach, Journal, Ajustes.

### File responsibilities

| File | Responsibility |
|---|---|
| `lib/journal-questions.ts` | 200 question pool + `getRandomQuestions(usedIndices, n)` + `getReplacementQuestion(usedIndices, currentIndices)` |
| `components/coach/ChatBubble.tsx` | One message bubble: user-aligned-right vs assistant-aligned-left, role-colored |
| `components/journal/QuestionCard.tsx` | One rotating-question card with skip button + textarea |
| `components/settings/ProfileSection.tsx` | Display name + height + goal weight inputs + save button |
| `components/settings/DietConfigSection.tsx` | List of past diet configs (active highlighted) + Trash delete + "+ Nueva" button → opens DietConfigSheet |
| `components/settings/DietConfigSheet.tsx` | BottomSheet form: effective_date + 6 group inputs + save |
| `components/settings/DangerZone.tsx` | Inline confirm form: "ELIMINAR MI CUENTA" phrase typing + delete button |
| `app/(app)/coach/index.tsx` | Chat screen orchestrator |
| `app/(app)/journal/index.tsx` | Journal day view orchestrator |
| `app/(app)/settings/index.tsx` | Composes ProfileSection + DietConfigSection + DangerZone |

---

# TASKS

### Task 1: Copy `lib/journal-questions.ts` from web

**Files:**
- Create: `lib/journal-questions.ts`

- [ ] **Step 1: Copy verbatim from web**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
cp /c/Users/Rafae/Projects/fitkis/lib/journal-questions.ts lib/journal-questions.ts
```

The file is pure TS (no DOM/RN). Should compile without changes. If it imports from `@/types`, find-replace to relative path:

```bash
sed -i "s|from '@/types'|from '../types'|g" lib/journal-questions.ts
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add lib/journal-questions.ts
git commit -m "feat(journal): port lib/journal-questions.ts (200 prompts + helpers)"
git push
```

If `tsc` complains, inspect the imports and fix. Don't omit the questions array.

---

### Task 2: `components/coach/ChatBubble.tsx`

**Files:**
- Create: `components/coach/ChatBubble.tsx`

- [ ] **Step 1: Create the component**

```bash
mkdir -p components/coach
```

```tsx
// components/coach/ChatBubble.tsx
//
// One chat message bubble. User messages align right with signal-colored bg;
// assistant messages align left with paper-2 bg.

import { View, Text } from 'react-native'

type Props = {
  role: 'user' | 'assistant'
  content: string
}

export function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user'
  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-3 px-5`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'bg-ink rounded-br-md' : 'bg-white border border-ink-7 rounded-bl-md'
        }`}
      >
        <Text
          className={`text-sm leading-5 ${isUser ? 'text-paper' : 'text-ink'}`}
        >
          {content}
        </Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/coach/ChatBubble.tsx
git commit -m "feat(coach): ChatBubble — role-styled message bubble"
git push
```

---

### Task 3: `app/(app)/coach/index.tsx` — chat screen

**Files:**
- Create: `app/(app)/coach/index.tsx`

- [ ] **Step 1: Create directory + screen**

```bash
mkdir -p 'app/(app)/coach'
```

```tsx
// app/(app)/coach/index.tsx
//
// Coach chat: inverted FlatList of bubbles + sticky input bar.
// Calls /api/chat via apiFetch (bearer JWT). No streaming — full response.

import { useState, useRef } from 'react'
import {
  View, Text, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Send, Trash2 } from 'lucide-react-native'
import { ChatBubble } from '../../../components/coach/ChatBubble'
import { PulseLine } from '../../../components/ui/PulseLine'
import { useToast } from '../../../lib/hooks/useToast'
import { apiFetch } from '../../../lib/api-client'

type Message = { role: 'user' | 'assistant'; content: string }

const INITIAL: Message = {
  role: 'assistant',
  content:
    '¡Hola! Soy Coach Fit, tu asistente personal de fitness y nutrición. Puedo ayudarte a:\n\n• Registrar lo que comes\n• Consultar tu presupuesto de equivalentes\n• Ver y actualizar tus datos del gym\n• Sugerir ideas de comidas\n• Resolver dudas de nutrición\n\n¿En qué te puedo ayudar hoy?',
}

const QUICK_ACTIONS = [
  { label: '¿Qué me queda hoy?', message: '¿Cuántos equivalentes me quedan hoy?' },
  { label: 'Ideas para cena', message: 'Dame ideas para la cena con lo que me queda del presupuesto' },
  { label: '¿Qué rutina toca?', message: '¿Qué rutina de gym me toca hoy?' },
  { label: 'Mi progreso', message: '¿Cómo voy con mi peso esta semana?' },
]

export default function CoachScreen() {
  const { showToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([INITIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<FlatList>(null)

  const send = async (content: string) => {
    const text = content.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Skip the initial assistant intro for cleaner API context
      const apiMessages = [...messages.slice(1), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const response = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: apiMessages }),
      })
      if (!response.ok) throw new Error('Error en la respuesta')
      const json = await response.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: json.message }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error procesando tu mensaje. Intenta de nuevo.',
        },
      ])
    }
    setLoading(false)
  }

  const clearChat = () => {
    setMessages([INITIAL])
  }

  // The inverted FlatList renders newest first, so we feed reversed data
  const dataReversed = [...messages].reverse()

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-ink-7">
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <ArrowLeft size={16} color="#0a0a0a" />
          </Pressable>
          <View className="items-center">
            <Text
              className="text-[10px] text-ink-4 uppercase tracking-widest"
              style={{ fontFamily: 'ui-monospace' }}
            >
              Coach Fit
            </Text>
            <Text className="text-sm font-medium text-ink">Tu asistente</Text>
          </View>
          <Pressable
            onPress={clearChat}
            className="w-[34px] h-[34px] rounded-full bg-white border border-ink-7 items-center justify-center"
          >
            <Trash2 size={14} color="#0a0a0a" />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={dataReversed}
          inverted
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 12 }}
          renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
          ListHeaderComponent={
            loading ? (
              <View className="px-5 py-3">
                <View className="flex-row items-center gap-2">
                  <PulseLine w={32} h={12} color="#ff5a1f" strokeWidth={2} active />
                  <Text className="text-xs text-ink-4">Pensando...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggested prompts (only on welcome screen) */}
        {messages.length === 1 && !loading && (
          <View className="px-5 pb-2 flex-row flex-wrap gap-2">
            {QUICK_ACTIONS.map((qa, i) => (
              <Pressable
                key={i}
                onPress={() => send(qa.message)}
                className="px-3 py-1.5 rounded-full bg-white border border-ink-7"
              >
                <Text className="text-xs text-ink">{qa.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View className="px-5 pt-2 pb-3 border-t border-ink-7 flex-row items-end gap-2">
          <View className="flex-1 bg-white border border-ink-7 rounded-2xl px-3 py-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#a3a3a3"
              multiline
              className="text-sm text-ink"
              style={{ maxHeight: 120 }}
              editable={!loading}
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              !input.trim() || loading ? 'bg-ink-7' : 'bg-ink'
            }`}
          >
            <Send size={16} color="#fafaf7" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/coach/index.tsx'
git commit -m "feat(coach): chat screen — inverted FlatList + KAV input + /api/chat"
git push
```

Notes for the implementer:
- If `useToast` import fails (it's not actually used here), drop the import. The component above doesn't call `showToast` — added defensively.
- If `apiFetch` returns a non-`Response`-like (e.g., direct JSON), adapt the handling block. Plan 1 set it to return a Response.
- If lucide's `Send` icon doesn't exist, use `ArrowUp` or `Plus` rotated.

---

### Task 4: `components/journal/QuestionCard.tsx`

**Files:**
- Create: `components/journal/QuestionCard.tsx`

- [ ] **Step 1: Create the component**

```bash
mkdir -p components/journal
```

```tsx
// components/journal/QuestionCard.tsx
//
// One rotating-question card: serif italic question text + skip button +
// answer textarea. Skip is hidden when skipsRemaining === 0.

import { View, Text, Pressable, TextInput } from 'react-native'
import { RefreshCw } from 'lucide-react-native'

type Props = {
  question: string
  answer: string
  skipsRemaining: number
  onAnswerChange: (val: string) => void
  onSkip: () => void
}

export function QuestionCard({
  question, answer, skipsRemaining, onAnswerChange, onSkip,
}: Props) {
  return (
    <View className="bg-white border border-ink-7 rounded-2xl p-4 mb-3">
      <View className="flex-row items-start justify-between gap-3 mb-3">
        <Text
          className="flex-1 font-serif text-base text-ink italic font-light leading-6"
        >
          {question}
        </Text>
        {skipsRemaining > 0 && (
          <Pressable
            onPress={onSkip}
            className="w-8 h-8 rounded-full bg-paper-2 items-center justify-center"
          >
            <RefreshCw size={14} color="#0a0a0a" />
          </Pressable>
        )}
      </View>
      <TextInput
        value={answer}
        onChangeText={onAnswerChange}
        placeholder="Tu respuesta..."
        placeholderTextColor="#a3a3a3"
        multiline
        className="text-sm text-ink min-h-[80px] bg-paper-2 rounded-xl px-3 py-2"
        style={{ textAlignVertical: 'top' }}
      />
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/journal/QuestionCard.tsx
git commit -m "feat(journal): QuestionCard — rotating question with skip + answer"
git push
```

---

### Task 5: `app/(app)/journal/index.tsx`

**Files:**
- Create: `app/(app)/journal/index.tsx`

- [ ] **Step 1: Create directory + screen**

```bash
mkdir -p 'app/(app)/journal'
```

```tsx
// app/(app)/journal/index.tsx
//
// Journal day view: date nav + free-text + 3 rotating questions + save.
// Persists to journal_entries; tracks used questions in journal_used_questions.

import { useEffect, useState, useRef } from 'react'
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Check } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { formatDateISO } from '../../../lib/utils'
import { getRandomQuestions, getReplacementQuestion } from '../../../lib/journal-questions'
import { QuestionCard } from '../../../components/journal/QuestionCard'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { JournalQuestion } from '../../../types'

const START_DATE = new Date('2026-04-06')
START_DATE.setHours(0, 0, 0, 0)

export default function JournalScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const today = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })()

  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const dateISO = formatDateISO(selectedDate)
  const isToday = dateISO === formatDateISO(today)
  const isFuture = selectedDate > today

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [questions, setQuestions] = useState<JournalQuestion[]>([])
  const [skipsUsed, setSkipsUsed] = useState(0)
  const [usedIndices, setUsedIndices] = useState<number[]>([])
  const loadedDateRef = useRef<string | null>(null)

  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  const loadEntry = async () => {
    if (!user || isFuture) {
      setLoading(false)
      return
    }
    if (loadedDateRef.current === dateISO) return
    loadedDateRef.current = dateISO
    setLoading(true)

    try {
      const { data: usedData } = await (supabase as any)
        .from('journal_used_questions')
        .select('question_index')
        .eq('user_id', user.id)
      const used = (usedData ?? []).map((d: { question_index: number }) => d.question_index)
      setUsedIndices(used)

      const { data: entry } = await (supabase as any)
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateISO)
        .maybeSingle()

      if (entry) {
        setEntryId(entry.id)
        setFreeText(entry.free_text || '')
        setQuestions(entry.questions || [])
        setSkipsUsed(entry.skips_used || 0)
      } else {
        // Create new entry with 3 random questions
        const fresh = getRandomQuestions(used, 3)
        const qs: JournalQuestion[] = fresh.map((q) => ({
          index: q.index, question: q.question, answer: '',
        }))
        const { data: newEntry } = await (supabase as any)
          .from('journal_entries')
          .insert({
            user_id: user.id,
            date: dateISO,
            free_text: '',
            questions: qs,
            skips_used: 0,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (newEntry) {
          setEntryId(newEntry.id)
          await (supabase as any).from('journal_used_questions').upsert(
            qs.map((q) => ({
              user_id: user.id, question_index: q.index, date_used: dateISO,
            })),
            { onConflict: 'user_id,question_index' },
          )
          setUsedIndices((prev) => [...prev, ...qs.map((q) => q.index).filter((i) => !prev.includes(i))])
        }
        setQuestions(qs)
        setFreeText('')
        setSkipsUsed(0)
      }
    } catch {
      showToast('Error al cargar entrada')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadedDateRef.current = null
    if (user) loadEntry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateISO])

  const save = async () => {
    if (!user || isFuture || !entryId) return
    setSaving(true)
    try {
      await (supabase as any)
        .from('journal_entries')
        .update({
          free_text: freeText, questions, skips_used: skipsUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      showToast('Error al guardar')
    }
    setSaving(false)
  }

  const skip = async (idx: number) => {
    if (skipsUsed >= 2 || !user || !entryId) return
    const currentIdxs = questions.map((q) => q.index)
    const replacement = getReplacementQuestion(usedIndices, currentIdxs)
    if (!replacement) {
      showToast('Sin más preguntas disponibles')
      return
    }
    const next = [...questions]
    next[idx] = { index: replacement.index, question: replacement.question, answer: '' }
    const newSkips = skipsUsed + 1
    await (supabase as any)
      .from('journal_entries')
      .update({ questions: next, skips_used: newSkips, updated_at: new Date().toISOString() })
      .eq('id', entryId)
    await (supabase as any)
      .from('journal_used_questions')
      .upsert(
        { user_id: user.id, question_index: replacement.index, date_used: dateISO },
        { onConflict: 'user_id,question_index' },
      )
    setUsedIndices((prev) => [...prev, replacement.index])
    setQuestions(next)
    setSkipsUsed(newSkips)
  }

  const updateAnswer = (idx: number, answer: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, answer } : q)))
  }

  const goPrev = () => {
    if (selectedDate <= START_DATE) return
    const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d)
  }
  const goNext = () => {
    if (isToday) return
    const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d)
  }

  const dateLabel = (() => {
    const s = formatDateDisplay(selectedDate)
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

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
            Journal
          </Text>
          <Pressable
            onPress={save}
            disabled={saving || isFuture}
            className={`flex-row items-center gap-1.5 px-3 h-[34px] rounded-full bg-ink ${(saving || isFuture) ? 'opacity-50' : ''}`}
          >
            {saved ? <Check size={14} color="#fafaf7" /> : <Save size={14} color="#fafaf7" />}
            <Text className="text-paper text-xs font-medium">
              {saved ? 'Guardado' : saving ? '...' : 'Guardar'}
            </Text>
          </Pressable>
        </View>

        {/* Date nav */}
        <View className="mx-5 mt-4 bg-white border border-ink-7 rounded-2xl p-3 flex-row items-center justify-between">
          <Pressable
            onPress={goPrev}
            disabled={selectedDate <= START_DATE}
            className={`w-9 h-9 rounded-lg bg-paper-2 items-center justify-center ${selectedDate <= START_DATE ? 'opacity-30' : ''}`}
          >
            <ChevronLeft size={18} color="#0a0a0a" />
          </Pressable>
          <View className="items-center">
            <Text className="text-sm font-medium text-ink capitalize">{dateLabel}</Text>
            {isToday && <Text className="text-[10px] text-signal" style={{ fontFamily: 'ui-monospace' }}>Hoy</Text>}
          </View>
          <Pressable
            onPress={goNext}
            disabled={isToday}
            className={`w-9 h-9 rounded-lg bg-paper-2 items-center justify-center ${isToday ? 'opacity-30' : ''}`}
          >
            <ChevronRight size={18} color="#0a0a0a" />
          </Pressable>
        </View>

        {isFuture ? (
          <View className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-700 text-center">
              No puedes ver las preguntas de días futuros
            </Text>
          </View>
        ) : (
          <>
            {/* Free text */}
            <View className="mx-5 mt-4 bg-white border border-ink-7 rounded-2xl p-4">
              <Text className="text-[10px] text-ink-4 uppercase tracking-widest mb-2"
                style={{ fontFamily: 'ui-monospace' }}>
                Mi día
              </Text>
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Escribe libremente sobre tu día..."
                placeholderTextColor="#a3a3a3"
                multiline
                className="text-sm text-ink min-h-[100px] bg-paper-2 rounded-xl px-3 py-2"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Questions */}
            <View className="mx-5 mt-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-ink">Preguntas del día</Text>
                <Text className="text-xs text-ink-4" style={{ fontFamily: 'ui-monospace' }}>
                  {2 - skipsUsed} cambios restantes
                </Text>
              </View>
              {questions.map((q, idx) => (
                <QuestionCard
                  key={`${q.index}-${idx}`}
                  question={q.question}
                  answer={q.answer}
                  skipsRemaining={2 - skipsUsed}
                  onAnswerChange={(val) => updateAnswer(idx, val)}
                  onSkip={() => skip(idx)}
                />
              ))}
            </View>

            <Text className="text-center text-xs text-ink-4 mt-2">
              {200 - usedIndices.length} preguntas disponibles de 200
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/journal/index.tsx'
git commit -m "feat(journal): day view — date nav + free text + rotating questions"
git push
```

Notes:
- The `bg-amber-50 / amber-200 / text-amber-700` classes — verify they exist in your tailwind config. If not, replace with literal `style={{ backgroundColor: '#fef3c7' }}` etc.
- `JournalQuestion` import: confirm shape (`{ index, question, answer }`) matches `types/index.ts`. Already verified per Plan 5 prep.

---

### Task 6: `components/settings/ProfileSection.tsx`

**Files:**
- Create: `components/settings/ProfileSection.tsx`

- [ ] **Step 1: Create directory + component**

```bash
mkdir -p components/settings
```

```tsx
// components/settings/ProfileSection.tsx
//
// Profile form: display name + height + goal weight + save button.
// Parent owns state + saving logic; this is a pure presentational form.

import { View, Text, TextInput, Pressable } from 'react-native'
import { User, Save, Check } from 'lucide-react-native'

type Props = {
  displayName: string
  heightCm: string
  goalWeightKg: string
  saving: boolean
  saved: boolean
  onChangeName: (v: string) => void
  onChangeHeight: (v: string) => void
  onChangeGoal: (v: string) => void
  onSave: () => void
}

export function ProfileSection({
  displayName, heightCm, goalWeightKg, saving, saved,
  onChangeName, onChangeHeight, onChangeGoal, onSave,
}: Props) {
  return (
    <View className="bg-white border border-ink-7 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center gap-2 mb-4">
        <User size={14} color="#0a0a0a" />
        <Text className="text-sm font-medium text-ink">Perfil</Text>
      </View>

      <View className="gap-3">
        <View>
          <Text className="text-xs text-ink-4 mb-1">Nombre</Text>
          <TextInput
            value={displayName}
            onChangeText={onChangeName}
            placeholder="Tu nombre"
            placeholderTextColor="#a3a3a3"
            className="bg-paper-2 rounded-xl px-3 py-2 text-sm text-ink"
          />
          <Text className="text-[10px] text-ink-4 mt-1">Visible para tu nutricionista</Text>
        </View>

        <View>
          <Text className="text-xs text-ink-4 mb-1">Altura (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={onChangeHeight}
            placeholder="163"
            placeholderTextColor="#a3a3a3"
            keyboardType="numeric"
            className="bg-paper-2 rounded-xl px-3 py-2 text-sm text-ink"
          />
          <Text className="text-[10px] text-ink-4 mt-1">Se usa para calcular tu IMC</Text>
        </View>

        <View>
          <Text className="text-xs text-ink-4 mb-1">Peso objetivo (kg)</Text>
          <TextInput
            value={goalWeightKg}
            onChangeText={onChangeGoal}
            placeholder="75"
            placeholderTextColor="#a3a3a3"
            keyboardType="decimal-pad"
            className="bg-paper-2 rounded-xl px-3 py-2 text-sm text-ink"
          />
        </View>

        <Pressable
          onPress={onSave}
          disabled={saving}
          className={`py-3 rounded-full bg-ink flex-row items-center justify-center gap-2 ${saving ? 'opacity-50' : ''}`}
        >
          {saved ? <Check size={14} color="#fafaf7" /> : <Save size={14} color="#fafaf7" />}
          <Text className="text-paper text-sm font-medium">
            {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar perfil'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/settings/ProfileSection.tsx
git commit -m "feat(settings): ProfileSection — name + height + goal form"
git push
```

---

### Task 7: `components/settings/DietConfigSheet.tsx` + `DietConfigSection.tsx`

**Files:**
- Create: `components/settings/DietConfigSheet.tsx`
- Create: `components/settings/DietConfigSection.tsx`

- [ ] **Step 1: Create the sheet**

```tsx
// components/settings/DietConfigSheet.tsx
//
// Bottom sheet to add a new diet config: effective date + 6 group inputs.

import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { Save, Calendar } from 'lucide-react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { DEFAULT_DAILY_BUDGET } from '../../lib/constants'
import { getToday } from '../../lib/utils'
import type { FoodGroup } from '../../types'

const GROUPS: { key: FoodGroup; label: string; color: string }[] = [
  { key: 'verdura', label: 'Verdura', color: '#4a7c3a' },
  { key: 'fruta', label: 'Fruta', color: '#ff5a1f' },
  { key: 'carb', label: 'Carbohidratos', color: '#d4a017' },
  { key: 'leguminosa', label: 'Leguminosa', color: '#3a6b8c' },
  { key: 'proteina', label: 'Proteína', color: '#c13b5a' },
  { key: 'grasa', label: 'Grasa', color: '#737373' },
]

type Props = {
  visible: boolean
  saving: boolean
  onClose: () => void
  onSave: (data: { effective_date: string; values: Record<FoodGroup, number> }) => void
}

export function DietConfigSheet({ visible, saving, onClose, onSave }: Props) {
  const [date, setDate] = useState(getToday())
  const [values, setValues] = useState<Record<FoodGroup, number>>({
    verdura: DEFAULT_DAILY_BUDGET.verdura,
    fruta: DEFAULT_DAILY_BUDGET.fruta,
    carb: DEFAULT_DAILY_BUDGET.carb,
    leguminosa: DEFAULT_DAILY_BUDGET.leguminosa,
    proteina: DEFAULT_DAILY_BUDGET.proteina,
    grasa: DEFAULT_DAILY_BUDGET.grasa,
  })

  useEffect(() => {
    if (visible) {
      setDate(getToday())
      setValues({
        verdura: DEFAULT_DAILY_BUDGET.verdura,
        fruta: DEFAULT_DAILY_BUDGET.fruta,
        carb: DEFAULT_DAILY_BUDGET.carb,
        leguminosa: DEFAULT_DAILY_BUDGET.leguminosa,
        proteina: DEFAULT_DAILY_BUDGET.proteina,
        grasa: DEFAULT_DAILY_BUDGET.grasa,
      })
    }
  }, [visible])

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="font-serif text-2xl font-light text-ink mb-4">
        Nueva dieta
      </Text>

      <View className="flex-row items-center gap-2 mb-4">
        <Calendar size={14} color="#737373" />
        <Text className="text-xs text-ink-4">Fecha efectiva:</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#a3a3a3"
          className="flex-1 bg-paper-2 rounded-lg px-3 py-1.5 text-sm text-ink"
        />
      </View>

      <View className="flex-row flex-wrap gap-3 mb-4">
        {GROUPS.map((g) => (
          <View key={g.key} style={{ width: '47%' }}>
            <Text className="text-xs mb-1" style={{ color: g.color }}>{g.label}</Text>
            <TextInput
              value={String(values[g.key])}
              onChangeText={(v) =>
                setValues((prev) => ({ ...prev, [g.key]: parseInt(v, 10) || 0 }))
              }
              keyboardType="number-pad"
              className="bg-paper-2 rounded-lg px-3 py-2 text-sm text-ink"
            />
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onClose}
          className="flex-1 py-3 rounded-full border border-ink-7 items-center"
        >
          <Text className="text-sm text-ink font-medium">Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() => onSave({ effective_date: date, values })}
          disabled={saving}
          className={`flex-1 py-3 rounded-full bg-ink flex-row items-center justify-center gap-2 ${saving ? 'opacity-50' : ''}`}
        >
          <Save size={14} color="#fafaf7" />
          <Text className="text-paper text-sm font-medium">
            {saving ? 'Guardando...' : 'Guardar'}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Create the section that lists configs + opens the sheet**

```tsx
// components/settings/DietConfigSection.tsx
//
// Lists past diet configs (newest first, active highlighted) + "+ Nueva" button
// → opens DietConfigSheet. Delete via ConfirmDialog.

import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Utensils, Plus, Trash2 } from 'lucide-react-native'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { DietConfigSheet } from './DietConfigSheet'
import { DEFAULT_DAILY_BUDGET } from '../../lib/constants'
import type { DietConfig, FoodGroup } from '../../types'

type Props = {
  configs: DietConfig[]
  saving: boolean
  onCreate: (data: { effective_date: string; values: Record<FoodGroup, number> }) => void
  onDelete: (id: string) => void
}

const formatDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DietConfigSection({ configs, saving, onCreate, onDelete }: Props) {
  const [showSheet, setShowSheet] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <View className="bg-white border border-ink-7 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <Utensils size={14} color="#0a0a0a" />
          <Text className="text-sm font-medium text-ink">Configuración de dieta</Text>
        </View>
        <Pressable
          onPress={() => setShowSheet(true)}
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-paper-2"
        >
          <Plus size={12} color="#0a0a0a" />
          <Text className="text-xs text-ink font-medium">Nueva</Text>
        </Pressable>
      </View>

      {configs.length === 0 ? (
        <View className="py-4 items-center">
          <Text className="text-xs text-ink-4">Sin configuraciones. Se usan los valores por defecto.</Text>
        </View>
      ) : (
        <View className="gap-2">
          {configs.map((cfg, idx) => (
            <View
              key={cfg.id}
              className={`bg-paper-2 rounded-xl p-3 ${idx === 0 ? 'border border-signal/40' : ''}`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-ink">{formatDate(cfg.effective_date)}</Text>
                  {idx === 0 && (
                    <Text className="text-[10px] px-1.5 py-0.5 rounded bg-signal/20 text-signal"
                      style={{ fontFamily: 'ui-monospace' }}>
                      Activa
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => setConfirmDeleteId(cfg.id)} className="p-1">
                  <Trash2 size={14} color="#c13b5a" />
                </Pressable>
              </View>
              <View className="flex-row gap-2">
                {(['verdura', 'fruta', 'carb', 'leguminosa', 'proteina', 'grasa'] as FoodGroup[]).map((g) => (
                  <View key={g} className="flex-1 items-center">
                    <Text className="text-[10px] text-ink-4 uppercase"
                      style={{ fontFamily: 'ui-monospace' }}>
                      {g[0]}
                    </Text>
                    <Text className="text-sm font-medium text-ink"
                      style={{ fontFamily: 'ui-monospace' }}>
                      {cfg[g]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <View className="mt-3 pt-3 border-t border-ink-7">
        <Text className="text-[10px] text-ink-4 mb-1.5"
          style={{ fontFamily: 'ui-monospace' }}>
          VALORES POR DEFECTO
        </Text>
        <View className="flex-row gap-2">
          {(['verdura', 'fruta', 'carb', 'leguminosa', 'proteina', 'grasa'] as FoodGroup[]).map((g) => (
            <View key={g} className="flex-1 items-center">
              <Text className="text-[10px] text-ink-4"
                style={{ fontFamily: 'ui-monospace' }}>
                {g[0].toUpperCase()}
              </Text>
              <Text className="text-xs text-ink-4"
                style={{ fontFamily: 'ui-monospace' }}>
                {DEFAULT_DAILY_BUDGET[g]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <DietConfigSheet
        visible={showSheet}
        saving={saving}
        onClose={() => setShowSheet(false)}
        onSave={(data) => {
          onCreate(data)
          setShowSheet(false)
        }}
      />

      <ConfirmDialog
        visible={!!confirmDeleteId}
        title="¿Eliminar configuración?"
        body="Esta dieta dejará de usarse. Acción reversible (puedes crear una nueva)."
        icon={<Trash2 size={28} color="#c13b5a" />}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) {
            onDelete(confirmDeleteId)
            setConfirmDeleteId(null)
          }
        }}
      />
    </View>
  )
}
```

- [ ] **Step 3: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/settings/DietConfigSheet.tsx components/settings/DietConfigSection.tsx
git commit -m "feat(settings): DietConfig section + add sheet (BottomSheet form)"
git push
```

---

### Task 8: `components/settings/DangerZone.tsx`

**Files:**
- Create: `components/settings/DangerZone.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/settings/DangerZone.tsx
//
// Account deletion with phrase confirmation. Two states:
// 1. Compact "Eliminar mi cuenta" button.
// 2. Expanded: warning + TextInput for "ELIMINAR MI CUENTA" + Confirm button.

import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { AlertTriangle, Trash2 } from 'lucide-react-native'

const PHRASE = 'ELIMINAR MI CUENTA'

type Props = {
  deleting: boolean
  error: string | null
  onConfirm: (phrase: string) => void
}

export function DangerZone({ deleting, error, onConfirm }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')

  return (
    <View className="bg-white border border-berry/40 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center gap-2 mb-3">
        <AlertTriangle size={14} color="#c13b5a" />
        <Text className="text-sm font-medium text-berry">Zona de peligro</Text>
      </View>

      {!expanded ? (
        <>
          <Text className="text-xs text-ink-4 mb-3 leading-5">
            Eliminar tu cuenta borra permanentemente tus datos: comida, peso, gym, hábitos,
            fotos y configuraciones. No se puede deshacer.
          </Text>
          <Pressable
            onPress={() => setExpanded(true)}
            className="py-3 rounded-full border border-berry/50 items-center"
          >
            <Text className="text-berry text-sm font-medium">Eliminar mi cuenta</Text>
          </Pressable>
        </>
      ) : (
        <View className="gap-3">
          <View className="bg-berry/10 border border-berry/30 rounded-xl p-3">
            <Text className="text-sm text-berry font-medium mb-1">
              ¿Estás seguro? Esta acción es permanente.
            </Text>
            <Text className="text-xs text-berry/80">
              Para confirmar, escribe: <Text className="font-bold">{PHRASE}</Text>
            </Text>
          </View>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={PHRASE}
            placeholderTextColor="#a3a3a3"
            autoCapitalize="characters"
            className="bg-paper-2 rounded-xl px-3 py-2 text-sm text-ink border border-berry/30"
          />

          {error && <Text className="text-xs text-berry">{error}</Text>}

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                setExpanded(false)
                setInput('')
              }}
              disabled={deleting}
              className="flex-1 py-3 rounded-full border border-ink-7 items-center"
            >
              <Text className="text-sm text-ink font-medium">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(input)}
              disabled={deleting || input !== PHRASE}
              className={`flex-1 py-3 rounded-full bg-berry flex-row items-center justify-center gap-2 ${(deleting || input !== PHRASE) ? 'opacity-50' : ''}`}
            >
              <Trash2 size={14} color="#fafaf7" />
              <Text className="text-paper text-sm font-medium">
                {deleting ? 'Eliminando...' : 'Confirmar'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add components/settings/DangerZone.tsx
git commit -m "feat(settings): DangerZone — phrase-confirmed account deletion"
git push
```

---

### Task 9: `app/(app)/settings/index.tsx` — orchestrator

**Files:**
- Create: `app/(app)/settings/index.tsx`

- [ ] **Step 1: Create directory + screen**

```bash
mkdir -p 'app/(app)/settings'
```

```tsx
// app/(app)/settings/index.tsx
//
// Settings orchestrator: composes ProfileSection + DietConfigSection + DangerZone.
// Owns load/save state for each subsection.

import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useUser } from '../../../lib/hooks/useUser'
import { useToast } from '../../../lib/hooks/useToast'
import { supabase } from '../../../lib/supabase'
import { apiFetch } from '../../../lib/api-client'
import { ProfileSection } from '../../../components/settings/ProfileSection'
import { DietConfigSection } from '../../../components/settings/DietConfigSection'
import { DangerZone } from '../../../components/settings/DangerZone'
import { PulseLine } from '../../../components/ui/PulseLine'
import type { DietConfig, FoodGroup } from '../../../types'

export default function SettingsScreen() {
  const { user } = useUser()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile
  const [displayName, setDisplayName] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [goalWeightKg, setGoalWeightKg] = useState('')

  // Diet configs
  const [configs, setConfigs] = useState<DietConfig[]>([])

  // Delete account
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [profileRes, configsRes] = await Promise.all([
        (supabase as any).from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('diet_configs').select('*').eq('user_id', user.id)
          .order('effective_date', { ascending: false }),
      ])
      if (profileRes.data) {
        setDisplayName(profileRes.data.display_name ?? '')
        setHeightCm(profileRes.data.height_cm?.toString() ?? '')
        setGoalWeightKg(profileRes.data.goal_weight_kg?.toString() ?? '')
      }
      setConfigs((configsRes.data as DietConfig[]) ?? [])
    } catch {
      showToast('Error al cargar')
    }
    setLoading(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const data = {
        user_id: user.id,
        display_name: displayName.trim() || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        goal_weight_kg: goalWeightKg ? parseFloat(goalWeightKg) : null,
        updated_at: new Date().toISOString(),
      }
      const { data: existing } = await (supabase as any)
        .from('user_profiles').select('id').eq('user_id', user.id).maybeSingle()
      if (existing) {
        await (supabase as any).from('user_profiles').update(data).eq('user_id', user.id)
      } else {
        await (supabase as any).from('user_profiles').insert(data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      showToast('Error al guardar perfil')
    }
    setSaving(false)
  }

  const createDietConfig = async (data: {
    effective_date: string
    values: Record<FoodGroup, number>
  }) => {
    if (!user) return
    setSaving(true)
    try {
      await (supabase as any).from('diet_configs').upsert(
        { user_id: user.id, effective_date: data.effective_date, ...data.values },
        { onConflict: 'user_id,effective_date' },
      )
      const { data: refreshed } = await (supabase as any)
        .from('diet_configs').select('*').eq('user_id', user.id)
        .order('effective_date', { ascending: false })
      setConfigs((refreshed as DietConfig[]) ?? [])
      showToast('Dieta guardada')
    } catch {
      showToast('Error al guardar dieta')
    }
    setSaving(false)
  }

  const deleteDietConfig = async (id: string) => {
    try {
      await (supabase as any).from('diet_configs').delete().eq('id', id)
      setConfigs((prev) => prev.filter((c) => c.id !== id))
    } catch {
      showToast('Error al eliminar')
    }
  }

  const deleteAccount = async (phrase: string) => {
    if (phrase !== 'ELIMINAR MI CUENTA') {
      setDeleteError('Escribe exactamente: ELIMINAR MI CUENTA')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      const response = await apiFetch('/api/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmation: phrase }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        setDeleteError(json?.error ?? 'Error al eliminar la cuenta')
        setDeleting(false)
        return
      }
      await supabase.auth.signOut()
      router.replace('/(auth)/login?deleted=true' as any)
    } catch {
      setDeleteError('Error de conexión. Intenta de nuevo.')
      setDeleting(false)
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
            <Text className="font-serif text-2xl font-light text-ink">Configuración</Text>
            <Text className="text-xs text-ink-4">Perfil y preferencias</Text>
          </View>
        </View>

        <View className="px-5 mt-5">
          <ProfileSection
            displayName={displayName}
            heightCm={heightCm}
            goalWeightKg={goalWeightKg}
            saving={saving}
            saved={saved}
            onChangeName={setDisplayName}
            onChangeHeight={setHeightCm}
            onChangeGoal={setGoalWeightKg}
            onSave={saveProfile}
          />

          <DietConfigSection
            configs={configs}
            saving={saving}
            onCreate={createDietConfig}
            onDelete={deleteDietConfig}
          />

          <DangerZone
            deleting={deleting}
            error={deleteError}
            onConfirm={deleteAccount}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/settings/index.tsx'
git commit -m "feat(settings): orchestrator — profile + diet configs + danger zone"
git push
```

Notes:
- The web `delete-account` flow signs the user out client-side after success. This plan does the same.
- If `apiFetch` doesn't return a `Response`, adapt the `response.ok / response.json()` handling. Plan 1 sets it as a fetch wrapper that returns Response.

---

### Task 10: Add dashboard entry rows

**Files:**
- Modify: `app/(app)/dashboard.tsx`

- [ ] **Step 1: Add three entry rows below the weight card**

Open `app/(app)/dashboard.tsx`. Right before the closing `</ScrollView>` (and `Cerrar sesión` Button block), insert this new section. ALSO add three icon imports near the top (`Sparkles`, `BookOpen`, `Settings`):

```tsx
// Update imports near the top — add these icons:
import { ChevronRight, Sparkles, BookOpen, Settings } from 'lucide-react-native'

// ...inside the return, after the weight Card Pressable Link, BEFORE the
// "Cerrar sesión" button section:
<View className="px-5 mt-6 gap-2">
  <Link href={"/(app)/coach" as any} asChild>
    <Pressable className="flex-row items-center gap-3 bg-white border border-ink-7 rounded-2xl p-4">
      <View className="w-10 h-10 rounded-full bg-paper-2 items-center justify-center">
        <Sparkles size={16} color="#ff5a1f" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">Coach Fit</Text>
        <Text className="text-xs text-ink-4">Pregunta lo que necesites</Text>
      </View>
      <ChevronRight size={14} color="#a3a3a3" />
    </Pressable>
  </Link>

  <Link href={"/(app)/journal" as any} asChild>
    <Pressable className="flex-row items-center gap-3 bg-white border border-ink-7 rounded-2xl p-4">
      <View className="w-10 h-10 rounded-full bg-paper-2 items-center justify-center">
        <BookOpen size={16} color="#0a0a0a" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">Journal</Text>
        <Text className="text-xs text-ink-4">Reflexiones diarias</Text>
      </View>
      <ChevronRight size={14} color="#a3a3a3" />
    </Pressable>
  </Link>

  <Link href={"/(app)/settings" as any} asChild>
    <Pressable className="flex-row items-center gap-3 bg-white border border-ink-7 rounded-2xl p-4">
      <View className="w-10 h-10 rounded-full bg-paper-2 items-center justify-center">
        <Settings size={16} color="#0a0a0a" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">Configuración</Text>
        <Text className="text-xs text-ink-4">Perfil y preferencias</Text>
      </View>
      <ChevronRight size={14} color="#a3a3a3" />
    </Pressable>
  </Link>
</View>
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/dashboard.tsx'
git commit -m "feat(dashboard): entry rows for Coach + Journal + Settings"
git push
```

If `Sparkles` icon doesn't exist in `lucide-react-native`, substitute with `Bot` or `MessageCircle`.

---

### Task 11: Hide coach/journal/settings sub-routes from tabs

**Files:**
- Modify: `app/(app)/_layout.tsx`

- [ ] **Step 1: Add hidden screen entries**

Open `app/(app)/_layout.tsx`. After the existing `food/_plate-photo` hidden entry from Plan 5, add:

```tsx
<Tabs.Screen
  name="coach/index"
  options={{
    href: null,
  }}
/>
<Tabs.Screen
  name="journal/index"
  options={{
    href: null,
  }}
/>
<Tabs.Screen
  name="settings/index"
  options={{
    href: null,
  }}
/>
```

- [ ] **Step 2: Verify TS + commit**

```bash
npx tsc --noEmit
git add 'app/(app)/_layout.tsx'
git commit -m "fix(navigation): hide coach/journal/settings from tab bar"
git push
```

---

### Task 12: Smoke test in Expo Go

**Files:** (no code — verification)

- [ ] **Step 1: Boot the app**

```bash
cd /c/Users/Rafae/Projects/fitkis-mobile
npx expo start --clear
```

- [ ] **Step 2: Navigate from Dashboard → Coach**

- Tap the "Coach Fit" row.
- See header with back arrow, "Coach Fit" label, trash icon.
- Welcome message visible.
- 4 quick-action chips below.
- Tap one → message appears, "Pensando..." loader, then assistant reply (5–15s).
- Type a free-form message → send.
- Trash icon → conversation resets to welcome message.

- [ ] **Step 3: Navigate from Dashboard → Journal**

- Tap "Journal" row.
- Header with date label "Hoy" + Save button on right.
- Free text textarea.
- 3 question cards in serif italic; "2 cambios restantes" badge.
- Type into one → tap Save → "Guardado" check appears briefly.
- Tap circle-arrow on a question → it changes to a new question, badge → "1 cambios restantes".
- Use ChevronLeft → goes to yesterday. ChevronRight → returns to today.
- Try ChevronRight on today → disabled.

- [ ] **Step 4: Navigate from Dashboard → Configuración**

- Tap "Configuración" row.
- See Profile section + Diet Config section + Danger Zone.
- Edit name → tap "Guardar perfil" → "Guardado" check.
- Tap "+ Nueva" in Diet Config → BottomSheet opens with date + 6 inputs.
- Edit values → tap "Guardar" → sheet closes, new config appears at top with "Activa" badge.
- Tap trash on a config → ConfirmDialog → confirm → row disappears.
- Tap "Eliminar mi cuenta" → expanded view with phrase input.
- Type something else → "Confirmar" disabled.
- Type `ELIMINAR MI CUENTA` → button enables. (Don't actually tap unless you want to delete!)

- [ ] **Step 5: Confirm tab bar**

Bottom bar still shows only 4 tabs (Hoy / Gym / Comida / Hábitos).

---

## Self-Review Checklist

### 1. Spec coverage
- ✅ Coach AI chat (Task 3)
- ✅ Suggested prompts row (Task 3)
- ✅ Inverted FlatList + KeyboardAvoidingView (Task 3)
- ✅ Journal date nav + free text + 3 rotating prompts + skip (Tasks 4, 5)
- ✅ 200-question pool with no-repeat tracking (Task 1, used in Task 5)
- ✅ Settings: profile, diet config CRUD, delete account with phrase confirm (Tasks 6-9)
- ✅ Dashboard entry points (Task 10)
- ✅ Hidden routes (Task 11)
- ✅ Smoke test (Task 12)

### 2. Placeholder scan
No "TBD", "TODO", "implement later" found. The chat streaming is explicitly deferred to v2 (acknowledged in Decisions).

### 3. Type consistency
- `Message` defined in Task 3, only used there.
- `JournalQuestion` from `types/index.ts` used in Tasks 4, 5.
- `DietConfig` from `types/index.ts` used in Tasks 7, 9.
- `FoodGroup` from `types/index.ts` used in Tasks 7.
- All hooks (`useUser`, `useToast`) and helpers (`apiFetch`, `formatDateISO`, `getToday`, `DEFAULT_DAILY_BUDGET`) from existing modules.

No drift detected.

---

## Summary

| Task | What | LOC |
|---|---|---|
| 1 | lib/journal-questions.ts | ~290 (copied) |
| 2 | ChatBubble | ~30 |
| 3 | coach/index.tsx | ~170 |
| 4 | QuestionCard | ~50 |
| 5 | journal/index.tsx | ~250 |
| 6 | ProfileSection | ~85 |
| 7 | DietConfigSheet + DietConfigSection | ~200 |
| 8 | DangerZone | ~95 |
| 9 | settings/index.tsx | ~190 |
| 10 | dashboard entry rows | ~50 (modify) |
| 11 | hide tabs | ~15 |
| 12 | smoke test | 0 |

Total: ~1135 net new LOC + ~290 copied across 12 tasks. ~2-3 days of subagent execution.

After Plan 6 completes, the mobile app reaches **feature parity with web's patient experience**. Plan 7 is then polish + closed beta + public release.
