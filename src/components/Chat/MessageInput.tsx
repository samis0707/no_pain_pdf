'use client'

import { useState, useRef, type KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-white">
      <button
        data-testid="image-upload-button"
        className="p-2 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 disabled:text-zinc-200"
        disabled={disabled}
        aria-label="Upload image"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
      <textarea
        ref={textareaRef}
        data-testid="message-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Sending...' : 'Type a message...'}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-50 disabled:text-zinc-400"
      />
      <button
        data-testid="send-button"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors"
        type="button"
      >
        {disabled ? 'Sending...' : 'Send'}
      </button>
    </div>
  )
}
