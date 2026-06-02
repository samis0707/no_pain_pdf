export function formatTextEvent(content: string): string {
  const data = JSON.stringify({ type: 'text', content })
  return `event: message\ndata: ${data}\n\n`
}

export function formatToolCallEvent(tool: string, args: Record<string, unknown>, id?: string): string {
  const data = JSON.stringify({ type: 'tool_call', id, name: tool, args })
  return `event: message\ndata: ${data}\n\n`
}

export function formatStreamEnd(id: string): string {
  const data = JSON.stringify({ id })
  return `event: done\ndata: ${data}\n\n`
}

export function formatErrorEvent(content: string): string {
  const data = JSON.stringify({ type: 'error', content })
  return `event: error\ndata: ${data}\n\n`
}
