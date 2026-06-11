// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockFindMany = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    asset: { findMany: mockFindMany },
  },
}))

vi.mock('@/lib/auth-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-session')>()),
  requireUserId: vi.fn().mockResolvedValue(1),
}))

const { GET } = await import('@/app/api/assets/route')

function makeRequest(printItemId?: string): NextRequest {
  const url = printItemId
    ? `http://localhost/api/assets?printItemId=${printItemId}`
    : 'http://localhost/api/assets'
  return new NextRequest(url)
}

describe('GET /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of assets for a given printItemId', async () => {
    const mockAssets = [
      {
        id: 1,
        printItemId: 42,
        userId: 1,
        filename: '1712345678-image.png',
        originalName: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 2,
        printItemId: 42,
        userId: 1,
        filename: '1712345679-doc.pdf',
        originalName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
        createdAt: new Date('2025-01-02'),
      },
    ]
    mockFindMany.mockResolvedValue(mockAssets)

    const response = await GET(makeRequest('42'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({
      id: 1,
      filename: '1712345678-image.png',
      originalName: 'image.png',
      mimeType: 'image/png',
      fileSize: 1024,
    })
    expect(body[1]).toMatchObject({
      id: 2,
      filename: '1712345679-doc.pdf',
      originalName: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
    })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { printItemId: 42, userId: 1 },
      })
    )
  })

  it('returns empty array for printItemId with no assets', async () => {
    mockFindMany.mockResolvedValue([])

    const response = await GET(makeRequest('99'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })

  it('returns 400 when printItemId is missing', async () => {
    const response = await GET(makeRequest())

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('includes url field as /api/assets/file/{filename}', async () => {
    const mockAssets = [
      {
        id: 1,
        printItemId: 42,
        userId: 1,
        filename: '1712345678-image.png',
        originalName: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        createdAt: new Date('2025-01-01'),
      },
    ]
    mockFindMany.mockResolvedValue(mockAssets)

    const response = await GET(makeRequest('42'))
    const body = await response.json()

    expect(body[0]).toHaveProperty('url')
    expect(body[0].url).toBe('/api/assets/file/1712345678-image.png')
  })

  it('returns 500 when Prisma query fails', async () => {
    mockFindMany.mockRejectedValue(new Error('Database connection failed'))

    const response = await GET(makeRequest('42'))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })
})
