import Handlebars from 'handlebars'
import '@/lib/handlebars-helpers'
import { loadHelpers } from '@/lib/helper-loader'

export interface RenderInput {
  html: string
  css: string
  data: Record<string, string>
}

export function renderTemplate(html: string, css: string, data: Record<string, string>, miscText?: string): string {
  loadHelpers(miscText)
  const template = Handlebars.compile(html)
  const compiled = template(data)
  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${compiled}</body></html>`
}
