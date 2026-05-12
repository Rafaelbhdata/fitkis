'use client'

import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  compact?: boolean
}

export default function ChatMessage({ role, content, compact = false }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center flex-shrink-0',
          compact ? 'w-7 h-7' : 'w-8 h-8',
          isUser ? 'bg-cyan-500' : 'bg-gradient-to-br from-violet-500 to-pink-500 shadow-glow-violet'
        )}
      >
        {isUser ? (
          <User className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', 'text-background')} />
        ) : (
          <Bot className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', 'text-white')} />
        )}
      </div>
      <div
        className={cn(
          'rounded-2xl max-w-[80%]',
          compact ? 'px-3 py-2' : 'px-4 py-3',
          isUser
            ? 'bg-cyan-500 text-background rounded-tr-sm'
            : 'bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-tl-sm'
        )}
      >
        <p className={cn(compact ? 'text-xs' : 'text-sm', 'whitespace-pre-wrap')}>{content}</p>
      </div>
    </div>
  )
}
