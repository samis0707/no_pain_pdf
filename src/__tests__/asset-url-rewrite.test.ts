import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateInternalDownloadUrl = vi.fn()

vi.mock('@/lib/s3', () => ({
  generateInternalDownloadUrl: mockGenerateInternalDownloadUrl,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateInternalDownloadUrl.mockImplementation(
    async (key: string) => `http://minio:9000/uploads/${key}?X-Amz-Signature=test`
  )
})

describe('rewriteAssetUrls', () => {
  it('rewrites an img src pointing at /api/assets/file/ to a presigned URL', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const html = '<img src="/api/assets/file/assets/1/1718000000-logo.png">'
    const result = await rewriteAssetUrls(html, '')

    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith(
      'assets/1/1718000000-logo.png'
    )
    expect(result.html).toBe(
      '<img src="http://minio:9000/uploads/assets/1/1718000000-logo.png?X-Amz-Signature=test">'
    )
  })

  it('URL-decodes encoded path segments back to the S3 key', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const html =
      '<img src="/api/assets/file/assets/1/1718000000-my%20logo%20(final).png">'
    const result = await rewriteAssetUrls(html, '')

    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith(
      'assets/1/1718000000-my logo (final).png'
    )
    expect(result.html).toContain('X-Amz-Signature=test')
    expect(result.html).not.toContain('/api/assets/file/')
  })

  it('rewrites url(...) references in CSS, with and without quotes', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const css = [
      '.a { background: url(/api/assets/file/assets/1/bg.jpg); }',
      ".b { background-image: url('/api/assets/file/assets/1/b.png'); }",
      '@font-face { src: url("/api/assets/file/assets/1/font.woff2"); }',
    ].join('\n')

    const result = await rewriteAssetUrls('', css)

    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith('assets/1/bg.jpg')
    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith('assets/1/b.png')
    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith('assets/1/font.woff2')
    expect(result.css).not.toContain('/api/assets/file/')
    expect(result.css).toContain(
      'http://minio:9000/uploads/assets/1/bg.jpg?X-Amz-Signature=test'
    )
  })

  it('rewrites every candidate inside a srcset attribute', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const html =
      '<img srcset="/api/assets/file/assets/1/sm.png 1x, /api/assets/file/assets/1/lg.png 2x">'
    const result = await rewriteAssetUrls(html, '')

    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith('assets/1/sm.png')
    expect(mockGenerateInternalDownloadUrl).toHaveBeenCalledWith('assets/1/lg.png')
    expect(result.html).not.toContain('/api/assets/file/')
  })

  it('leaves external http(s) URLs and data: URIs untouched', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const html =
      '<img src="https://example.com/pic.png"><img src="data:image/png;base64,AAAA">'
    const css = '.x { background: url(https://cdn.example.com/bg.jpg); }'
    const result = await rewriteAssetUrls(html, css)

    expect(mockGenerateInternalDownloadUrl).not.toHaveBeenCalled()
    expect(result.html).toBe(html)
    expect(result.css).toBe(css)
  })

  it('rewrites multiple occurrences and presigns each key only once', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const html =
      '<img src="/api/assets/file/assets/1/a.png"><img src="/api/assets/file/assets/1/a.png"><img src="/api/assets/file/assets/1/b.png">'
    const result = await rewriteAssetUrls(html, '')

    expect(result.html).not.toContain('/api/assets/file/')
    const keys = mockGenerateInternalDownloadUrl.mock.calls.map((c) => c[0])
    expect(keys.sort()).toEqual(['assets/1/a.png', 'assets/1/b.png'])
  })

  it('returns input unchanged when there are no asset references', async () => {
    const { rewriteAssetUrls } = await import('@/lib/asset-url-rewrite')

    const result = await rewriteAssetUrls('<h1>{{title}}</h1>', 'h1 { color: red }')

    expect(result).toEqual({ html: '<h1>{{title}}</h1>', css: 'h1 { color: red }' })
    expect(mockGenerateInternalDownloadUrl).not.toHaveBeenCalled()
  })
})
