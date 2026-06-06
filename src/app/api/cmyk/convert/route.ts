import { NextRequest } from 'next/server'

const GHOSTSCRIPT_URL = process.env.GHOSTSCRIPT_URL ?? 'http://localhost:3002'

export async function POST(request: NextRequest) {
  let body: { pdf_base64?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.pdf_base64) {
    return new Response(JSON.stringify({ error: 'pdf_base64 is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const response = await fetch(`${GHOSTSCRIPT_URL}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_base64: body.pdf_base64 }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Conversion failed' }))
      return new Response(JSON.stringify(err), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const pdfBuffer = await response.arrayBuffer()
    return new Response(new Uint8Array(pdfBuffer), {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Conversion service unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
