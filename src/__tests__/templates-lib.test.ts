import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockTemplateFindMany,
  mockTemplateFindUnique,
  mockTemplateCreate,
  mockTemplateDelete,
  mockItemFindUnique,
  mockItemUpdate,
  mockSnapshotItem,
} = vi.hoisted(() => ({
  mockTemplateFindMany: vi.fn(),
  mockTemplateFindUnique: vi.fn(),
  mockTemplateCreate: vi.fn(),
  mockTemplateDelete: vi.fn(),
  mockItemFindUnique: vi.fn(),
  mockItemUpdate: vi.fn(),
  mockSnapshotItem: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printTemplate: {
      findMany: mockTemplateFindMany,
      findUnique: mockTemplateFindUnique,
      create: mockTemplateCreate,
      delete: mockTemplateDelete,
    },
    printItem: {
      findUnique: mockItemFindUnique,
      update: mockItemUpdate,
    },
  },
}))

vi.mock('@/lib/versioning', () => ({
  snapshotItem: mockSnapshotItem,
}))

const ITEM = {
  id: 7,
  projectId: 3,
  name: 'My Flyer',
  html: '<h1>{{title}}</h1>',
  css: 'h1 { color: teal }',
  version: 2,
  project: { id: 3, userId: 1 },
}

const TEMPLATE = {
  id: 10,
  name: 'ACME Letterhead',
  category: 'corporate',
  html: '<header>ACME</header><main>{{content}}</main>',
  css: 'header { color: navy }',
  userId: 1,
  projectId: null,
  sourceItemId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItemFindUnique.mockResolvedValue(ITEM)
  mockTemplateFindUnique.mockResolvedValue(TEMPLATE)
  mockItemUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...ITEM,
    ...data,
  }))
  mockTemplateCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 11,
    ...data,
  }))
})

describe('listTemplates', () => {
  it('returns the union of global presets, my templates, and project templates', async () => {
    const { listTemplates } = await import('@/lib/templates')
    mockTemplateFindMany.mockResolvedValue([TEMPLATE])

    await listTemplates(1, 3)

    const where = mockTemplateFindMany.mock.calls[0][0].where
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { userId: null, projectId: null },
        { userId: 1 },
        { projectId: 3 },
      ])
    )
  })

  it('omits the project clause when no projectId is given', async () => {
    const { listTemplates } = await import('@/lib/templates')
    mockTemplateFindMany.mockResolvedValue([])

    await listTemplates(1)

    const where = mockTemplateFindMany.mock.calls[0][0].where
    expect(where.OR).toHaveLength(2)
  })
})

describe('applyTemplateToItem', () => {
  it('snapshots the item BEFORE copying template html/css and linking templateId', async () => {
    const { applyTemplateToItem } = await import('@/lib/templates')

    const result = await applyTemplateToItem('7', 10)

    expect(mockSnapshotItem).toHaveBeenCalledWith('7')
    expect(mockSnapshotItem.mock.invocationCallOrder[0]).toBeLessThan(
      mockItemUpdate.mock.invocationCallOrder[0]
    )
    expect(mockItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({
          html: TEMPLATE.html,
          css: TEMPLATE.css,
          templateId: 10,
          version: 3,
        }),
      })
    )
    expect(result).toMatchObject({ html: TEMPLATE.html, templateId: 10 })
  })

  it('throws for a missing template', async () => {
    const { applyTemplateToItem } = await import('@/lib/templates')
    mockTemplateFindUnique.mockResolvedValue(null)

    await expect(applyTemplateToItem('7', 99)).rejects.toThrow(/template.*not found/i)
  })

  it('throws for a missing item', async () => {
    const { applyTemplateToItem } = await import('@/lib/templates')
    mockItemFindUnique.mockResolvedValue(null)

    await expect(applyTemplateToItem('99', 10)).rejects.toThrow(/item.*not found/i)
  })
})

describe('saveItemAsTemplate', () => {
  it('creates a user-scoped template from the item with sourceItemId', async () => {
    const { saveItemAsTemplate } = await import('@/lib/templates')

    const result = await saveItemAsTemplate('7', {
      name: 'My Brand',
      scope: 'user',
      userId: 1,
    })

    expect(mockTemplateCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'My Brand',
        html: ITEM.html,
        css: ITEM.css,
        userId: 1,
        projectId: null,
        sourceItemId: 7,
      }),
    })
    expect(result).toMatchObject({ name: 'My Brand', sourceItemId: 7 })
  })

  it('creates a project-scoped template bound to the item project', async () => {
    const { saveItemAsTemplate } = await import('@/lib/templates')

    await saveItemAsTemplate('7', { name: 'Project Style', scope: 'project', userId: 1 })

    expect(mockTemplateCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        projectId: 3,
        sourceItemId: 7,
      }),
    })
  })
})

describe('deleteTemplate', () => {
  it('refuses to delete a global preset', async () => {
    const { deleteTemplate } = await import('@/lib/templates')
    mockTemplateFindUnique.mockResolvedValue({ ...TEMPLATE, userId: null, projectId: null })

    await expect(deleteTemplate(10)).rejects.toThrow(/preset/i)
    expect(mockTemplateDelete).not.toHaveBeenCalled()
  })

  it('deletes a user-scoped template', async () => {
    const { deleteTemplate } = await import('@/lib/templates')
    mockTemplateDelete.mockResolvedValue(TEMPLATE)

    await deleteTemplate(10)

    expect(mockTemplateDelete).toHaveBeenCalledWith({ where: { id: 10 } })
  })
})
