import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Handlebars from 'handlebars'
import { useChatStore } from '@/stores/chatStore'
import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { unregisterCustomHelpers } from '@/lib/helper-loader'
import { handleChatRequest } from '@/lib/ai/chat-route'
import { loadMessages, clearConversation } from '@/lib/ai/conversation'

const {
  mockChat,
  mockExecuteToolCall,
  mockCreateProvider,
  mockPrintItemFindUnique,
  mockPrintItemUpdate,
  mockDataSetFindFirst,
  mockDataSetCreate,
  mockChatMessageFindMany,
  mockChatMessageCreate,
  mockChatMessageDeleteMany,
  mockTransaction,
  resetChatStore,
} = vi.hoisted(
  () => {
    const store: Record<number, unknown[]> = {}
    return {
      mockChat: vi.fn(),
      mockExecuteToolCall: vi.fn(),
      mockCreateProvider: vi.fn(),
      mockPrintItemFindUnique: vi.fn(),
      mockPrintItemUpdate: vi.fn(),
      mockDataSetFindFirst: vi.fn(),
      mockDataSetCreate: vi.fn(),
      mockChatMessageFindMany: vi.fn(({ where: { printItemId } }: { where: { printItemId: number } }) =>
        Promise.resolve(store[printItemId] ?? []),
      ),
      mockChatMessageCreate: vi.fn(({ data }: { data: { printItemId: number } }) => {
        const id = data.printItemId
        if (!store[id]) store[id] = []
        const msg = { id: store[id].length + 1, createdAt: new Date(), ...data }
        store[id].push(msg)
        return Promise.resolve(msg)
      }),
      mockChatMessageDeleteMany: vi.fn(({ where: { printItemId } }: { where: { printItemId: number } }) => {
        if (printItemId !== undefined) {
          const count = (store[printItemId] ?? []).length
          delete store[printItemId]
          return Promise.resolve({ count })
        }
        return Promise.resolve({ count: 0 })
      }),
      mockTransaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
      resetChatStore: () => { Object.keys(store).forEach(k => delete store[Number(k)]) },
    }
  },
)

vi.mock('@/lib/ai/registry', () => ({
  createProvider: mockCreateProvider,
}))

vi.mock('@/lib/ai/tool-loop', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/tool-loop')>(
    '@/lib/ai/tool-loop',
  )
  return {
    ...actual,
    executeToolCall: (...args: unknown[]) => mockExecuteToolCall(...args),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: {
      findUnique: (args: any) => mockPrintItemFindUnique(args),
      update: (args: any) => mockPrintItemUpdate(args),
    },
    dataSet: {
      findFirst: (args: any) => mockDataSetFindFirst(args),
      create: (args: any) => mockDataSetCreate(args),
    },
    chatMessage: {
      findMany: (args: any) => mockChatMessageFindMany(args),
      create: (args: any) => mockChatMessageCreate(args),
      deleteMany: (args: any) => mockChatMessageDeleteMany(args),
    },
    $transaction: (args: any) => mockTransaction(args),
  },
}))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function createMockSSEStream(
  events: Array<{ type: string; content?: string; data?: unknown }>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const chunks = events.map((e) => {
    switch (e.type) {
      case 'text':
        return `data: ${JSON.stringify({ type: 'text', content: e.content })}\n\n`
      case 'tool_call':
        return `data: ${JSON.stringify({ type: 'tool_call', data: e.data })}\n\n`
      case 'error':
        return `data: ${JSON.stringify({ type: 'error', data: e.content })}\n\n`
      case 'done':
        return 'data: {"type":"done","data":null}\n\n'
      default:
        return ''
    }
  })

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

async function readAllStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  reader.releaseLock()
  return result
}

