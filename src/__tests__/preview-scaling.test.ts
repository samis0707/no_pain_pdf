import { describe, it, expect } from 'vitest'
import { calculateScale } from '@/utils/previewScale'

const MM_TO_PX = 3.7795

describe('calculateScale', () => {
  describe('A4 portrait in typical viewport', () => {
    const a4W = 210
    const a4H = 297

    it('scales to fit height in 600x800 viewport with default padding', () => {
      const containerW = 600
      const containerH = 800
      const padding = 40
      const availableH = containerH - padding
      const pageHpx = a4H * MM_TO_PX
      const scale = calculateScale(containerW, containerH, a4W, a4H)

      const expectedScaleY = availableH / pageHpx
      const expectedScaleX = (containerW - padding) / (a4W * MM_TO_PX)
      const expected = Math.min(expectedScaleX, expectedScaleY)

      expect(scale).toBeCloseTo(expected, 4)
    })

    it('scales to fit width when container is narrow', () => {
      const containerW = 400
      const containerH = 800
      const padding = 40
      const pageWpx = a4W * MM_TO_PX

      const scale = calculateScale(containerW, containerH, a4W, a4H)
      const expectedScale = (containerW - padding) / pageWpx

      expect(scale).toBeCloseTo(expectedScale, 4)
    })
  })

  describe('A4 landscape in 800x600 viewport', () => {
    const a4W = 297
    const a4H = 210

    it('scales to fit width (more constraining than height with this ratio)', () => {
      const containerW = 800
      const containerH = 600
      const padding = 40
      const pageWpx = a4W * MM_TO_PX
      const pageHpx = a4H * MM_TO_PX

      const scale = calculateScale(containerW, containerH, a4W, a4H)
      const expectedScaleX = (containerW - padding) / pageWpx
      const expectedScaleY = (containerH - padding) / pageHpx
      const expected = Math.min(expectedScaleX, expectedScaleY)

      expect(scale).toBeCloseTo(expected, 4)
    })
  })

  describe('padding behavior', () => {
    it('scale without padding is larger than with padding', () => {
      const scaleWithPadding = calculateScale(800, 600, 210, 297, 40)
      const scaleWithoutPadding = calculateScale(800, 600, 210, 297, 0)
      expect(scaleWithoutPadding).toBeGreaterThan(scaleWithPadding)
    })

    it('defaults padding to 40px when not provided', () => {
      const explicit = calculateScale(800, 600, 210, 297, 40)
      const implicit = calculateScale(800, 600, 210, 297)
      expect(implicit).toBe(explicit)
    })
  })

  describe('small viewport', () => {
    it('produces scale < 1 in a very small viewport', () => {
      const scale = calculateScale(100, 100, 210, 297)
      expect(scale).toBeLessThan(1)
    })

    it('produces scale > 0 in a tiny viewport', () => {
      const scale = calculateScale(50, 50, 210, 297)
      expect(scale).toBeGreaterThan(0)
    })
  })

  describe('large viewport', () => {
    it('produces scale > 1 in a very large viewport', () => {
      const scale = calculateScale(3000, 4000, 210, 297)
      expect(scale).toBeGreaterThan(1)
    })
  })

  describe('edge cases', () => {
    it('handles zero-size viewport gracefully (returns 0 or small)', () => {
      const scale = calculateScale(0, 0, 210, 297)
      expect(scale).toBe(0)
    })

    it('handles very large padding that exceeds container', () => {
      const scale = calculateScale(100, 100, 210, 297, 200)
      expect(scale).toBeLessThanOrEqual(0)
    })
  })

  describe('Letter format scaling', () => {
    it('scales Letter portrait correctly', () => {
      const scale = calculateScale(800, 600, 215.9, 279.4)
      expect(scale).toBeGreaterThan(0)
      expect(scale).toBeLessThan(1)
    })

    it('scales Letter landscape correctly', () => {
      const scale = calculateScale(800, 600, 279.4, 215.9)
      expect(scale).toBeGreaterThan(0)
      expect(scale).toBeLessThan(1)
    })
  })
})
