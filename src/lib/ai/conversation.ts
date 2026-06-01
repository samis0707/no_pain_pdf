import type { ChatMessage } from './types'
export type { ChatMessage }

const conversationStore = new Map<string, ChatMessage[]>()

export async function saveMessages(itemId: string, messages: ChatMessage[]): Promise<void> {
  const existing = conversationStore.get(itemId) || []
  conversationStore.set(itemId, [...existing, ...messages])
}

export async function loadMessages(itemId: string): Promise<ChatMessage[]> {
  return conversationStore.get(itemId) || []
}

export async function clearConversation(itemId: string): Promise<void> {
  conversationStore.delete(itemId)
}
