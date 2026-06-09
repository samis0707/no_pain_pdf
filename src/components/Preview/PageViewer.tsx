'use client'

import { useEffect, useRef, useState } from 'react'
import { usePreviewStore } from '@/stores/previewStore'

interface PageViewerProps {
  pdfBlob: Blob
  containerWidth: number
  containerHeight: number
}

export default function PageViewer({ pdfBlob, containerWidth, containerHeight }: PageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { currentPage, totalPages, setPage, setTotalPages } = usePreviewStore()

  const vScale = Math.min(
    (containerWidth - 48) / 595.28,
    (containerHeight - 48) / 841.89,
    2,
  )

  useEffect(() => {
    let cancelled = false
    setPdfDoc(null)
    setLoadError(null)
    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const arrayBuffer = await pdfBlob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        if (cancelled) return
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load PDF')
      }
    }
    loadPdf()
    return () => { cancelled = true }
  }, [pdfBlob, setTotalPages])

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage)
        const viewport = page.getViewport({ scale: vScale })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = viewport.width * devicePixelRatio
        canvas.height = viewport.height * devicePixelRatio
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(devicePixelRatio, devicePixelRatio)
        await page.render({ canvasContext: ctx, viewport }).promise
      } catch {
        // page render failed silently — keep previous frame
      }
    }

    renderPage()
    return () => { cancelled = true }
  }, [pdfDoc, currentPage, vScale])

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-amber-600 mb-1">Could not load PDF preview</p>
          <p className="text-xs text-zinc-400">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!pdfDoc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mb-2" />
          <p className="text-sm text-zinc-500">Loading PDF preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-3 px-4 py-2 border-b border-zinc-200 bg-zinc-50 shrink-0">
        <button
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1 text-sm font-medium rounded border border-zinc-300 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="text-sm text-zinc-600 tabular-nums">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 text-sm font-medium rounded border border-zinc-300 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center bg-zinc-100 overflow-hidden p-4">
        <div className="bg-white shadow-lg">
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </div>
  )
}
