import { compileBody, detectLang } from '@/utils/compileBody'

export function renderTemplate(html: string, css: string, data: Record<string, unknown>, miscText?: string): string {
  const compiled = compileBody(html, data, miscText)
  const lang = detectLang(html)

  return `<!DOCTYPE html><html lang="${lang}"><head><style>${css}</style></head><body>${compiled}</body></html>`
}
