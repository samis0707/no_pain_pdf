import { describe, it, expect } from 'vitest'
import { buildPreviewDocument } from '@/utils/previewDocument'
import { buildPagedCss } from '@/utils/pagedCss'

describe('buildPreviewDocument uses buildPagedCss', () => {
  it('generates @page CSS matching buildPagedCss without hardcoded margin', () => {
    const result = buildPreviewDocument('<p>hello</p>', 'p { color: red; }', 210, 297)
    const expectedPageCss = buildPagedCss(210, 297)
    expect(result).toContain(expectedPageCss)
    expect(result).not.toContain('margin: 0')
  })

  it('generates @page CSS for A4 landscape matching buildPagedCss', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 297, 210)
    const expectedPageCss = buildPagedCss(297, 210)
    expect(result).toContain(expectedPageCss)
  })

  it('generates @page CSS for Letter matching buildPagedCss', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 215.9, 279.4)
    const expectedPageCss = buildPagedCss(215.9, 279.4)
    expect(result).toContain(expectedPageCss)
  })

  it('includes bleed and crop marks when provided', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 210, 297, 3, true)
    expect(result).toContain('bleed: 3mm')
    expect(result).toContain('marks: crop cross')
  })

  it('places buildPagedCss output before user CSS in style block', () => {
    const result = buildPreviewDocument('<p>hello</p>', 'body { margin: 0; }', 210, 297)
    const styleContent = result.match(/<style>([\s\S]*?)<\/style>/)
    expect(styleContent).not.toBeNull()
    const pageIdx = styleContent![1].indexOf('@page')
    const userIdx = styleContent![1].indexOf('body { margin: 0; }')
    expect(pageIdx).toBeLessThan(userIdx)
  })
})
