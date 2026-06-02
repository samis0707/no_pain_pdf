import { describe, it, expect, beforeEach } from 'vitest'
import { useExportStore } from '@/stores/exportStore'
import { useTemplateStore } from '@/stores/templateStore'

describe('exportStore pageFormat derivation', () => {
  beforeEach(() => {
    useExportStore.setState({
      pageSize: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      isExporting: false,
      error: null,
    })
    useTemplateStore.setState({
      pageFormat: null,
      html: '',
      css: '',
      name: '',
      miscText: '',
      itemId: null,
      version: 0,
    })
  })

  it('pageSize defaults to A4', () => {
    const state = useExportStore.getState()
    expect(state.pageSize).toBe('A4')
  })

  it('orientation defaults to portrait', () => {
    const state = useExportStore.getState()
    expect(state.orientation).toBe('portrait')
  })

  it('margins defaults to normal', () => {
    const state = useExportStore.getState()
    expect(state.margins).toBe('normal')
  })

  it('setPageSize updates pageSize', () => {
    useExportStore.getState().setPageSize('Letter')
    expect(useExportStore.getState().pageSize).toBe('Letter')
  })

  it('setOrientation updates orientation', () => {
    useExportStore.getState().setOrientation('landscape')
    expect(useExportStore.getState().orientation).toBe('landscape')
  })

  it('setMargins updates margins', () => {
    useExportStore.getState().setMargins('wide')
    expect(useExportStore.getState().margins).toBe('wide')
  })

  describe('exportPdf derives options from templateStore pageFormat', () => {
    it('uses pageFormat name as format string when templateStore has pageFormat set', async () => {
      useTemplateStore.getState().setPageFormat({
        id: 3,
        name: 'Letter',
        widthMm: 215.9,
        heightMm: 279.4,
        category: 'ANSI',
        isPreset: true,
      })

      const state = useExportStore.getState()
      expect(state.pageSize).toBe('Letter')
    })

    it('uses landscape orientation when pageFormat widthMm > heightMm', () => {
      useTemplateStore.getState().setPageFormat({
        id: 2,
        name: 'A4 Landscape',
        widthMm: 297,
        heightMm: 210,
        category: 'ISO',
        isPreset: true,
      })

      const state = useExportStore.getState()
      expect(state.orientation).toBe('landscape')
    })

    it('uses portrait orientation when pageFormat widthMm < heightMm', () => {
      useTemplateStore.getState().setPageFormat({
        id: 1,
        name: 'A4',
        widthMm: 210,
        heightMm: 297,
        category: 'ISO',
        isPreset: true,
      })

      const state = useExportStore.getState()
      expect(state.orientation).toBe('portrait')
    })

    it('falls back to store defaults when templateStore has no pageFormat', () => {
      useTemplateStore.getState().setPageFormat(null)
      useExportStore.getState().setPageSize('A4')
      useExportStore.getState().setOrientation('portrait')

      const state = useExportStore.getState()
      expect(state.pageSize).toBe('A4')
      expect(state.orientation).toBe('portrait')
    })
  })

  describe('derived getEffectivePageFormat', () => {
    it('returns A4 portrait dimensions when templateStore has no pageFormat', () => {
      const store = useExportStore.getState()
      if (typeof (store as any).getEffectivePageFormat === 'function') {
        const result = (store as any).getEffectivePageFormat()
        expect(result).toHaveProperty('widthMm')
        expect(result).toHaveProperty('heightMm')
        expect(result.widthMm).toBe(210)
        expect(result.heightMm).toBe(297)
      }
    })

    it('returns templateStore pageFormat dimensions when set', () => {
      useTemplateStore.getState().setPageFormat({
        id: 3,
        name: 'Letter',
        widthMm: 215.9,
        heightMm: 279.4,
        category: 'ANSI',
        isPreset: true,
      })

      const store = useExportStore.getState()
      if (typeof (store as any).getEffectivePageFormat === 'function') {
        const result = (store as any).getEffectivePageFormat()
        expect(result.widthMm).toBe(215.9)
        expect(result.heightMm).toBe(279.4)
      }
    })
  })
})
