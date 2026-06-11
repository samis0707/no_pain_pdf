import { NextRequest } from 'next/server'
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { resolveModel } from '@/lib/ai/sdk-provider'
import { buildSdkTools } from '@/lib/ai/sdk-tools'
import { buildItemSystemPrompt } from '@/lib/ai/item-context'
import { saveUIMessages } from '@/lib/ai/conversation'
import { requireUserId, unauthorizedResponse, findOwnedItem } from '@/lib/auth-session'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  let body: { itemId?: string; messages?: UIMessage[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { itemId, messages } = body
  if (!itemId || !Array.isArray(messages)) {
    return Response.json({ error: 'itemId and messages are required' }, { status: 400 })
  }

  if (!(await findOwnedItem(itemId, userId))) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  const system = await buildItemSystemPrompt(itemId)

  const result = streamText({
    model: resolveModel(),
    system,
    messages: await convertToModelMessages(messages),
    tools: buildSdkTools(itemId),
    stopWhen: stepCountIs(10),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: allMessages }) => {
      await saveUIMessages(itemId, allMessages as never)
    },
  })
}
