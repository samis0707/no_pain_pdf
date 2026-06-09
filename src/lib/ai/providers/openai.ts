import { AiProvider } from '../provider'
import { ChatMessage, ProviderConfig } from '../types'

function formatMessages(messages: ChatMessage[]): Record<string, unknown>[] {
  return messages.map((msg) => {
    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args),
          },
        })),
      }
    }
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId || '',
        content: msg.content,
      }
    }
    if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
      const content: Array<Record<string, unknown>> = [
        { type: 'text', text: msg.content },
      ]
      for (const att of msg.attachments) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:${att.mimeType};base64,${att.data}` },
        })
      }
      return { role: 'user', content }
    }
    return { role: msg.role, content: msg.content }
  })
}

export class OpenAIProvider extends AiProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  supportsToolCalling(): boolean {
    return true
  }

  async chat(messages: ChatMessage[], tools?: unknown[]): Promise<ChatMessage> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1'
      const body: Record<string, unknown> = {
        model: this.config.model,
        messages: formatMessages(messages),
      }
      if (tools && tools.length > 0) {
        body.tools = tools
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        return { role: 'assistant', content: `Error: API responded with status ${response.status}: ${errBody}` }
      }

      const data = await response.json() as { choices: Array<{ message: { role: string; content: string; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> } }> }
      const choice = data.choices?.[0]
      const message = choice?.message
      const toolCalls = message?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
      }))
      return {
        role: 'assistant',
        content: message?.content || '',
        toolCalls,
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
      const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1'
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: formatMessages(messages),
          stream: true,
        }),
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        yield `Error: API responded with status ${response.status}: ${errBody}`
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
