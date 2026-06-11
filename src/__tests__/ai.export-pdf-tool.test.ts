import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrintItemFindUnique, mockPageFormatFindMany } = vi.hoisted(() => ({
  mockPrintItemFindUnique: vi.fn(),
  mockPageFormatFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: {
      findUnique: (...args: unknown[]) => mockPrintItemFindUnique(...args),
    },
    pageFormat: {
      findMany: (...args: unknown[]) => mockPageFormatFindMany(...args),
    },
  },
}))

import { buildSdkTools } from '@/lib/ai/sdk-tools'
import { TOOL_LABELS_DE } from '@/lib/ai/tool-labels'

const mockItem = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  projectId: 1,
  name: 'Test Item',
  html: '<h1>{{title}}</h1>',
  css: 'h1 { color: red; }',
  pageFormatId: 1,
  miscText: '{}',
  exportSettings: JSON.stringify({ bleed: 3, cropMarks: true, colorMode: 'cmyk' }),
  version: 5,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('export_pdf SDK declaration', () => {
  it('is declared with a PDF-generating description and optional filename', () => {
    const tools = buildSdkTools('1')
    expect(tools.export_pdf).toBeDefined()
    expect(tools.export_pdf.description!.toLowerCase()).toContain('pdf')

    const schema = tools.export_pdf.inputSchema as {
      safeParse: (v: unknown) => { success: boolean }
    }
    expect(schema.safeParse({}).success).toBe(true)
    expect(schema.safeParse({ filename: 'flyer.pdf' }).success).toBe(true)
  })
})

describe('export_pdf execution', () => {
  it('returns a summary with template info', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())

    const tools = buildSdkTools('1')
    const result = (await tools.export_pdf.execute!({}, { toolCallId: 'c1', messages: [] })) as {
      success: boolean
      itemName: string
      exportSettings: { bleed: number; cropMarks: boolean; colorMode: string }
    }

    expect(result.success).toBe(true)
    expect(result.itemName).toBe('Test Item')
    expect(result.exportSettings).toMatchObject({ bleed: 3, cropMarks: true, colorMode: 'cmyk' })
  })

  it('returns success=false for invalid item', async () => {
    mockPrintItemFindUnique.mockResolvedValue(null)

    const tools = buildSdkTools('999')
    const result = (await tools.export_pdf.execute!({}, { toolCallId: 'c2', messages: [] })) as {
      success: boolean
      itemName: string
    }

    expect(result.success).toBe(false)
    expect(result.itemName).toBe('')
  })
})

describe('TOOL_LABELS_DE includes export_pdf', () => {
  it('has a German label for export_pdf', () => {
    expect(TOOL_LABELS_DE).toHaveProperty('export_pdf')
    expect(TOOL_LABELS_DE.export_pdf).toBeTruthy()
  })
})
