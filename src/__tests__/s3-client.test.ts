import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSend = vi.fn()
const mockGetSignedUrl = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () { return { send: mockSend } }),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('S3 client configuration', () => {
  it('creates S3 client with MinIO-compatible forcePathStyle', async () => {
    const { s3Client } = await import('@/lib/s3')
    const { S3Client } = await import('@aws-sdk/client-s3')
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({ forcePathStyle: true })
    )
  })

  it('uses region from S3_REGION env with fallback to us-east-1', async () => {
    const { s3Client } = await import('@/lib/s3')
    const { S3Client } = await import('@aws-sdk/client-s3')
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'us-east-1' })
    )
  })
})

describe('uploadFile', () => {
  it('sends PutObjectCommand with bucket, key, body and contentType', async () => {
    const { uploadFile } = await import('@/lib/s3')
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')

    mockSend.mockResolvedValueOnce({ ETag: '"abc123"' })
    const body = Buffer.from('test')
    const result = await uploadFile('test-key.png', body, 'image/png')

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'test-key.png',
      Body: body,
      ContentType: 'image/png',
    })
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ETag: '"abc123"' })
  })

  it('works without contentType', async () => {
    const { uploadFile } = await import('@/lib/s3')
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')

    mockSend.mockResolvedValueOnce({})
    await uploadFile('no-mime.txt', 'hello')

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'no-mime.txt',
      Body: 'hello',
      ContentType: undefined,
    })
  })

  it('propagates upload errors', async () => {
    const { uploadFile } = await import('@/lib/s3')
    mockSend.mockRejectedValueOnce(new Error('Network error'))

    await expect(uploadFile('fail.txt', 'data')).rejects.toThrow('Network error')
  })
})

describe('getFile', () => {
  it('sends GetObjectCommand and returns the response body', async () => {
    const { getFile } = await import('@/lib/s3')
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')

    const mockBody = 'file-content'
    mockSend.mockResolvedValueOnce({ Body: mockBody })

    const result = await getFile('test-key.png')

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'test-key.png',
    })
    expect(result).toBe(mockBody)
  })

  it('propagates errors when file not found', async () => {
    const { getFile } = await import('@/lib/s3')
    const error = new Error('NoSuchKey: The specified key does not exist.')
    ;(error as any).name = 'NoSuchKey'
    mockSend.mockRejectedValueOnce(error)

    await expect(getFile('missing.png')).rejects.toThrow('NoSuchKey')
  })
})

describe('deleteFile', () => {
  it('sends DeleteObjectCommand with bucket and key', async () => {
    const { deleteFile } = await import('@/lib/s3')
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')

    mockSend.mockResolvedValueOnce({})
    await deleteFile('old-file.pdf')

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'old-file.pdf',
    })
  })
})

describe('listFiles', () => {
  it('sends ListObjectsV2Command with optional prefix', async () => {
    const { listFiles } = await import('@/lib/s3')
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')

    mockSend.mockResolvedValueOnce({ Contents: [{ Key: 'file1.pdf' }] })
    const result = await listFiles('thumbnails/')

    expect(ListObjectsV2Command).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Prefix: 'thumbnails/',
    })
    expect(result.Contents).toHaveLength(1)
  })

  it('lists all files when no prefix is given', async () => {
    const { listFiles } = await import('@/lib/s3')
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')

    mockSend.mockResolvedValueOnce({ Contents: [] })
    await listFiles()

    expect(ListObjectsV2Command).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Prefix: undefined,
    })
  })
})

describe('generateUploadUrl', () => {
  it('calls getSignedUrl with PutObjectCommand and default expiry', async () => {
    const { generateUploadUrl } = await import('@/lib/s3')
    const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3')

    mockGetSignedUrl.mockResolvedValueOnce('https://signed-url.example.com/upload')
    const url = await generateUploadUrl('my-file.pdf')

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'my-file.pdf',
    })
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      { expiresIn: 3600 }
    )
    expect(url).toBe('https://signed-url.example.com/upload')
  })

  it('accepts custom expiry time', async () => {
    const { generateUploadUrl } = await import('@/lib/s3')

    mockGetSignedUrl.mockResolvedValueOnce('https://signed-url.example.com/upload')
    await generateUploadUrl('my-file.pdf', 7200)

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      { expiresIn: 7200 }
    )
  })
})

describe('generateInternalDownloadUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('presigns with a client built from S3_INTERNAL_ENDPOINT', async () => {
    vi.stubEnv('S3_ENDPOINT', 'http://localhost:9000')
    vi.stubEnv('S3_INTERNAL_ENDPOINT', 'http://minio:9000')

    const { generateInternalDownloadUrl } = await import('@/lib/s3')
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')

    mockGetSignedUrl.mockResolvedValueOnce('http://minio:9000/uploads/k?sig=1')
    const url = await generateInternalDownloadUrl('assets/1/k.png')

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'http://minio:9000' })
    )
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'assets/1/k.png',
    })
    expect(url).toBe('http://minio:9000/uploads/k?sig=1')
  })

  it('falls back to S3_ENDPOINT when S3_INTERNAL_ENDPOINT is not set', async () => {
    vi.stubEnv('S3_ENDPOINT', 'http://localhost:9000')
    vi.stubEnv('S3_INTERNAL_ENDPOINT', '')

    const { generateInternalDownloadUrl } = await import('@/lib/s3')
    const { S3Client } = await import('@aws-sdk/client-s3')

    mockGetSignedUrl.mockResolvedValueOnce('http://localhost:9000/uploads/k?sig=1')
    await generateInternalDownloadUrl('k.png')

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'http://localhost:9000' })
    )
  })
})

describe('generateDownloadUrl', () => {
  it('calls getSignedUrl with GetObjectCommand', async () => {
    const { generateDownloadUrl } = await import('@/lib/s3')
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')

    mockGetSignedUrl.mockResolvedValueOnce('https://signed-url.example.com/download')
    const url = await generateDownloadUrl('my-file.pdf')

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'uploads',
      Key: 'my-file.pdf',
    })
    expect(url).toBe('https://signed-url.example.com/download')
  })
})
