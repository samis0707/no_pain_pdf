import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRenderItemPreviewImages } = vi.hoisted(() => ({
  mockRenderItemPreviewImages: vi.fn(),
}))

vi.mock('@/lib/pdf-render', () => ({
  renderItemPreviewImages: mockRenderItemPreviewImages,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

const PREVIEW = {
  pageCount: 2,
  truncated: false,
  images: [
    { mimeType: 'image/jpeg', data: 'cGFnZTE=' },
    { mimeType: 'image/jpeg', data: 'cGFnZTI=' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRenderItemPreviewImages.mockResolvedValue(PREVIEW)
})

describe('renderPreview tool', () => {
  it('returns real rendered page images, not a stub screenshot', async () => {
    const { renderPreview } = await import('@/lib/ai/tools')

    const result = await renderPreview('1')

    expect(mockRenderItemPreviewImages).toHaveBeenCalledWith('1')
    expect(result.pageCount).toBe(2)
    expect(result.truncated).toBe(false)
    expect(result.images).toHaveLength(2)
    expect(result.images[0]).toEqual({ mimeType: 'image/jpeg', data: 'cGFnZTE=' })
  })
})

describe('executeToolCall image splitting', () => {
  it('moves images out of the JSON result and onto ToolResult.images', async () => {
    const { executeToolCall } = await import('@/lib/ai/tool-loop')

    const toolResult = await executeToolCall('1', {
      id: 'tc_1',
      name: 'render_preview',
      args: {},
    })

    expect(toolResult.toolCallId).toBe('tc_1')
    expect(toolResult.images).toEqual(PREVIEW.images)
    // the serialized result must stay small — no base64 payloads
    const serialized = JSON.stringify(toolResult.result)
    expect(serialized).not.toContain('cGFnZTE=')
    expect(toolResult.result).toMatchObject({ pageCount: 2, truncated: false })
  })

  it('leaves tools without images untouched', async () => {
    const { executeToolCall } = await import('@/lib/ai/tool-loop')
    const { prisma } = await import('@/lib/prisma')
    ;(prisma as Record<string, unknown>).printItem = {
      findUnique: vi.fn().mockResolvedValue({
        id: 1,
        name: 'x',
        html: '<p>x</p>',
        css: '',
        pageFormat: null,
      }),
    }

    const toolResult = await executeToolCall('1', {
      id: 'tc_2',
      name: 'get_template',
      args: {},
    })

    expect(toolResult.images).toBeUndefined()
    expect(toolResult.result).toMatchObject({ html: '<p>x</p>' })
  })
})
