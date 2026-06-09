import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUploadFile = vi.fn()
const mockAssetCreate = vi.fn()

vi.mock('@/lib/s3', () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    asset: {
      create: (...args: unknown[]) => mockAssetCreate(...args),
      findMany: vi.fn(),
    },
  },
}))

const { POST } = await import('@/app/api/assets/upload/route')

function createRequestWithFormData(formData: FormData): NextRequest {
  const request = new NextRequest('http://localhost/api/assets/upload', { method: 'POST' })
  vi.spyOn(request, 'formData').mockResolvedValue(formData)
  return request
}

function createImageFormData(printItemId?: string): FormData {
  const fd = new FormData()
  fd.append('file', new File(['fake-image-content'], 'test.png', { type: 'image/png' }))
  if (printItemId) {
    fd.append('printItemId', printItemId)
  }
  return fd
}

describe('POST /api/assets/upload', () => {
  const mockAssetResponse = {
    id: 1,
    filename: '1234567890-test.png',
    originalName: 'test.png',
    mimeType: 'image/png',
    fileSize: 18,
    userId: 1,
    printItemId: null,
    createdAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAssetCreate.mockResolvedValue(mockAssetResponse)
    mockUploadFile.mockResolvedValue({ ETag: '"abc123"' })
  })

  it('uploads image and returns asset with id, filename, originalName, mimeType, fileSize, url', async () => {
    const formData = createImageFormData()
    const request = createRequestWithFormData(formData)

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body).toMatchObject({
      id: mockAssetResponse.id,
      filename: mockAssetResponse.filename,
      originalName: mockAssetResponse.originalName,
      mimeType: mockAssetResponse.mimeType,
      fileSize: mockAssetResponse.fileSize,
    })
    expect(body).toHaveProperty('url')
    expect(typeof body.url).toBe('string')
  })

  it('accepts optional printItemId and associates it with the asset', async () => {
    const formData = createImageFormData('42')
    const request = createRequestWithFormData(formData)

    await POST(request)

    expect(mockAssetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ printItemId: 42 }),
      }),
    )
  })

  it('rejects non-image file types', async () => {
    const fd = new FormData()
    fd.append('file', new File(['some text'], 'document.txt', { type: 'text/plain' }))
    const request = createRequestWithFormData(fd)

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when no file provided', async () => {
    const fd = new FormData()
    const request = new NextRequest('http://localhost/api/assets/upload', {
      method: 'POST',
      body: fd,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('No file provided')
  })

  it('returns 400 on invalid form data', async () => {
    const request = new NextRequest('http://localhost/api/assets/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid form data')
  })

  it('propagates S3 upload errors as 500', async () => {
    mockUploadFile.mockRejectedValue(new Error('S3 connection failed'))
    const formData = createImageFormData()
    const request = createRequestWithFormData(formData)

    const response = await POST(request)

    expect(response.status).toBe(500)
  })

  it('stores file with correct key prefix on S3', async () => {
    const formData = createImageFormData()
    const request = createRequestWithFormData(formData)

    await POST(request)

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/^assets\//),
      expect.any(Buffer),
      expect.any(String),
    )
  })
})
