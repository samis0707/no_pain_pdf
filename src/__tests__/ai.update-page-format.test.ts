import { describe, it, expect, beforeEach, vi } from 'vitest'

const {
  mockFindManyPageFormats,
  mockPrintItemFindUnique,
  mockPrintItemUpdate,
} = vi.hoisted(() => ({
  mockFindManyPageFormats: vi.fn(),
  mockPrintItemFindUnique: vi.fn(),
  mockPrintItemUpdate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pageFormat: {
      findMany: (...args: unknown[]) => mockFindManyPageFormats(...args),
    },
    printItem: {
      findUnique: (...args: unknown[]) => mockPrintItemFindUnique(...args),
      update: (...args: unknown[]) => mockPrintItemUpdate(...args),
    },
  },
}))

import { getPageFormats, updatePageFormat } from '@/lib/ai/tools'

const mockPageFormats = [
  { id: 1, name: 'A4', widthMm: 210, heightMm: 297, category: 'ISO', isPreset: true },
  { id: 2, name: 'Letter', widthMm: 215.9, heightMm: 279.4, category: 'ANSI', isPreset: true },
  { id: 3, name: 'A4 Landscape', widthMm: 297, heightMm: 210, category: 'ISO', isPreset: true },
]

const mockItem = {
  id: 1,
  projectId: 1,
  name: 'Test Item',
  html: '<h1>{{title}}</h1>',
  css: 'h1 { color: red; }',
  pageFormatId: 1,
  miscText: '{}',
  version: 3,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPageFormats', () => {
  it('returns all page formats and the current format ID', async () => {
    mockFindManyPageFormats.mockResolvedValue(mockPageFormats)
    mockPrintItemFindUnique.mockResolvedValue(mockItem as any)

    const result = await getPageFormats('1')

    expect(result.formats).toHaveLength(3)
    expect(result.currentId).toBe(1)
    expect(result.formats[0].name).toBe('A4')
  })

  it('throws when item is not found', async () => {
    mockPrintItemFindUnique.mockResolvedValue(null)

    await expect(getPageFormats('999')).rejects.toThrow('Item not found: 999')
  })

  it('throws on invalid item ID', async () => {
    await expect(getPageFormats('abc')).rejects.toThrow('Invalid item ID: abc')
  })
})

describe('updatePageFormat', () => {
  it('updates css only when pageFormatId is not provided', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem as any)
    mockPrintItemUpdate.mockResolvedValue({
      ...mockItem,
      css: 'h1 { color: blue; }',
      version: 4,
    } as any)

    const result = await updatePageFormat('1', undefined, 'h1 { color: blue; }')

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { css: 'h1 { color: blue; }', version: 4 },
      include: { pageFormat: true },
    })
    expect(result.css).toBe('h1 { color: blue; }')
    expect(result.version).toBe(4)
  })

  it('updates pageFormatId when css is not provided', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem as any)
    mockPrintItemUpdate.mockResolvedValue({
      ...mockItem,
      pageFormatId: 2,
      version: 4,
    } as any)

    const result = await updatePageFormat('1', 2, undefined)

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { pageFormatId: 2, version: 4 },
      include: { pageFormat: true },
    })
    expect(result.pageFormatId).toBe(2)
  })

  it('updates both css and pageFormatId when both provided', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem as any)
    mockPrintItemUpdate.mockResolvedValue({
      ...mockItem,
      css: 'body { margin: 0; }',
      pageFormatId: 3,
      version: 4,
    } as any)

    const result = await updatePageFormat('1', 3, 'body { margin: 0; }')

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { css: 'body { margin: 0; }', pageFormatId: 3, version: 4 },
      include: { pageFormat: true },
    })
    expect(result.css).toBe('body { margin: 0; }')
    expect(result.pageFormatId).toBe(3)
  })

  it('throws on invalid itemId', async () => {
    await expect(updatePageFormat('abc', undefined, undefined)).rejects.toThrow('Invalid item ID: abc')
  })

  it('throws when item is not found', async () => {
    mockPrintItemFindUnique.mockResolvedValue(null)

    await expect(updatePageFormat('999', undefined, undefined)).rejects.toThrow('Item not found: 999')
  })
})
