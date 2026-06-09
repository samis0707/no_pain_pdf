import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPage = {
  getViewport: vi.fn().mockReturnValue({ width: 595, height: 842 }),
  render: vi.fn().mockResolvedValue({ promise: Promise.resolve() }),
}
const mockPdf = {
  numPages: 5,
  getPage: vi.fn().mockResolvedValue(mockPage),
}

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve(mockPdf) }),
}))

beforeEach(() => {
  vi.clearAllMocks()

  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,/9j/4AAQSkZJRg==')
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    scale: vi.fn(),
  }) as unknown as CanvasRenderingContext2D)
})

describe('renderPdfPages', () => {
  it('renders specified number of pages based on PDF_VISION_PAGE_LIMIT', async () => {
    process.env.PDF_VISION_PAGE_LIMIT = '3'

    const { renderPdfPages } = await import('@/utils/pdfToImages')
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    const results = await renderPdfPages(file)

    expect(results).toHaveLength(3)
    expect(mockPdf.getPage).toHaveBeenCalledTimes(3)
    expect(mockPdf.getPage).toHaveBeenNthCalledWith(1, 1)
    expect(mockPdf.getPage).toHaveBeenNthCalledWith(2, 2)
    expect(mockPdf.getPage).toHaveBeenNthCalledWith(3, 3)
  })

  it('respects env var PDF_VISION_PAGE_LIMIT', async () => {
    process.env.PDF_VISION_PAGE_LIMIT = '2'

    const { renderPdfPages } = await import('@/utils/pdfToImages')
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    const results = await renderPdfPages(file)

    expect(results).toHaveLength(2)
    expect(mockPdf.getPage).toHaveBeenCalledTimes(2)
  })

  it('throws error for invalid file', async () => {
    const { getDocument } = await import('pdfjs-dist')
    vi.mocked(getDocument).mockReturnValueOnce({
      promise: Promise.reject(new Error('Invalid PDF format')),
    })

    const { renderPdfPages } = await import('@/utils/pdfToImages')
    const file = new File(['bad'], 'broken.pdf', { type: 'application/pdf' })

    await expect(renderPdfPages(file)).rejects.toThrow('Invalid PDF format')
  })

  it('each returned item has image/jpeg mimeType', async () => {
    process.env.PDF_VISION_PAGE_LIMIT = '2'

    const { renderPdfPages } = await import('@/utils/pdfToImages')
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    const results = await renderPdfPages(file)

    for (const item of results) {
      expect(item.mimeType).toBe('image/jpeg')
    }
  })

  it('each returned item has base64 data string (no data: prefix)', async () => {
    process.env.PDF_VISION_PAGE_LIMIT = '1'

    const { renderPdfPages } = await import('@/utils/pdfToImages')
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    const results = await renderPdfPages(file)

    expect(results).toHaveLength(1)
    expect(results[0].data).toBe('/9j/4AAQSkZJRg==')
    expect(results[0].data).not.toContain('data:')
  })
})
