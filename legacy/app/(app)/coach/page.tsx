'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import ChatMessage from '@/components/coach/ChatMessage'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: '¡Hola! Soy Coach Fit, tu asistente personal de fitness y nutrición. Puedo ayudarte a:\n\n- Registrar lo que comes (solo cuéntame y yo lo anoto)\n- Consultar tu presupuesto de equivalentes\n- Ver y actualizar tus datos del gym\n- Sugerir ideas de comidas\n- Resolver dudas de nutrición\n\n¿En qué te puedo ayudar hoy?',
}

const QUICK_ACTIONS = [
  { label: '¿Qué me queda hoy?', message: '¿Cuántos equivalentes me quedan hoy?' },
  { label: 'Ideas para cena', message: 'Dame ideas para la cena con lo que me queda del presupuesto' },
  { label: '¿Qué rutina toca?', message: '¿Qué rutina de gym me toca hoy?' },
  { label: 'Mi progreso', message: '¿Cómo voy con mi peso esta semana?' },
]

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: content.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Abort controller with 60s timeout for AI chat
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      // Prepare messages for API (exclude initial assistant message for cleaner context)
      const apiMessages = [...messages.slice(1), userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Error en la respuesta')
      }

      const data = await response.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
      }])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Por favor intenta de nuevo.'
        : 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-glow-violet">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">Coach Fit</h1>
            <p className="text-xs text-muted-foreground">Tu asistente de fitness y nutrición</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
          title="Limpiar conversación"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} role={message.role} content={message.content} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-glow-violet">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-tl-sm">
              <p className="text-sm text-muted-foreground">Pensando...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 pb-4">
          {QUICK_ACTIONS.map((action, index) => (
            <button
              key={index}
              onClick={() => sendMessage(action.message)}
              className="px-3 py-1.5 text-xs bg-surface border border-border rounded-full hover:border-violet-500 hover:text-violet-400 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          rows={1}
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="w-12 h-12 bg-accent text-background rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  )
}
