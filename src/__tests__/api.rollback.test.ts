import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRollbackItem, mockListVersions } = vi.hoisted(() => ({
  mockRollbackItem: vi.fn(),
  mockListVersions: vi.fn(),
}))

vi.mock('@/lib/versioning', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/versioning')>()
  return {
    VersionNotFoundError: mod.VersionNotFoundError,
    rollbackItem: mockRollbackItem,
    listVersions: mockListVersions,
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

const { POST, GET } = await import('@/app/api/items/[id]/rollback/route')

function postRequest(id: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/items/${id}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/items/[id]/rollback', () => {
  it('rolls back to the requested version and returns the restored state', async () => {
    mockRollbackItem.mockResolvedValue({
      id: 1,
      html: '<h1>old</h1>',
      css: '',
      miscText: '{}',
      version: 2,
    })

    const response = await POST(postRequest('1', { version: 2 }), {
      params: Promise.resolve({ id: '1' }),
    })

    expect(mockRollbackItem).toHaveBeenCalledWith('1', 2)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toMatchObject({ html: '<h1>old</h1>', version: 2 })
  })

  it('performs an undo (latest snapshot) when no version is supplied', async () => {
    mockRollbackItem.mockResolvedValue({ id: 1, html: '', css: '', miscText: '{}', version: 4 })

    const response = await POST(postRequest('1', {}), {
      params: Promise.resolve({ id: '1' }),
    })

    expect(mockRollbackItem).toHaveBeenCalledWith('1', undefined)
    expect(response.status).toBe(200)
  })

  it('returns 404 for a missing snapshot version', async () => {
    const { VersionNotFoundError } = await import('@/lib/versioning')
    mockRollbackItem.mockRejectedValue(new VersionNotFoundError('no snapshot for version 9'))

    const response = await POST(postRequest('1', { version: 9 }), {
      params: Promise.resolve({ id: '1' }),
    })

    expect(response.status).toBe(404)
  })

  it('returns 400 for a non-numeric version', async () => {
    const response = await POST(postRequest('1', { version: 'two' }), {
      params: Promise.resolve({ id: '1' }),
    })

    expect(response.status).toBe(400)
    expect(mockRollbackItem).not.toHaveBeenCalled()
  })
})

describe('GET /api/items/[id]/rollback', () => {
  it('lists available versions', async () => {
    mockListVersions.mockResolvedValue([
      { version: 3, createdAt: new Date('2026-06-11T10:00:00Z') },
      { version: 2, createdAt: new Date('2026-06-11T09:00:00Z') },
    ])

    const response = await GET(
      new NextRequest('http://localhost/api/items/1/rollback'),
      { params: Promise.resolve({ id: '1' }) }
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.versions).toHaveLength(2)
    expect(json.versions[0].version).toBe(3)
  })
})
