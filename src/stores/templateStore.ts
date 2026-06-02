import { create } from 'zustand'

interface PageFormatState {
  id: number
  name: string
  widthMm: number
  heightMm: number
  category: string
  isPreset: boolean
}

interface TemplateState {
  itemId: number | null
  html: string
  css: string
  name: string
  miscText: string
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
  version: number
  pageFormat: PageFormatState | null

  setItemId: (id: number) => void
  setHtml: (html: string) => void
  setCss: (css: string) => void
  setPageFormat: (format: PageFormatState | null) => void
  fetchTemplate: () => Promise<void>
  saveTemplate: () => Promise<void>
}

export { type PageFormatState }

export const useTemplateStore = create<TemplateState>()((set, get) => ({
  itemId: null,
  html: '',
  css: '',
  name: '',
  miscText: '',
  isSaving: false,
  lastSaved: null,
  error: null,
  version: 0,
  pageFormat: null,

  setItemId: (id) => {
    set({ itemId: id, error: null })
    get().fetchTemplate()
  },

  setHtml: (html) => {
    set({ html })
  },

  setCss: (css) => {
    set({ css })
  },

  setPageFormat: (format) => {
    set({ pageFormat: format })
  },

  fetchTemplate: async () => {
    const { itemId } = get()
    if (!itemId) return

    set({ error: null })
    try {
      const res = await fetch(`/api/items/${itemId}`)
      if (!res.ok) throw new Error('Failed to fetch template')
      const data = await res.json()
      set({ html: data.html ?? '', css: data.css ?? '', name: data.name ?? '', miscText: data.miscText ?? '', pageFormat: data.pageFormat ?? null })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch template' })
    }
  },

  saveTemplate: async () => {
    const { itemId, html, css, miscText } = get()
    if (!itemId) return

    set({ isSaving: true, error: null })
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css, miscText }),
      })
      if (!res.ok) throw new Error('Failed to save template')
      set({ lastSaved: new Date() })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to save template' })
    } finally {
      set({ isSaving: false })
    }
  },
}))
