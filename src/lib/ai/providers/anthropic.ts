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

function formatMessages(messages: ChatMessage[]): { system: string | undefined; formatted: Record<string, unknown>[] } {
  let systemStr: string | undefined
  const formatted: Record<string, unknown>[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemStr = systemStr
        ? `${systemStr}\n${msg.content}`
        : msg.content
      continue
    }

    if (msg.role === 'assistant') {
      const contentBlocks: Record<string, unknown>[] = []
      if (msg.content) {
        contentBlocks.push({ type: 'text', text: msg.content })
      }
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          contentBlocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.args,
          })
        }
      }
      if (contentBlocks.length === 0) {
        contentBlocks.push({ type: 'text', text: '' })
      }
      formatted.push({ role: 'assistant', content: contentBlocks })
    } else if (msg.role === 'tool') {
      formatted.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.toolCallId || '',
            content: msg.content,
          },
        ],
      })
    } else {
      formatted.push({ role: msg.role, content: msg.content })
    }
  }

  return { system: systemStr, formatted }
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
      let { system, formatted } = formatMessages(messages)

      const body: Record<string, unknown> = {
        model: this.config.model,
        messages: formatted,
        max_tokens: 8192,
      }

      if (system) {
        body.system = system
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
        const errBody = await response.text().catch(() => '')
        return { role: 'assistant', content: `Error: API responded with status ${response.status} - ${errBody}` }
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
      let { system, formatted } = formatMessages(messages)

      const body: Record<string, unknown> = {
        model: this.config.model,
        messages: formatted,
        max_tokens: 8192,
        stream: true,
      }

      if (system) {
        body.system = system
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
        const errBody = await response.text().catch(() => '')
        yield `Error: API responded with status ${response.status} - ${errBody}`
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
