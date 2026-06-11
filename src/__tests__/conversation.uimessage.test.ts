import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDeleteMany, mockCreate, mockFindMany, mockTransaction } = vi.hoisted(() => ({
  mockDeleteMany: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockTransaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatMessage: {
      deleteMany: mockDeleteMany,
      create: mockCreate,
      findMany: mockFindMany,
    },
    $transaction: mockTransaction,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (ops: unknown[]) => ops)
})

describe('saveUIMessages', () => {
  it('persists parts losslessly and derives content for back-compat', async () => {
    const { saveUIMessages } = await import('@/lib/ai/conversation')

    await saveUIMessages('7', [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'make it blue' }] },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          {
            type: 'tool-update_template',
            toolCallId: 'tc1',
            state: 'output-available',
            input: { css: 'h1{color:blue}' },
            output: { version: 2 },
          },
          { type: 'text', text: 'Done — heading is blue now.' },
        ],
      },
    ] as never)

    expect(mockCreate).toHaveBeenCalledTimes(2)
    const userRow = mockCreate.mock.calls[0][0].data
    expect(userRow.role).toBe('user')
    expect(userRow.content).toBe('make it blue')
    expect(JSON.parse(userRow.parts)).toEqual([{ type: 'text', text: 'make it blue' }])

    const assistantRow = mockCreate.mock.calls[1][0].data
    expect(assistantRow.content).toBe('Done — heading is blue now.')
    expect(JSON.parse(assistantRow.parts)).toHaveLength(3)
  })
})

describe('loadUIMessages', () => {
  it('returns stored parts when present', async () => {
    const { loadUIMessages } = await import('@/lib/ai/conversation')
    mockFindMany.mockResolvedValue([
      {
        id: 1,
        role: 'user',
        content: 'hi',
        parts: JSON.stringify([{ type: 'text', text: 'hi' }]),
        toolCalls: '[]',
        attachments: '{}',
      },
    ])

    const messages = await loadUIMessages('7')

    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].parts).toEqual([{ type: 'text', text: 'hi' }])
  })

  it('converts legacy rows (no parts) into text-part messages and skips tool rows', async () => {
    const { loadUIMessages } = await import('@/lib/ai/conversation')
    mockFindMany.mockResolvedValue([
      { id: 1, role: 'user', content: 'old question', parts: '[]', toolCalls: '[]', attachments: '{}' },
      { id: 2, role: 'tool', content: '{"ok":true}', parts: '[]', toolCalls: '[]', attachments: '{}' },
      { id: 3, role: 'assistant', content: 'old answer', parts: '[]', toolCalls: '[]', attachments: '{}' },
      { id: 4, role: 'assistant', content: '', parts: '[]', toolCalls: '[{"id":"x","name":"y"}]', attachments: '{}' },
    ])

    const messages = await loadUIMessages('7')

    expect(messages).toHaveLength(2)
    expect(messages[0].parts).toEqual([{ type: 'text', text: 'old question' }])
    expect(messages[1].parts).toEqual([{ type: 'text', text: 'old answer' }])
  })
})
