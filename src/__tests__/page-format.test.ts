import { describe, it, expect } from 'vitest'
import { getPageFormatDimensions } from '@/utils/pageFormat'

describe('getPageFormatDimensions', () => {
  describe('A4 portrait', () => {
    it('returns 210mm width', () => {
      const { widthMm } = getPageFormatDimensions('A4', 'portrait')
      expect(widthMm).toBe(210)
    })

    it('returns 297mm height', () => {
      const { heightMm } = getPageFormatDimensions('A4', 'portrait')
      expect(heightMm).toBe(297)
    })
  })

  describe('A4 landscape', () => {
    it('returns 297mm width', () => {
      const { widthMm } = getPageFormatDimensions('A4', 'landscape')
      expect(widthMm).toBe(297)
    })

    it('returns 210mm height', () => {
      const { heightMm } = getPageFormatDimensions('A4', 'landscape')
      expect(heightMm).toBe(210)
    })
  })

  describe('Letter portrait', () => {
    it('returns 215.9mm width', () => {
      const { widthMm } = getPageFormatDimensions('Letter', 'portrait')
      expect(widthMm).toBe(215.9)
    })

    it('returns 279.4mm height', () => {
      const { heightMm } = getPageFormatDimensions('Letter', 'portrait')
      expect(heightMm).toBe(279.4)
    })
  })

  describe('Letter landscape', () => {
    it('returns 279.4mm width', () => {
      const { widthMm } = getPageFormatDimensions('Letter', 'landscape')
      expect(widthMm).toBe(279.4)
    })

    it('returns 215.9mm height', () => {
      const { heightMm } = getPageFormatDimensions('Letter', 'landscape')
      expect(heightMm).toBe(215.9)
    })
  })

  describe('A3 portrait', () => {
    it('returns 297mm width', () => {
      const { widthMm } = getPageFormatDimensions('A3', 'portrait')
      expect(widthMm).toBe(297)
    })

    it('returns 420mm height', () => {
      const { heightMm } = getPageFormatDimensions('A3', 'portrait')
      expect(heightMm).toBe(420)
    })
  })

  describe('A3 landscape', () => {
    it('returns 420mm width', () => {
      const { widthMm } = getPageFormatDimensions('A3', 'landscape')
      expect(widthMm).toBe(420)
    })

    it('returns 297mm height', () => {
      const { heightMm } = getPageFormatDimensions('A3', 'landscape')
      expect(heightMm).toBe(297)
    })
  })

  describe('unknown format', () => {
    it('throws for unknown page format', () => {
      expect(() => getPageFormatDimensions('B5', 'portrait')).toThrow()
    })
  })

  describe('unknown orientation', () => {
    it('throws for invalid orientation', () => {
      expect(() => getPageFormatDimensions('A4', 'square')).toThrow()
    })
  })

  describe('presets are available', () => {
    it('A4, Letter, and A3 are all known formats', () => {
      const a4 = getPageFormatDimensions('A4', 'portrait')
      const letter = getPageFormatDimensions('Letter', 'portrait')
      const a3 = getPageFormatDimensions('A3', 'portrait')
      expect(a4.widthMm).toBeGreaterThan(0)
      expect(letter.widthMm).toBeGreaterThan(0)
      expect(a3.widthMm).toBeGreaterThan(0)
    })
  })

  describe('returns numbers, not strings', () => {
    it('widthMm and heightMm are numbers', () => {
      const dims = getPageFormatDimensions('A4', 'portrait')
      expect(typeof dims.widthMm).toBe('number')
      expect(typeof dims.heightMm).toBe('number')
    })
  })
})
