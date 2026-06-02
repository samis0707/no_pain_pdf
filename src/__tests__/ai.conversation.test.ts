import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveMessages,
  loadMessages,
  clearConversation,
  type ChatMessage,
} from '@/lib/ai/conversation'

const mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 })
const mockCreate = vi.fn().mockResolvedValue({ id: 1 })
const mockFindMany = vi.fn().mockResolvedValue([])

vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatMessage: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    $transaction: (actions: any[]) => Promise.all(actions),
  },
}))

const TEST_ITEM = '42'

beforeEach(() => {
  vi.clearAllMocks()
  mockDeleteMany.mockResolvedValue({ count: 0 })
  mockCreate.mockResolvedValue({ id: 1 })
  mockFindMany.mockResolvedValue([])
})

describe('saveMessages', () => {
  it('stores messages for a given itemId', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]
    mockFindMany.mockResolvedValue([
      { role: 'user', content: 'Hello', toolCalls: '[]', attachments: '{}' },
      { role: 'assistant', content: 'Hi there!', toolCalls: '[]', attachments: '{}' },
    ])
    await saveMessages(TEST_ITEM, messages)
    const loaded = await loadMessages(TEST_ITEM)
    expect(loaded).toEqual(messages)
  })

  it('replaces existing messages on subsequent save (caller provides full history)', async () => {
    mockFindMany.mockResolvedValue([
      { role: 'user', content: 'Second', toolCalls: '[]', attachments: '{}' },
    ])
    await saveMessages(TEST_ITEM, [{ role: 'user', content: 'First' }])
    await saveMessages(TEST_ITEM, [{ role: 'user', content: 'Second' }])
    const loaded = await loadMessages(TEST_ITEM)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('Second')
  })
})

describe('loadMessages', () => {
  it('retrieves messages that were saved', async () => {
    const msgs: ChatMessage[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hi' },
    ]
    mockFindMany.mockResolvedValue([
      { role: 'system', content: 'You are helpful', toolCalls: '[]', attachments: '{}' },
      { role: 'user', content: 'Hi', toolCalls: '[]', attachments: '{}' },
    ])
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
