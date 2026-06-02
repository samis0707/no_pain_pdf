import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '@/stores/templateStore'

describe('templateStore pageFormat integration', () => {
  beforeEach(() => {
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

  it('initial pageFormat is null', () => {
    const state = useTemplateStore.getState()
    expect(state.pageFormat).toBeNull()
  })

  it('setPageFormat stores the page format with id, name, widthMm, heightMm, category', () => {
    const format = {
      id: 1,
      name: 'A4',
      widthMm: 210,
      heightMm: 297,
      category: 'ISO',
      isPreset: true,
    }
    useTemplateStore.getState().setPageFormat(format)
    const state = useTemplateStore.getState()
    expect(state.pageFormat).toEqual(format)
  })

  it('setPageFormat stores landscape format correctly', () => {
    const format = {
      id: 2,
      name: 'A4 Landscape',
      widthMm: 297,
      heightMm: 210,
      category: 'ISO',
      isPreset: true,
    }
    useTemplateStore.getState().setPageFormat(format)
    const state = useTemplateStore.getState()
    expect(state.pageFormat).toEqual(format)
    expect(state.pageFormat!.widthMm).toBe(297)
    expect(state.pageFormat!.heightMm).toBe(210)
  })

  it('setPageFormat(null) clears the pageFormat', () => {
    const format = {
      id: 1,
      name: 'A4',
      widthMm: 210,
      heightMm: 297,
      category: 'ISO',
      isPreset: true,
    }
    useTemplateStore.getState().setPageFormat(format)
    expect(useTemplateStore.getState().pageFormat).not.toBeNull()

    useTemplateStore.getState().setPageFormat(null)
    expect(useTemplateStore.getState().pageFormat).toBeNull()
  })

  it('pageFormat state is preserved across multiple calls', () => {
    const a4 = {
      id: 1, name: 'A4', widthMm: 210, heightMm: 297,
      category: 'ISO' as const, isPreset: true,
    }
    const letter = {
      id: 3, name: 'Letter', widthMm: 215.9, heightMm: 279.4,
      category: 'ANSI' as const, isPreset: true,
    }

    useTemplateStore.getState().setPageFormat(a4)
    expect(useTemplateStore.getState().pageFormat).toEqual(a4)

    useTemplateStore.getState().setPageFormat(letter)
    expect(useTemplateStore.getState().pageFormat).toEqual(letter)
    expect(useTemplateStore.getState().pageFormat!.id).toBe(3)
    expect(useTemplateStore.getState().pageFormat!.name).toBe('Letter')
    expect(useTemplateStore.getState().pageFormat!.widthMm).toBe(215.9)
  })

  it('pageFormat type includes isPreset field', () => {
    const format = {
      id: 1,
      name: 'A4',
      widthMm: 210,
      heightMm: 297,
      category: 'ISO',
      isPreset: true,
    }
    useTemplateStore.getState().setPageFormat(format)
    const state = useTemplateStore.getState()
    expect(state.pageFormat).toHaveProperty('isPreset')
    expect(typeof state.pageFormat!.isPreset).toBe('boolean')
  })
})
