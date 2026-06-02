import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import Handlebars from 'handlebars'

const seedPath = path.resolve(__dirname, '../../prisma/seed.ts')
const seedContent = fs.readFileSync(seedPath, 'utf-8')

function extractHtmlFields(content: string): string[] {
  const regex = /html:\s*'([\s\S]*?)'/g
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1])
  }
  return matches
}

function extractCssFields(content: string): string[] {
  const regex = /css:\s*'([\s\S]*?)'/g
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1])
  }
  return matches
}

describe('seed templates are clean — no full document wrappers', () => {
  const htmlFields = extractHtmlFields(seedContent)
  const cssFields = extractCssFields(seedContent)

  it('extracts exactly 3 template html fields', () => {
    expect(htmlFields).toHaveLength(3)
  })

  it('extracts exactly 3 template css fields', () => {
    expect(cssFields).toHaveLength(3)
  })

  describe.each([
    ['template 1 (Quartierszentrum)', 0],
    ['template 2 (Sportpark)', 1],
    ['template 3 (linqr Allgemein)', 2],
  ])('%s', (_label, idx) => {
    const html = htmlFields[idx]
    const css = cssFields[idx]

    it('does not contain <!DOCTYPE html>', () => {
      expect(html).not.toMatch(/<!DOCTYPE\s+html>/i)
    })

    it('does not contain {{css}} variable', () => {
      expect(html).not.toContain('{{css}}')
    })

    it('does not contain <html> tag', () => {
      expect(html).not.toMatch(/<html[\s>]/i)
    })

    it('does not contain </html> tag', () => {
      expect(html).not.toContain('</html>')
    })

    it('does not contain <head> tag', () => {
      expect(html).not.toMatch(/<head[\s>]/i)
    })

    it('does not contain </head> tag', () => {
      expect(html).not.toContain('</head>')
    })

    it('does not contain <body> tag', () => {
      expect(html).not.toMatch(/<body[\s>]/i)
    })

    it('does not contain </body> tag', () => {
      expect(html).not.toContain('</body>')
    })

    it('does not contain <style> tag (css is separate field)', () => {
      expect(html).not.toMatch(/<style[\s>]/i)
    })

    it('does not contain <meta> tag', () => {
      expect(html).not.toMatch(/<meta[\s>]/i)
    })

    it('starts with a body-level tag like <div> or <section>', () => {
      expect(html.trim()).toMatch(/^<\w+/)
      expect(html.trim()).not.toMatch(/^<!DOCTYPE/i)
    })

    it('CSS field does NOT contain {{css}} variable', () => {
      expect(css).not.toContain('{{css}}')
    })

    it('CSS field contains actual CSS rules', () => {
      expect(css.length).toBeGreaterThan(0)
      expect(css).toContain('{')
      expect(css).toContain('}')
    })

    it('html is valid Handlebars (compiles without error)', () => {
      expect(() => Handlebars.compile(html)).not.toThrow()
    })

    it('compiled template produces output matching variables in template', () => {
      const template = Handlebars.compile(html)

      const vars = html.match(/\{\{([^#/]+?)\}\}/g) || []
      const mockData: Record<string, string> = {}
      for (const v of vars) {
        const key = v.replace(/[{}]/g, '')
        mockData[key] = `mock_${key}`
      }

      const result = template(mockData)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result).not.toMatch(/^\{\{/)
    })
  })
})
