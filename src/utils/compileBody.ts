import Handlebars from 'handlebars'
import '@/lib/handlebars-helpers'
import { loadHelpers } from '@/lib/helper-loader'

export function compileBody(html: string, data: Record<string, unknown>, miscText?: string): string {
  loadHelpers(miscText)

  const isFullDocument = /<!DOCTYPE\s+html>/i.test(html) || /<html[\s>]/i.test(html)
  const bodyContent = isFullDocument ? extractBodyContent(html) : html

  const template = Handlebars.compile(bodyContent)
  return template(data)
}

export function detectLang(html: string): string {
  const langMatch = html.match(/<html[^>]*\slang\s*=\s*["']([^"']+)["']/i)
  return langMatch ? langMatch[1] : 'en'
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return bodyMatch ? bodyMatch[1] : html
}
