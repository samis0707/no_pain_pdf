import { describe, it, expect } from 'vitest'
import { TOOL_LABELS_DE } from '@/lib/ai/tool-labels'

describe('TOOL_LABELS_DE', () => {
  it('has a label for get_template', () => {
    expect(TOOL_LABELS_DE.get_template).toBe('Prüfe Design...')
  })

  it('has a label for update_template_html', () => {
    expect(TOOL_LABELS_DE.update_template_html).toBe('Aktualisiere Vorlage (HTML)...')
  })

  it('has a label for update_page_format', () => {
    expect(TOOL_LABELS_DE.update_page_format).toBe('Aktualisiere Seitenformat...')
  })

  it('has a label for get_page_formats', () => {
    expect(TOOL_LABELS_DE.get_page_formats).toBe('Lade Seitenformate...')
  })

  it('covers all expected tools', () => {
    const expectedTools = [
      'get_template',
      'update_template',
      'update_template_html',
      'get_page_formats',
      'update_page_format',
      'get_data_info',
      'analyze_data',
      'render_preview',
      'get_assets',
      'register_helper',
      'get_data',
      'update_data',
      'get_helpers',
    ]
    for (const tool of expectedTools) {
      expect(TOOL_LABELS_DE).toHaveProperty(tool)
      expect(TOOL_LABELS_DE[tool]).toBeTruthy()
    }
  })
})
