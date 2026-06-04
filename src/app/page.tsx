'use client'

import { useState, useEffect } from 'react'
import DataImportPanel from '@/components/DataImport/DataImportPanel'
import MonacoEditor from '@/components/Editor/MonacoEditor'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import ErrorBoundary from '@/components/Preview/ErrorBoundary'
import ExportPanel from '@/components/ExportPanel/ExportPanel'
import ChatSidebar from '@/components/Chat/ChatSidebar'
import DebugBar from '@/components/DebugBar/DebugBar'
import { useTemplateStore } from '@/stores/templateStore'
import { useChatStore } from '@/stores/chatStore'

type Tab = 'upload' | 'design' | 'export'

export default function EditorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [editorOpen, setEditorOpen] = useState(false)
  const { setItemId } = useTemplateStore()
  const chatMessages = useChatStore((s) => s.messages)
  const chatIsStreaming = useChatStore((s) => s.isStreaming)
  const chatError = useChatStore((s) => s.error)
  const chatSendMessage = useChatStore((s) => s.sendMessage)
  const chatClearMessages = useChatStore((s) => s.clearMessages)
  const chatSetItemId = useChatStore((s) => s.setItemId)

  useEffect(() => {
    if (activeTab === 'design') {
      setItemId(1)
      chatSetItemId('1')
    }
  }, [activeTab, setItemId, chatSetItemId])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'design', label: 'Design' },
    { id: 'export', label: 'Export' },
  ]

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold">No Pain PDF</h1>
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="w-24" />
      </header>

      <DebugBar />

      <main className="flex-1 overflow-auto">
        {activeTab === 'upload' && <DataImportPanel itemId={1} />}

        {activeTab === 'design' && (
          <div className="flex h-full">
            <div className="flex-1 border-r p-4 min-w-0 relative">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Preview</h2>
                <button
                  onClick={() => setEditorOpen(true)}
                  className="px-3 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
                  type="button"
                >
                  Open Editor
                </button>
              </div>
              <ErrorBoundary>
                <div className="h-[calc(100%-2.5rem)]">
                  <PreviewPanel />
                </div>
              </ErrorBoundary>
            </div>
            <ChatSidebar
              messages={chatMessages}
              isStreaming={chatIsStreaming}
              error={chatError}
              onSend={chatSendMessage}
              onClear={chatClearMessages}
            />
          </div>
        )}

        {editorOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setEditorOpen(false)}
          >
            <div
              className="relative w-[90vw] h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <h2 className="text-lg font-semibold">Template Editor</h2>
                <button
                  onClick={() => setEditorOpen(false)}
                  className="px-3 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <MonacoEditor />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="p-6 max-w-lg mx-auto space-y-6">
            <h2 className="text-xl font-semibold">Export PDF</h2>
            <p className="text-zinc-500 text-sm">
              Configure export settings and download your PDF.
            </p>
            <div className="border rounded-lg p-6">
              <ExportPanel />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
