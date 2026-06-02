import Handlebars from 'handlebars'
import '@/lib/handlebars-helpers'
import { loadHelpers } from '@/lib/helper-loader'

export function renderTemplate(html: string, css: string, data: Record<string, unknown>, miscText?: string): string {
  loadHelpers(miscText)

  const isFullDocument = /<!DOCTYPE\s+html>/i.test(html) || /<html[\s>]/i.test(html)
  const bodyContent = isFullDocument ? extractBodyContent(html) : html

  const template = Handlebars.compile(bodyContent)
  const compiled = template(data)

  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${compiled}</body></html>`
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : html
}