beforeEach(() => {
  useChatStore.setState({
    itemId: null,
    messages: [],
    isStreaming: false,
    error: null,
  })
  useTemplateStore.setState({
    itemId: null,
    html: '',
    css: '',
    name: '',
    miscText: '',
    isSaving: false,
    lastSaved: null,
    error: null,
    version: 0,
  })
  usePreviewStore.setState({
    compiledHtml: '',
    isCompiling: false,
    compileError: null,
  })
  unregisterCustomHelpers()
  mockFetch.mockReset()

  mockPrintItemFindUnique.mockReset()
  mockPrintItemFindUnique.mockImplementation(({ where }) => {
    if (where.id === 42) {
      return Promise.resolve({
        id: 42, name: 'Test', html: '', css: '', version: 1, miscText: '{}',
      })
    }
    return Promise.resolve(null)
  })
  mockPrintItemUpdate.mockReset()
  mockPrintItemUpdate.mockImplementation(({ where, data }) =>
    Promise.resolve({ id: where.id, name: 'Test', html: data.html ?? '', css: data.css ?? '', version: data.version ?? 2 })
  )
  mockDataSetFindFirst.mockReset()
  mockDataSetFindFirst.mockResolvedValue(null)
  mockDataSetCreate.mockReset()
  resetChatStore()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// ChatStore sendMessage with SSE streaming
// ---------------------------------------------------------------------------
describe('ChatStore sendMessage with SSE streaming', () => {
  it('streams text events and builds the assistant message', async () => {
    useChatStore.getState().setItemId('42')

    const stream = createMockSSEStream([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' World' },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBeNull()
    expect(state.isStreaming).toBe(false)
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Hi' })
    expect(state.messages[1]).toEqual({ role: 'assistant', content: 'Hello World' })
  })

  it('toggles isStreaming during streaming lifecycle', async () => {
    useChatStore.getState().setItemId('42')

    const streamingStates: boolean[] = []
    const unsub = useChatStore.subscribe((state) => {
      streamingStates.push(state.isStreaming)
    })
    const stream = createMockSSEStream([
      { type: 'text', content: 'Hi' },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    expect(useChatStore.getState().isStreaming).toBe(false)
    await useChatStore.getState().sendMessage('Hello')
    unsub()

    expect(streamingStates.includes(true)).toBe(true)
    expect(streamingStates.includes(false)).toBe(true)
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('includes user message in the messages array after sendMessage', async () => {
    useChatStore.getState().setItemId('42')

    const stream = createMockSSEStream([
      { type: 'text', content: 'OK' },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Hello')

    const state = useChatStore.getState()
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Hello' })
    expect(state.messages[1]).toEqual({ role: 'assistant', content: 'OK' })
  })
})

// ---------------------------------------------------------------------------
// ChatStore sendMessage with tool calls
// ---------------------------------------------------------------------------
describe('ChatStore sendMessage with tool calls', () => {
  it('handles update_template tool_call and updates templateStore', async () => {
    useChatStore.getState().setItemId('42')
    useTemplateStore.setState({ itemId: 1 })

    const stream = createMockSSEStream([
      {
        type: 'tool_call',
        data: {
          id: 'call_1',
          name: 'update_template',
          args: { html: '<h1>{{title}}</h1>', css: 'h1 { color: red; }' },
        },
      },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Make title red')

    expect(useTemplateStore.getState().html).toBe('<h1>{{title}}</h1>')
    expect(useTemplateStore.getState().css).toBe('h1 { color: red; }')
    expect(useTemplateStore.getState().version).toBe(1)
  })

  it('triggers preview recompilation after update_template', async () => {
    useChatStore.getState().setItemId('42')
    useTemplateStore.setState({ itemId: 1 })

    const stream = createMockSSEStream([
      {
        type: 'tool_call',
        data: {
          id: 'call_1',
          name: 'update_template',
          args: { html: '<h1>{{title}}</h1>', css: '' },
        },
      },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Update template')

    expect(usePreviewStore.getState().compiledHtml).toBeTruthy()
    expect(usePreviewStore.getState().compiledHtml).toContain('<h1></h1>')
    expect(usePreviewStore.getState().isCompiling).toBe(false)
  })

  it('registers helper from register_helper tool_call', async () => {
    useChatStore.getState().setItemId('42')
    useTemplateStore.setState({ itemId: 1 })

    const stream = createMockSSEStream([
      {
        type: 'tool_call',
        data: {
          id: 'call_1',
          name: 'register_helper',
          args: { name: 'greet', params: ['name'], body: 'return `Hello, ${name}!`' },
        },
      },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Create a greet helper')

    const tpl = Handlebars.compile('{{greet "World"}}')
    expect(tpl({})).toBe('Hello, World!')
    expect(useTemplateStore.getState().miscText).toContain('greet')
  })

  it('appends tool_call messages to the messages array', async () => {
    useChatStore.getState().setItemId('42')

    const stream = createMockSSEStream([
      { type: 'text', content: 'Looking up the template' },
      {
        type: 'tool_call',
        data: { id: 'call_1', name: 'get_template', args: { itemId: '42' } },
      },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Get template')

    const state = useChatStore.getState()
    expect(state.messages).toHaveLength(3)
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Get template' })
    expect(state.messages[1]).toEqual({
      role: 'assistant',
      content: 'Looking up the template',
    })
    expect(state.messages[2]).toEqual({
      role: 'assistant',
      content: '',
      toolCalls: [
        { id: 'call_1', name: 'get_template', args: { itemId: '42' } },
      ],
    })
  })

  it('handles multiple tool calls sequentially', async () => {
    useChatStore.getState().setItemId('42')
    useTemplateStore.setState({ itemId: 1 })

    const stream = createMockSSEStream([
      {
        type: 'tool_call',
        data: {
          id: 'call_1',
          name: 'update_template',
          args: { html: '<p>v1</p>' },
        },
      },
      {
        type: 'tool_call',
        data: {
          id: 'call_2',
          name: 'update_template',
          args: { html: '<p>v2</p>', css: 'p { color: blue; }' },
        },
      },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Update twice')

    expect(useTemplateStore.getState().html).toBe('<p>v2</p>')
    expect(useTemplateStore.getState().css).toBe('p { color: blue; }')
    expect(useTemplateStore.getState().version).toBe(2)

    const state = useChatStore.getState()
    expect(state.messages).toHaveLength(3)
    expect(state.messages[1].toolCalls![0].name).toBe('update_template')
    expect(state.messages[2].toolCalls![0].name).toBe('update_template')
  })
})

// ---------------------------------------------------------------------------
// ChatStore sendMessage error handling
// ---------------------------------------------------------------------------
describe('ChatStore sendMessage error handling', () => {
  it('sets error state on non-ok HTTP response', async () => {
    useChatStore.getState().setItemId('42')
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('Chat request failed')
    expect(state.isStreaming).toBe(false)
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Hi' })
  })

  it('resets isStreaming on fetch rejection (network error)', async () => {
    useChatStore.getState().setItemId('42')
    mockFetch.mockRejectedValue(new Error('Network connection lost'))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('Network connection lost')
    expect(state.isStreaming).toBe(false)
    expect(state.messages).toHaveLength(1)
  })

  it('sets error when response body is null', async () => {
    useChatStore.getState().setItemId('42')
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('No response body')
    expect(state.isStreaming).toBe(false)
  })

  it('does nothing and sets error when itemId is null', async () => {
    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('No item selected')
    expect(state.isStreaming).toBe(false)
    expect(state.messages).toHaveLength(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// ChatStore sendMessage with SSE error event
// ---------------------------------------------------------------------------
describe('ChatStore sendMessage with SSE error event', () => {
  it('sets error from SSE error event data', async () => {
    useChatStore.getState().setItemId('42')

    const stream = createMockSSEStream([
      { type: 'text', content: 'Partial response' },
      { type: 'error', content: 'Rate limit exceeded. Try again later.' },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('Rate limit exceeded. Try again later.')
    expect(state.isStreaming).toBe(false)
  })

  it('sets error even without preceding text events', async () => {
    useChatStore.getState().setItemId('42')

    const stream = createMockSSEStream([
      { type: 'error', content: 'Server error occurred' },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('Server error occurred')
    expect(state.isStreaming).toBe(false)
    expect(state.messages).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Chat API route — handleChatRequest full flow
// ---------------------------------------------------------------------------
describe('Chat API route handleChatRequest', () => {
  beforeEach(async () => {
    mockChat.mockReset()
    mockExecuteToolCall.mockReset()
    mockCreateProvider.mockReset()
    mockCreateProvider.mockReturnValue({
      chat: mockChat,
      chatStream: vi.fn(),
      supportsToolCalling: vi.fn().mockReturnValue(true),
    })
    await clearConversation('42')
  })

  it('returns a ReadableStream', async () => {
    mockChat.mockResolvedValue({ role: 'assistant', content: 'OK' })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Hi' },
    ])

    expect(stream).toBeInstanceOf(ReadableStream)
  })

  it('emits text and done events for a simple text response', async () => {
    mockChat.mockResolvedValue({ role: 'assistant', content: 'Hello from AI' })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Hi' },
    ])

    const text = await readAllStream(stream)
    expect(text).toContain('"content":"Hello from AI"')
    expect(text).toContain('[DONE]')
  })

  it('emits tool_call events then text and done for a tool-calling response', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            name: 'get_template',
            args: { itemId: '42' },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'Here is the current template.',
      })
    mockExecuteToolCall.mockResolvedValue({
      toolCallId: 'call_1',
      result: { html: '<div>test</div>', css: '', name: 'Test' },
    })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Show template' },
    ])

    const text = await readAllStream(stream)
    expect(text).toContain('"type":"tool_call"')
    expect(text).toContain('"name":"get_template"')
    expect(text).toContain('Here is the current template.')
    expect(text).toContain('[DONE]')
    expect(mockChat).toHaveBeenCalledTimes(2)
    expect(mockExecuteToolCall).toHaveBeenCalledWith('42', {
      id: 'call_1',
      name: 'get_template',
      args: { itemId: '42' },
    })
  })

  it('emits tool_call events for multiple concurrent tool calls', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            name: 'get_template',
            args: { itemId: '42' },
          },
          {
            id: 'call_2',
            name: 'get_data_info',
            args: { itemId: '42' },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'Done with both.',
      })
    mockExecuteToolCall
      .mockResolvedValueOnce({
        toolCallId: 'call_1',
        result: { html: '<div>test</div>' },
      })
      .mockResolvedValueOnce({
        toolCallId: 'call_2',
        result: { columns: ['col1'], rowCount: 5 },
      })
    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Show everything' },
    ])

    const text = await readAllStream(stream)
    expect(text).toContain('get_template')
    expect(text).toContain('get_data_info')
    expect(text).toContain('Done with both.')
    expect(mockExecuteToolCall).toHaveBeenCalledTimes(2)
  })

  it('persists messages via saveMessages with full message history', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            name: 'get_template',
            args: { itemId: '42' },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'Final answer.',
      })
    mockExecuteToolCall.mockResolvedValue({
      toolCallId: 'call_1',
      result: { html: '<div>test</div>' },
    })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Start' },
    ])
    await readAllStream(stream)

    const saved = await loadMessages('42')
    expect(saved).toHaveLength(4)
    expect(saved[0]).toMatchObject({ role: 'user', content: 'Start' })
    expect(saved[1]).toMatchObject({ role: 'assistant' })
    expect(saved[2]).toMatchObject({ role: 'tool' })
    expect(saved[3]).toMatchObject({
      role: 'assistant',
      content: 'Final answer.',
    })
  })

  it('replaces conversation history instead of appending on subsequent save', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'First response.',
      })

    const stream1 = await handleChatRequest('42', [
      { role: 'user', content: 'Hello' },
    ])
    await readAllStream(stream1)

    const loaded = await loadMessages('42')
    expect(loaded).toHaveLength(2)

    mockChat.mockResolvedValueOnce({
      role: 'assistant',
      content: 'Second response.',
    })

    const stream2 = await handleChatRequest('42', [
      ...loaded,
      { role: 'user', content: 'How are you?' },
    ])
    await readAllStream(stream2)

    const final = await loadMessages('42')
    const contents = final.map((m) => `${m.role}:${m.content}`)
    expect(new Set(contents).size).toBe(contents.length)
    expect(final).toHaveLength(4)
  })

  it('calls provider.chat with tool definitions on each iteration', async () => {
    mockChat
      .mockResolvedValueOnce({
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            name: 'get_template',
            args: { itemId: '42' },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: 'Done.',
      })
    mockExecuteToolCall.mockResolvedValue({
      toolCallId: 'call_1',
      result: { html: '<div>test</div>' },
    })

    const stream = await handleChatRequest('42', [{ role: 'user', content: 'Go' }])
    await readAllStream(stream)

    for (const call of mockChat.mock.calls) {
      const messages = call[0]
      const tools = call[1]
      expect(Array.isArray(messages)).toBe(true)
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.some((t: { function: { name: string } }) => t.function.name === 'get_template')).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Chat API route — handleChatRequest error handling
// ---------------------------------------------------------------------------
describe('Chat API route error handling', () => {
  beforeEach(() => {
    mockChat.mockReset()
    mockExecuteToolCall.mockReset()
    mockCreateProvider.mockReset()
  })

  it('returns error event when createProvider throws', async () => {
    mockCreateProvider.mockImplementation(() => {
      throw new Error('LLM_PROVIDER environment variable is not set')
    })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Hi' },
    ])

    const text = await readAllStream(stream)
    expect(text).toContain('"type":"error"')
    expect(text).toContain('LLM_PROVIDER environment variable is not set')
    expect(text).toContain('[DONE]')
  })

  it('returns error event when provider.chat throws', async () => {
    mockCreateProvider.mockReturnValue({
      chat: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
      chatStream: vi.fn(),
      supportsToolCalling: vi.fn().mockReturnValue(true),
    })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Hi' },
    ])

    const text = await readAllStream(stream)
    expect(text).toContain('"type":"error"')
    expect(text).toContain('API rate limit exceeded')
    expect(text).toContain('[DONE]')
  })

  it('returns error event when executeToolCall throws', async () => {
    mockCreateProvider.mockReturnValue({
      chat: mockChat,
      chatStream: vi.fn(),
      supportsToolCalling: vi.fn().mockReturnValue(true),
    })
    mockChat.mockResolvedValue({
      role: 'assistant',
      content: '',
      toolCalls: [
        { id: 'call_1', name: 'get_template', args: { itemId: '42' } },
      ],
    })
    mockExecuteToolCall.mockRejectedValue(new Error('Database connection failed'))

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Get template' },
    ])

    const text = await readAllStream(stream)
    expect(text).toContain('"type":"error"')
    expect(text).toContain('Database connection failed')
    expect(text).toContain('[DONE]')
  })

  it('includes a done event after the error event', async () => {
    mockCreateProvider.mockImplementation(() => {
      throw new Error('Missing env')
    })

    const stream = await handleChatRequest('42', [
      { role: 'user', content: 'Hi' },
    ])

    const text = await readAllStream(stream)
    const errorIndex = text.indexOf('error')
    const doneIndex = text.indexOf('[DONE]')
    expect(errorIndex).toBeGreaterThanOrEqual(0)
    expect(doneIndex).toBeGreaterThan(errorIndex)
  })
})
