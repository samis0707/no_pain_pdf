import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { DATA_HELPER_NAMES } from '@/lib/handlebars-helpers.data'

describe('buildSystemPrompt', () => {
  const baseContext = {
    templateName: 'Test Flyer',
    templateHtml: '<h1>{{title}}</h1>\n<p>{{description}}</p>',
    templateCss: 'h1 { color: blue; font-size: 24px; }',
    customHelpers: [],
    dataColumns: ['title', 'description', 'date', 'location'],
    sampleRows: [
      { title: 'Hello', description: 'World', date: '2025-01-01', location: 'Berlin' },
    ],
    rowCount: 47,
    assets: [],
    pageFormat: null,
    availablePageFormats: [],
  }

  it('includes all built-in Handlebars helpers from DATA_HELPER_NAMES', () => {
    const prompt = buildSystemPrompt(baseContext)
    for (const name of DATA_HELPER_NAMES) {
      expect(prompt).toContain(name)
    }
  })

  it('includes custom helpers already registered', () => {
    const context = {
      ...baseContext,
      customHelpers: [
        { name: 'greet', params: ['name'], body: 'return `Hello, ${name}!`' },
        { name: 'bold', params: ['text'], body: 'return `<strong>${text}</strong>`' },
      ],
    }
    const prompt = buildSystemPrompt(context)
    expect(prompt).toContain('greet')
    expect(prompt).toContain('bold')
    expect(prompt).toContain('name')
    expect(prompt).toContain('text')
  })

  it('includes current template HTML and CSS', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('<h1>{{title}}</h1>')
    expect(prompt).toContain('h1 { color: blue; font-size: 24px; }')
  })

  it('includes dataset columns and sample rows', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('title')
    expect(prompt).toContain('description')
    expect(prompt).toContain('date')
    expect(prompt).toContain('location')
    expect(prompt).toContain('47')
    expect(prompt).toContain('Berlin')
  })

  it('includes instructions for creating custom helpers via register_helper', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/register_helper/i)
  })

  it('includes the template name', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('Test Flyer')
  })

  it('includes available assets section when assets are provided', () => {
    const context = {
      ...baseContext,
      assets: [
        { filename: 'logo.png', url: '/api/assets/file/logo.png' },
        { filename: 'qr-code.svg', url: '/api/assets/file/qr-code.svg' },
      ],
    }
    const prompt = buildSystemPrompt(context)
    expect(prompt).toContain('## Available Assets')
    expect(prompt).toContain('logo.png')
    expect(prompt).toContain('/api/assets/file/logo.png')
    expect(prompt).toContain('qr-code.svg')
    expect(prompt).toContain('/api/assets/file/qr-code.svg')
  })

  it('does not include available assets section when assets list is empty', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).not.toContain('## Available Assets')
  })

  it('includes correct section headers in order', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('## Current Template')
    expect(prompt).toContain('## Dataset')
    expect(prompt).toContain('## Available Handlebars Helpers')
    expect(prompt).toContain('## Creating Custom Helpers')
  })

  it('does not include custom helpers section when none are registered', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).not.toContain('## Custom Helpers Already Registered')
  })

  it('includes all built-in helpers with signature format', () => {
    const prompt = buildSystemPrompt(baseContext)
    for (const name of DATA_HELPER_NAMES) {
      expect(prompt).toContain(`\`${name}(`)
    }
  })

  it('handles empty template gracefully', () => {
    const context = {
      ...baseContext,
      templateHtml: '',
      templateCss: '',
    }
    const prompt = buildSystemPrompt(context)
    expect(prompt).toContain('```html')
    expect(prompt).toContain('```css')
  })
})

describe('visual feedback loop section', () => {
  const baseContext = {
    templateName: 'Test Flyer',
    templateHtml: '<h1>{{title}}</h1>',
    templateCss: '',
    customHelpers: [],
    dataColumns: [],
    sampleRows: [],
    rowCount: 0,
    assets: [],
    pageFormat: null,
    availablePageFormats: [],
  }

  it('explains that render_preview returns real page images', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('## Visual Feedback')
    expect(prompt).toContain('render_preview')
    expect(prompt).toMatch(/page images|images of the rendered/i)
  })

  it('explains the automatic preview after template edits and asks for visual verification', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toMatch(/automatic/i)
    expect(prompt).toMatch(/verify|check/i)
    expect(prompt).toContain('autoPreview')
  })
})

describe('templates / corporate identity section', () => {
  const baseContext = {
    templateName: 'Test Flyer',
    templateHtml: '<h1>{{title}}</h1>',
    templateCss: '',
    customHelpers: [],
    dataColumns: [],
    sampleRows: [],
    rowCount: 0,
    assets: [],
    pageFormat: null,
    availablePageFormats: [],
  }

  it('explains the corporate identity workflow with the template tools', () => {
    const prompt = buildSystemPrompt(baseContext)
    expect(prompt).toContain('## Templates & Corporate Identity')
    expect(prompt).toContain('list_templates')
    expect(prompt).toContain('apply_template')
    expect(prompt).toContain('save_as_template')
    // the core use case: fit NEW content into an EXISTING styling
    expect(prompt).toMatch(/re-insert|fit.*content/i)
  })
})
