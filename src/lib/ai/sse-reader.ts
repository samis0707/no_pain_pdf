export type SSEEvent =
  | { type: 'text'; data: string }
  | { type: 'tool_call'; data: { id: string; name: string; args: Record<string, unknown> } }
  | { type: 'done'; data: null }
  | { type: 'error'; data: string }

export async function* createSSEReader(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''

      for (const part of parts) {
        const lines = part.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.slice(6)
          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.type === 'text') {
              yield { type: 'text', data: parsed.content ?? parsed.data }
            } else if (parsed.type === 'tool_call') {
              yield { type: 'tool_call', data: parsed.data ?? parsed }
            } else if (parsed.type === 'done' || parsed.type === undefined && parsed.id) {
              yield { type: 'done', data: null }
            } else if (parsed.type === 'error') {
              yield { type: 'error', data: parsed.content ?? parsed.data }
            } else {
              yield { type: 'error', data: 'Unknown event type' }
            }
          } catch {
            if (dataStr === '[DONE]') {
              yield { type: 'done', data: null }
              continue
            }
            yield { type: 'error', data: dataStr }
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
