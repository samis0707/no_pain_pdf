import { describe, it, expect } from 'vitest'
import { createSSEReader, type SSEEvent } from '@/lib/ai/sse-reader'

function createMockStream(chunks: string[]): ReadableStream {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe('createSSEReader', () => {
  it('reads text events from a ReadableStream', async () => {
    const stream = createMockStream([
      'data: {"type":"text","data":"Hello"}\n\n',
      'data: {"type":"text","data":" World"}\n\n',
      'data: {"type":"done","data":null}\n\n',
    ])
    const events: SSEEvent[] = []
    const reader = createSSEReader(stream)
    for await (const event of reader) {
      events.push(event)
    }
    expect(events).toHaveLength(3)
    expect(events[0].type).toBe('text')
    expect(events[0].data).toBe('Hello')
    expect(events[2].type).toBe('done')
  })

  it('reads tool call events', async () => {
    const stream = createMockStream([
      'data: {"type":"tool_call","data":{"id":"call_1","name":"get_template","args":{"itemId":"123"}}}\n\n',
      'data: {"type":"done","data":null}\n\n',
    ])
    const events: SSEEvent[] = []
    const reader = createSSEReader(stream)
    for await (const event of reader) {
      events.push(event)
    }
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('tool_call')
    expect((events[0].data as any).name).toBe('get_template')
  })

  it('emits a done event when stream ends', async () => {
    const stream = createMockStream([
      'data: {"type":"text","data":"Hello"}\n\n',
      'data: {"type":"done","data":null}\n\n',
    ])
    const reader = createSSEReader(stream)
    const events: SSEEvent[] = []
    for await (const event of reader) {
      events.push(event)
    }
    expect(events[events.length - 1].type).toBe('done')
  })

  it('emits an error event on parse failure', async () => {
    const stream = createMockStream([
      'data: not valid json\n\n',
      'data: {"type":"done","data":null}\n\n',
    ])
    const reader = createSSEReader(stream)
    const events: SSEEvent[] = []
    for await (const event of reader) {
      events.push(event)
    }
    expect(events[0].type).toBe('error')
  })
})
