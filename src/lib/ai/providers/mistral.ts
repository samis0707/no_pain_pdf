import { AiProvider } from '../provider'
import { ChatMessage, ProviderConfig } from '../types'

export class MistralProvider extends AiProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  supportsToolCalling(): boolean {
    return true
  }

  async chat(messages: ChatMessage[], _tools?: unknown[]): Promise<ChatMessage> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.mistral.ai/v1'
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
        }),
      })

      if (!response.ok) {
        return { role: 'assistant', content: `Error: API responded with status ${response.status}` }
      }

      const data = await response.json() as { choices: Array<{ message: { role: string; content: string } }> }
      const choice = data.choices?.[0]
      return {
        role: 'assistant',
        content: choice?.message?.content || '',
      }
    } catch (error) {
      return {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  async *chatStream(messages: ChatMessage[], _tools?: unknown[]): AsyncGenerator<string> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.mistral.ai/v1'
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
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
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> }
            const content = parsed.choices?.[0]?.delta?.content
            if (content) yield content
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
