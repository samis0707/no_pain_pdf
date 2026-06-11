import { useTemplateStore } from '@/stores/templateStore'
import { useExportStore } from '@/stores/exportStore'

interface UIMessageLike {
  id: string
  role: string
  parts: Array<{ type: string } & Record<string, unknown>>
}

const TEMPLATE_MUTATORS = new Set([
  'tool-update_template',
  'tool-update_template_html',
  'tool-update_page_format',
  'tool-apply_template',
  'tool-register_helper',
  'tool-update_data',
])

/**
 * Applies client-side consequences of completed tool calls in a finished
 * assistant message: refresh the template after document mutations, sync
 * export settings, trigger the browser download for export_pdf.
 */
export async function applyToolEffects(message: UIMessageLike): Promise<void> {
  let templateDirty = false

  for (const part of message.parts) {
    if (!part.type.startsWith('tool-')) continue
    if (part.state !== 'output-available') continue

    if (TEMPLATE_MUTATORS.has(part.type)) {
      templateDirty = true
    } else if (part.type === 'tool-update_export_settings') {
      const input = (part.input ?? {}) as { bleed?: number; cropMarks?: boolean; colorMode?: 'rgb' | 'cmyk' }
      const exportStore = useExportStore.getState()
      if (input.bleed !== undefined) exportStore.setBleed(input.bleed)
      if (input.cropMarks !== undefined) exportStore.setCropMarks(input.cropMarks)
      if (input.colorMode !== undefined) exportStore.setColorMode(input.colorMode)
    } else if (part.type === 'tool-export_pdf') {
      const { html, css } = useTemplateStore.getState()
      await useExportStore.getState().exportPdf(html, css)
    }
  }

  if (templateDirty) {
    await useTemplateStore.getState().fetchTemplate()
  }
}
