import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Handlebars from 'handlebars'
import { useChatStore, type ChatMessage } from '@/stores/chatStore'
import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { unregisterCustomHelpers } from '@/lib/helper-loader'

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

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      itemId: null,
      messages: [],
      isStreaming: false,
      error: null,
    })
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('setItemId updates the itemId in state', () => {
    useChatStore.getState().setItemId('item-1')
    expect(useChatStore.getState().itemId).toBe('item-1')
  })

  it('addMessage appends a message to the messages array', () => {
    const msg: ChatMessage = { role: 'user', content: 'Hello' }
    useChatStore.getState().addMessage(msg)
    expect(useChatStore.getState().messages).toHaveLength(1)
    expect(useChatStore.getState().messages[0]).toEqual(msg)
  })

  it('setMessages replaces all messages', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'first' })
    useChatStore.getState().addMessage({ role: 'assistant', content: 'second' })

    const replacement: ChatMessage[] = [
      { role: 'user', content: 'new1' },
      { role: 'assistant', content: 'new2' },
      { role: 'user', content: 'new3' },
    ]
    useChatStore.getState().setMessages(replacement)
    expect(useChatStore.getState().messages).toHaveLength(3)
    expect(useChatStore.getState().messages).toEqual(replacement)
  })

  it('setStreaming updates the isStreaming flag', () => {
    expect(useChatStore.getState().isStreaming).toBe(false)
    useChatStore.getState().setStreaming(true)
    expect(useChatStore.getState().isStreaming).toBe(true)
    useChatStore.getState().setStreaming(false)
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('setError updates the error state', () => {
    useChatStore.getState().setError('Something went wrong')
    expect(useChatStore.getState().error).toBe('Something went wrong')
    useChatStore.getState().setError(null)
    expect(useChatStore.getState().error).toBeNull()
  })

  it('clearMessages removes all messages and error', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'Hello' })
    useChatStore.getState().addMessage({ role: 'assistant', content: 'Hi' })
    useChatStore.getState().setError('some error')

    useChatStore.getState().clearMessages()

    expect(useChatStore.getState().messages).toHaveLength(0)
    expect(useChatStore.getState().error).toBeNull()
  })

  it('sendMessage does nothing and sets error when itemId is null', async () => {
    await useChatStore.getState().sendMessage('Hello')
    expect(useChatStore.getState().error).toBe('No item selected')
    expect(useChatStore.getState().messages).toHaveLength(0)
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('sendMessage posts to the chat API and updates messages on SSE stream', async () => {
    useChatStore.getState().setItemId('item-1')

    const stream = createMockSSEStream([
      { type: 'text', content: 'Hello from AI' },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(
      new Response(stream, { status: 200 }),
    )

    await useChatStore.getState().sendMessage('Hi')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'item-1',
        message: { role: 'user', content: 'Hi' },
      }),
    })

    const state = useChatStore.getState()
    expect(state.error).toBeNull()
    expect(state.isStreaming).toBe(false)
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0]).toEqual({ role: 'user', content: 'Hi' })
    expect(state.messages[1]).toEqual({ role: 'assistant', content: 'Hello from AI' })
  })

  it('sendMessage handles tool_call SSE events', async () => {
    useChatStore.getState().setItemId('item-1')

    const stream = createMockSSEStream([
      { type: 'text', content: 'Let me look that up' },
      {
        type: 'tool_call',
        data: { id: 'call_1', name: 'get_template', args: { itemId: 'item-1' } },
      },
      { type: 'done' },
    ])
    mockFetch.mockResolvedValue(
      new Response(stream, { status: 200 }),
    )

    await useChatStore.getState().sendMessage('What template?')

    const state = useChatStore.getState()
    expect(state.error).toBeNull()
    expect(state.messages).toHaveLength(3)
    expect(state.messages[0]).toEqual({ role: 'user', content: 'What template?' })
    expect(state.messages[1]).toEqual({
      role: 'assistant',
      content: 'Let me look that up',
    })
    expect(state.messages[2]).toEqual({
      role: 'assistant',
      content: '',
      toolCalls: [{ id: 'call_1', name: 'get_template', args: { itemId: 'item-1' }, label: 'Prüfe Design...' }],
    })
  })

  it('sendMessage sets error on fetch failure', async () => {
    useChatStore.getState().setItemId('item-1')
    mockFetch.mockRejectedValue(new Error('Network error'))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.isStreaming).toBe(false)
  })

  it('sendMessage sets error on non-ok response', async () => {
    useChatStore.getState().setItemId('item-1')
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

    await useChatStore.getState().sendMessage('Hi')

    const state = useChatStore.getState()
    expect(state.error).toBe('Chat request failed')
    expect(state.isStreaming).toBe(false)
  })

  describe('auto-apply flow', () => {
    beforeEach(() => {
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
    })

    it('applies html from update_template tool_call to templateStore', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ itemId: 1 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'update_template', args: { html: '<h1>{{title}}</h1>' } },
        },
        { type: 'done' },
      ])
      mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

      await useChatStore.getState().sendMessage('Change title')

      expect(useTemplateStore.getState().html).toBe('<h1>{{title}}</h1>')
    })

    it('applies css from update_template tool_call to templateStore', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ itemId: 1 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'update_template', args: { css: 'h1 { color: red; }' } },
        },
        { type: 'done' },
      ])
      mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

      await useChatStore.getState().sendMessage('Make it red')

      expect(useTemplateStore.getState().css).toBe('h1 { color: red; }')
    })

    it('increments version on update_template tool_call', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ itemId: 1 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'update_template', args: { html: '<h1>v1</h1>' } },
        },
        {
          type: 'tool_call',
          data: { id: 'call_2', name: 'update_template', args: { html: '<h1>v2</h1>' } },
        },
        { type: 'done' },
      ])
      mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

      await useChatStore.getState().sendMessage('Change twice')

      expect(useTemplateStore.getState().version).toBe(2)
      expect(useTemplateStore.getState().html).toBe('<h1>v2</h1>')
    })

    it('triggers preview recompilation after update_template', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ itemId: 1 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'update_template', args: { html: '<h1>{{title}}</h1>', css: '' } },
        },
        { type: 'done' },
      ])
      mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

      await useChatStore.getState().sendMessage('Update')

      expect(usePreviewStore.getState().compiledHtml).toBeTruthy()
      expect(usePreviewStore.getState().compiledHtml).toContain('<h1></h1>')
    })

    it('registers helpers from register_helper tool_call', async () => {
      useChatStore.getState().setItemId('item-1')
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

      await useChatStore.getState().sendMessage('Create helper')

      const tpl = Handlebars.compile('{{greet "World"}}')
      expect(tpl({})).toBe('Hello, World!')
    })

    it('does not auto-apply for non-mutating tool calls like get_template', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ html: '<p>original</p>', version: 5 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'get_template', args: {} },
        },
        { type: 'done' },
      ])
      mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

      await useChatStore.getState().sendMessage('Get template')

      expect(useTemplateStore.getState().html).toBe('<p>original</p>')
      expect(useTemplateStore.getState().version).toBe(5)
    })

    it('handles multiple tool calls with mixed types correctly', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ itemId: 1 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'get_data_info', args: {} },
        },
        {
          type: 'tool_call',
          data: { id: 'call_2', name: 'update_template', args: { html: '<p>changed</p>' } },
        },
        { type: 'done' },
      ])
      mockFetch.mockResolvedValue(new Response(stream, { status: 200 }))

      await useChatStore.getState().sendMessage('Update template')

      expect(useTemplateStore.getState().html).toBe('<p>changed</p>')
      expect(useTemplateStore.getState().version).toBe(1)
    })

    it('persists changes to DB via saveTemplate after update_template', async () => {
      useChatStore.getState().setItemId('item-1')
      useTemplateStore.setState({ itemId: 1 })

      const stream = createMockSSEStream([
        {
          type: 'tool_call',
          data: { id: 'call_1', name: 'update_template', args: { html: '<h1>Saved</h1>', css: '' } },
        },
        { type: 'done' },
      ])
      const sseResponse = new Response(stream, { status: 200 })
      mockFetch.mockImplementation((url: string | URL | Request) => {
        if (url.toString().includes('/api/ai/chat')) {
          return Promise.resolve(sseResponse)
        }
        return Promise.resolve(
          new Response(JSON.stringify({ version: 2, pageFormat: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      })

      await useChatStore.getState().sendMessage('Save')

      const template = useTemplateStore.getState()
      expect(template.lastSaved).not.toBeNull()
      expect(template.html).toBe('<h1>Saved</h1>')
    })
  })
})
