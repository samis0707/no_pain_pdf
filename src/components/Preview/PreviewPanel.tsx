'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePreviewStore } from '@/stores/previewStore'
import { useTemplateStore } from '@/stores/templateStore'
import { useDataStore } from '@/stores/dataStore'
import { calculateScale } from '@/utils/previewScale'
import { getPageFormatDimensions } from '@/utils/pageFormat'
import { buildPreviewDocument } from '@/utils/previewDocument'
import { useExportStore } from '@/stores/exportStore'
import { applyFieldMapping } from '@/utils/applyMapping'
import PageViewer from './PageViewer'

const MM_TO_PX = 3.7795
const PDF_DEBOUNCE_MS = 500

export default function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { html, css, miscText, pageFormat } = useTemplateStore()
  const { rows, mapping } = useDataStore()
  const { bleed, cropMarks } = useExportStore()
  const {
    compiledBody, isCompiling, compileError, compile,
    pdfBlob, isPdfLoading, pdfError, fetchPdf,
  } = usePreviewStore()

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
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
      const s = calculateScale(width, height, fmt.widthMm, fmt.heightMm)
      setScale(s)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [fmt.widthMm, fmt.heightMm])

  const triggerPdfFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPdf(html, css, fmt.widthMm, fmt.heightMm, bleed, cropMarks)
    }, PDF_DEBOUNCE_MS)
  }, [html, css, fmt.widthMm, fmt.heightMm, bleed, cropMarks, fetchPdf])

  useEffect(() => {
    if (compiledBody && !compileError) {
      triggerPdfFetch()
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [compiledBody, compileError, triggerPdfFetch])

  const displayHtml = compiledBody
    ? buildPreviewDocument(compiledBody, css, fmt.widthMm, fmt.heightMm, bleed, cropMarks)
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
      {isPdfLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-2">
          <p className="text-xs text-blue-600">Generating multi-page preview...</p>
        </div>
      )}
      {pdfError && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
          <p className="text-xs text-amber-600">{pdfError}</p>
        </div>
      )}
      {isCompiling && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-2">
          <p className="text-xs text-blue-600">Compiling...</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-zinc-100"
      >
        {pdfBlob ? (
          <PageViewer
            pdfBlob={pdfBlob}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
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
        )}
      </div>
    </div>
  )
}
