export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  label?: string
}

export interface ToolResult {
  toolCallId: string
  result: unknown
}

export interface ChatMessage {
  role: string
  content: string
  id?: string
  version?: number
  toolCalls?: ToolCall[]
  toolCallId?: string
}

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}
