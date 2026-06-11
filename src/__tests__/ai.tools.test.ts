import Handlebars from 'handlebars'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const {
  mockPrintItemFindUnique,
  mockPrintItemUpdate,
  mockDataSetFindFirst,
  mockDataSetCreate,
  mockAssetFindMany,
  mockVersionUpsert,
} = vi.hoisted(() => ({
  mockPrintItemFindUnique: vi.fn(),
  mockPrintItemUpdate: vi.fn(),
  mockDataSetFindFirst: vi.fn(),
  mockDataSetCreate: vi.fn(),
  mockAssetFindMany: vi.fn(),
  mockVersionUpsert: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: {
      findUnique: (...args: unknown[]) => mockPrintItemFindUnique(...args),
      update: (...args: unknown[]) => mockPrintItemUpdate(...args),
    },
    dataSet: {
      findFirst: (...args: unknown[]) => mockDataSetFindFirst(...args),
      create: (...args: unknown[]) => mockDataSetCreate(...args),
    },
    asset: {
      findMany: (...args: unknown[]) => mockAssetFindMany(...args),
    },
    printItemVersion: {
      upsert: (...args: unknown[]) => mockVersionUpsert(...args),
    },
  },
}))

const { mockRenderItemPreviewImages } = vi.hoisted(() => ({
  mockRenderItemPreviewImages: vi.fn(),
}))

vi.mock('@/lib/pdf-render', () => ({
  renderItemPreviewImages: mockRenderItemPreviewImages,
}))

import {
  getTemplate,
  updateTemplate,
  getDataInfo,
  analyzeData,
  renderPreview,
  getAssets,
  registerHelper,
  getData,
  updateData,
  getHelpers,
} from '@/lib/ai/tools'

const TEST_ITEM_ID = '42'

let currentVersion = 5

beforeEach(() => {
  vi.clearAllMocks()
  currentVersion = 5

  mockPrintItemFindUnique.mockImplementation(
    ({ where }: { where: { id: number } }) => {
      if (where.id === 42) {
        return Promise.resolve({
          id: 42,
          name: 'Test Item',
          html: '<div>hello</div>',
          css: 'body { color: red; }',
          version: currentVersion,
          miscText: JSON.stringify({ customHelpers: [] }),
        })
      }
      return Promise.resolve(null)
    },
  )

  mockPrintItemUpdate.mockImplementation(
    ({
      where,
      data,
    }: {
      where: { id: number }
      data: Record<string, unknown>
    }) => {
      currentVersion = data.version as number
      return Promise.resolve({
        id: where.id,
        name: 'Test Item',
        html: (data.html as string) ?? '<div>hello</div>',
        css: (data.css as string) ?? '',
        version: currentVersion,
      })
    },
  )

  mockDataSetFindFirst.mockResolvedValue(null)
  mockDataSetCreate.mockResolvedValue({
    id: 1,
    printItemId: 42,
    name: 'test',
    columns: '[]',
    rows: '[]',
    rowCount: 0,
  })
})

describe('getTemplate', () => {
  it('returns html, css, name properties', async () => {
    const result = await getTemplate(TEST_ITEM_ID)
    expect(result).toHaveProperty('html')
    expect(result).toHaveProperty('css')
    expect(result).toHaveProperty('name')
    expect(typeof result.html).toBe('string')
    expect(typeof result.css).toBe('string')
    expect(typeof result.name).toBe('string')
  })

  it('handles item not found', async () => {
    await expect(getTemplate('non-existent-id')).rejects.toThrow()
  })
})

