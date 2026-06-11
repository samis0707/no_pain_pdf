import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRewriteAssetUrls = vi.fn()

vi.mock('@/lib/asset-url-rewrite', () => ({
  rewriteAssetUrls: mockRewriteAssetUrls,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  mockRewriteAssetUrls.mockImplementation(async (html: string, css: string) => ({
    html: html.replace('/api/assets/file/assets/1/x.png', 'http://minio:9000/signed'),
    css,
  }))
})

describe('renderPdf', () => {
  it('sends the REWRITTEN html and css to the WeasyPrint service', async () => {
    const { renderPdf } = await import('@/lib/pdf-render')

    mockFetch.mockResolvedValueOnce(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        headers: { 'Content-Type': 'application/pdf' },
      })
    )

    await renderPdf({
      html: '<img src="/api/assets/file/assets/1/x.png">',
      css: 'body { margin: 0 }',
      options: { pdf_variant: 'pdf/x-4' },
    })

    expect(mockRewriteAssetUrls).toHaveBeenCalledWith(
      '<img src="/api/assets/file/assets/1/x.png">',
      'body { margin: 0 }'
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/generate')
    const sent = JSON.parse(init.body)
    expect(sent.html).toBe('<img src="http://minio:9000/signed">')
    expect(sent.css).toBe('body { margin: 0 }')
    expect(sent.options).toEqual({ pdf_variant: 'pdf/x-4' })
  })

  it('returns the PDF bytes on success', async () => {
    const { renderPdf } = await import('@/lib/pdf-render')

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
    mockFetch.mockResolvedValueOnce(
      new Response(pdfBytes, { headers: { 'Content-Type': 'application/pdf' } })
    )

    const result = await renderPdf({ html: '<p>x</p>' })

    expect(new Uint8Array(result)).toEqual(pdfBytes)
  })

  it('throws a PdfRenderError carrying status and message when the service fails', async () => {
    const { renderPdf, PdfRenderError } = await import('@/lib/pdf-render')

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'boom' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(renderPdf({ html: '<p>x</p>' })).rejects.toSatisfy((e: unknown) => {
      return e instanceof PdfRenderError && e.status === 502 && /boom/.test(e.message)
    })
  })
})
