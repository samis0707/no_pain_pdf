export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  result: unknown
}

export interface ChatMessage {
  role: string
  content: string
  toolCalls?: ToolCall[]
}

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}
