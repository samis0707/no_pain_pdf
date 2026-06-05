import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'

const baseContext = {
  templateName: 'Test Flyer',
  templateHtml: '<h1>{{title}}</h1>',
  templateCss: 'h1 { color: blue; }',
  customHelpers: [],
  dataColumns: ['title'],
  sampleRows: [{ title: 'Hello' }],
  rowCount: 1,
  assets: [],
  pageFormat: null,
  availablePageFormats: [],
}

describe('buildSystemPrompt includes CSS Paged Media knowledge', () => {
  it('mentions @page rule', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('@page')
  })

  it('mentions bleed property', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/bleed/i)
  })

  it('mentions crop marks or marks', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/crop(\s|-)?marks|marks/i)
  })

  it('mentions device-cmyk() for CMYK colors', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('device-cmyk()')
  })

  it('mentions running() elements for page headers/footers', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('running()')
  })

  it('mentions named pages', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('named pages')
  })

  it('has a ## CSS Paged Media section', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('## CSS Paged Media')
  })
})
