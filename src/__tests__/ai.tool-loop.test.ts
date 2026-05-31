import { describe, it, expect } from 'vitest'
import { executeToolCall, runToolLoop } from '@/lib/ai/tool-loop'
import { getTemplate } from '@/lib/ai/tools'

const TEST_ITEM_ID = 'test-item-123'

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
  it('processes a user message through tool-calling and returns final response', async () => {
    const response = await runToolLoop(TEST_ITEM_ID, [
      { role: 'user', content: 'Make the title bigger' },
    ])
    expect(response).toHaveProperty('role', 'assistant')
    expect(typeof response.content).toBe('string')
  })

  it('handles multiple sequential tool calls', async () => {
    const response = await runToolLoop(TEST_ITEM_ID, [
      { role: 'user', content: 'Change title and make it blue' },
    ])
    expect(response).toHaveProperty('role', 'assistant')
  })
})
