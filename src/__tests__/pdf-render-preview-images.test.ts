import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindUniqueItem, mockFindFirstDataSet } = vi.hoisted(() => ({
  mockFindUniqueItem: vi.fn(),
  mockFindFirstDataSet: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: { findUnique: mockFindUniqueItem },
    dataSet: { findFirst: mockFindFirstDataSet },
  },
}))

vi.mock('@/lib/asset-url-rewrite', () => ({
  rewriteAssetUrls: vi.fn(async (html: string, css: string) => ({ html, css })),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const ITEM = {
  id: 1,
  name: 'Flyer',
  html: '<h1>{{title}}</h1>',
  css: 'h1 { color: blue }',
  miscText: '{}',
  exportSettings: JSON.stringify({ bleed: 3, cropMarks: true }),
  pageFormat: { id: 2, name: 'A5', widthMm: 148, heightMm: 210 },
}

const DATASET = {
  id: 7,
  rows: JSON.stringify([{ headline: 'Hello' }, { headline: 'World' }]),
  columns: JSON.stringify(['headline']),
  mapping: JSON.stringify({ headline: 'title' }),
  rowCount: 2,
}

function mockImagesResponse(pages: string[], pageCount: number, truncated: boolean) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ pages, page_count: pageCount, truncated }), {
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindUniqueItem.mockResolvedValue(ITEM)
  mockFindFirstDataSet.mockResolvedValue(DATASET)
})

describe('renderItemPreviewImages', () => {
  it('compiles the item template with mapped dataset rows and posts to /preview-images', async () => {
    const { renderItemPreviewImages } = await import('@/lib/pdf-render')
    mockImagesResponse(['anVuaw=='], 1, false)

    await renderItemPreviewImages('1')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/preview-images')
    const sent = JSON.parse(init.body)
    // mapping renames headline → title; first row feeds top-level variables
    expect(sent.html).toContain('<h1>Hello</h1>')
    // item page format + export settings drive the @page rule
    expect(sent.html).toContain('size: 148mm 210mm')
    expect(sent.html).toContain('bleed: 3mm')
    expect(sent.html).toContain('marks: crop cross')
    // user CSS included
    expect(sent.html).toContain('h1 { color: blue }')
    expect(sent.page_limit).toBe(3)
  })

  it('returns vision-ready images with page metadata', async () => {
    const { renderItemPreviewImages } = await import('@/lib/pdf-render')
    mockImagesResponse(['cGFnZTE=', 'cGFnZTI='], 5, true)

    const result = await renderItemPreviewImages('1')

    expect(result.pageCount).toBe(5)
    expect(result.truncated).toBe(true)
    expect(result.images).toEqual([
      { mimeType: 'image/jpeg', data: 'cGFnZTE=' },
      { mimeType: 'image/jpeg', data: 'cGFnZTI=' },
    ])
  })

  it('falls back to A4 and renders without a dataset', async () => {
    const { renderItemPreviewImages } = await import('@/lib/pdf-render')
    mockFindUniqueItem.mockResolvedValue({ ...ITEM, pageFormat: null, exportSettings: '{}' })
    mockFindFirstDataSet.mockResolvedValue(null)
    mockImagesResponse(['eA=='], 1, false)

    await renderItemPreviewImages('1')

    const sent = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(sent.html).toContain('size: 210mm 297mm')
    // unresolved variables render empty, not crash
    expect(sent.html).toContain('<h1></h1>')
  })

  it('throws for a missing item', async () => {
    const { renderItemPreviewImages } = await import('@/lib/pdf-render')
    mockFindUniqueItem.mockResolvedValue(null)

    await expect(renderItemPreviewImages('99')).rejects.toThrow(/not found/i)
  })
})
