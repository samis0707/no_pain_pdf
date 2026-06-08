import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'

const baseContext = {
  templateName: 'Test Template',
  templateHtml: '<p>Hello</p>',
  templateCss: '',
  customHelpers: [],
  dataColumns: ['name', 'date'],
  sampleRows: [{ name: 'Test', date: '2024-01-01' }],
  rowCount: 1,
  assets: [],
  pageFormat: null,
  availablePageFormats: [],
}

describe('buildSystemPrompt includes PDF/UA accessibility guidance', () => {
  it('mentions PDF/UA or accessibility standards', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/PDF\/UA|accessibility/i)
  })

  it('includes guidance on the lang attribute', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/\blang\b/)
  })

  it('mentions semantic HTML (headings, lists, tables)', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/semantic HTML|semantic markup|proper headings|headings|unordered lists|ordered lists|table structure/i)
  })

  it('mentions enableAccessibility in export or PDF/UA context', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/enableAccessibility|accessibility toggle|PDF\/UA/)
  })

  it('mentions alt text for images', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/alt text|alt attribute|alternative text/i)
  })
})
