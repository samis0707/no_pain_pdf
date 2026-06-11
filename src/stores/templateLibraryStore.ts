import { create } from 'zustand'
import { useTemplateStore } from '@/stores/templateStore'

export interface LibraryTemplate {
  id: number
  name: string
  category: string | null
  userId: number | null
  projectId: number | null
}

export function templateScopeLabel(t: LibraryTemplate): 'preset' | 'user' | 'project' {
  if (t.projectId !== null) return 'project'
  if (t.userId !== null) return 'user'
  return 'preset'
}

interface TemplateLibraryState {
  templates: LibraryTemplate[]
  isLoading: boolean
  error: string | null

  fetchTemplates: (projectId?: number) => Promise<void>
  applyTemplate: (itemId: string, templateId: number) => Promise<void>
  saveAsTemplate: (itemId: string, name: string, scope: 'user' | 'project') => Promise<void>
}

export const useTemplateLibraryStore = create<TemplateLibraryState>()((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const query = projectId !== undefined ? `?projectId=${projectId}` : ''
      const res = await fetch(`/api/print-templates${query}`)
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      set({ templates: data.templates ?? [] })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load templates' })
    } finally {
      set({ isLoading: false })
    }
  },

  applyTemplate: async (itemId, templateId) => {
    set({ error: null })
    try {
      const res = await fetch(`/api/items/${itemId}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        set({ error: err.error || 'Failed to apply template' })
        return
      }
      await useTemplateStore.getState().fetchTemplate()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to apply template' })
    }
  },

  saveAsTemplate: async (itemId, name, scope) => {
    set({ error: null })
    try {
      const res = await fetch(`/api/items/${itemId}/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scope }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        set({ error: err.error || 'Failed to save template' })
        return
      }
      await get().fetchTemplates()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to save template' })
    }
  },
}))
