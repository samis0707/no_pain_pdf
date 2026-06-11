import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockFindUnique = vi.fn()
const mockDelete = vi.fn()
const mockDeleteFile = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    asset: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

vi.mock('@/lib/s3', () => ({
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}))

vi.mock('@/lib/auth-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-session')>()),
  requireUserId: vi.fn().mockResolvedValue(1),
}))

const { DELETE } = await import('@/app/api/assets/[id]/route')

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/assets/${id}`, { method: 'DELETE' })
}

describe('DELETE /api/assets/[id]', () => {
  const mockAsset = {
    id: 1,
    filename: 'assets/42/logo.png',
    originalName: 'logo.png',
    mimeType: 'image/png',
    fileSize: 12345,
    userId: 1,
    printItemId: 42,
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes asset from S3 and DB and returns success', async () => {
    mockFindUnique.mockResolvedValue(mockAsset)
    mockDeleteFile.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(mockAsset)

    const response = await DELETE(makeRequest('1'), {
      params: Promise.resolve({ id: '1' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(mockDeleteFile).toHaveBeenCalledWith('assets/42/logo.png')
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('returns 404 when asset does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    const response = await DELETE(makeRequest('999'), {
      params: Promise.resolve({ id: '999' }),
    })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(mockDeleteFile).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid id', async () => {
    const response = await DELETE(makeRequest('abc'), {
      params: Promise.resolve({ id: 'abc' }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })
})
