import { create } from 'zustand'

interface ExportState {
  pageSize: string
  orientation: string
  margins: string
  isExporting: boolean
  error: string | null

  setPageSize: (size: string) => void
  setOrientation: (orientation: string) => void
  setMargins: (margins: string) => void
  exportPdf: (html: string, css: string) => Promise<void>
}

export const useExportStore = create<ExportState>()((set, get) => ({
  pageSize: 'A4',
  orientation: 'portrait',
  margins: 'normal',
  isExporting: false,
  error: null,

  setPageSize: (size) => set({ pageSize: size }),

  setOrientation: (orientation) => set({ orientation }),

  setMargins: (margins) => set({ margins }),

  exportPdf: async (html, css) => {
    set({ isExporting: true, error: null })
    try {
      const { pageSize, orientation, margins } = get()
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          css,
          options: { format: pageSize, orientation, margin: margins },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        set({ error: err.message || 'Failed to generate PDF' })
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'document.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unexpected error' })
    } finally {
      set({ isExporting: false })
    }
  },
}))
