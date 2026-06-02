import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'

export interface RegisteredHelper {
  name: string
  params: string[]
  body: string
  active?: boolean
}

interface HelperManager {
  list: () => RegisteredHelper[]
  register: (helper: Omit<RegisteredHelper, 'active'>) => void
  delete: (name: string) => void
  update: (name: string, updates: Partial<Omit<RegisteredHelper, 'active'>>) => void
  get: (name: string) => RegisteredHelper | undefined
  activate: (name: string) => void
  clear: () => void
  persist: () => void
}

function createHelperManager(): HelperManager {
  const helpers = new Map<string, RegisteredHelper>()

  return {
    list: () => Array.from(helpers.values()),
    register: (helper) => {
      helpers.set(helper.name, { ...helper, active: false })
    },
    delete: (name) => {
      helpers.delete(name)
    },
    update: (name, updates) => {
      const existing = helpers.get(name)
      if (existing) {
        if (updates.name && updates.name !== name) {
          helpers.delete(name)
          helpers.set(updates.name, { ...existing, ...updates })
        } else {
          helpers.set(name, { ...existing, ...updates })
        }
      }
    },
    get: (name) => helpers.get(name),
    activate: (name) => {
      const h = helpers.get(name)
      if (h) {
        for (const [, value] of helpers) {
          value.active = false
        }
        h.active = true
      }
    },
    clear: () => helpers.clear(),
    persist: () => {
      const all = Array.from(helpers.values()).map(({ name, params, body }) => ({
        name,
        params,
        body,
      }))
      const miscText = JSON.stringify({ customHelpers: all })
      useTemplateStore.setState({ miscText })
      usePreviewStore.setState({ isCompiling: true, compileError: null })
    },
  }
}

export const helperManager = createHelperManager()
