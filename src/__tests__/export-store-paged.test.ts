import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useExportStore } from '@/stores/exportStore'
import { useTemplateStore } from '@/stores/templateStore'
import { useDataStore } from '@/stores/dataStore'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
  }))

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  })

  vi.stubGlobal('Blob', class BlobMock {
    constructor(public parts: BlobPart[], public options?: BlobPropertyBag) {
    }
  })

  useTemplateStore.setState({
    itemId: null,
    html: '<h1>{{title}}</h1>',
    css: 'h1 { color: red; }',
    name: '',
    miscText: '',
    isSaving: false,
    lastSaved: null,
    error: null,
    version: 0,
  })

  useDataStore.setState({
    itemId: null,
    datasets: [],
    selectedDatasetId: null,
    columns: ['title'],
    rows: [{ title: 'Hello World' }],
    rowCount: 1,
    isUploading: false,
    isLoading: false,
    error: null,
    mapping: '',
  })

  useExportStore.setState({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: 'normal',
    isExporting: false,
    error: null,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function getFetchOptions(): Record<string, unknown> {
  const fetchCall = vi.mocked(fetch).mock.calls[0]
  if (!fetchCall) throw new Error('fetch was never called')
  const bodyArg = fetchCall[1]?.body
  if (typeof bodyArg !== 'string') throw new Error('fetch body was not a string')
  return JSON.parse(bodyArg)
}

describe('exportStore bleed/cropMarks/colorMode defaults', () => {
  it('defaults bleed to 0', () => {
    expect(useExportStore.getState().bleed).toBe(0)
  })

  it('defaults cropMarks to false', () => {
    expect(useExportStore.getState().cropMarks).toBe(false)
  })

  it('defaults colorMode to rgb', () => {
    expect(useExportStore.getState().colorMode).toBe('rgb')
  })
})

describe('exportStore setters', () => {
  it('setBleed updates bleed value', () => {
    useExportStore.getState().setBleed(3)
    expect(useExportStore.getState().bleed).toBe(3)
  })

  it('setCropMarks updates cropMarks value', () => {
    useExportStore.getState().setCropMarks(true)
    expect(useExportStore.getState().cropMarks).toBe(true)
  })

  it('setColorMode updates colorMode value', () => {
    useExportStore.getState().setColorMode('cmyk')
    expect(useExportStore.getState().colorMode).toBe('cmyk')
  })

  it('setBleed clamps to 0 minimum', () => {
    useExportStore.getState().setBleed(-1)
    expect(useExportStore.getState().bleed).toBe(0)
  })

  it('setBleed clamps to 5 maximum', () => {
    useExportStore.getState().setBleed(10)
    expect(useExportStore.getState().bleed).toBe(5)
  })
})

describe('exportPdf includes @page CSS via buildPagedCss', () => {
  it('includes bleed CSS in request when bleed > 0', async () => {
    useExportStore.getState().setBleed(3)
    useExportStore.getState().setCropMarks(false)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.css).toContain('@page')
    expect(body.css).toContain('bleed: 3mm')
  })

  it('includes crop marks CSS in request when cropMarks=true', async () => {
    useExportStore.getState().setCropMarks(true)
    useExportStore.getState().setBleed(0)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.css).toContain('@page')
    expect(body.css).toContain('marks: crop cross')
  })

  it('includes both bleed and crop marks CSS when both set', async () => {
    useExportStore.getState().setBleed(3)
    useExportStore.getState().setCropMarks(true)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.css).toContain('bleed: 3mm')
    expect(body.css).toContain('marks: crop cross')
  })

  it('does not include bleed in CSS when bleed=0', async () => {
    useExportStore.getState().setBleed(0)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.css).not.toMatch(/bleed/)
  })

  it('appends user CSS after @page CSS', async () => {
    useExportStore.getState().setBleed(0)
    await useExportStore.getState().exportPdf('<p>test</p>', 'body { color: black; }')

    const body = getFetchOptions()
    const pageIdx = body.css.indexOf('@page')
    const userIdx = body.css.indexOf('body { color: black; }')
    expect(pageIdx).toBeLessThan(userIdx)
  })

  it('includes @page size matching current page format from templateStore', async () => {
    useTemplateStore.setState({
      pageFormat: { id: 1, name: 'A4', widthMm: 210, heightMm: 297, category: 'PRESET', isPreset: true },
    })
    useExportStore.getState().setBleed(0)
    useExportStore.getState().setCropMarks(false)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.css).toContain('size: 210mm 297mm')
  })
})

describe('exportPdf colorMode', () => {
  it('includes pdf_variant: pdf/x-4 when colorMode=cmyk', async () => {
    useExportStore.getState().setColorMode('cmyk')
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.options.pdf_variant).toBe('pdf/x-4')
  })

  it('does not include pdf_variant when colorMode=rgb', async () => {
    useExportStore.getState().setColorMode('rgb')
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.options.pdf_variant).toBeUndefined()
  })
})