describe('updateTemplate', () => {
  it('snapshots the PRE-WRITE state before applying the change', async () => {
    await updateTemplate(TEST_ITEM_ID, '<h1>New</h1>')

    expect(mockVersionUpsert).toHaveBeenCalledTimes(1)
    const arg = mockVersionUpsert.mock.calls[0][0]
    expect(arg.create).toMatchObject({
      printItemId: 42,
      version: 5,
      html: '<div>hello</div>',
      css: 'body { color: red; }',
    })
    // snapshot happens before the update writes the new html
    expect(mockVersionUpsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrintItemUpdate.mock.invocationCallOrder[0],
    )
  })

  it('saves html and returns updated version', async () => {
    const result = await updateTemplate(TEST_ITEM_ID, '<h1>Hello</h1>')
    expect(result.html).toBe('<h1>Hello</h1>')
    expect(result).toHaveProperty('version')
    expect(typeof result.version).toBe('number')
  })

  it('saves css and returns updated version', async () => {
    const result = await updateTemplate(
      TEST_ITEM_ID,
      undefined,
      'h1 { color: red; }',
    )
    expect(result.css).toBe('h1 { color: red; }')
    expect(result).toHaveProperty('version')
    expect(typeof result.version).toBe('number')
  })

  it('increments version on each call', async () => {
    const first = await updateTemplate(TEST_ITEM_ID, '<h1>v1</h1>')
    const second = await updateTemplate(TEST_ITEM_ID, '<h1>v2</h1>')
    expect(second.version).toBeGreaterThan(first.version)
  })

  it('handles missing item', async () => {
    await expect(
      updateTemplate('non-existent-id', '<h1>test</h1>'),
    ).rejects.toThrow()
  })
})

describe('getDataInfo', () => {
  it('returns columns array, rowCount number, sampleRows', async () => {
    const result = await getDataInfo(TEST_ITEM_ID)
    expect(Array.isArray(result.columns)).toBe(true)
    expect(typeof result.rowCount).toBe('number')
    expect(Array.isArray(result.sampleRows)).toBe(true)
  })

  it('handles item with no dataset', async () => {
    const result = await getDataInfo('999')
    expect(result.rowCount).toBe(0)
    expect(result.columns).toEqual([])
    expect(result.sampleRows).toEqual([])
  })
})

describe('analyzeData', () => {
  it('returns count of duplicates', async () => {
    const result = await analyzeData(TEST_ITEM_ID)
    expect(typeof result.duplicates).toBe('number')
    expect(result.duplicates).toBeGreaterThanOrEqual(0)
  })

  it('returns null field counts', async () => {
    const result = await analyzeData(TEST_ITEM_ID)
    expect(result).toHaveProperty('nulls')
    for (const [column, count] of Object.entries(result.nulls)) {
      expect(typeof column).toBe('string')
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns suggestions array', async () => {
    const result = await analyzeData(TEST_ITEM_ID)
    expect(Array.isArray(result.suggestions)).toBe(true)
  })
})

describe('renderPreview', () => {
  it('delegates to renderItemPreviewImages and returns its pages', async () => {
    mockRenderItemPreviewImages.mockResolvedValueOnce({
      pageCount: 1,
      truncated: false,
      images: [{ mimeType: 'image/jpeg', data: 'cGFnZTE=' }],
    })

    const result = await renderPreview(TEST_ITEM_ID)

    expect(mockRenderItemPreviewImages).toHaveBeenCalledWith(TEST_ITEM_ID)
    expect(result.pageCount).toBe(1)
    expect(result.images[0].data).toBe('cGFnZTE=')
  })
})

describe('getAssets', () => {
  it('queries assets by printItemId and returns them', async () => {
    const mockAssets = [
      { id: 1, printItemId: 42, filename: 'assets/42/logo.png', originalName: 'logo.png', mimeType: 'image/png', fileSize: 12345, userId: 1, createdAt: new Date() },
    ]
    mockAssetFindMany.mockResolvedValue(mockAssets)

    const result = await getAssets(TEST_ITEM_ID)

    expect(mockAssetFindMany).toHaveBeenCalledWith({
      where: { printItemId: 42 },
      orderBy: { createdAt: 'desc' },
    })
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0]).toEqual({
      filename: 'assets/42/logo.png',
      url: '/api/assets/file/assets/42/logo.png',
      mimeType: 'image/png',
    })
  })

  it('returns empty array when item has no assets', async () => {
    mockAssetFindMany.mockResolvedValue([])

    const result = await getAssets(TEST_ITEM_ID)

    expect(result.assets).toEqual([])
  })
})

