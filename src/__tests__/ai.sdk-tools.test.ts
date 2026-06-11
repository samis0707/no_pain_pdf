import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpdateTemplate, mockRenderPreview, mockListTemplatesTool } = vi.hoisted(() => ({
  mockUpdateTemplate: vi.fn(),
  mockRenderPreview: vi.fn(),
  mockListTemplatesTool: vi.fn(),
}))

vi.mock('@/lib/ai/tools', () => ({
  getTemplate: vi.fn(),
  updateTemplate: mockUpdateTemplate,
  updateTemplateHtml: vi.fn(),
  getDataInfo: vi.fn(),
  analyzeData: vi.fn(),
  renderPreview: mockRenderPreview,
  getAssets: vi.fn(),
  registerHelper: vi.fn(),
  getData: vi.fn(),
  updateData: vi.fn(),
  getHelpers: vi.fn(),
  getPageFormats: vi.fn(),
  updatePageFormat: vi.fn(),
  updateExportSettings: vi.fn(),
  generatePdf: vi.fn(),
  listTemplatesTool: mockListTemplatesTool,
  applyTemplateTool: vi.fn(),
  saveAsTemplateTool: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildSdkTools', () => {
  it('exposes every legacy tool under its original name', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    const tools = buildSdkTools('7')

    for (const name of [
      'get_template',
      'update_template',
      'update_template_html',
      'get_data_info',
      'analyze_data',
      'render_preview',
      'get_assets',
      'register_helper',
      'get_data',
      'update_data',
      'get_helpers',
      'get_page_formats',
      'update_page_format',
      'update_export_settings',
      'export_pdf',
      'list_templates',
      'apply_template',
      'save_as_template',
    ]) {
      expect(tools[name], `missing tool ${name}`).toBeDefined()
      expect(tools[name].description).toBeTruthy()
    }
  })

  it('delegates execute to the legacy implementation with the bound itemId', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    mockUpdateTemplate.mockResolvedValue({ html: '<h1>x</h1>', css: '', version: 2 })

    const tools = buildSdkTools('7')
    const result = await tools.update_template.execute!(
      { html: '<h1>x</h1>' },
      { toolCallId: 'tc', messages: [] }
    )

    expect(mockUpdateTemplate).toHaveBeenCalledWith('7', '<h1>x</h1>', undefined)
    expect(result).toMatchObject({ version: 2 })
  })

  it('validates input via zod schema (apply_template requires numeric templateId)', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    const tools = buildSdkTools('7')

    const schema = tools.apply_template.inputSchema as { safeParse: (v: unknown) => { success: boolean } }
    expect(schema.safeParse({ templateId: 10 }).success).toBe(true)
    expect(schema.safeParse({ templateId: 'ten' }).success).toBe(false)
    expect(schema.safeParse({}).success).toBe(false)
  })

  it('render_preview returns image parts via toModelOutput so the model can see pages', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    mockRenderPreview.mockResolvedValue({
      pageCount: 1,
      truncated: false,
      images: [{ mimeType: 'image/jpeg', data: 'cGFnZTE=' }],
    })

    const tools = buildSdkTools('7')
    const output = await tools.render_preview.execute!({}, { toolCallId: 'tc', messages: [] })
    const modelOutput = tools.render_preview.toModelOutput!({
      output,
      input: {},
      toolCallId: 'tc',
      messages: [],
    })

    expect(modelOutput.type).toBe('content')
    const parts = modelOutput.value as Array<{ type: string; mediaType?: string; data?: string }>
    const imagePart = parts.find((p) => p.type === 'media')
    expect(imagePart).toMatchObject({ mediaType: 'image/jpeg', data: 'cGFnZTE=' })
    const textPart = parts.find((p) => p.type === 'text') as { text: string }
    expect(textPart.text).toContain('"pageCount":1')
  })
})

describe('auto preview feedback on mutators', () => {
  it('attaches a preview render to update_template output and exposes it as media parts', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    mockUpdateTemplate.mockResolvedValue({ html: '<h1>x</h1>', css: '', version: 2 })
    mockRenderPreview.mockResolvedValue({
      pageCount: 1,
      truncated: false,
      images: [{ mimeType: 'image/jpeg', data: 'YXV0bw==' }],
    })

    const tools = buildSdkTools('7')
    const output = await tools.update_template.execute!(
      { html: '<h1>x</h1>' },
      { toolCallId: 'tc', messages: [] }
    )

    expect(mockRenderPreview).toHaveBeenCalledWith('7')
    expect(output).toMatchObject({ version: 2, autoPreview: { pageCount: 1, truncated: false } })

    const modelOutput = tools.update_template.toModelOutput!({
      output,
      input: {},
      toolCallId: 'tc',
      messages: [],
    })
    const parts = modelOutput.value as Array<{ type: string; mediaType?: string; data?: string }>
    expect(parts.find((p) => p.type === 'media')).toMatchObject({ data: 'YXV0bw==' })
    const text = (parts.find((p) => p.type === 'text') as { text: string }).text
    expect(text).not.toContain('YXV0bw==')
  })

  it('caps auto-renders at 3 per buildSdkTools instance', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    mockUpdateTemplate.mockResolvedValue({ html: '', css: '', version: 2 })
    mockRenderPreview.mockResolvedValue({ pageCount: 1, truncated: false, images: [] })

    const tools = buildSdkTools('7')
    for (let i = 0; i < 5; i++) {
      await tools.update_template.execute!({ html: 'x' }, { toolCallId: `tc${i}`, messages: [] })
    }

    expect(mockRenderPreview).toHaveBeenCalledTimes(3)
  })

  it('keeps the mutator working when the auto-render fails', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    mockUpdateTemplate.mockResolvedValue({ html: '', css: '', version: 2 })
    mockRenderPreview.mockRejectedValue(new Error('weasyprint down'))

    const tools = buildSdkTools('7')
    const output = await tools.update_template.execute!(
      { html: 'x' },
      { toolCallId: 'tc', messages: [] }
    )

    expect(output).toMatchObject({ version: 2 })
  })
})
