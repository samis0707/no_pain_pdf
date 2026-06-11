import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatMessage } from '@/lib/ai/types'

const { mockChat, mockExecuteToolCall, mockRenderPreview, mockSaveMessages } = vi.hoisted(() => ({
  mockChat: vi.fn(),
  mockExecuteToolCall: vi.fn(),
  mockRenderPreview: vi.fn(),
  mockSaveMessages: vi.fn(),
}))

vi.mock('@/lib/ai/registry', () => ({
  createProvider: () => ({ chat: mockChat }),
}))

vi.mock('@/lib/ai/tool-loop', () => ({
  TOOL_DEFINITIONS: [],
  executeToolCall: mockExecuteToolCall,
}))

vi.mock('@/lib/ai/tools', () => ({
  renderPreview: mockRenderPreview,
}))

vi.mock('@/lib/ai/conversation', () => ({
  saveMessages: mockSaveMessages,
}))

const PREVIEW = {
  pageCount: 1,
  truncated: false,
  images: [{ mimeType: 'image/jpeg', data: 'YXV0bw==' }],
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  let out = ''
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value)
  }
  return out
}

function assistantWithTool(name: string, id = 'tc_1'): ChatMessage {
  return { role: 'assistant', content: '', toolCalls: [{ id, name, args: {} }] }
}

const FINAL: ChatMessage = { role: 'assistant', content: 'done' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRenderPreview.mockResolvedValue(PREVIEW)
  mockExecuteToolCall.mockImplementation(async (_itemId: string, tc: { id: string; name: string }) => ({
    toolCallId: tc.id,
    result: { version: 2 },
  }))
  mockSaveMessages.mockResolvedValue(undefined)
})

describe('auto preview feedback after template mutations', () => {
  it('renders once after update_template and feeds images into the next provider call', async () => {
    const { handleChatRequest } = await import('@/lib/ai/chat-route')
    mockChat.mockResolvedValueOnce(assistantWithTool('update_template'))
    mockChat.mockResolvedValueOnce(FINAL)

    await drain(await handleChatRequest('1', [{ role: 'user', content: 'make it blue' }]))

    expect(mockRenderPreview).toHaveBeenCalledTimes(1)
    expect(mockRenderPreview).toHaveBeenCalledWith('1')

    // second provider call sees the tool message enriched with preview images
    const secondCallMessages = mockChat.mock.calls[1][0] as ChatMessage[]
    const toolMsg = secondCallMessages.find((m) => m.role === 'tool')
    expect(toolMsg?.images).toEqual(PREVIEW.images)
    expect(toolMsg?.content).toContain('autoPreview')
    expect(toolMsg?.content).toContain('"pageCount":1')
  })

  it('skips auto-render when the model already called render_preview in the same iteration', async () => {
    const { handleChatRequest } = await import('@/lib/ai/chat-route')
    mockChat.mockResolvedValueOnce({
      role: 'assistant',
      content: '',
      toolCalls: [
        { id: 'tc_1', name: 'update_template', args: {} },
        { id: 'tc_2', name: 'render_preview', args: {} },
      ],
    })
    mockChat.mockResolvedValueOnce(FINAL)

    await drain(await handleChatRequest('1', [{ role: 'user', content: 'x' }]))

    expect(mockRenderPreview).not.toHaveBeenCalled()
  })

  it('does not render for non-mutating tools', async () => {
    const { handleChatRequest } = await import('@/lib/ai/chat-route')
    mockChat.mockResolvedValueOnce(assistantWithTool('get_data_info'))
    mockChat.mockResolvedValueOnce(FINAL)

    await drain(await handleChatRequest('1', [{ role: 'user', content: 'x' }]))

    expect(mockRenderPreview).not.toHaveBeenCalled()
  })

  it('caps auto-renders at 3 per request', async () => {
    const { handleChatRequest } = await import('@/lib/ai/chat-route')
    for (let i = 0; i < 5; i++) {
      mockChat.mockResolvedValueOnce(assistantWithTool('update_template', `tc_${i}`))
    }
    mockChat.mockResolvedValueOnce(FINAL)

    await drain(await handleChatRequest('1', [{ role: 'user', content: 'x' }]))

    expect(mockRenderPreview).toHaveBeenCalledTimes(3)
  })

  it('continues the loop when the auto-render fails', async () => {
    const { handleChatRequest } = await import('@/lib/ai/chat-route')
    mockRenderPreview.mockRejectedValue(new Error('weasyprint down'))
    mockChat.mockResolvedValueOnce(assistantWithTool('update_template'))
    mockChat.mockResolvedValueOnce(FINAL)

    const out = await drain(
      await handleChatRequest('1', [{ role: 'user', content: 'x' }])
    )

    expect(out).toContain('done')
    expect(mockChat).toHaveBeenCalledTimes(2)
  })
})
