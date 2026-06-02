import { prisma } from '@/lib/prisma'
import type { ChatMessage } from './types'
export type { ChatMessage }

function serializeChatMessage(msg: ChatMessage): { role: string; content: string; toolCalls: string; attachments: string } {
  return {
    role: msg.role,
    content: msg.content,
    toolCalls: JSON.stringify(msg.toolCalls ?? []),
    attachments: JSON.stringify({
      version: msg.version,
      toolCallId: msg.toolCallId,
    }),
  }
}

function deserializeChatMessage(
  row: { role: string; content: string; toolCalls: string; attachments: string },
): ChatMessage {
  const toolCalls = (() => {
    try { return JSON.parse(row.toolCalls) } catch { return [] }
  })()
  const attachments = (() => {
    try { return JSON.parse(row.attachments) } catch { return {} }
  })()
  return {
    role: row.role,
    content: row.content,
    toolCalls: Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls : undefined,
    version: attachments.version,
    toolCallId: attachments.toolCallId,
  }
}

export async function saveMessages(itemId: string, messages: ChatMessage[]): Promise<void> {
  const printItemId = parseInt(itemId)
  if (isNaN(printItemId)) return

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { printItemId } }),
    ...messages.map((msg) =>
      prisma.chatMessage.create({
        data: { printItemId, ...serializeChatMessage(msg) },
      }),
    ),
  ])
}

export async function loadMessages(itemId: string): Promise<ChatMessage[]> {
  const printItemId = parseInt(itemId)
  if (isNaN(printItemId)) return []

  const rows = await prisma.chatMessage.findMany({
    where: { printItemId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(deserializeChatMessage)
}

export async function clearConversation(itemId: string): Promise<void> {
  const printItemId = parseInt(itemId)
  if (isNaN(printItemId)) return

  await prisma.chatMessage.deleteMany({ where: { printItemId } })
}
