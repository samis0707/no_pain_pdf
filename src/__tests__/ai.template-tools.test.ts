import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockListTemplates, mockApply, mockSaveAs, mockItemFindUnique } = vi.hoisted(() => ({
  mockListTemplates: vi.fn(),
  mockApply: vi.fn(),
  mockSaveAs: vi.fn(),
  mockItemFindUnique: vi.fn(),
}))

vi.mock('@/lib/templates', () => ({
  listTemplates: mockListTemplates,
  applyTemplateToItem: mockApply,
  saveItemAsTemplate: mockSaveAs,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: { findUnique: mockItemFindUnique },
  },
}))

const ITEM = {
  id: 7,
  projectId: 3,
  project: { id: 3, userId: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItemFindUnique.mockResolvedValue(ITEM)
})

describe('listTemplatesTool', () => {
  it('lists templates scoped via the item project and owner', async () => {
    const { listTemplatesTool } = await import('@/lib/ai/tools')
    mockListTemplates.mockResolvedValue([
      { id: 10, name: 'ACME', category: 'corporate', userId: 1, projectId: null, sourceItemId: 7 },
      { id: 1, name: 'Event flyer', category: 'event-flyer', userId: null, projectId: null, sourceItemId: null },
    ])

    const result = await listTemplatesTool('7')

    expect(mockListTemplates).toHaveBeenCalledWith(1, 3)
    expect(result.templates).toHaveLength(2)
    // tool output labels the scope so the model can explain choices
    expect(result.templates[0]).toMatchObject({ id: 10, name: 'ACME', scope: 'user' })
    expect(result.templates[1]).toMatchObject({ id: 1, scope: 'preset' })
    // raw html/css stay out of the listing to keep tokens lean
    expect(JSON.stringify(result)).not.toContain('html')
  })
})

describe('applyTemplateTool', () => {
  it('delegates to applyTemplateToItem', async () => {
    const { applyTemplateTool } = await import('@/lib/ai/tools')
    mockApply.mockResolvedValue({ id: 7, html: '<header/>', css: '', templateId: 10, version: 3 })

    const result = await applyTemplateTool('7', 10)

    expect(mockApply).toHaveBeenCalledWith('7', 10)
    expect(result).toMatchObject({ templateId: 10, version: 3 })
  })
})

describe('saveAsTemplateTool', () => {
  it('saves with the item owner as userId', async () => {
    const { saveAsTemplateTool } = await import('@/lib/ai/tools')
    mockSaveAs.mockResolvedValue({ id: 11, name: 'My Brand', userId: 1, projectId: null, sourceItemId: 7 })

    const result = await saveAsTemplateTool('7', 'My Brand', 'user')

    expect(mockSaveAs).toHaveBeenCalledWith('7', expect.objectContaining({ name: 'My Brand', scope: 'user', userId: 1 }))
    expect(result).toMatchObject({ id: 11, name: 'My Brand' })
  })
})

describe('SDK dispatch', () => {
  it('declares and dispatches the three template tools', async () => {
    const { buildSdkTools } = await import('@/lib/ai/sdk-tools')
    const tools = buildSdkTools('7')

    for (const name of ['list_templates', 'apply_template', 'save_as_template']) {
      expect(tools[name], `missing tool ${name}`).toBeDefined()
    }

    mockApply.mockResolvedValue({ id: 7, templateId: 10, version: 3, html: '', css: '' })
    const result = await tools.apply_template.execute!(
      { templateId: 10 },
      { toolCallId: 'tc_1', messages: [] }
    )
    expect(mockApply).toHaveBeenCalledWith('7', 10)
    expect(result).toMatchObject({ templateId: 10 })
  })
})
