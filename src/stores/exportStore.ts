import { create } from 'zustand'
import Handlebars from 'handlebars'
import { useTemplateStore } from '@/stores/templateStore'
import { useDataStore } from '@/stores/dataStore'
import { loadHelpers } from '@/lib/helper-loader'
import { getPageFormatDimensions } from '@/utils/pageFormat'
import { applyFieldMapping } from '@/utils/applyMapping'
import '@/lib/handlebars-helpers'

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
  getEffectivePageFormat: () => { widthMm: number; heightMm: number }
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

  getEffectivePageFormat: () => {
    const templatePageFormat = useTemplateStore.getState().pageFormat
    if (templatePageFormat) {
      return { widthMm: templatePageFormat.widthMm, heightMm: templatePageFormat.heightMm }
    }
    const { pageSize, orientation } = get()
    return getPageFormatDimensions(pageSize, orientation)
  },

  exportPdf: async (html, css) => {
    set({ isExporting: true, error: null })
    try {
      const { pageSize, orientation, margins } = get()

      const dataRows = useDataStore.getState().rows
      const mapping = useDataStore.getState().mapping
      const mappedRows = applyFieldMapping(dataRows, mapping)
      const data = mappedRows.length > 0 ? { ...mappedRows[0], rows: mappedRows } : {}
      const template = Handlebars.compile(html)
      const compiledHtml = template(data)

      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: compiledHtml,
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

useTemplateStore.subscribe((state) => {
  if (state.pageFormat) {
    useExportStore.setState({
      pageSize: state.pageFormat.name,
      orientation: state.pageFormat.widthMm > state.pageFormat.heightMm ? 'landscape' : 'portrait',
    })
  }
})
