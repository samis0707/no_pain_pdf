import { describe, it, expect, beforeEach, vi } from 'vitest'

const {
  mockPrintItemFindUnique,
  mockPrintItemUpdate,
  mockPageFormatFindMany,
} = vi.hoisted(() => ({
  mockPrintItemFindUnique: vi.fn(),
  mockPrintItemUpdate: vi.fn(),
  mockPageFormatFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: {
      findUnique: (...args: unknown[]) => mockPrintItemFindUnique(...args),
      update: (...args: unknown[]) => mockPrintItemUpdate(...args),
    },
    pageFormat: {
      findMany: (...args: unknown[]) => mockPageFormatFindMany(...args),
    },
  },
}))

import { updateExportSettings } from '@/lib/ai/tools'
import { TOOL_DEFINITIONS, executeToolCall } from '@/lib/ai/tool-loop'
import { TOOL_LABELS_DE } from '@/lib/ai/tool-labels'

const mockItem = (exportSettingsStr: string = '{}', version: number = 5) => ({
  id: 1,
  projectId: 1,
  name: 'Test Item',
  html: '<h1>{{title}}</h1>',
  css: 'h1 { color: red; }',
  pageFormatId: 1,
  miscText: '{}',
  exportSettings: exportSettingsStr,
  version,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateExportSettings tool handler', () => {
  it('persists bleed to PrintItem.exportSettings', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', 3)

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { exportSettings: JSON.stringify({ bleed: 3 }) },
    })
    expect(result.bleed).toBe(3)
  })

  it('persists cropMarks to PrintItem.exportSettings', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', undefined, true)

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { exportSettings: JSON.stringify({ cropMarks: true }) },
    })
    expect(result.cropMarks).toBe(true)
  })

  it('persists colorMode to PrintItem.exportSettings', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', undefined, undefined, 'cmyk')

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { exportSettings: JSON.stringify({ colorMode: 'cmyk' }) },
    })
    expect(result.colorMode).toBe('cmyk')
  })

  it('merges with existing exportSettings', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem(JSON.stringify({ bleed: 3 })))
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', undefined, true)

    expect(mockPrintItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { exportSettings: JSON.stringify({ bleed: 3, cropMarks: true }) },
    })
    expect(result.bleed).toBe(3)
    expect(result.cropMarks).toBe(true)
  })

  it('returns all current export settings', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', 3, true, 'cmyk')

    expect(result.bleed).toBe(3)
    expect(result.cropMarks).toBe(true)
    expect(result.colorMode).toBe('cmyk')
  })

  it('throws on invalid colorMode value', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())

    await expect(
      updateExportSettings('1', undefined, undefined, 'invalid' as 'rgb' | 'cmyk'),
    ).rejects.toThrow(/colorMode/i)
  })

  it('throws on negative bleed', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())

    await expect(
      updateExportSettings('1', -1),
    ).rejects.toThrow(/bleed/i)
  })

  it('throws on bleed > 5', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())

    await expect(
      updateExportSettings('1', 6),
    ).rejects.toThrow(/bleed/i)
  })

  it('accepts bleed = 0', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', 0)
    expect(result.bleed).toBe(0)
  })

  it('accepts bleed = 5', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await updateExportSettings('1', 5)
    expect(result.bleed).toBe(5)
  })

  it('throws on invalid item ID', async () => {
    await expect(updateExportSettings('abc')).rejects.toThrow('Invalid item ID: abc')
  })

  it('throws when item is not found', async () => {
    mockPrintItemFindUnique.mockResolvedValue(null)

    await expect(updateExportSettings('999')).rejects.toThrow('Item not found: 999')
  })

  it('does not increment version', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem('{}', 5))
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    await updateExportSettings('1', 3)

    const updateCall = mockPrintItemUpdate.mock.calls[0]
    expect(updateCall[0].data).not.toHaveProperty('version')
  })
})

describe('TOOL_DEFINITIONS includes update_export_settings', () => {
  it('has a tool definition named update_export_settings', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'update_export_settings',
    )
    expect(def).toBeDefined()
    expect(def!.function.name).toBe('update_export_settings')
  })

  it('update_export_settings has bleed parameter', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'update_export_settings',
    )
    expect(def!.function.parameters.properties).toHaveProperty('bleed')
  })

  it('update_export_settings has cropMarks parameter', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'update_export_settings',
    )
    expect(def!.function.parameters.properties).toHaveProperty('cropMarks')
  })

  it('update_export_settings has colorMode parameter with rgb/cmyk enum', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'update_export_settings',
    )
    expect(def!.function.parameters.properties).toHaveProperty('colorMode')
    expect(def!.function.parameters.properties.colorMode.enum).toContain('rgb')
    expect(def!.function.parameters.properties.colorMode.enum).toContain('cmyk')
  })

  it('update_export_settings has optional parameters (itemId injected server-side)', () => {
    const def = TOOL_DEFINITIONS.find(
      (d) => d.function && d.function.name === 'update_export_settings',
    )
    expect(def!.function.parameters.required).toBeUndefined()
  })
})

describe('executeToolCall dispatches update_export_settings', () => {
  it('calls updateExportSettings handler with correct args', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await executeToolCall('1', {
      id: 'call_1',
      name: 'update_export_settings',
      args: { bleed: 3, cropMarks: true, colorMode: 'cmyk' },
    })

    expect(result.toolCallId).toBe('call_1')
    expect(result.result).toHaveProperty('bleed', 3)
    expect(result.result).toHaveProperty('cropMarks', true)
    expect(result.result).toHaveProperty('colorMode', 'cmyk')
  })

  it('passes partial args (only bleed)', async () => {
    mockPrintItemFindUnique.mockResolvedValue(mockItem())
    mockPrintItemUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...mockItem(data.exportSettings as string), version: data.version ?? 5 }),
    )

    const result = await executeToolCall('1', {
      id: 'call_2',
      name: 'update_export_settings',
      args: { bleed: 5 },
    })

    expect(result.result).toHaveProperty('bleed', 5)
  })
})

describe('TOOL_LABELS_DE includes update_export_settings', () => {
  it('has a German label for update_export_settings', () => {
    expect(TOOL_LABELS_DE).toHaveProperty('update_export_settings')
    expect(TOOL_LABELS_DE.update_export_settings).toBeTruthy()
  })
})
