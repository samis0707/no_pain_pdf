'use client'

import { useEffect, useRef, useState } from 'react'
import { usePreviewStore } from '@/stores/previewStore'
import { useTemplateStore } from '@/stores/templateStore'
import { useDataStore } from '@/stores/dataStore'
import { calculateScale } from '@/utils/previewScale'
import { getPageFormatDimensions } from '@/utils/pageFormat'
import { applyFieldMapping } from '@/utils/applyMapping'

const MM_TO_PX = 3.7795

export default function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const { html, css, miscText, pageFormat } = useTemplateStore()
  const { rows, mapping } = useDataStore()
  const { compiledHtml, isCompiling, compileError, compile } = usePreviewStore()

  const fmt = pageFormat
    ? { widthMm: pageFormat.widthMm, heightMm: pageFormat.heightMm }
    : getPageFormatDimensions('A4', 'portrait')

  useEffect(() => {
    const mappedRows = applyFieldMapping(rows, mapping)
    const sampleData: Record<string, unknown> = mappedRows.length > 0
      ? { ...mappedRows[0], rows: mappedRows }
      : {}
    compile(html, css, sampleData, miscText)
  }, [html, css, rows, mapping, miscText, compile])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const s = calculateScale(width, height, fmt.widthMm, fmt.heightMm)
      setScale(s)
    })
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [fmt.widthMm, fmt.heightMm])

  const pageCss = `@page { size: ${fmt.widthMm}mm ${fmt.heightMm}mm; margin: 0; }
html, body { margin: 0; overflow: hidden; width: 100%; height: 100%; }`
  const displayHtml = compiledHtml
    ? compiledHtml.replace('<style>', `<style>${pageCss}\n`)
    : ''

  const pageWidthPx = fmt.widthMm * MM_TO_PX
  const pageHeightPx = fmt.heightMm * MM_TO_PX

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
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-zinc-100 flex items-center justify-center"
      >
        <div
          className="bg-white shadow-lg origin-top-left"
          style={{
            width: pageWidthPx,
            height: pageHeightPx,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            srcDoc={displayHtml}
            title="Preview"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  )
}
