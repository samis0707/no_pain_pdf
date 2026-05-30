import Handlebars from 'handlebars'

let customHelperNames = new Set<string>()

export function loadHelpers(miscText?: string): void {
  unregisterCustomHelpers()

  if (!miscText) return

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(miscText)
  } catch {
    return
  }

  const helpers = parsed.customHelpers as Array<{ name: string; params: string[]; body: string }> | undefined
  if (!Array.isArray(helpers)) return

  for (const h of helpers) {
    if (!h.name || !Array.isArray(h.params) || typeof h.body !== 'string') continue
    try {
      const fn = new Function(...h.params, h.body)
      Handlebars.registerHelper(h.name, fn)
      customHelperNames.add(h.name)
    } catch {
      // Skip invalid helpers — don't crash the render
    }
  }
}

export function unregisterCustomHelpers(): void {
  for (const name of customHelperNames) {
    delete (Handlebars as any).helpers[name]
  }
  customHelperNames.clear()
}
