import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/preview/route'

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]) // %PDF-1.4

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/pdf' }),
    arrayBuffer: () => Promise.resolve(MOCK_PDF_BYTES.buffer),
  }))
})

describe('POST /api/preview multi-page preview route', () => {
  it('returns 200 and application/pdf for valid html+css', async () => {
    const request = new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<p>Page 1</p><p style="page-break-before: always">Page 2</p>',
        css: 'p { font-size: 12pt; }',
        options: { format: 'A4' },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
  })

  it('returns 400 with error JSON when html is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ css: 'p { color: red; }' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('exports a function named POST (Next.js route handler convention)', () => {
    expect(POST).toBeInstanceOf(Function)
    expect(POST.name).toBe('POST')
  })

  it('forwards pdf_variant and pdf_tags in options to WeasyPrint', async () => {
    const request = new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<p>accessible PDF</p>',
        css: '',
        options: { pdf_variant: 'pdf/ua-1', pdf_tags: true },
      }),
    })

    const response = await POST(request)

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const sentBody = JSON.parse(fetchCall[1]?.body as string)
    expect(sentBody.options.pdf_variant).toBe('pdf/ua-1')
    expect(sentBody.options.pdf_tags).toBe(true)

    expect(response.status).toBe(200)
  })

  it('proxies to WeasyPrint /preview endpoint', async () => {
    const request = new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<p>hello</p>', css: '', options: {} }),
    })

    await POST(request)

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[0]).toContain('/generate')
  })

  it('returns PDF bytes for multi-page content (multiple page-breaks)', async () => {
    const multiPageHtml = Array.from(
      { length: 5 },
      (_, i) => `<div style="page-break-after: always">Page ${i + 1}</div>`,
    ).join('\n')

    const request = new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: multiPageHtml,
        css: 'div { height: 100vh; }',
        options: { format: 'A4' },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')

    const bytes = await response.arrayBuffer()
    expect(bytes.byteLength).toBeGreaterThan(0)
  })
})
