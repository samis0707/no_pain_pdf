'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import MarkdownRenderer from './MarkdownRenderer'
import { applyToolEffects } from '@/lib/ai/tool-effects'
import { renderPdfPages } from '@/utils/pdfToImages'
import { TOOL_LABELS_DE } from '@/lib/ai/tool-labels'

interface SdkChatProps {
  itemId: string
}

const MUTATOR_PARTS = new Set([
  'tool-update_template',
  'tool-update_template_html',
  'tool-update_page_format',
  'tool-apply_template',
  'tool-register_helper',
])

function toolName(partType: string): string {
  return partType.slice('tool-'.length)
}

export default function SdkChat({ itemId }: SdkChatProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Array<{ mediaType: string; url: string; label: string }>>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const historyLoaded = useRef(false)

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { itemId },
    }),
    onFinish: ({ message }) => {
      void applyToolEffects(message as never)
    },
  })

  useEffect(() => {
    if (historyLoaded.current) return
    historyLoaded.current = true
    fetch(`/api/chat?itemId=${itemId}`)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages as UIMessage[])
        }
      })
      .catch(() => {})
  }, [itemId, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isBusy = status === 'streaming' || status === 'submitted'

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const next: Array<{ mediaType: string; url: string; label: string }> = []
    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf') {
        const pages = await renderPdfPages(file)
        pages.forEach((p, i) =>
          next.push({
            mediaType: p.mimeType,
            url: `data:${p.mimeType};base64,${p.data}`,
            label: `${file.name} p.${i + 1}`,
          })
        )
      } else if (file.type.startsWith('image/')) {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        next.push({ mediaType: file.type, url, label: file.name })
      }
    }
    setAttachments((prev) => [...prev, ...next])
  }

  function send() {
    const text = input.trim()
    if (!text || isBusy) return
    sendMessage({
      text,
      files: attachments.map((a) => ({
        type: 'file' as const,
        mediaType: a.mediaType,
        url: a.url,
      })),
    })
    setInput('')
    setAttachments([])
  }

  async function clearChat() {
    await fetch(`/api/chat?itemId=${itemId}`, { method: 'DELETE' }).catch(() => {})
    setMessages([])
  }

  async function undo() {
    const res = await fetch(`/api/items/${itemId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const { useTemplateStore } = await import('@/stores/templateStore')
      await useTemplateStore.getState().fetchTemplate()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-zinc-50 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-800">Chat</h2>
        <div className="flex items-center gap-2">
          <button
            data-testid="undo-button"
            onClick={undo}
            disabled={isBusy}
            className="px-3 py-1 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:text-zinc-300"
            type="button"
          >
            ↩ Undo
          </button>
          <button
            data-testid="new-chat-button"
            onClick={clearChat}
            disabled={isBusy}
            className="px-3 py-1 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:text-zinc-300"
            type="button"
          >
            New Chat
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          {error.message}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400 text-center mt-8">
            Upload data, describe your design, preview and export — all here.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`message-${msg.role}`}
            className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'self-end bg-blue-500 text-white'
                : 'self-start bg-zinc-100 text-zinc-900'
            }`}
          >
            {msg.parts.map((part, i) => {
              if (part.type === 'text') {
                return <MarkdownRenderer key={i} content={part.text} />
              }
              if (part.type.startsWith('tool-')) {
                const name = toolName(part.type)
                const state = 'state' in part ? (part.state as string) : ''
                return (
                  <details key={i} data-testid={`tool-part-${name}`} className="text-xs text-zinc-500 my-1">
                    <summary className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-700">
                      <span className="font-bold">→</span>
                      <span>{TOOL_LABELS_DE[name] || name}</span>
                      {state !== 'output-available' && <span className="animate-pulse">…</span>}
                      {MUTATOR_PARTS.has(part.type) && state === 'output-available' && (
                        <button
                          data-testid="rollback-link"
                          type="button"
                          className="ml-1 text-blue-500 hover:text-blue-700 underline"
                          onClick={(e) => {
                            e.preventDefault()
                            void undo()
                          }}
                        >
                          ↩ Rollback
                        </button>
                      )}
                    </summary>
                    <div className="mt-1 ml-4 p-2 bg-zinc-50 rounded border border-zinc-200 font-mono text-[10px] whitespace-pre-wrap text-zinc-600">
                      {JSON.stringify('input' in part ? part.input : {}, null, 2)}
                    </div>
                  </details>
                )
              }
              return null
            })}
          </div>
        ))}
        {isBusy && (
          <div data-testid="streaming-indicator" className="self-start text-zinc-400 text-sm px-4">
            …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 py-2 border-t">
          {attachments.map((a, i) => (
            <span key={i} className="px-2 py-0.5 text-[10px] bg-zinc-100 rounded-full text-zinc-600">
              {a.label}
            </span>
          ))}
          <button
            type="button"
            className="text-[10px] text-red-500 underline"
            onClick={() => setAttachments([])}
          >
            clear
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 p-3 border-t shrink-0">
        <label className="px-2 py-2 text-zinc-400 hover:text-zinc-600 cursor-pointer" title="Attach image or PDF">
          📎
          <input
            data-testid="chat-file-input"
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </label>
        <textarea
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          placeholder="Describe your print design…"
          className="flex-1 px-3 py-2 text-sm border rounded-md resize-none"
        />
        <button
          data-testid="chat-send"
          onClick={send}
          disabled={isBusy || !input.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-300 rounded-md"
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  )
}
