import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { MockLanguageModelV3 } from 'ai/test'
import { simulateReadableStream, tool } from 'ai'
import type { LanguageModelV3StreamPart } from '@ai-sdk/provider'
import { z } from 'zod'

const { mockResolveModel, mockBuildSdkTools, mockSaveUIMessages, mockBuildItemSystemPrompt } =
  vi.hoisted(() => ({
    mockResolveModel: vi.fn(),
    mockBuildSdkTools: vi.fn(),
    mockSaveUIMessages: vi.fn(),
    mockBuildItemSystemPrompt: vi.fn(),
  }))

vi.mock('@/lib/ai/sdk-provider', () => ({ resolveModel: mockResolveModel }))
vi.mock('@/lib/ai/sdk-tools', () => ({ buildSdkTools: mockBuildSdkTools }))
vi.mock('@/lib/ai/item-context', () => ({ buildItemSystemPrompt: mockBuildItemSystemPrompt }))
vi.mock('@/lib/ai/conversation', () => ({
  saveUIMessages: mockSaveUIMessages,
  loadUIMessages: vi.fn(),
  clearConversation: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/auth-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-session')>()),
  requireUserId: vi.fn().mockResolvedValue(1),
  findOwnedItem: vi.fn().mockResolvedValue({ id: 7, project: { userId: 1 } }),
}))

const USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
  totalTokens: 2,
}

function textOnlyModel(text: string) {
  const chunks: LanguageModelV3StreamPart[] = [
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 't1' },
    { type: 'text-delta', id: 't1', delta: text },
    { type: 'text-end', id: 't1' },
    { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
  ]
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: simulateReadableStream({ chunks }) }),
  })
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const USER_MESSAGES = [
  { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'make it blue' }] },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockResolveModel.mockReturnValue(textOnlyModel('Done!'))
  mockBuildSdkTools.mockReturnValue({})
  mockBuildItemSystemPrompt.mockResolvedValue('SYSTEM PROMPT')
  mockSaveUIMessages.mockResolvedValue(undefined)
})

describe('POST /api/chat (AI SDK)', () => {
  it('streams a UI message response and persists the conversation on finish', async () => {
    const { POST } = await import('@/app/api/chat/route')

    const res = await POST(makeRequest({ itemId: '7', messages: USER_MESSAGES }))

    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Done!')

    expect(mockBuildItemSystemPrompt).toHaveBeenCalledWith('7')
    expect(mockSaveUIMessages).toHaveBeenCalledTimes(1)
    const [savedItemId, savedMessages] = mockSaveUIMessages.mock.calls[0]
    expect(savedItemId).toBe('7')
    const roles = savedMessages.map((m: { role: string }) => m.role)
    expect(roles).toContain('user')
    expect(roles).toContain('assistant')
  })

  it('runs the tool loop: executes tools and continues to a final answer', async () => {
    const { POST } = await import('@/app/api/chat/route')

    const executeSpy = vi.fn().mockResolvedValue({ ok: true })
    mockBuildSdkTools.mockReturnValue({
      get_template: tool({
        description: 'test tool',
        inputSchema: z.object({}),
        execute: executeSpy,
      }),
    })

    const model = new MockLanguageModelV3({
      doStream: vi
        .fn()
        .mockResolvedValueOnce({
          stream: simulateReadableStream({
            chunks: [
              { type: 'stream-start', warnings: [] },
              {
                type: 'tool-call',
                toolCallId: 'tc1',
                toolName: 'get_template',
                input: '{}',
              },
              { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE },
            ] satisfies LanguageModelV3StreamPart[],
          }),
        })
        .mockResolvedValueOnce({
          stream: simulateReadableStream({
            chunks: [
              { type: 'stream-start', warnings: [] },
              { type: 'text-start', id: 't1' },
              { type: 'text-delta', id: 't1', delta: 'Here is your template' },
              { type: 'text-end', id: 't1' },
              { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
            ] satisfies LanguageModelV3StreamPart[],
          }),
        }),
    })
    mockResolveModel.mockReturnValue(model)

    const res = await POST(makeRequest({ itemId: '7', messages: USER_MESSAGES }))
    const body = await res.text()

    expect(executeSpy).toHaveBeenCalledTimes(1)
    expect(body).toContain('Here is your template')
  })

  it('rejects unauthenticated requests with 401', async () => {
    const { POST } = await import('@/app/api/chat/route')
    const { requireUserId, UnauthorizedError } = await import('@/lib/auth-session')
    vi.mocked(requireUserId).mockRejectedValueOnce(new UnauthorizedError())

    const res = await POST(makeRequest({ itemId: '7', messages: USER_MESSAGES }))

    expect(res.status).toBe(401)
  })

  it('hides foreign items as 404', async () => {
    const { POST } = await import('@/app/api/chat/route')
    const { findOwnedItem } = await import('@/lib/auth-session')
    vi.mocked(findOwnedItem).mockResolvedValueOnce(null)

    const res = await POST(makeRequest({ itemId: '99', messages: USER_MESSAGES }))

    expect(res.status).toBe(404)
  })

  it('validates the body', async () => {
    const { POST } = await import('@/app/api/chat/route')

    const res = await POST(makeRequest({ messages: USER_MESSAGES }))

    expect(res.status).toBe(400)
  })
})

describe('GET/DELETE /api/chat', () => {
  it('GET returns the stored UIMessages for an owned item', async () => {
    const { GET } = await import('@/app/api/chat/route')
    const { loadUIMessages } = await import('@/lib/ai/conversation')
    vi.mocked(loadUIMessages).mockResolvedValue([
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
    ] as never)

    const res = await GET(new NextRequest('http://localhost/api/chat?itemId=7'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.messages).toHaveLength(1)
  })

  it('DELETE clears the conversation', async () => {
    const { DELETE } = await import('@/app/api/chat/route')
    const { clearConversation } = await import('@/lib/ai/conversation')

    const res = await DELETE(
      new NextRequest('http://localhost/api/chat?itemId=7', { method: 'DELETE' })
    )

    expect(res.status).toBe(200)
    expect(vi.mocked(clearConversation)).toHaveBeenCalledWith('7')
  })
})
