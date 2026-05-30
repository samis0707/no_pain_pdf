import Handlebars from 'handlebars'
import '@/lib/handlebars-helpers'
import { loadHelpers } from '@/lib/helper-loader'

export async function POST(request: Request) {
  try {
    const { html, css, data, miscText } = await request.json() as { html: string; css: string; data: Record<string, string>; miscText?: string }

    if (!html) {
      return Response.json({ error: 'html is required' }, { status: 400 })
    }

    loadHelpers(miscText)
    const template = Handlebars.compile(html)
    const compiled = template(data)

    const document = `<!DOCTYPE html><html><head><style>${css ?? ''}</style></head><body>${compiled}</body></html>`

    return Response.json({ compiled: document })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: message }, { status: 400 })
  }
}
