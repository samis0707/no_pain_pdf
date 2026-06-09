import { NextRequest } from 'next/server'

const WEASYPRINT_URL = process.env.WEASYPRINT_URL ?? 'http://localhost:3001'

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
    const response = await fetch(`${WEASYPRINT_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: body.html,
        css: body.css ?? '',
        options: body.options ?? {},
        base_url: body.base_url ?? '',
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'PDF generation failed' }))
      return new Response(JSON.stringify(err), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const pdfBuffer = await response.arrayBuffer()
    return new Response(new Uint8Array(pdfBuffer), {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PDF generation failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
