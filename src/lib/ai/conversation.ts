import { prisma } from '@/lib/prisma'
import type { ChatMessage } from './types'
export type { ChatMessage }

function serializeChatMessage(msg: ChatMessage): { role: string; content: string; toolCalls: string; attachments: string } {
  const attachmentData: Record<string, unknown> = {}
  if (msg.version != null) attachmentData.version = msg.version
  if (msg.toolCallId != null) attachmentData.toolCallId = msg.toolCallId
  if (msg.attachments && msg.attachments.length > 0) attachmentData.images = msg.attachments
  return {
    role: msg.role,
    content: msg.content,
    toolCalls: JSON.stringify(msg.toolCalls ?? []),
    attachments: JSON.stringify(attachmentData),
  }
}

function deserializeChatMessage(
  row: { role: string; content: string; toolCalls: string; attachments: string },
): ChatMessage {
  const toolCalls = (() => {
    try { return JSON.parse(row.toolCalls) } catch { return [] }
  })()
  const attachmentData = (() => {
    try { return JSON.parse(row.attachments) } catch { return {} }
  })()
  return {
    role: row.role,
    content: row.content,
    toolCalls: Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls : undefined,
    version: attachmentData.version != null ? attachmentData.version : undefined,
    toolCallId: attachmentData.toolCallId != null ? attachmentData.toolCallId : undefined,
    attachments: Array.isArray(attachmentData.images) && attachmentData.images.length > 0 ? attachmentData.images : undefined,
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

interface UIMessageLike {
  id: string
  role: string
  parts: Array<{ type: string; text?: string } & Record<string, unknown>>
}

function textFromParts(parts: UIMessageLike['parts']): string {
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n')
}

/** Persists AI SDK UIMessages losslessly (parts) with legacy content kept in sync. */
export async function saveUIMessages(itemId: string, messages: UIMessageLike[]): Promise<void> {
  const printItemId = parseInt(itemId)
  if (isNaN(printItemId)) return

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { printItemId } }),
    ...messages.map((msg) =>
      prisma.chatMessage.create({
        data: {
          printItemId,
          role: msg.role,
          content: textFromParts(msg.parts),
          parts: JSON.stringify(msg.parts),
          toolCalls: '[]',
          attachments: '{}',
        },
      }),
    ),
  ])
}

/**
 * Loads the conversation as UIMessages. Rows from before the SDK migration
 * have no parts — their text content is converted; legacy tool rows and
 * tool-call-only assistant rows carry no displayable text and are skipped.
 */
export async function loadUIMessages(itemId: string): Promise<UIMessageLike[]> {
  const printItemId = parseInt(itemId)
  if (isNaN(printItemId)) return []

  const rows = await prisma.chatMessage.findMany({
    where: { printItemId },
    orderBy: { createdAt: 'asc' },
  })

  const messages: UIMessageLike[] = []
  for (const row of rows) {
    const parts = (() => {
      try {
        return JSON.parse(row.parts ?? '[]')
      } catch {
        return []
      }
    })()

    if (Array.isArray(parts) && parts.length > 0) {
      messages.push({ id: String(row.id), role: row.role, parts })
      continue
    }

    if ((row.role === 'user' || row.role === 'assistant') && row.content) {
      messages.push({
        id: String(row.id),
        role: row.role,
        parts: [{ type: 'text', text: row.content }],
      })
    }
  }
  return messages
}

export async function clearConversation(itemId: string): Promise<void> {
  const printItemId = parseInt(itemId)
  if (isNaN(printItemId)) return

  await prisma.chatMessage.deleteMany({ where: { printItemId } })
}
