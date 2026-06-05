import { describe, it, expect } from 'vitest'
import { buildPagedCss } from '@/utils/pagedCss'

describe('buildPagedCss', () => {
  describe('generates @page size CSS', () => {
    it('generates correct @page size for A4 portrait (210×297mm)', () => {
      const result = buildPagedCss(210, 297)
      expect(result).toContain('@page')
      expect(result).toContain('size: 210mm 297mm')
    })

    it('generates correct @page size for A4 landscape (297×210mm)', () => {
      const result = buildPagedCss(297, 210)
      expect(result).toContain('size: 297mm 210mm')
    })

    it('generates correct @page size for Letter portrait (215.9×279.4mm)', () => {
      const result = buildPagedCss(215.9, 279.4)
      expect(result).toContain('size: 215.9mm 279.4mm')
    })
  })

  describe('bleed option', () => {
    it('includes bleed: 3mm when bleed=3', () => {
      const result = buildPagedCss(210, 297, 3)
      expect(result).toContain('bleed: 3mm')
    })

    it('includes bleed: 5mm when bleed=5', () => {
      const result = buildPagedCss(210, 297, 5)
      expect(result).toContain('bleed: 5mm')
    })

    it('does NOT include bleed when omitted', () => {
      const result = buildPagedCss(210, 297)
      expect(result).not.toMatch(/bleed/)
    })

    it('does NOT include bleed when bleed=0', () => {
      const result = buildPagedCss(210, 297, 0)
      expect(result).not.toMatch(/bleed/)
    })
  })

  describe('crop marks option', () => {
    it('includes marks: crop cross when cropMarks=true', () => {
      const result = buildPagedCss(210, 297, undefined, true)
      expect(result).toContain('marks: crop cross')
    })

    it('does NOT include marks when cropMarks=false', () => {
      const result = buildPagedCss(210, 297, undefined, false)
      expect(result).not.toMatch(/marks/)
    })

    it('does NOT include marks when cropMarks is omitted', () => {
      const result = buildPagedCss(210, 297)
      expect(result).not.toMatch(/marks/)
    })
  })

  describe('combined options', () => {
    it('includes both bleed and crop marks when both set', () => {
      const result = buildPagedCss(210, 297, 3, true)
      expect(result).toContain('bleed: 3mm')
      expect(result).toContain('marks: crop cross')
    })

    it('includes @page rule with size, bleed and marks in one block', () => {
      const result = buildPagedCss(210, 297, 3, true)
      expect(result).toMatch(/@page\s*\{[^}]*size:[^}]*bleed:[^}]*marks:[^}]*\}/)
    })
  })

  describe('margin option', () => {
    it('includes margin: 0 when margin="0"', () => {
      const result = buildPagedCss(210, 297, undefined, undefined, '0')
      expect(result).toContain('margin: 0')
    })

    it('includes margin: 2cm when margin="2cm"', () => {
      const result = buildPagedCss(210, 297, undefined, undefined, '2cm')
      expect(result).toContain('margin: 2cm')
    })

    it('does NOT include margin when margin is omitted', () => {
      const result = buildPagedCss(210, 297)
      expect(result).not.toMatch(/margin/)
    })
  })

  describe('format and structure', () => {
    it('always generates a valid CSS @page rule', () => {
      const result = buildPagedCss(210, 297)
      expect(result).toMatch(/@page\s*\{/)
      expect(result).toMatch(/\}/)
    })

    it('uses mm units for dimensions', () => {
      const result = buildPagedCss(210, 297)
      expect(result).toMatch(/\d+\.?\d*mm/)
    })

    it('preserves decimal precision in dimensions', () => {
      const result = buildPagedCss(215.9, 279.4)
      expect(result).toContain('215.9mm')
      expect(result).toContain('279.4mm')
    })
  })
})
