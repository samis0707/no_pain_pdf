import { NextRequest } from 'next/server'
import { renderPdf, PdfRenderError } from '@/lib/pdf-render'

export async function POST(request: NextRequest) {
  let body: { html?: string; css?: string; options?: Record<string, unknown>; base_url?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.html) {
    return new Response(JSON.stringify({ error: 'html is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const pdfBuffer = await renderPdf({
      html: body.html,
      css: body.css,
      options: body.options,
      base_url: body.base_url,
    })
    return new Response(new Uint8Array(pdfBuffer), {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch (error: unknown) {
    const status = error instanceof PdfRenderError ? error.status : 500
    const message = error instanceof Error ? error.message : 'PDF generation failed'
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
