'use client'

import { useEffect, useRef } from 'react'
import type { ChatMessage } from './types'
import MarkdownRenderer from './MarkdownRenderer'

interface MessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onRollback?: (msg: ChatMessage) => void
}

// Tool calls that change the document — only these offer a rollback.
const MUTATOR_TOOLS = new Set([
  'update_template',
  'update_template_html',
  'update_page_format',
  'apply_template',
  'register_helper',
])

function hasMutatorCall(msg: ChatMessage): boolean {
  return msg.toolCalls?.some((tc) => MUTATOR_TOOLS.has(tc.name)) ?? false
}

function roleStyle(role: ChatMessage['role']): string {
  switch (role) {
    case 'user':
      return 'self-end bg-blue-500 text-white'
    case 'assistant':
      return 'self-start bg-zinc-100 text-zinc-900'
    case 'tool':
      return 'self-start bg-zinc-50 text-zinc-500 border border-zinc-200 text-xs'
    default:
      return 'self-start bg-zinc-50 text-zinc-500'
  }
}

export default function MessageList({ messages, isStreaming, onRollback }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div data-testid="empty-state" className="flex items-center justify-center h-full text-zinc-400 text-sm">
        No messages yet. Start a conversation!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
      {messages.map((msg, i) => (
        <div
          key={msg.id ?? i}
          data-testid={`message-${msg.role}`}
          className={`max-w-[80%] rounded-lg px-4 py-2 text-sm leading-relaxed ${roleStyle(msg.role)}`}
        >
          <MarkdownRenderer content={msg.content} />
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="space-y-1 mt-1">
              {msg.toolCalls.map((tc) => (
                <details key={tc.id} className="text-xs text-zinc-500">
                  <summary className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-700">
                    <span className="text-zinc-500 text-sm font-bold">→</span>
                    <span>{tc.label || `Running ${tc.name}...`}</span>
                  </summary>
                  <div className="mt-1 ml-4 p-2 bg-zinc-50 rounded border border-zinc-200 font-mono text-[10px] whitespace-pre-wrap text-zinc-600">
                    {JSON.stringify(tc.args, null, 2)}
                  </div>
                </details>
              ))}
            </div>
          )}
          {msg.role === 'tool' && msg.version != null && (
            <span
              data-testid="version-badge"
              className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600"
            >
              v{msg.version}
            </span>
          )}
          {(msg.role === 'tool' || (msg.role === 'assistant' && hasMutatorCall(msg))) && (
            <button
              data-testid="rollback-link"
              className="ml-2 text-blue-500 hover:text-blue-700 underline text-[10px]"
              onClick={() => onRollback?.(msg)}
            >
              ↩ Rollback
            </button>
          )}
        </div>
      ))}
      {isStreaming && (
        <div
          data-testid="streaming-indicator"
          className="self-start bg-zinc-100 text-zinc-500 rounded-lg px-4 py-2 text-sm"
        >
          <span className="inline-flex gap-1">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
