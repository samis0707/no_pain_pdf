import { AiProvider } from '../provider'
import { ChatMessage, ProviderConfig } from '../types'

function convertTool(tool: unknown): Record<string, unknown> {
  const openaiTool = tool as { type?: string; function?: { name: string; description?: string; parameters?: Record<string, unknown> } }
  if (openaiTool?.function) {
    return {
      name: openaiTool.function.name,
      description: openaiTool.function.description || '',
      input_schema: openaiTool.function.parameters || { type: 'object', properties: {} },
    }
  }
  return tool as Record<string, unknown>
}

export class AnthropicProvider extends AiProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  supportsToolCalling(): boolean {
    return true
  }

  async chat(messages: ChatMessage[], tools?: unknown[]): Promise<ChatMessage> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1'
      const systemMessages = messages.filter(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const body: Record<string, unknown> = {
        model: this.config.model,
        system: systemMessages.map(m => m.content).join('\n') || undefined,
        messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
      }

      if (tools && tools.length > 0) {
        body.tools = tools.map(convertTool)
      }

      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        return { role: 'assistant', content: `Error: API responded with status ${response.status}` }
      }

      const data = await response.json() as { content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> }
      const textBlock = data.content?.find((c) => c.type === 'text')
      const text = textBlock?.text || ''
      const toolUseBlocks = data.content?.filter((c) => c.type === 'tool_use')
      const toolCalls = toolUseBlocks?.map((tc) => ({
        id: tc.id || '',
        name: tc.name || '',
        args: tc.input || {},
      }))
      return { role: 'assistant', content: text, toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined }
    } catch (error) {
      return {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  async *chatStream(messages: ChatMessage[], tools?: unknown[]): AsyncGenerator<string> {
    try {
      const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1'
      const systemMessages = messages.filter(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const body: Record<string, unknown> = {
        model: this.config.model,
        system: systemMessages.map(m => m.content).join('\n') || undefined,
        messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
        stream: true,
      }

      if (tools && tools.length > 0) {
        body.tools = tools.map(convertTool)
      }

      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
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
