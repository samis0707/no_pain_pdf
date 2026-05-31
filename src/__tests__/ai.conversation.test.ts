import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveMessages,
  loadMessages,
  clearConversation,
  type ChatMessage,
} from '@/lib/ai/conversation'

const TEST_ITEM = 'test-item-123'

describe('saveMessages', () => {
  it('stores messages for a given itemId', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]
    await saveMessages(TEST_ITEM, messages)
    const loaded = await loadMessages(TEST_ITEM)
    expect(loaded).toEqual(messages)
  })

  it('appends messages to existing ones (does not overwrite)', async () => {
    await saveMessages(TEST_ITEM, [{ role: 'user', content: 'First' }])
    await saveMessages(TEST_ITEM, [{ role: 'user', content: 'Second' }])
    const loaded = await loadMessages(TEST_ITEM)
    expect(loaded).toHaveLength(2)
    expect(loaded[0].content).toBe('First')
    expect(loaded[1].content).toBe('Second')
  })
})

describe('loadMessages', () => {
  beforeEach(async () => {
    await clearConversation(TEST_ITEM)
  })

  it('retrieves messages that were saved', async () => {
    const msgs: ChatMessage[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hi' },
    ]
    await saveMessages(TEST_ITEM, msgs)
    const loaded = await loadMessages(TEST_ITEM)
    expect(loaded).toHaveLength(2)
    expect(loaded[0].role).toBe('system')
    expect(loaded[1].role).toBe('user')
  })

  it('returns empty array for unknown itemId', async () => {
    const loaded = await loadMessages('unknown-item')
    expect(loaded).toEqual([])
  })
})

describe('clearConversation', () => {
  it('removes all messages for an itemId', async () => {
    await saveMessages(TEST_ITEM, [{ role: 'user', content: 'Hi' }])
    await clearConversation(TEST_ITEM)
    const loaded = await loadMessages(TEST_ITEM)
    expect(loaded).toEqual([])
  })
})
