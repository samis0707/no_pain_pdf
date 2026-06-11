import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockListTemplates, mockDeleteTemplate, mockApply, mockSaveAs, mockPrisma } = vi.hoisted(() => ({
  mockListTemplates: vi.fn(),
  mockDeleteTemplate: vi.fn(),
  mockApply: vi.fn(),
  mockSaveAs: vi.fn(),
  mockPrisma: {
    printTemplate: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/templates', () => ({
  listTemplates: mockListTemplates,
  deleteTemplate: mockDeleteTemplate,
  applyTemplateToItem: mockApply,
  saveItemAsTemplate: mockSaveAs,
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

vi.mock('@/lib/auth-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-session')>()),
  requireUserId: vi.fn().mockResolvedValue(1),
  findOwnedItem: vi.fn().mockResolvedValue({ id: 7, project: { userId: 1 } }),
}))

const TEMPLATE = {
  id: 10,
  name: 'ACME Letterhead',
  category: 'corporate',
  html: '<header>ACME</header>',
  css: '',
  userId: 1,
  projectId: null,
  sourceItemId: 7,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/print-templates', () => {
  it('lists templates scoped to the user and optional project', async () => {
    const { GET } = await import('@/app/api/print-templates/route')
    mockListTemplates.mockResolvedValue([TEMPLATE])

    const res = await GET(new NextRequest('http://localhost/api/print-templates?projectId=3'))

    expect(mockListTemplates).toHaveBeenCalledWith(1, 3)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.templates).toHaveLength(1)
  })

  it('omits projectId when not supplied', async () => {
    const { GET } = await import('@/app/api/print-templates/route')
    mockListTemplates.mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/print-templates'))

    expect(mockListTemplates).toHaveBeenCalledWith(1, undefined)
  })
})

describe('POST /api/print-templates', () => {
  it('creates a user-scoped template and returns 201', async () => {
    const { POST } = await import('@/app/api/print-templates/route')
    mockPrisma.printTemplate.create.mockResolvedValue(TEMPLATE)

    const res = await POST(
      new NextRequest('http://localhost/api/print-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ACME Letterhead', html: '<header>ACME</header>', css: '' }),
      })
    )

    expect(res.status).toBe(201)
    expect(mockPrisma.printTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'ACME Letterhead', userId: 1 }),
    })
  })

  it('rejects a template without a name or html', async () => {
    const { POST } = await import('@/app/api/print-templates/route')

    const res = await POST(
      new NextRequest('http://localhost/api/print-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css: '' }),
      })
    )

    expect(res.status).toBe(400)
  })
})

describe('/api/print-templates/[id]', () => {
  it('GET returns the template or 404', async () => {
    const { GET } = await import('@/app/api/print-templates/[id]/route')
    mockPrisma.printTemplate.findUnique.mockResolvedValue(TEMPLATE)

    const res = await GET(new NextRequest('http://localhost/api/print-templates/10'), {
      params: Promise.resolve({ id: '10' }),
    })
    expect(res.status).toBe(200)

    mockPrisma.printTemplate.findUnique.mockResolvedValue(null)
    const missing = await GET(new NextRequest('http://localhost/api/print-templates/99'), {
      params: Promise.resolve({ id: '99' }),
    })
    expect(missing.status).toBe(404)
  })

  it('PUT updates a user template but refuses presets', async () => {
    const { PUT } = await import('@/app/api/print-templates/[id]/route')
    mockPrisma.printTemplate.findUnique.mockResolvedValue(TEMPLATE)
    mockPrisma.printTemplate.update.mockResolvedValue({ ...TEMPLATE, name: 'Renamed' })

    const res = await PUT(
      new NextRequest('http://localhost/api/print-templates/10', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed' }),
      }),
      { params: Promise.resolve({ id: '10' }) }
    )
    expect(res.status).toBe(200)

    mockPrisma.printTemplate.findUnique.mockResolvedValue({
      ...TEMPLATE,
      userId: null,
      projectId: null,
    })
    const preset = await PUT(
      new NextRequest('http://localhost/api/print-templates/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    )
    expect(preset.status).toBe(403)
    expect(mockPrisma.printTemplate.update).toHaveBeenCalledTimes(1)
  })

  it('DELETE delegates to the lib and maps the preset guard to 403', async () => {
    const { DELETE } = await import('@/app/api/print-templates/[id]/route')
    mockDeleteTemplate.mockRejectedValue(new Error('Global presets cannot be deleted'))

    const res = await DELETE(new NextRequest('http://localhost/api/print-templates/1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '1' }),
    })

    expect(res.status).toBe(403)
  })
})

describe('item template routes', () => {
  it('POST /api/items/[id]/apply-template applies and returns the updated item state', async () => {
    const { POST } = await import('@/app/api/items/[id]/apply-template/route')
    mockApply.mockResolvedValue({ id: 7, html: '<header>ACME</header>', css: '', templateId: 10, version: 3 })

    const res = await POST(
      new NextRequest('http://localhost/api/items/7/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 10 }),
      }),
      { params: Promise.resolve({ id: '7' }) }
    )

    expect(mockApply).toHaveBeenCalledWith('7', 10)
    expect(res.status).toBe(200)
    expect((await res.json()).templateId).toBe(10)
  })

  it('POST apply-template validates templateId', async () => {
    const { POST } = await import('@/app/api/items/[id]/apply-template/route')

    const res = await POST(
      new NextRequest('http://localhost/api/items/7/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: '7' }) }
    )

    expect(res.status).toBe(400)
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('POST /api/items/[id]/save-as-template creates the template and returns 201', async () => {
    const { POST } = await import('@/app/api/items/[id]/save-as-template/route')
    mockSaveAs.mockResolvedValue(TEMPLATE)

    const res = await POST(
      new NextRequest('http://localhost/api/items/7/save-as-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ACME Letterhead', scope: 'user' }),
      }),
      { params: Promise.resolve({ id: '7' }) }
    )

    expect(mockSaveAs).toHaveBeenCalledWith('7', expect.objectContaining({ name: 'ACME Letterhead', scope: 'user', userId: 1 }))
    expect(res.status).toBe(201)
  })

  it('POST save-as-template validates name and scope', async () => {
    const { POST } = await import('@/app/api/items/[id]/save-as-template/route')

    const res = await POST(
      new NextRequest('http://localhost/api/items/7/save-as-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'galaxy' }),
      }),
      { params: Promise.resolve({ id: '7' }) }
    )

    expect(res.status).toBe(400)
    expect(mockSaveAs).not.toHaveBeenCalled()
  })
})
