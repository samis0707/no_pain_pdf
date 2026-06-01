import { create } from 'zustand'
import { createSSEReader } from '@/lib/ai/sse-reader'
import { applyTemplateChanges } from '@/lib/ai/apply-flow'
import { useTemplateStore } from '@/stores/templateStore'
import type { ChatMessage } from '@/lib/ai/types'

export type { ChatMessage }

interface ChatState {
  itemId: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null

  setItemId: (id: string) => void
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  itemId: null,
  messages: [],
  isStreaming: false,
  error: null,

  setItemId: (id) => {
    set({ itemId: id, error: null })
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },

  setMessages: (messages) => {
    set({ messages })
  },

  setStreaming: (streaming) => {
    set({ isStreaming: streaming })
  },

  setError: (error) => {
    set({ error })
  },

  clearMessages: () => {
    set({ messages: [], error: null })
  },

  sendMessage: async (content) => {
    const { itemId } = get()
    if (!itemId) {
      set({ error: 'No item selected' })
      return
    }

    set({ isStreaming: true, error: null })
    set((state) => ({
      messages: [...state.messages, { role: 'user', content }],
    }))

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, message: { role: 'user', content } }),
      })

      if (!res.ok) throw new Error('Chat request failed')
      if (!res.body) throw new Error('No response body')

      const reader = createSSEReader(res.body)
      let textBuffer = ''
      let hasAssistantText = false

      for await (const event of reader) {
        if (event.type === 'text') {
          textBuffer += event.data
          set((state) => {
            const msgs = [...state.messages]
            if (hasAssistantText) {
              msgs[msgs.length - 1] = { role: 'assistant', content: textBuffer }
            } else {
              msgs.push({ role: 'assistant', content: textBuffer })
              hasAssistantText = true
            }
            return { messages: msgs }
          })
        } else if (event.type === 'tool_call') {
          if (event.data.name === 'update_template') {
            applyTemplateChanges({
              html: event.data.args.html as string | undefined,
              css: event.data.args.css as string | undefined,
            })
            await useTemplateStore.getState().saveTemplate()
          } else if (event.data.name === 'register_helper') {
            const currentMisc = useTemplateStore.getState().miscText
            let parsed: Record<string, unknown> = {}
            if (currentMisc) {
              try { parsed = JSON.parse(currentMisc) } catch {}
            }
            const customHelpers: Array<{ name: string; params: string[]; body: string }> =
              Array.isArray(parsed.customHelpers) ? parsed.customHelpers : []
            customHelpers.push({
              name: event.data.args.name as string,
              params: event.data.args.params as string[],
              body: event.data.args.body as string,
            })
            applyTemplateChanges({ miscText: JSON.stringify({ ...parsed, customHelpers }) })
            await useTemplateStore.getState().saveTemplate()
          }

          set((state) => ({
            messages: [
              ...state.messages,
              {
                role: 'assistant',
                content: '',
                toolCalls: [
                  { id: event.data.id, name: event.data.name, args: event.data.args },
                ],
              },
            ],
          }))
        } else if (event.type === 'error') {
          throw new Error(event.data)
        }
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Chat failed' })
    } finally {
      set({ isStreaming: false })
    }
  },
}))