describe('registerHelper', () => {
  it('returns success true with helper name', async () => {
    const result = await registerHelper(
      TEST_ITEM_ID,
      'greet',
      ['name'],
      'return `Hello, ${name}!`',
    )
    expect(result.success).toBe(true)
    expect(result.name).toBe('greet')
  })

  it('creates a helper that can be compiled by Handlebars', async () => {
    const result = await registerHelper(
      TEST_ITEM_ID,
      'double',
      ['n'],
      'return n * 2',
    )
    expect(result.success).toBe(true)

    const tpl = Handlebars.compile('{{double 5}}')
    expect(tpl({})).toBe('10')
  })
})

describe('getData', () => {
  it('returns columns and rows properties', async () => {
    const result = await getData(TEST_ITEM_ID)
    expect(result).toHaveProperty('columns')
    expect(result).toHaveProperty('rows')
    expect(Array.isArray(result.columns)).toBe(true)
    expect(Array.isArray(result.rows)).toBe(true)
  })

  it('rows is an array of objects with keys matching columns', async () => {
    const result = await getData(TEST_ITEM_ID)
    for (const row of result.rows) {
      expect(typeof row).toBe('object')
      expect(row).not.toBeNull()
      for (const col of result.columns) {
        expect(row).toHaveProperty(col)
      }
    }
  })

  it('handles item with no dataset (returns empty columns and rows)', async () => {
    const result = await getData('999')
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
  })
})

describe('updateData', () => {
  const sampleRows = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ]

  it('accepts a new set of rows and returns success with row count', async () => {
    const result = await updateData(TEST_ITEM_ID, sampleRows)
    expect(result.success).toBe(true)
    expect(result.rowCount).toBe(2)
  })

  it('rejects non-array input (throws)', async () => {
    await expect(
      updateData(TEST_ITEM_ID, 'not-an-array' as unknown as Record<string, unknown>[]),
    ).rejects.toThrow()
  })

  it('rejects empty array (throws)', async () => {
    await expect(updateData(TEST_ITEM_ID, [])).rejects.toThrow()
  })

  it('persists data via prisma.dataSet.create', async () => {
    const freshRows = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]
    const updateResult = await updateData(TEST_ITEM_ID, freshRows)
    expect(updateResult.success).toBe(true)
    expect(updateResult.rowCount).toBe(2)
    expect(mockDataSetCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        printItemId: 42,
        columns: JSON.stringify(['x', 'y']),
        rows: JSON.stringify(freshRows),
        rowCount: 2,
      }),
    })
  })
})

describe('getHelpers', () => {
  it('returns builtIn array with helper objects', async () => {
    const result = await getHelpers()
    expect(result).toHaveProperty('builtIn')
    expect(Array.isArray(result.builtIn)).toBe(true)
  })

  it('each builtIn helper has name, params, description as strings', async () => {
    const result = await getHelpers()
    for (const helper of result.builtIn) {
      expect(typeof helper.name).toBe('string')
      expect(typeof helper.params).toBe('string')
      expect(typeof helper.description).toBe('string')
    }
  })

  it('returns custom array (can be empty)', async () => {
    const result = await getHelpers()
    expect(result).toHaveProperty('custom')
    expect(Array.isArray(result.custom)).toBe(true)
    if (result.custom.length > 0) {
      expect(result.custom[0]).toHaveProperty('name')
      expect(result.custom[0]).toHaveProperty('params')
      expect(result.custom[0]).toHaveProperty('body')
    }
  })

  it('includes core helpers like sortBy, filterBy in builtIn', async () => {
    const result = await getHelpers()
    const names = result.builtIn.map((h) => h.name)
    expect(names).toContain('sortBy')
    expect(names).toContain('filterBy')
  })
})
