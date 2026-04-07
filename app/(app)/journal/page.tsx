'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, BookOpen, Save, Check } from 'lucide-react'
import { useUser, useSupabase } from '@/lib/hooks'
import { JOURNAL_QUESTIONS, getRandomQuestions, getReplacementQuestion } from '@/lib/journal-questions'
import type { JournalEntry, JournalQuestion } from '@/types'

const formatDateISO = (date: Date) => date.toISOString().split('T')[0]

const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

export default function JournalPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [selectedDate, setSelectedDate] = useState(today)
  const [freeText, setFreeText] = useState('')
  const [questions, setQuestions] = useState<JournalQuestion[]>([])
  const [skipsUsed, setSkipsUsed] = useState(0)
  const [usedQuestionIndices, setUsedQuestionIndices] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)

  const selectedDateISO = formatDateISO(selectedDate)
  const isToday = selectedDateISO === formatDateISO(today)
  const isFuture = selectedDate > today

  // Cargar preguntas usadas del usuario
  const loadUsedQuestions = useCallback(async () => {
    if (!user) return []

    const { data } = await (supabase as any)
      .from('journal_used_questions')
      .select('question_index')
      .eq('user_id', user.id)

    if (data) {
      const indices = data.map((d: any) => d.question_index)
      setUsedQuestionIndices(indices)
      return indices
    }
    return []
  }, [user, supabase])

  // Cargar entrada del día
  const loadEntry = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // Cargar preguntas usadas primero
      const usedIndices = await loadUsedQuestions()

      // Buscar entrada existente
      const { data: entry } = await (supabase as any)
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDateISO)
        .single()

      if (entry) {
        setEntryId(entry.id)
        setFreeText(entry.free_text || '')
        setQuestions(entry.questions || [])
        setSkipsUsed(entry.skips_used || 0)
      } else {
        // Nueva entrada - generar preguntas aleatorias
        setEntryId(null)
        setFreeText('')
        setSkipsUsed(0)

        // Generar 3 preguntas nuevas
        const newQuestions = getRandomQuestions(usedIndices, 3)
        setQuestions(newQuestions.map(q => ({
          index: q.index,
          question: q.question,
          answer: ''
        })))
      }
    } catch (err) {
      // No entry found, generate new questions
      setEntryId(null)
      setFreeText('')
      setSkipsUsed(0)

      const newQuestions = getRandomQuestions(usedQuestionIndices, 3)
      setQuestions(newQuestions.map(q => ({
        index: q.index,
        question: q.question,
        answer: ''
      })))
    } finally {
      setLoading(false)
    }
  }, [user, supabase, selectedDateISO, loadUsedQuestions, usedQuestionIndices])

  useEffect(() => {
    loadEntry()
  }, [loadEntry])

  // Guardar entrada
  const saveEntry = async () => {
    if (!user || isFuture) return
    setSaving(true)

    try {
      const entryData = {
        user_id: user.id,
        date: selectedDateISO,
        free_text: freeText,
        questions: questions,
        skips_used: skipsUsed,
        updated_at: new Date().toISOString()
      }

      if (entryId) {
        // Update existing
        await (supabase as any)
          .from('journal_entries')
          .update(entryData)
          .eq('id', entryId)
      } else {
        // Insert new
        const { data } = await (supabase as any)
          .from('journal_entries')
          .insert(entryData)
          .select('id')
          .single()

        if (data) {
          setEntryId(data.id)

          // Marcar preguntas como usadas
          const usedQuestionsToInsert = questions.map(q => ({
            user_id: user.id,
            question_index: q.index,
            date_used: selectedDateISO
          }))

          await (supabase as any)
            .from('journal_used_questions')
            .upsert(usedQuestionsToInsert, { onConflict: 'user_id,question_index' })
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving journal:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Cambiar pregunta
  const skipQuestion = async (questionIndex: number) => {
    if (skipsUsed >= 2 || isFuture) return

    const currentIndices = questions.map(q => q.index)
    const replacement = getReplacementQuestion(usedQuestionIndices, currentIndices)

    if (!replacement) {
      alert('No hay más preguntas disponibles')
      return
    }

    const newQuestions = [...questions]
    newQuestions[questionIndex] = {
      index: replacement.index,
      question: replacement.question,
      answer: ''
    }

    setQuestions(newQuestions)
    setSkipsUsed(prev => prev + 1)
  }

  // Actualizar respuesta
  const updateAnswer = (questionIndex: number, answer: string) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      answer
    }
    setQuestions(newQuestions)
  }

  // Navegación de fechas
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    setSelectedDate(prev)
  }

  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    if (next <= today) {
      setSelectedDate(next)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold">Journal</h1>
            <p className="text-xs text-muted-foreground">Reflexiones diarias</p>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveEntry}
          disabled={saving || isFuture}
          className="btn-primary flex items-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Guardado
            </>
          ) : saving ? (
            <>
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Guardando
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar
            </>
          )}
        </button>
      </div>

      {/* Date navigation */}
      <div className="card p-3 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousDay}
            className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface-hover transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="font-medium capitalize">{formatDateDisplay(selectedDate)}</p>
            {isToday && <span className="text-xs text-accent">Hoy</span>}
          </div>

          <button
            onClick={goToNextDay}
            disabled={isToday}
            className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Future date warning */}
      {isFuture && (
        <div className="card p-4 mb-6 border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-400 text-sm text-center">
            No puedes ver las preguntas de días futuros
          </p>
        </div>
      )}

      {!isFuture && (
        <>
          {/* Free text section */}
          <div className="card p-4 mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Mi día
            </label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Escribe libremente sobre tu día..."
              className="w-full h-32 bg-surface-elevated rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Questions section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Preguntas del día</h2>
              <span className="text-xs text-muted-foreground">
                {2 - skipsUsed} cambios restantes
              </span>
            </div>

            {questions.map((q, idx) => (
              <div key={`${q.index}-${idx}`} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-purple-300">{q.question}</p>
                  {skipsUsed < 2 && (
                    <button
                      onClick={() => skipQuestion(idx)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface-hover transition-colors"
                      title="Cambiar pregunta"
                    >
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <textarea
                  value={q.answer}
                  onChange={(e) => updateAnswer(idx, e.target.value)}
                  placeholder="Tu respuesta..."
                  className="w-full h-24 bg-surface-elevated rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-muted-foreground/50"
                />
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>
              {200 - usedQuestionIndices.length} preguntas disponibles de 200
            </p>
          </div>
        </>
      )}
    </div>
  )
}
