// @vitest-environment node
import { describe, it, expect } from 'vitest'

import { E2E_BASE as BASE, e2eEnabled, e2eFetch } from './e2e-fetch'

describe.skipIf(!e2eEnabled)('Page Formats API', () => {
  let formats: Array<{
    id: number
    name: string
    widthMm: number
    heightMm: number
    category: string
    isPreset: boolean
  }>

  it('GET /api/page-formats returns a list of page formats', async () => {
    const res = await e2eFetch(`${BASE}/api/page-formats`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    formats = body
  })

  it('each format has id, name, widthMm, heightMm, category, isPreset', () => {
    for (const fmt of formats) {
      expect(fmt).toHaveProperty('id')
      expect(typeof fmt.id).toBe('number')
      expect(fmt).toHaveProperty('name')
      expect(typeof fmt.name).toBe('string')
      expect(fmt).toHaveProperty('widthMm')
      expect(typeof fmt.widthMm).toBe('number')
      expect(fmt).toHaveProperty('heightMm')
      expect(typeof fmt.heightMm).toBe('number')
      expect(fmt).toHaveProperty('category')
      expect(typeof fmt.category).toBe('string')
      expect(fmt).toHaveProperty('isPreset')
      expect(typeof fmt.isPreset).toBe('boolean')
    }
  })

  it('the list includes at least A4 (portrait)', () => {
    const a4 = formats.find((f) => f.name === 'A4' && f.category === 'ISO')
    expect(a4).toBeDefined()
    expect(a4!.widthMm).toBe(210)
    expect(a4!.heightMm).toBe(297)
  })

  it('the list includes A4 landscape', () => {
    const a4Landscape = formats.find((f) => f.name === 'A4 Landscape')
    expect(a4Landscape).toBeDefined()
    expect(a4Landscape!.widthMm).toBe(297)
    expect(a4Landscape!.heightMm).toBe(210)
  })

  it('the list includes Letter (portrait)', () => {
    const letter = formats.find((f) => f.name === 'Letter' && f.category === 'ANSI')
    expect(letter).toBeDefined()
    expect(letter!.widthMm).toBe(215.9)
    expect(letter!.heightMm).toBe(279.4)
  })

  it('the list includes Letter landscape', () => {
    const letterLandscape = formats.find((f) => f.name === 'Letter Landscape')
    expect(letterLandscape).toBeDefined()
    expect(letterLandscape!.widthMm).toBe(279.4)
    expect(letterLandscape!.heightMm).toBe(215.9)
  })

  it('the list includes A3 (portrait)', () => {
    const a3 = formats.find((f) => f.name === 'A3' && f.category === 'ISO')
    expect(a3).toBeDefined()
    expect(a3!.widthMm).toBe(297)
    expect(a3!.heightMm).toBe(420)
  })

  it('all preset formats have isPreset set to true', () => {
    const presets = formats.filter((f) => !f.name.startsWith('Custom'))
    for (const fmt of presets) {
      expect(fmt.isPreset).toBe(true)
    }
  })
})
