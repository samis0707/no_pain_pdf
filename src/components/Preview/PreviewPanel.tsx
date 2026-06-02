'use client'

import { useEffect, useRef } from 'react'
import { usePreviewStore } from '@/stores/previewStore'
import { useTemplateStore } from '@/stores/templateStore'
import { useDataStore } from '@/stores/dataStore'

export default function PreviewPanel() {
  const { html, css, miscText } = useTemplateStore()
  const { rows } = useDataStore()
  const { compiledHtml, isCompiling, compileError, compile } = usePreviewStore()

  useEffect(() => {
    const sampleData = rows.length > 0 ? rows[0] : {} as Record<string, string>
    compile(html, css, sampleData, miscText)
  }, [html, css, rows, miscText, compile])

  if (!html) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg bg-zinc-50">
        <p className="text-sm text-zinc-400">No template</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {compileError && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
          <p className="text-xs text-red-600">{compileError}</p>
        </div>
      )}
      {isCompiling && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-2">
          <p className="text-xs text-blue-600">Compiling...</p>
        </div>
      )}
      <div className="flex-1 overflow-auto bg-zinc-100 flex justify-center p-4">
        <div
          className="bg-white shadow-lg"
          style={{ width: 794, aspectRatio: '210 / 297' }}
        >
          <iframe
            srcDoc={compiledHtml}
            title="Preview"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  )
}
