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

describe('buildSystemPrompt includes export settings context', () => {
  it('has an ## Export Settings section', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      bleed: 3,
      cropMarks: true,
      colorMode: 'cmyk',
    })
    expect(prompt).toContain('## Export Settings')
  })

  it('includes bleed value when set', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      bleed: 3,
    })
    expect(prompt).toContain('Bleed: 3mm')
  })

  it('includes crop marks as enabled when true', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      cropMarks: true,
    })
    expect(prompt).toContain('Crop marks: enabled')
  })

  it('includes crop marks as disabled when false', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      cropMarks: false,
    })
    expect(prompt).toContain('Crop marks: disabled')
  })

  it('includes color mode value', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      colorMode: 'cmyk',
    })
    expect(prompt).toContain('Color mode: CMYK')
  })

  it('shows RGB color mode', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      colorMode: 'rgb',
    })
    expect(prompt).toContain('Color mode: RGB')
  })

  it('mentions update_export_settings tool for configuring export', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      bleed: 3,
      cropMarks: true,
      colorMode: 'cmyk',
    })
    expect(prompt).toContain('update_export_settings')
  })

  it('does not include export settings section when no settings provided', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).not.toContain('## Export Settings')
  })
})
