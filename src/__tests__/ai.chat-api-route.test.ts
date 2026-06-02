import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockLoadMessages = vi.fn()
const mockSaveMessages = vi.fn()
const mockHandleChatRequest = vi.fn()

vi.mock('@/lib/ai/conversation', () => ({
  loadMessages: (...args: unknown[]) => mockLoadMessages(...args),
  saveMessages: (...args: unknown[]) => mockSaveMessages(...args),
}))

vi.mock('@/lib/ai/chat-route', () => ({
  handleChatRequest: (...args: unknown[]) => mockHandleChatRequest(...args),
}))

vi.mock('@/lib/ai/system-prompt', () => ({
  buildSystemPrompt: () => 'mocked system prompt',
}))

vi.mock('@/lib/ai/tools', () => ({
  getTemplate: vi.fn().mockResolvedValue({ name: 'Test', html: '<div></div>', css: '' }),
  getDataInfo: vi.fn().mockResolvedValue({ columns: ['col1'], rowCount: 5, sampleRows: [] }),
  getHelpers: vi.fn().mockResolvedValue({ builtIn: [], custom: [] }),
  getAssets: vi.fn().mockResolvedValue({ assets: [] }),
  initItem: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: { findUnique: vi.fn().mockResolvedValue(null) },
    dataSet: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

const { POST } = await import('@/app/api/ai/chat/route')

function createMockStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: message\ndata: {"type":"text","content":"hi"}\n\n'))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

describe('POST /api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadMessages.mockResolvedValue([])
    mockSaveMessages.mockResolvedValue(undefined)
    mockHandleChatRequest.mockResolvedValue(createMockStream())
  })

  it('returns a Response with content-type text/event-stream', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'test-123', message: { role: 'user', content: 'Hello' } }),
    })

    const response = await POST(request)

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('response body is a ReadableStream', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'test-123', message: { role: 'user', content: 'Hello' } }),
    })

    const response = await POST(request)

    expect(response.body).toBeInstanceOf(ReadableStream)
  })

  it('returns 400 when itemId is missing', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { role: 'user', content: 'Hello' } }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('itemId is required')
  })

  it('returns 400 when message is missing', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'test-123' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('message with role and content is required')
  })

  it('returns 400 when message has no content', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'test-123', message: { role: 'user', content: '' } }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('message with role and content is required')
  })

  it('calls loadMessages with itemId', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'test-123', message: { role: 'user', content: 'Hello' } }),
    })

    await POST(request)

    expect(mockLoadMessages).toHaveBeenCalledWith('test-123')
  })

  it('passes existing messages to handleChatRequest', async () => {
    const existingMessages = [{ role: 'user', content: 'Previous message' }]
    mockLoadMessages.mockResolvedValue(existingMessages)

    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'test-123', message: { role: 'user', content: 'Hello' } }),
    })

    await POST(request)

    expect(mockHandleChatRequest).toHaveBeenCalledWith(
      'test-123',
      expect.arrayContaining([
        { role: 'system', content: expect.any(String) },
        ...existingMessages,
        { role: 'user', content: 'Hello' },
      ]),
    )
  })
})
