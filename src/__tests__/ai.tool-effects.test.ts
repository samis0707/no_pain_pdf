import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTemplateStore } from '@/stores/templateStore'
import { useExportStore } from '@/stores/exportStore'

beforeEach(() => {
  vi.restoreAllMocks()
})

function toolPart(toolName: string, input: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    role: 'assistant' as const,
    parts: [
      {
        type: `tool-${toolName}`,
        toolCallId: 'tc1',
        state: 'output-available',
        input,
        output: {},
      },
    ],
  }
}

describe('applyToolEffects', () => {
  it('refreshes the template store after a document mutation', async () => {
    const { applyToolEffects } = await import('@/lib/ai/tool-effects')
    const fetchTemplate = vi.fn().mockResolvedValue(undefined)
    useTemplateStore.setState({ fetchTemplate })

    await applyToolEffects(toolPart('update_template', { html: '<h1>x</h1>' }))

    expect(fetchTemplate).toHaveBeenCalled()
  })

  it('updates the export store for update_export_settings', async () => {
    const { applyToolEffects } = await import('@/lib/ai/tool-effects')

    await applyToolEffects(
      toolPart('update_export_settings', { bleed: 3, cropMarks: true, colorMode: 'cmyk' })
    )

    const state = useExportStore.getState()
    expect(state.bleed).toBe(3)
    expect(state.cropMarks).toBe(true)
    expect(state.colorMode).toBe('cmyk')
  })

  it('triggers the PDF export for export_pdf', async () => {
    const { applyToolEffects } = await import('@/lib/ai/tool-effects')
    const exportPdf = vi.fn().mockResolvedValue(undefined)
    useExportStore.setState({ exportPdf })
    useTemplateStore.setState({ html: '<h1>x</h1>', css: 'h1{}' })

    await applyToolEffects(toolPart('export_pdf'))

    expect(exportPdf).toHaveBeenCalledWith('<h1>x</h1>', 'h1{}')
  })

  it('ignores read-only tools and incomplete tool parts', async () => {
    const { applyToolEffects } = await import('@/lib/ai/tool-effects')
    const fetchTemplate = vi.fn()
    useTemplateStore.setState({ fetchTemplate })

    await applyToolEffects(toolPart('get_data_info'))
    await applyToolEffects({
      id: 'm2',
      role: 'assistant',
      parts: [
        {
          type: 'tool-update_template',
          toolCallId: 'tc2',
          state: 'input-available',
          input: {},
        },
      ],
    })

    expect(fetchTemplate).not.toHaveBeenCalled()
  })
})
