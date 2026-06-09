'use client'

import { useState, useRef, type KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (content: string, attachments?: Array<{ mimeType: string; data: string }>) => void
  disabled: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Array<{ mimeType: string; data: string }>>([])
  const [previews, setPreviews] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if ((!trimmed && attachments.length === 0) || disabled) return
    onSend(trimmed, attachments.length > 0 ? attachments : undefined)
    setText('')
    setAttachments([])
    setPreviews([])
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        setAttachments([{ mimeType: file.type, data: base64 }])
        setPreviews([dataUrl])
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'application/pdf') {
      const { renderPdfPages } = await import('@/utils/pdfToImages')
      const pages = await renderPdfPages(file)
      setAttachments(pages)
      setPreviews(pages.map(() => ''))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = () => {
    setAttachments([])
    setPreviews([])
  }

  return (
    <div className="flex flex-col gap-2 p-4 border-t bg-white">
      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previews.map((preview, i) => (
            <div key={i} className="relative group">
              {preview ? (
                <img src={preview} alt="Attachment" className="h-16 w-16 object-cover rounded border" />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center rounded border bg-zinc-100 text-xs text-zinc-500">
                  PDF p.{i + 1}
                </div>
              )}
              <button
                onClick={removeAttachment}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          data-testid="image-upload-button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 disabled:text-zinc-200"
          disabled={disabled}
          aria-label="Upload image or PDF"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="file-input"
        />
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
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors"
          type="button"
        >
          {disabled ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
