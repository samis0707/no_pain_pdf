import { createProvider } from './registry'
import { formatTextEvent, formatToolCallEvent, formatStreamEnd, formatErrorEvent } from './sse'
import { executeToolCall, TOOL_DEFINITIONS } from './tool-loop'
import { saveMessages } from './conversation'
import { renderPreview } from './tools'
import type { ChatMessage, ToolCall, ToolResult } from './types'

// Tools whose success changes the rendered document — each gets an automatic
// preview render so the model sees the result of its own edit.
const MUTATOR_TOOLS = new Set([
  'update_template',
  'update_template_html',
  'update_page_format',
  'apply_template',
])

const MAX_AUTO_RENDERS = 3

async function attachAutoPreview(
  itemId: string,
  toolCalls: ToolCall[],
  toolResults: ToolResult[],
): Promise<void> {
  try {
    const preview = await renderPreview(itemId)
    for (let i = toolCalls.length - 1; i >= 0; i--) {
      if (MUTATOR_TOOLS.has(toolCalls[i].name)) {
        toolResults[i].images = preview.images
        toolResults[i].result = {
          ...(toolResults[i].result as Record<string, unknown>),
          autoPreview: { pageCount: preview.pageCount, truncated: preview.truncated },
        }
        return
      }
    }
  } catch (error) {
    console.error('⚠️ [ChatRoute] Auto preview render failed:', error)
  }
}

export async function handleChatRequest(
  itemId: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        console.log('🤖 [ChatRoute] Starting chat request', { itemId, messageCount: messages.length })
        const provider = createProvider()
        console.log('🤖 [ChatRoute] Provider created', { type: provider.constructor.name })

        let currentMessages = [...messages]
        let response = await provider.chat(currentMessages, TOOL_DEFINITIONS)

        const maxIterations = 10
        let iterations = 0
        let autoRenders = 0

        while (response.toolCalls && response.toolCalls.length > 0 && iterations < maxIterations) {
          iterations++

          for (const tc of response.toolCalls) {
            console.log('🤖 [ChatRoute] Tool call:', { name: tc.name, args: tc.args })
            const event = formatToolCallEvent(tc.name, tc.args, tc.id)
            controller.enqueue(encoder.encode(event))
          }

          const toolResults = await Promise.all(
            response.toolCalls.map((tc) => executeToolCall(itemId, tc)),
          )
          for (const tr of toolResults) {
            console.log('🤖 [ChatRoute] Tool result:', { toolCallId: tr.toolCallId, result: tr.result })
          }

          const mutated = response.toolCalls.some((tc) => MUTATOR_TOOLS.has(tc.name))
          const modelRendered = response.toolCalls.some((tc) => tc.name === 'render_preview')
          if (mutated && !modelRendered && autoRenders < MAX_AUTO_RENDERS) {
            autoRenders++
            await attachAutoPreview(itemId, response.toolCalls, toolResults)
          }

          currentMessages.push(response)
          for (const tr of toolResults) {
            currentMessages.push({
              role: 'tool',
              content: JSON.stringify(tr.result),
              toolCallId: tr.toolCallId,
              images: tr.images,
            })
          }

          response = await provider.chat(currentMessages, TOOL_DEFINITIONS)
        }

        const textContent = response.content || ''
        console.log('🤖 [ChatRoute] Streaming response:', { content: textContent })
        const textEvent = formatTextEvent(textContent)
        controller.enqueue(encoder.encode(textEvent))
        currentMessages.push(response)

        await saveMessages(itemId, currentMessages)

        const doneEvent = formatStreamEnd('msg_' + Date.now())
        controller.enqueue(encoder.encode(doneEvent))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
        console.error('❌ [ChatRoute] Error:', error)
        if (error instanceof Error && error.stack) {
          console.error('❌ [ChatRoute] Stack:', error.stack)
        }
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        const event = formatErrorEvent(errMsg)
        controller.enqueue(encoder.encode(event))
        const doneEvent = formatStreamEnd('msg_err')
        controller.enqueue(encoder.encode(doneEvent))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })
}
