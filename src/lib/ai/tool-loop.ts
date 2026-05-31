import { ChatMessage, ToolCall, ToolResult } from './types'
import { createProvider } from './registry'
import {
  getTemplate,
  updateTemplate,
  getDataInfo,
  analyzeData,
  renderPreview,
  getAssets,
  registerHelper,
  getData,
  updateData,
  getHelpers,
} from './tools'

type ToolHandler = (itemId: string, args: Record<string, unknown>) => Promise<unknown>

const toolHandlers: Record<string, ToolHandler> = {
  get_template: (itemId) => getTemplate(itemId),
  update_template: (itemId, args) =>
    updateTemplate(itemId, args.html as string | undefined, args.css as string | undefined),
  get_data_info: (itemId) => getDataInfo(itemId),
  analyze_data: (itemId) => analyzeData(itemId),
  render_preview: (itemId) => renderPreview(itemId),
  get_assets: (itemId) => getAssets(itemId),
  register_helper: (itemId, args) =>
    registerHelper(
      itemId,
      args.name as string,
      args.params as string[],
      args.body as string,
    ),
  get_data: (itemId) => getData(itemId),
  update_data: (itemId, args) =>
    updateData(itemId, args.rows as Record<string, unknown>[]),
  get_helpers: () => getHelpers(),
}

export async function executeToolCall(itemId: string, toolCall: ToolCall): Promise<ToolResult> {
  const handler = toolHandlers[toolCall.name]
  if (!handler) {
    throw new Error(`Unknown tool: ${toolCall.name}`)
  }

  const result = await handler(itemId, toolCall.args)
  return { toolCallId: toolCall.id, result }
}

export async function runToolLoop(
  itemId: string,
  messages: ChatMessage[],
): Promise<ChatMessage> {
  try {
    const provider = createProvider()
    const response = await provider.chat(messages)
    return response
  } catch (error) {
    return {
      role: 'assistant',
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
