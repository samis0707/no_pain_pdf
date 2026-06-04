import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pdf/generate/route'

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]) // %PDF-1.4

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/pdf' }),
    body: new ReadableStream({
      start(controller: ReadableStreamDefaultController) {
        controller.enqueue(MOCK_PDF_BYTES)
        controller.close()
      },
    }),
    arrayBuffer: () => Promise.resolve(MOCK_PDF_BYTES.buffer),
  }))
})

describe('POST /api/pdf/generate proxies to WeasyPrint', () => {
  it('forwards HTML+CSS+options to WeasyPrint service', async () => {
    const request = new NextRequest('http://localhost:3000/api/pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<p>test</p>',
        css: 'p { color: red; }',
        options: { format: 'A4', orientation: 'portrait', margin: 'normal' },
      }),
    })

    const response = await POST(request)

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[0]).toBe('http://localhost:3001/generate')
    expect(fetchCall[1]?.method).toBe('POST')

    const sentBody = JSON.parse(fetchCall[1]?.body as string)
    expect(sentBody.html).toBe('<p>test</p>')
    expect(sentBody.css).toBe('p { color: red; }')
    expect(sentBody.options.format).toBe('A4')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
  })

  it('returns 400 when html is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ css: 'p { color: red; }' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('forwards error from WeasyPrint service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'PDF generation crashed' }),
    }))

    const request = new NextRequest('http://localhost:3000/api/pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<p>test</p>' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})
