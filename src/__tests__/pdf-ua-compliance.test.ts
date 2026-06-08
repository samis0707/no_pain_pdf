import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderTemplate } from '@/utils/handlebarsRenderer'
import { buildPreviewDocument } from '@/utils/previewDocument'
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
    css: '',
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
    bleed: 0,
    cropMarks: false,
    colorMode: 'rgb',
    enableAccessibility: false,
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

describe('renderTemplate — PDF/UA lang attribute', () => {
  it('adds lang="en" to <html> when template has no lang attribute', () => {
    const result = renderTemplate('<p>Hello</p>', '', {})
    expect(result).toMatch(/<html lang="en">/)
  })

  it('preserves an existing lang attribute from the template', () => {
    const template = '<!DOCTYPE html><html lang="de"><head></head><body><p>Hallo</p></body></html>'
    const result = renderTemplate(template, '', {})
    expect(result).toMatch(/<html lang="de">/)
  })
})

describe('buildPreviewDocument — PDF/UA lang attribute', () => {
  it('adds lang="en" to <html> element', () => {
    const result = buildPreviewDocument('<p>Hello</p>', '', 210, 297)
    expect(result).toMatch(/<html lang="en">/)
  })
})

describe('exportStore.exportPdf — PDF/UA options', () => {
  it('sends pdf_tags: true and pdf_variant: pdf/ua-1 when enableAccessibility=true', async () => {
    useExportStore.getState().setEnableAccessibility(true)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.options.pdf_tags).toBe(true)
    expect(body.options.pdf_variant).toBe('pdf/ua-1')
  })

  it('does not send pdf_tags or pdf_variant when enableAccessibility=false', async () => {
    useExportStore.getState().setEnableAccessibility(false)
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.options.pdf_tags).toBeUndefined()
    expect(body.options.pdf_variant).toBeUndefined()
  })

  it('sends pdf_variant: pdf/x-4 (not pdf/ua-1) when enableAccessibility=true and colorMode=cmyk', async () => {
    useExportStore.getState().setEnableAccessibility(true)
    useExportStore.getState().setColorMode('cmyk')
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchOptions()
    expect(body.options.pdf_variant).toBe('pdf/x-4')
    expect(body.options.pdf_tags).toBe(true)
  })
})
