import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnthropicProvider } from '@/lib/ai/providers/anthropic'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import type { ChatMessage } from '@/lib/ai/types'

const mockFetch = vi.fn()
global.fetch = mockFetch

const CONFIG = { apiKey: 'test-key', model: 'test-model' }

const IMAGE = { mimeType: 'image/jpeg', data: 'cGFnZTE=' }

const TOOL_MESSAGE_WITH_IMAGES: ChatMessage = {
  role: 'tool',
  content: '{"pageCount":1,"truncated":false}',
  toolCallId: 'tc_1',
  images: [IMAGE],
}

const ASSISTANT_TOOL_CALL: ChatMessage = {
  role: 'assistant',
  content: '',
  toolCalls: [{ id: 'tc_1', name: 'render_preview', args: {} }],
}

function anthropicOk() {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

function openaiOk() {
  mockFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AnthropicProvider image handling', () => {
  it('formats tool messages with images as tool_result blocks containing image blocks', async () => {
    anthropicOk()
    const provider = new AnthropicProvider(CONFIG)

    await provider.chat([
      { role: 'user', content: 'render it' },
      ASSISTANT_TOOL_CALL,
      TOOL_MESSAGE_WITH_IMAGES,
    ])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const toolResultMsg = body.messages.find(
      (m: { content?: Array<{ type: string }> }) =>
        Array.isArray(m.content) && m.content.some((c) => c.type === 'tool_result')
    )
    const toolResult = toolResultMsg.content.find(
      (c: { type: string }) => c.type === 'tool_result'
    )
    expect(toolResult.tool_use_id).toBe('tc_1')
    // content must be a block array: text JSON + the rendered page image
    const blocks = toolResult.content as Array<Record<string, unknown>>
    expect(Array.isArray(blocks)).toBe(true)
    const imageBlock = blocks.find((b) => b.type === 'image') as {
      source: { type: string; media_type: string; data: string }
    }
    expect(imageBlock.source).toEqual({
      type: 'base64',
      media_type: 'image/jpeg',
      data: 'cGFnZTE=',
    })
    const textBlock = blocks.find((b) => b.type === 'text') as { text: string }
    expect(textBlock.text).toContain('pageCount')
  })

  it('keeps plain-string tool_result content for tool messages without images', async () => {
    anthropicOk()
    const provider = new AnthropicProvider(CONFIG)

    await provider.chat([
      ASSISTANT_TOOL_CALL,
      { role: 'tool', content: '{"ok":true}', toolCallId: 'tc_1' },
    ])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const toolResult = body.messages
      .flatMap((m: { content: unknown }) => (Array.isArray(m.content) ? m.content : []))
      .find((c: { type: string }) => c.type === 'tool_result')
    expect(toolResult.content).toBe('{"ok":true}')
  })

  it('formats user attachments as image content blocks', async () => {
    anthropicOk()
    const provider = new AnthropicProvider(CONFIG)

    await provider.chat([
      { role: 'user', content: 'match this style', attachments: [IMAGE] },
    ])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userMsg = body.messages[0]
    expect(Array.isArray(userMsg.content)).toBe(true)
    const imageBlock = userMsg.content.find((c: { type: string }) => c.type === 'image')
    expect(imageBlock.source.data).toBe('cGFnZTE=')
    const textBlock = userMsg.content.find((c: { type: string }) => c.type === 'text')
    expect(textBlock.text).toBe('match this style')
  })
})

describe('OpenAIProvider image handling', () => {
  it('injects a synthetic user message with image parts after an image-bearing tool result', async () => {
    openaiOk()
    const provider = new OpenAIProvider(CONFIG)

    await provider.chat([
      { role: 'user', content: 'render it' },
      ASSISTANT_TOOL_CALL,
      TOOL_MESSAGE_WITH_IMAGES,
    ])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const toolIdx = body.messages.findIndex(
      (m: { role: string }) => m.role === 'tool'
    )
    // tool message itself stays text-only
    expect(typeof body.messages[toolIdx].content).toBe('string')
    // followed by a synthetic user message carrying the images
    const synthetic = body.messages[toolIdx + 1]
    expect(synthetic.role).toBe('user')
    const imagePart = synthetic.content.find(
      (c: { type: string }) => c.type === 'image_url'
    )
    expect(imagePart.image_url.url).toBe('data:image/jpeg;base64,cGFnZTE=')
  })

  it('does not inject synthetic messages for tool results without images', async () => {
    openaiOk()
    const provider = new OpenAIProvider(CONFIG)

    await provider.chat([
      ASSISTANT_TOOL_CALL,
      { role: 'tool', content: '{"ok":true}', toolCallId: 'tc_1' },
    ])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const lastMsg = body.messages[body.messages.length - 1]
    expect(lastMsg.role).toBe('tool')
    expect(body.messages.filter((m: { role: string }) => m.role === 'user')).toHaveLength(0)
  })
})
