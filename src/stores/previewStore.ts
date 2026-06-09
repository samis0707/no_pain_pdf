import { create } from 'zustand'
import { compileBody } from '@/utils/compileBody'
import { useDataStore } from '@/stores/dataStore'
import { applyFieldMapping } from '@/utils/applyMapping'

interface PreviewState {
  compiledBody: string
  isCompiling: boolean
  compileError: string | null
  compile: (html: string, css: string, data: Record<string, unknown>, miscText?: string) => void

  currentPage: number
  totalPages: number
  pdfBlob: Blob | null
  isPdfLoading: boolean
  pdfError: string | null
  setPage: (page: number) => void
  setTotalPages: (pages: number) => void
  setPdfBlob: (blob: Blob | null) => void
  fetchPdf: (html: string, css: string, widthMm: number, heightMm: number, bleed: number, cropMarks: boolean) => Promise<void>
}

export const usePreviewStore = create<PreviewState>()((set, get) => ({
  compiledBody: '',
  isCompiling: false,
  compileError: null,

  currentPage: 1,
  totalPages: 0,
  pdfBlob: null,
  isPdfLoading: false,
  pdfError: null,

  setPage: (page) => set({ currentPage: page }),

  setTotalPages: (pages) => set({ totalPages: pages }),

  setPdfBlob: (blob) => set({ pdfBlob: blob }),

  compile: (html, css, data, miscText) => {
    set({ isCompiling: true, compileError: null })
    try {
      const compiled = compileBody(html, data, miscText)
      set({ compiledBody: compiled })
    } catch (e) {
      set({ compileError: e instanceof Error ? e.message : 'Compilation failed' })
    } finally {
      set({ isCompiling: false })
    }
  },

  fetchPdf: async (html, css, widthMm, heightMm, bleed, cropMarks) => {
    set({ isPdfLoading: true, pdfError: null })
    try {
      const dataRows = useDataStore.getState().rows
      const mapping = useDataStore.getState().mapping
      const mappedRows = applyFieldMapping(dataRows, mapping)
      const data = mappedRows.length > 0 ? { ...mappedRows[0], rows: mappedRows } : {}
      const body = compileBody(html, data)
      const pageCss = `@page { size: ${widthMm}mm ${heightMm}mm${bleed > 0 ? `; bleed: ${bleed}mm` : ''}${cropMarks ? '; marks: crop cross' : ''} }`
      const fullCss = `${pageCss}\n\n${css}`

      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: body,
          css: fullCss,
          options: { format: 'A4' },
          base_url: window.location.origin,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
        throw new Error(err.error || 'PDF generation failed')
      }

      const blob = await res.blob()
      set({ pdfBlob: blob, currentPage: 1 })
    } catch (e) {
      set({ pdfError: e instanceof Error ? e.message : 'PDF generation failed' })
    } finally {
      set({ isPdfLoading: false })
    }
  },
}))
