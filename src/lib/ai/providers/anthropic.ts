import { AiProvider } from '../provider'
import { ChatMessage, ProviderConfig } from '../types'

export class AnthropicProvider extends AiProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  supportsToolCalling(): boolean {
    return true
  }

  async chat(messages: ChatMessage[], _tools?: unknown[]): Promise<ChatMessage> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1'
      const systemMessages = messages.filter(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          system: systemMessages.map(m => m.content).join('\n') || undefined,
          messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
        }),
      })

      if (!response.ok) {
        return { role: 'assistant', content: `Error: API responded with status ${response.status}` }
      }

      const data = await response.json() as { content: Array<{ text: string }> }
      const text = data.content?.[0]?.text || ''
      return { role: 'assistant', content: text }
    } catch (error) {
      return {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  async *chatStream(messages: ChatMessage[], _tools?: unknown[]): AsyncGenerator<string> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1'
      const systemMessages = messages.filter(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          system: systemMessages.map(m => m.content).join('\n') || undefined,
          messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
          stream: true,
        }),
      })

      if (!response.ok) {
        yield `Error: API responded with status ${response.status}`
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        yield 'Error: No response body'
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          try {
            const parsed = JSON.parse(data) as { type: string; delta?: { text?: string } }
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (error) {
      yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
