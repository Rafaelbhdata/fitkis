'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, X } from 'lucide-react';
import ChatMessage from './ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hola, soy Coach. Puedo registrar tu comida, consultar tu progreso, o resolver dudas de nutricion. En que te ayudo?',
};

const QUICK_ACTIONS = [
  { label: 'Que me queda?', message: 'Cuantos equivalentes me quedan hoy?' },
  { label: 'Ideas cena', message: 'Dame ideas para la cena' },
  { label: 'Que rutina?', message: 'Que rutina me toca hoy?' },
];

export default function CoachBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [...messages.slice(1), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) throw new Error('Error en la respuesta');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error procesando tu mensaje. Intenta de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Button - positioned above the mobile dock */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-12 h-12 bg-ink rounded-full shadow-dock flex items-center justify-center z-40 hover:scale-105 transition-transform"
          aria-label="Abrir Coach"
        >
          <Sparkles className="w-5 h-5 text-signal" />
        </button>
      )}

      {/* Chat Drawer */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Panel */}
          <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-[85vh] md:h-[600px] md:max-h-[80vh] bg-paper md:rounded-2xl shadow-2xl z-50 flex flex-col border border-ink-7 overflow-hidden animate-slide-up md:animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-7 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-signal" />
                </div>
                <div>
                  <h3 className="font-serif font-medium text-sm text-ink">Coach</h3>
                  <p className="fk-eyebrow">Tu asistente</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-paper-2 flex items-center justify-center transition-colors text-ink-4 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-paper-2">
              {messages.map((message, index) => (
                <ChatMessage key={index} role={message.role} content={message.content} compact />
              ))}

              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3 h-3 text-signal animate-spin" />
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-white border border-ink-7 rounded-tl-sm">
                    <p className="text-xs text-ink-4">Pensando...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="flex gap-2 px-4 pb-2 overflow-x-auto bg-paper-2">
                {QUICK_ACTIONS.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(action.message)}
                    className="px-3 py-1.5 text-xs bg-white border border-ink-7 rounded-full hover:border-signal hover:text-signal transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 p-4 border-t border-ink-7 bg-white"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="flex-1 bg-paper-2 border border-ink-7 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-ink text-ink placeholder:text-ink-5"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-signal text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
