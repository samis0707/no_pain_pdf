import { describe, it, expect, beforeEach } from 'vitest'
import { renderTemplate } from '@/utils/handlebarsRenderer'
import { unregisterCustomHelpers } from '@/lib/helper-loader'

beforeEach(() => {
  unregisterCustomHelpers()
})

describe('renderTemplate', () => {
  describe('body-only input (no double wrapping)', () => {
    it('output starts with DOCTYPE', () => {
      const result = renderTemplate('<h1>{{title}}</h1>', 'h1 { color: red; }', { title: 'Hello' })
      expect(result.startsWith('<!DOCTYPE html>')).toBe(true)
    })

    it('contains exactly one <html> tag', () => {
      const result = renderTemplate('<h1>{{title}}</h1>', '', { title: 'Hello' })
      const matches = result.match(/<html\b[^>]*>/g)
      expect(matches).toHaveLength(1)
    })

    it('contains exactly one <head> tag', () => {
      const result = renderTemplate('<h1>{{title}}</h1>', '', { title: 'Hello' })
      const matches = result.match(/<head>/g)
      expect(matches).toHaveLength(1)
    })

    it('contains exactly one <body> tag', () => {
      const result = renderTemplate('<h1>{{title}}</h1>', '', { title: 'Hello' })
      const matches = result.match(/<body>/g)
      expect(matches).toHaveLength(1)
    })

    it('CSS is inside <style> tags within <head>', () => {
      const result = renderTemplate('<h1>{{title}}</h1>', 'h1 { color: red; }', { title: 'Hello' })
      expect(result).toContain('<style>')
      expect(result).toContain('</style>')
      expect(result).toContain('h1 { color: red; }')
      const styleContent = result.match(/<style>([\s\S]*?)<\/style>/)
      expect(styleContent).not.toBeNull()
      expect(styleContent![1]).toContain('h1 { color: red; }')
    })
  })

  describe('full-document input (no double wrapping)', () => {
    const fullDoc = '<!DOCTYPE html><html><head><style>{{css}}</style></head><body><h1>{{title}}</h1></body></html>'

    it('does not produce nested <html> tags', () => {
      const result = renderTemplate(fullDoc, '', { title: 'Hello', css: '' })
      const matches = result.match(/<html\b[^>]*>/g)
      expect(matches).toHaveLength(1)
    })

    it('produces valid HTML output', () => {
      const result = renderTemplate(fullDoc, '', { title: 'Hello', css: '' })
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<h1>Hello</h1>')
    })
  })

  describe('renders {{variable}} placeholders', () => {
    it('replaces {{name}} with World', () => {
      const result = renderTemplate('<h1>{{name}}</h1>', '', { name: 'World' })
      expect(result).toContain('<h1>World</h1>')
    })

    it('replaces multiple variables', () => {
      const result = renderTemplate('<p>{{a}} {{b}}</p>', '', { a: 'foo', b: 'bar' })
      expect(result).toContain('<p>foo bar</p>')
    })
  })

  describe('renders {{#each rows}}', () => {
    it('iterates over rows with each helper', () => {
      const result = renderTemplate(
        '{{#each rows}}{{name}},{{/each}}',
        '',
        { rows: [{ name: 'A' }, { name: 'B' }] } as unknown as Record<string, string>,
      )
      expect(result).toContain('A,B,')
    })

    it('exposes each row fields inside the loop', () => {
      const result = renderTemplate(
        '{{#each rows}}[{{name}}:{{value}}]{{/each}}',
        '',
        { rows: [{ name: 'x', value: '1' }, { name: 'y', value: '2' }] } as unknown as Record<string, string>,
      )
      expect(result).toContain('[x:1][y:2]')
    })
  })

  describe('throws on compilation error', () => {
    it('throws for invalid Handlebars syntax', () => {
      expect(() => renderTemplate('{{#invalid', '', {})).toThrow()
    })

    it('throws for unmatched block helper', () => {
      expect(() => renderTemplate('{{#each items}}', '', { items: [] })).toThrow()
    })
  })

  describe('includes CSS properly', () => {
    it('CSS string appears in <style> tag', () => {
      const result = renderTemplate('<p>text</p>', 'p { font-size: 14pt; }', {})
      expect(result).toContain('p { font-size: 14pt; }')
      expect(result).toMatch(/<style>[\s\S]*p \{ font-size: 14pt; \}[\s\S]*<\/style>/)
    })

    it('empty CSS produces empty <style> tag', () => {
      const result = renderTemplate('<p>text</p>', '', {})
      expect(result).toContain('<style></style>')
    })
  })

  describe('empty template', () => {
    it('handles empty html string gracefully', () => {
      const result = renderTemplate('', '', {})
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toMatch(/<html\b/)
      expect(result).toContain('<body>')
    })
  })

  describe('data types', () => {
    it('handles numeric values', () => {
      const result = renderTemplate('<p>{{count}}</p>', '', { count: '42' })
      expect(result).toContain('<p>42</p>')
    })
  })
})
