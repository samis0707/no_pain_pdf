import { describe, it, expect } from 'vitest'
import { buildPreviewDocument } from '@/utils/previewDocument'

describe('buildPreviewDocument — bleed and crop marks integration', () => {
  it('includes bleed and crop marks when bleed>0 and cropMarks=true', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 210, 297, 3, true)
    expect(result).toContain('bleed: 3mm')
    expect(result).toContain('marks: crop cross')
  })

  it('omits bleed and marks when not provided', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
    expect(result).not.toContain('bleed')
    expect(result).not.toContain('marks')
  })

  it('does not hardcode margin:0 in @page CSS', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
    expect(result).not.toContain('margin: 0')
  })

  it('preserves body HTML unchanged', () => {
    const html = '<div class="content"><h1>Title</h1><p>Body text</p></div>'
    const result = buildPreviewDocument(html, '', 210, 297)
    expect(result).toContain(html)
  })

  it('matches @page size to the provided dimensions', () => {
    const result = buildPreviewDocument('<p>hello</p>', '', 210, 297)
    expect(result).toContain('size: 210mm 297mm')
  })
})
