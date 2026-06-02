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

function getFetchCallBody(): { html: string; css: string; options: Record<string, string> } {
  const fetchCall = vi.mocked(fetch).mock.calls[0]
  if (!fetchCall) throw new Error('fetch was never called')
  const bodyArg = fetchCall[1]?.body
  if (typeof bodyArg !== 'string') throw new Error('fetch body was not a string')
  return JSON.parse(bodyArg)
}

describe('exportPdf compiles Handlebars before sending', () => {
  it('sends compiled HTML without raw {{title}} placeholders', async () => {
    await useExportStore.getState().exportPdf('<h1>{{title}}</h1>', 'h1 { color: red; }')

    const body = getFetchCallBody()
    expect(body.html).not.toContain('{{title}}')
    expect(body.html).not.toMatch(/\{\{[\w]+\}\}/)
  })

  it('sends compiled HTML containing the rendered data', async () => {
    await useExportStore.getState().exportPdf('<h1>{{title}}</h1>', 'h1 { color: red; }')

    const body = getFetchCallBody()
    expect(body.html).toContain('Hello World')
    expect(body.html).toContain('<h1>Hello World</h1>')
  })

  it('includes CSS in the request body unchanged', async () => {
    await useExportStore.getState().exportPdf('<p>test</p>', 'body { margin: 20mm; }')

    const body = getFetchCallBody()
    expect(body.css).toContain('body { margin: 20mm; }')
  })

  it('sends multiple variables compiled correctly', async () => {
    useDataStore.setState({
      rows: [{ title: 'Report', subtitle: 'Q4 Summary', author: 'Jane' }],
      columns: ['title', 'subtitle', 'author'],
    })

    await useExportStore.getState().exportPdf(
      '<h1>{{title}}</h1><h2>{{subtitle}}</h2><p>{{author}}</p>',
      '',
    )

    const body = getFetchCallBody()
    expect(body.html).toContain('<h1>Report</h1>')
    expect(body.html).toContain('<h2>Q4 Summary</h2>')
    expect(body.html).toContain('<p>Jane</p>')
    expect(body.html).not.toMatch(/\{\{[\w]+\}\}/)
  })

  it('preserves Handlebars block helpers like #each in the output', async () => {
    useDataStore.setState({
      rows: [
        { title: 'Report', items: JSON.stringify([{ name: 'A' }, { name: 'B' }]) },
      ],
      columns: ['title', 'items'],
    })

    const template = '<ul>{{#each items}}<li>{{name}}</li>{{/each}}</ul>'
    await useExportStore.getState().exportPdf(template, '')

    const body = getFetchCallBody()
    expect(body.html).toContain('<ul>')
    expect(body.html).toContain('</ul>')
    expect(body.html).not.toMatch(/\{\{[\w#/]+\}\}/)
  })

  it('sends to POST /api/pdf/generate', async () => {
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[0]).toBe('/api/pdf/generate')
    expect(fetchCall[1]?.method).toBe('POST')
    expect(fetchCall[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
  })
})

describe('exportPdf includes export options', () => {
  it('includes default A4 portrait normal options', async () => {
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchCallBody()
    expect(body.options.format).toBe('A4')
    expect(body.options.orientation).toBe('portrait')
    expect(body.options.margin).toBe('normal')
  })

  it('includes custom page size Letter', async () => {
    useExportStore.setState({ pageSize: 'Letter' })
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchCallBody()
    expect(body.options.format).toBe('Letter')
  })

  it('includes landscape orientation', async () => {
    useExportStore.setState({ orientation: 'landscape' })
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchCallBody()
    expect(body.options.orientation).toBe('landscape')
  })

  it('includes wide margins', async () => {
    useExportStore.setState({ margins: 'wide' })
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchCallBody()
    expect(body.options.margin).toBe('wide')
  })

  it('includes narrow margins', async () => {
    useExportStore.setState({ margins: 'narrow' })
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    const body = getFetchCallBody()
    expect(body.options.margin).toBe('narrow')
  })
})

describe('exportPdf error handling', () => {
  it('sets error state when fetch returns non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'PDF generation failed' }),
    }))

    await useExportStore.getState().exportPdf('<p>test</p>', '')

    expect(useExportStore.getState().error).toBe('PDF generation failed')
  })

  it('sets isExporting to false after successful export', async () => {
    useExportStore.setState({ isExporting: true })
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    expect(useExportStore.getState().isExporting).toBe(false)
  })

  it('sets isExporting to false after failed export', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    useExportStore.setState({ isExporting: true })
    await useExportStore.getState().exportPdf('<p>test</p>', '')

    expect(useExportStore.getState().isExporting).toBe(false)
    expect(useExportStore.getState().error).toBe('Network error')
  })
})

describe('exportPdf uses template and data from stores', () => {
  it('reads miscText from templateStore for Handlebars helpers', async () => {
    useTemplateStore.setState({ miscText: 'helper content' })

    await useExportStore.getState().exportPdf('<p>{{title}}</p>', '')

    const body = getFetchCallBody()
    expect(body.html).toContain('Hello World')
  })

  it('compiles with data from first row of dataStore', async () => {
    useDataStore.setState({
      rows: [{ title: 'Dynamic Title' }],
    })

    await useExportStore.getState().exportPdf('<h1>{{title}}</h1>', '')

    const body = getFetchCallBody()
    expect(body.html).toContain('<h1>Dynamic Title</h1>')
  })

  it('passes css through even when template has {{css}} placeholder', async () => {
    useDataStore.setState({ rows: [{ title: 'Test' }] })

    await useExportStore.getState().exportPdf(
      '<h1>{{title}}</h1><style>{{css}}</style>',
      'h1 { font-size: 20pt; }',
    )

    const body = getFetchCallBody()
    expect(body.css).toContain('h1 { font-size: 20pt; }')
    expect(body.html).toContain('<h1>Test</h1>')
    expect(body.html).not.toContain('{{title}}')
  })
})
