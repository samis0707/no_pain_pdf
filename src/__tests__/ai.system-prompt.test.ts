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
})
