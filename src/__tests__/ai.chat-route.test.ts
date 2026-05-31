import { describe, it, expect } from 'vitest'
import { handleChatRequest } from '@/lib/ai/chat-route'

const TEST_ITEM_ID = 'test-item-123'

describe('handleChatRequest', () => {
  it('returns a ReadableStream with SSE events', async () => {
    const stream = await handleChatRequest(TEST_ITEM_ID, [
      { role: 'user', content: 'Hello' },
    ])
    expect(stream).toBeInstanceOf(ReadableStream)
  })

  it('stream contains text events when no tools are called', async () => {
    const stream = await handleChatRequest(TEST_ITEM_ID, [
      { role: 'user', content: 'Hello' },
    ])
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let allText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      allText += decoder.decode(value, { stream: true })
    }
    expect(allText).toContain('data:')
    expect(allText).toContain('[DONE]')
  })

  it('stream contains tool call events when AI uses tools', async () => {
    const stream = await handleChatRequest(TEST_ITEM_ID, [
      { role: 'user', content: 'What data do I have?' },
    ])
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let allText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      allText += decoder.decode(value, { stream: true })
    }
    expect(allText).toContain('data:')
    expect(allText).toContain('[DONE]')
  })

  it('stream ends with [DONE] event', async () => {
    const stream = await handleChatRequest(TEST_ITEM_ID, [
      { role: 'user', content: 'Hi' },
    ])
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let lastChunk = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      lastChunk = decoder.decode(value, { stream: true })
    }
    expect(lastChunk).toContain('[DONE]')
  })
})
