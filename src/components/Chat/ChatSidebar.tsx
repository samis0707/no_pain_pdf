'use client'

import { useState, useCallback, useEffect } from 'react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import HelperPanel from './HelperPanel'
import type { ChatMessage } from './types'

interface ChatSidebarProps {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  onSend: (content: string) => void
  onClear: () => void
  onExportPdf?: () => void
  isExporting?: boolean
}

function enrichErrorMessage(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('llm_provider')) {
    return `${msg} — Set LLM_PROVIDER in your .env file (e.g. LLM_PROVIDER=openai)`
  }
  if (lower.includes('api_key')) {
    return `${msg} — Set LLM_API_KEY in your .env file`
  }
  if (lower.includes('no item selected')) {
    return `${msg} — Open the Design tab first to load a template`
  }
  if (lower.includes('chat request failed') || lower.includes('failed to fetch')) {
    return `${msg} — The chat API is unreachable. Is the server running? Check the terminal for errors.`
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('403') || lower.includes('forbidden')) {
    return `${msg} — Your API key was rejected. Check LLM_API_KEY in .env`
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return `${msg} — API rate limit exceeded. Wait a moment and try again.`
  }
  return msg
}

export default function ChatSidebar({ messages, isStreaming, error, onSend, onClear, onExportPdf, isExporting }: ChatSidebarProps) {
  const [width, setWidth] = useState(380)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newWidth = Math.max(280, Math.min(800, window.innerWidth - e.clientX))
    setWidth(newWidth)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      className="relative flex flex-col h-full bg-white border-l"
      style={{ width }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-zinc-50 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-800">AI Chat</h2>
        <div className="flex items-center gap-2">
          {onExportPdf && !isStreaming && (
            <button
              data-testid="export-pdf-button"
              onClick={onExportPdf}
              disabled={isExporting}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:text-green-100 rounded-md transition-colors"
              type="button"
            >
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>
          )}
          <button
            data-testid="new-chat-button"
            onClick={onClear}
            disabled={isStreaming}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isStreaming
                ? 'text-zinc-300 bg-zinc-100 border border-zinc-200 cursor-not-allowed'
                : 'text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-50'
            }`}
            type="button"
          >
            New Chat
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="chat-error-banner"
          className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 whitespace-pre-wrap"
        >
          <span className="font-semibold">Error: </span>
          {enrichErrorMessage(error)}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList messages={messages} isStreaming={isStreaming} />
      </div>

      <HelperPanel />

      <MessageInput onSend={onSend} disabled={isStreaming} />

      <div
        data-testid="resize-handle"
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
