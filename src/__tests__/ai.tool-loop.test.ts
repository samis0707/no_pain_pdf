import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeToolCall, runToolLoop } from '@/lib/ai/tool-loop'
import { getTemplate } from '@/lib/ai/tools'

const TEST_ITEM_ID = 'test-item-123'

const { mockChat } = vi.hoisted(() => ({ mockChat: vi.fn() }))

vi.mock('@/lib/ai/registry', () => ({
  createProvider: () => ({
    chat: mockChat,
    chatStream: vi.fn(),
    supportsToolCalling: vi.fn().mockReturnValue(true),
  }),
}))

describe('executeToolCall', () => {
  it('dispatches get_template tool call and returns result with toolCallId', async () => {
    const result = await executeToolCall(TEST_ITEM_ID, {
      id: 'call_1',
      name: 'get_template',
      args: { itemId: TEST_ITEM_ID },
    })
    expect(result).toHaveProperty('toolCallId', 'call_1')
    expect(result).toHaveProperty('result')
    expect(result.result).toHaveProperty('html')
  })

  it('throws for unknown tool name', async () => {
    await expect(
      executeToolCall(TEST_ITEM_ID, {
        id: 'call_2',
        name: 'unknown_tool',
        args: {},
      })
    ).rejects.toThrow()
  })
})

describe('runToolLoop', () => {
  beforeEach(() => {
    mockChat.mockReset()
  })

  it('executes a single tool call and returns the final response', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_1', name: 'get_template', args: { itemId: TEST_ITEM_ID } },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'Here is the current template.',
      })

    const response = await runToolLoop(TEST_ITEM_ID, [
      { role: 'user', content: 'What template?' },
    ])

    expect(response.role).toBe('assistant')
    expect(response.content).toContain('template')
    expect(mockChat).toHaveBeenCalledTimes(2)
  })

  it('feeds tool results back into loop for multiple sequential tool calls', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_1', name: 'get_template', args: { itemId: TEST_ITEM_ID } },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_2', name: 'update_template', args: { html: '<h1>Updated</h1>' } },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'I updated the template.',
      })

    const response = await runToolLoop(TEST_ITEM_ID, [
      { role: 'user', content: 'Update the template' },
    ])

    expect(response.role).toBe('assistant')
    expect(response.content).toContain('updated')
    expect(mockChat).toHaveBeenCalledTimes(3)
    expect(response.content).not.toContain('Error')
  })

  it('passes tool results as tool-role messages in subsequent chat calls', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_1', name: 'get_template', args: { itemId: TEST_ITEM_ID } },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'Done.',
      })

    await runToolLoop(TEST_ITEM_ID, [
      { role: 'user', content: 'Show template' },
    ])

    const secondCallArgs = mockChat.mock.calls[1]
    const messages = secondCallArgs[0]
    const toolMessages = messages.filter((m: { role: string }) => m.role === 'tool')
    expect(toolMessages.length).toBeGreaterThan(0)
    expect(toolMessages[0]).toHaveProperty('toolCallId', 'call_1')
    expect(toolMessages[0]).toHaveProperty('content')
    const parsed = JSON.parse(toolMessages[0].content)
    expect(parsed).toHaveProperty('html')
  })
})
