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

import { TOOL_DEFINITIONS, executeToolCall } from '@/lib/ai/tool-loop'
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

describe('export_pdf tool definition', () => {
  it('has a tool definition named export_pdf', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'export_pdf',
    )
    expect(def).toBeDefined()
    expect(def!.function.name).toBe('export_pdf')
  })

  it('export_pdf has a description mentioning PDF generation', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'export_pdf',
    )
    expect(def!.function.description.toLowerCase()).toContain('pdf')
  })

  it('export_pdf has itemId as required parameter', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'export_pdf',
    )
    expect(def!.function.parameters.required).toContain('itemId')
  })

  it('export_pdf has optional filename parameter', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'export_pdf',
    )
    expect(def!.function.parameters.properties).toHaveProperty('filename')
  })
})

describe('executeToolCall dispatches export_pdf', () => {
  it('calls export_pdf handler and returns summary with template info', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())

    const result = await executeToolCall('1', {
      id: 'call_pdf_1',
      name: 'export_pdf',
      args: {},
    })

    expect(result.toolCallId).toBe('call_pdf_1')
    expect(result.result).toHaveProperty('success', true)
    expect(result.result).toHaveProperty('itemName')
    expect(result.result).toHaveProperty('exportSettings')
    expect(result.result.exportSettings).toHaveProperty('bleed')
    expect(result.result.exportSettings).toHaveProperty('cropMarks')
    expect(result.result.exportSettings).toHaveProperty('colorMode')
  })

  it('returns success=false for invalid item', async () => {
    mockPrintItemFindUnique.mockResolvedValue(null)

    const result = await executeToolCall('999', {
      id: 'call_err',
      name: 'export_pdf',
      args: {},
    })

    expect(result.result).toHaveProperty('success', false)
    expect(result.result).toHaveProperty('itemName', '')
  })
})

describe('TOOL_LABELS_DE includes export_pdf', () => {
  it('has a German label for export_pdf', () => {
    expect(TOOL_LABELS_DE).toHaveProperty('export_pdf')
    expect(TOOL_LABELS_DE.export_pdf).toBeTruthy()
  })
})
