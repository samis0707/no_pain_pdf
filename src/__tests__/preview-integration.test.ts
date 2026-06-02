import { describe, it, expect } from 'vitest'
import { buildPreviewDocument } from '@/utils/previewDocument'

describe('buildPreviewDocument', () => {
  describe('injects @page size CSS', () => {
    it('injects @page size for A4 portrait (210×297mm)', () => {
      const result = buildPreviewDocument('<p>hello</p>', 'p { color: red; }', 210, 297)
      expect(result).toContain('@page')
      expect(result).toContain('size: 210mm 297mm')
    })

    it('injects @page size for A4 landscape (297×210mm)', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 297, 210)
      expect(result).toContain('size: 297mm 210mm')
    })

    it('injects @page size for Letter portrait (215.9×279.4mm)', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 215.9, 279.4)
      expect(result).toContain('size: 215.9mm 279.4mm')
    })

    it('injects @page size for A3 portrait (297×420mm)', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 297, 420)
      expect(result).toContain('size: 297mm 420mm')
    })

    it('handles non-standard dimensions like square 100×100mm', () => {
      const result = buildPreviewDocument('<p>x</p>', '', 100, 100)
      expect(result).toContain('size: 100mm 100mm')
    })

    it('the @page rule is inside a <style> tag', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      const styleMatch = result.match(/<style>([\s\S]*?)<\/style>/)
      expect(styleMatch).not.toBeNull()
      expect(styleMatch![1]).toContain('@page')
      expect(styleMatch![1]).toContain('size: 210mm 297mm')
    })

    it('only injects one @page rule', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      const matches = result.match(/@page/g)
      expect(matches).toHaveLength(1)
    })
  })

  describe('includes the user CSS', () => {
    it('appends user CSS after the @page rule', () => {
      const result = buildPreviewDocument('<p>hello</p>', 'p { color: red; }', 210, 297)
      const styleContent = result.match(/<style>([\s\S]*?)<\/style>/)
      expect(styleContent).not.toBeNull()
      expect(styleContent![1]).toContain('p { color: red; }')
    })

    it('handles multiline user CSS', () => {
      const css = `p { color: red; }
h1 { font-size: 24pt; }
.foo { background: blue; }`
      const result = buildPreviewDocument('<p>hello</p>', css, 210, 297)
      expect(result).toContain('p { color: red; }')
      expect(result).toContain('h1 { font-size: 24pt; }')
      expect(result).toContain('.foo { background: blue; }')
    })

    it('includes @page before user CSS in the style block', () => {
      const result = buildPreviewDocument('<p>hello</p>', 'body { margin: 0; }', 210, 297)
      const styleContent = result.match(/<style>([\s\S]*?)<\/style>/)
      const pageIdx = styleContent![1].indexOf('@page')
      const userIdx = styleContent![1].indexOf('body { margin: 0; }')
      expect(pageIdx).toBeLessThan(userIdx)
    })

    it('handles empty user CSS string', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      expect(result).toContain('size: 210mm 297mm')
      const styleContent = result.match(/<style>([\s\S]*?)<\/style>/)
      expect(styleContent![1].trim()).toBeTruthy()
    })
  })

  describe('includes the HTML body content', () => {
    it('preserves simple HTML content in the body', () => {
      const result = buildPreviewDocument('<h1>Title</h1>', '', 210, 297)
      expect(result).toContain('<h1>Title</h1>')
    })

    it('preserves complex nested HTML content', () => {
      const html = `<div class="flyer">
  <header><h1>{{title}}</h1></header>
  <div class="content">{{body}}</div>
  <footer>{{contact}}</footer>
</div>`
      const result = buildPreviewDocument(html, '', 210, 297)
      expect(result).toContain('<div class="flyer">')
      expect(result).toContain('{{title}}')
      expect(result).toContain('{{body}}')
      expect(result).toContain('{{contact}}')
    })

    it('content is placed in <body> tag, not <head>', () => {
      const result = buildPreviewDocument('<p>body-content</p>', '', 210, 297)
      const headContent = result.match(/<head>([\s\S]*?)<\/head>/)
      expect(headContent![1]).not.toContain('body-content')
      const bodyContent = result.match(/<body>([\s\S]*?)<\/body>/)
      expect(bodyContent![1]).toContain('body-content')
    })
  })

  describe('returns a complete HTML document', () => {
    it('starts with <!DOCTYPE html>', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      expect(result).toMatch(/^<!DOCTYPE html>/i)
    })

    it('contains exactly one <html> tag', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      const matches = result.match(/<html[\s>]/g)
      expect(matches).toHaveLength(1)
    })

    it('contains exactly one </html> closing tag', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      const matches = result.match(/<\/html>/g)
      expect(matches).toHaveLength(1)
    })

    it('contains exactly one <head> tag', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      const matches = result.match(/<head>/g)
      expect(matches).toHaveLength(1)
    })

    it('contains exactly one <body> tag', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      const matches = result.match(/<body[\s>]/g)
      expect(matches).toHaveLength(1)
    })

    it('has <meta charset> in head for proper rendering', () => {
      const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
      expect(result).toMatch(/<meta[^>]+charset/i)
    })
  })

  describe('edge cases', () => {
    it('handles empty html string', () => {
      const result = buildPreviewDocument('', '', 210, 297)
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<body>')
    })

    it('handles html with special characters', () => {
      const html = '<p>üñîçödé & <em>special</em> chars <<>></p>'
      const result = buildPreviewDocument(html, '', 210, 297)
      expect(result).toContain(html)
    })

    it('handles zero-sized page dimensions gracefully', () => {
      const result = buildPreviewDocument('<p>test</p>', '', 0, 0)
      expect(result).toContain('<!DOCTYPE html>')
    })

    it('preserves Handlebars expressions in body content', () => {
      const html = '{{#each items}}<div>{{name}}</div>{{/each}}'
      const result = buildPreviewDocument(html, '', 210, 297)
      expect(result).toContain('{{#each items}}')
      expect(result).toContain('{{name}}')
    })
  })
})
