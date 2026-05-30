'use client'

import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useTemplateStore } from '@/stores/templateStore'

export default function MonacoEditor() {
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html')
  const { html, css, setHtml, setCss, saveTemplate, isSaving, lastSaved } = useTemplateStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      saveTemplate()
    }, 300)
    return () => clearTimeout(timer)
  }, [html, css, saveTemplate])

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex gap-2 px-4 pt-3 pb-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('html')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'html'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          HTML
        </button>
        <button
          onClick={() => setActiveTab('css')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'css'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          CSS
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-1 border-b border-zinc-100">
        <span className="text-xs text-zinc-400">
          {isSaving ? 'Saving...' : lastSaved ? `Saved` : ''}
        </span>
      </div>

      <div className="flex-1">
        {activeTab === 'html' && (
          <Editor
            height="100%"
            defaultLanguage="html"
            value={html}
            onChange={(value) => setHtml(value ?? '')}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        )}
        {activeTab === 'css' && (
          <Editor
            height="100%"
            defaultLanguage="css"
            value={css}
            onChange={(value) => setCss(value ?? '')}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
