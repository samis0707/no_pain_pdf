import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRequireUserId, mockPrisma } = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockPrisma: {
    printProject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    printItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-session', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/auth-session')>()
  return {
    ...mod,
    requireUserId: mockRequireUserId,
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

vi.mock('@/lib/templates', () => ({
  listTemplates: vi.fn().mockResolvedValue([]),
  deleteTemplate: vi.fn(),
  applyTemplateToItem: vi.fn(),
  saveItemAsTemplate: vi.fn().mockResolvedValue({ id: 1, name: 'x' }),
}))

const SESSION_USER = 7

beforeEach(async () => {
  vi.clearAllMocks()
  mockRequireUserId.mockResolvedValue(SESSION_USER)
})

async function expectUnauthorized(run: () => Promise<Response>) {
  const { UnauthorizedError } = await import('@/lib/auth-session')
  mockRequireUserId.mockRejectedValue(new UnauthorizedError())
  const res = await run()
  expect(res.status).toBe(401)
}

describe('projects scoping', () => {
  it('GET lists only the session user projects', async () => {
    const { GET } = await import('@/app/api/projects/route')
    mockPrisma.printProject.findMany.mockResolvedValue([])

    await GET()

    expect(mockPrisma.printProject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: SESSION_USER } })
    )
  })

  it('GET returns 401 without a session', async () => {
    const { GET } = await import('@/app/api/projects/route')
    await expectUnauthorized(() => GET())
  })

  it('POST creates the project for the session user, not a hardcoded id', async () => {
    const { POST } = await import('@/app/api/projects/route')
    mockPrisma.printProject.create.mockResolvedValue({ id: 1, name: 'P', userId: SESSION_USER })

    await POST(
      new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'P' }),
      })
    )

    expect(mockPrisma.printProject.create).toHaveBeenCalledWith({
      data: { name: 'P', userId: SESSION_USER },
    })
  })
})

describe('items scoping', () => {
  it('POST refuses to create an item in a foreign project', async () => {
    const { POST } = await import('@/app/api/items/route')
    mockPrisma.printProject.findUnique.mockResolvedValue({ id: 3, userId: 999 })

    const res = await POST(
      new NextRequest('http://localhost/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 3, name: 'Item' }),
      })
    )

    expect(res.status).toBe(404)
    expect(mockPrisma.printItem.create).not.toHaveBeenCalled()
  })

  it('GET /api/items/[id] hides foreign items as 404', async () => {
    const { GET } = await import('@/app/api/items/[id]/route')
    mockPrisma.printItem.findUnique.mockResolvedValue({
      id: 5,
      projectId: 3,
      project: { id: 3, userId: 999 },
    })

    const res = await GET(new NextRequest('http://localhost/api/items/5'), {
      params: Promise.resolve({ id: '5' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('assets scoping', () => {
  it('GET lists only the session user assets', async () => {
    const { GET } = await import('@/app/api/assets/route')
    mockPrisma.asset.findMany.mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/assets'))

    const where = mockPrisma.asset.findMany.mock.calls[0][0].where
    expect(where).toMatchObject({ userId: SESSION_USER })
  })
})

describe('print-templates scoping', () => {
  it('GET passes the session user to listTemplates', async () => {
    const { GET } = await import('@/app/api/print-templates/route')
    const { listTemplates } = await import('@/lib/templates')

    await GET(new NextRequest('http://localhost/api/print-templates'))

    expect(listTemplates).toHaveBeenCalledWith(SESSION_USER, undefined)
  })

  it('save-as-template uses the session user', async () => {
    const { POST } = await import('@/app/api/items/[id]/save-as-template/route')
    const { saveItemAsTemplate } = await import('@/lib/templates')
    mockPrisma.printItem.findUnique.mockResolvedValue({
      id: 7,
      projectId: 3,
      project: { id: 3, userId: SESSION_USER },
    })

    await POST(
      new NextRequest('http://localhost/api/items/7/save-as-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'T', scope: 'user' }),
      }),
      { params: Promise.resolve({ id: '7' }) }
    )

    expect(saveItemAsTemplate).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ userId: SESSION_USER })
    )
  })
})
