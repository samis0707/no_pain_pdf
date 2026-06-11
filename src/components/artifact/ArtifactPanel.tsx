'use client'

import { useState } from 'react'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import MonacoEditor from '@/components/Editor/MonacoEditor'
import DataImportPanel from '@/components/DataImport/DataImportPanel'
import ErrorBoundary from '@/components/Preview/ErrorBoundary'
import TemplatePicker from '@/components/TemplateLibrary/TemplatePicker'
import ExportPanel from '@/components/ExportPanel/ExportPanel'
import VisualEditor from '@/components/artifact/VisualEditor'

type ArtifactTab = 'preview' | 'visual' | 'code' | 'data' | 'templates' | 'export'

interface ArtifactPanelProps {
  itemId: number
}

const TABS: Array<{ id: ArtifactTab; label: string }> = [
  { id: 'preview', label: 'Preview' },
  { id: 'visual', label: 'Visual' },
  { id: 'code', label: 'Code' },
  { id: 'data', label: 'Data' },
  { id: 'templates', label: 'Templates' },
  { id: 'export', label: 'Export' },
]

export default function ArtifactPanel({ itemId }: ArtifactPanelProps) {
  const [tab, setTab] = useState<ArtifactTab>('preview')

  return (
    <div className="flex flex-col h-full min-w-0 bg-zinc-50">
      <nav className="flex gap-1 px-4 py-2 border-b bg-white shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`artifact-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {tab === 'preview' && (
          <ErrorBoundary>
            <div className="h-full">
              <PreviewPanel />
            </div>
          </ErrorBoundary>
        )}
        {tab === 'visual' && (
          <div className="h-full">
            <VisualEditor />
          </div>
        )}
        {tab === 'code' && (
          <div className="h-full bg-white border rounded-lg overflow-hidden">
            <MonacoEditor />
          </div>
        )}
        {tab === 'data' && <DataImportPanel itemId={itemId} />}
        {tab === 'templates' && <TemplatePicker itemId={String(itemId)} />}
        {tab === 'export' && <ExportPanel />}
      </div>
    </div>
  )
}
