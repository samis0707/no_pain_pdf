import { createProvider } from './registry'
import { formatTextEvent, formatToolCallEvent, formatStreamEnd, formatErrorEvent } from './sse'
import { executeToolCall, TOOL_DEFINITIONS } from './tool-loop'
import { saveMessages } from './conversation'
import type { ChatMessage } from './types'

export async function handleChatRequest(
  itemId: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const provider = createProvider()

        let currentMessages = [...messages]
        let response = await provider.chat(currentMessages, TOOL_DEFINITIONS)

        const maxIterations = 10
        let iterations = 0

        while (response.toolCalls && response.toolCalls.length > 0 && iterations < maxIterations) {
          iterations++

          for (const tc of response.toolCalls) {
            const event = formatToolCallEvent(tc.name, tc.args, tc.id)
            controller.enqueue(encoder.encode(event))
          }

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

        const textEvent = formatTextEvent(response.content || '')
        controller.enqueue(encoder.encode(textEvent))
        currentMessages.push(response)

        await saveMessages(itemId, currentMessages)

        const doneEvent = formatStreamEnd('msg_' + Date.now())
        controller.enqueue(encoder.encode(doneEvent))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
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
