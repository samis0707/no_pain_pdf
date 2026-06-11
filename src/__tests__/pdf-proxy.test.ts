import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pdf/generate/route'
import { POST as PREVIEW_POST } from '@/app/api/preview/route'

vi.mock('@/lib/s3', () => ({
  generateInternalDownloadUrl: vi.fn(
    async (key: string) => `http://minio:9000/uploads/${key}?X-Amz-Signature=route`
  ),
}))

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

  it('forwards pdf_tags option to WeasyPrint service', async () => {
    const request = new NextRequest('http://localhost:3000/api/pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<p>test</p>',
        css: '',
        options: { pdf_tags: true, pdf_variant: 'pdf/ua-1' },
      }),
    })

    const response = await POST(request)

    const sentBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(sentBody.options.pdf_tags).toBe(true)
    expect(sentBody.options.pdf_variant).toBe('pdf/ua-1')
    expect(response.status).toBe(200)
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

describe('asset URL rewriting before WeasyPrint', () => {
  const assetBody = JSON.stringify({
    html: '<img src="/api/assets/file/assets/1/logo.png">',
    css: '.hero { background: url(/api/assets/file/assets/1/bg.jpg); }',
  })

  it('POST /api/pdf/generate sends presigned URLs, not /api/assets/file/ paths', async () => {
    const request = new NextRequest('http://localhost:3000/api/pdf/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: assetBody,
    })

    await POST(request)

    const sentBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(sentBody.html).toContain(
      'http://minio:9000/uploads/assets/1/logo.png?X-Amz-Signature=route'
    )
    expect(sentBody.css).toContain(
      'http://minio:9000/uploads/assets/1/bg.jpg?X-Amz-Signature=route'
    )
    expect(sentBody.html).not.toContain('/api/assets/file/')
    expect(sentBody.css).not.toContain('/api/assets/file/')
  })

  it('POST /api/preview sends presigned URLs, not /api/assets/file/ paths', async () => {
    const request = new NextRequest('http://localhost:3000/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: assetBody,
    })

    await PREVIEW_POST(request)

    const sentBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(sentBody.html).not.toContain('/api/assets/file/')
    expect(sentBody.css).not.toContain('/api/assets/file/')
    expect(sentBody.html).toContain('X-Amz-Signature=route')
  })
})
