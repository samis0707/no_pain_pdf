export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  label?: string
}

export interface ToolResult {
  toolCallId: string
  result: unknown
  /** Vision payloads (e.g. rendered preview pages), kept out of the JSON result. */
  images?: Array<{ mimeType: string; data: string }>
}

export interface ChatMessage {
  role: string
  content: string
  id?: string
  version?: number
  toolCalls?: ToolCall[]
  toolCallId?: string
  attachments?: Array<{ mimeType: string; data: string }>
  /** Images attached to a tool result message for vision-capable models. */
  images?: Array<{ mimeType: string; data: string }>
}

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}
