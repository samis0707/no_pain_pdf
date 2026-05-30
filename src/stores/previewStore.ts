import { create } from 'zustand'
import { renderTemplate } from '@/utils/handlebarsRenderer'

interface PreviewState {
  compiledHtml: string
  isCompiling: boolean
  compileError: string | null
  compile: (html: string, css: string, data: Record<string, string>) => void
}

export const usePreviewStore = create<PreviewState>()((set) => ({
  compiledHtml: '',
  isCompiling: false,
  compileError: null,

  compile: (html, css, data) => {
    set({ isCompiling: true, compileError: null })
    try {
      const compiled = renderTemplate(html, css, data)
      set({ compiledHtml: compiled })
    } catch (e) {
      set({ compileError: e instanceof Error ? e.message : 'Compilation failed' })
    } finally {
      set({ isCompiling: false })
    }
  },
}))
