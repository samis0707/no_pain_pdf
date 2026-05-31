import { AiProvider } from '../provider'
import { ChatMessage, ProviderConfig } from '../types'

export class GoogleProvider extends AiProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  supportsToolCalling(): boolean {
    return true
  }

  async chat(messages: ChatMessage[]): Promise<ChatMessage> {
    try {
      const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
      const systemMessages = messages.filter(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const contents = nonSystemMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const response = await fetch(
        `${baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: systemMessages.length > 0
              ? { parts: [{ text: systemMessages.map(m => m.content).join('\n') }] }
              : undefined,
            contents,
          }),
        },
      )

      if (!response.ok) {
        return { role: 'assistant', content: `Error: API responded with status ${response.status}` }
      }

      const data = await response.json() as {
        candidates: Array<{
          content: { parts: Array<{ text: string }> }
        }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
      const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
      const systemMessages = messages.filter(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const contents = nonSystemMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const response = await fetch(
        `${baseUrl}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: systemMessages.length > 0
              ? { parts: [{ text: systemMessages.map(m => m.content).join('\n') }] }
              : undefined,
            contents,
          }),
        },
      )

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
            const parsed = JSON.parse(data) as {
              candidates?: Array<{
                content: { parts: Array<{ text: string }> }
              }>
            }
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) yield text
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
