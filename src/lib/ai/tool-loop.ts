import { ChatMessage, ToolCall, ToolResult } from './types'
import { createProvider } from './registry'
import {
  getTemplate,
  updateTemplate,
  updateTemplateHtml,
  getDataInfo,
  analyzeData,
  renderPreview,
  getAssets,
  registerHelper,
  getData,
  updateData,
  getHelpers,
  getPageFormats,
  updatePageFormat,
  updateExportSettings,
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
  get_helpers: (itemId) => getHelpers(itemId),
  update_template_html: (itemId, args) =>
    updateTemplateHtml(itemId, args.html as string),
  get_page_formats: (itemId) => getPageFormats(itemId),
  update_page_format: (itemId, args) =>
    updatePageFormat(
      itemId,
      args.pageFormatId as number | null | undefined,
      args.css as string | undefined,
    ),
  update_export_settings: (itemId, args) =>
    updateExportSettings(
      itemId,
      args.bleed as number | undefined,
      args.cropMarks as boolean | undefined,
      args.colorMode as 'rgb' | 'cmyk' | undefined,
    ),
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_template',
      description: 'Get the current template HTML, CSS, and name',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_template',
      description: 'Save changes to the template (html, css, name) and increment version',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The item ID' },
          html: { type: 'string', description: 'HTML content' },
          css: { type: 'string', description: 'CSS content' },
        },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_data_info',
      description: 'Get DataSet columns, row count, and sample rows',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_data',
      description: 'Deep analysis of dataset: duplicates, nulls, and suggestions',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_preview',
      description: 'Render the template with current data and return a base64 screenshot',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_assets',
      description: 'List uploaded images for this item',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_helper',
      description: 'Create a custom Handlebars helper available immediately in the template',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The item ID' },
          name: { type: 'string', description: 'Helper name' },
          params: { type: 'array', items: { type: 'string' }, description: 'Parameter names' },
          body: { type: 'string', description: 'Function body' },
        },
        required: ['itemId', 'name', 'params', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_data',
      description: 'Return the full dataset with columns and all rows',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_data',
      description: 'Replace the dataset with new rows (validates shape, rejects empty)',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The item ID' },
          rows: {
            type: 'array',
            items: { type: 'object' },
            description: 'Array of row objects with consistent keys',
          },
        },
        required: ['itemId', 'rows'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_helpers',
      description: 'List all available Handlebars helpers with signatures and descriptions',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_template_html',
      description: 'Update ONLY the HTML content of the template. CSS is NEVER modified by this tool. Use update_page_format to change CSS or page format.',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The item ID' },
          html: { type: 'string', description: 'The new HTML content (Handlebars syntax)' },
        },
        required: ['itemId', 'html'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_page_formats',
      description: 'List all available page formats with their dimensions and the currently selected format for this item',
      parameters: {
        type: 'object',
        properties: { itemId: { type: 'string', description: 'The item ID' } },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_page_format',
      description: 'Change the page format and/or update the CSS for the template. Use this tool for any CSS changes or page format selection.',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The item ID' },
          pageFormatId: { type: 'number', description: 'The ID of the page format to switch to (omit or set null to keep current)' },
          css: { type: 'string', description: 'New CSS content (omit to keep current CSS)' },
        },
        required: ['itemId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_export_settings',
      description: 'Set bleed, crop marks, and/or color mode for PDF export. Bleed range: 0-5mm. Color mode can be "rgb" or "cmyk".',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The item ID' },
          bleed: { type: 'number', description: 'Bleed in mm (0-5)' },
          cropMarks: { type: 'boolean', description: 'Whether to include printer crop marks' },
          colorMode: { type: 'string', enum: ['rgb', 'cmyk'], description: 'Color mode for the exported PDF' },
        },
        required: ['itemId'],
      },
    },
  },
]

export { TOOL_DEFINITIONS }

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
    const maxIterations = 10
    let iterations = 0
    let currentMessages = [...messages]

    let response = await provider.chat(currentMessages, TOOL_DEFINITIONS)

    while (response.toolCalls && response.toolCalls.length > 0 && iterations < maxIterations) {
      iterations++

      const toolResults = await Promise.all(
        response.toolCalls.map((tc) => executeToolCall(itemId, tc)),
      )

      currentMessages.push(response)
      for (const tr of toolResults) {
        currentMessages.push({
          role: 'tool',
          content: JSON.stringify(tr.result),
          toolCallId: tr.toolCallId,
        })
      }

      response = await provider.chat(currentMessages, TOOL_DEFINITIONS)
    }

    return response
  } catch (error) {
    return {
      role: 'assistant',
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
