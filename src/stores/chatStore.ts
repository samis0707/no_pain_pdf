import { create } from 'zustand'
import { createSSEReader } from '@/lib/ai/sse-reader'
import { applyTemplateChanges } from '@/lib/ai/apply-flow'
import { useTemplateStore } from '@/stores/templateStore'
import { useExportStore } from '@/stores/exportStore'
import type { ChatMessage } from '@/lib/ai/types'
import { TOOL_LABELS_DE } from '@/lib/ai/tool-labels'

export type { ChatMessage }

interface ChatState {
  itemId: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  isLoadingHistory: boolean

  setItemId: (id: string) => void
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => Promise<void>
  loadHistory: () => Promise<void>
}

export const useChatStore = create<ChatState>()((set, get) => ({
  itemId: null,
  messages: [],
  isStreaming: false,
  error: null,
  isLoadingHistory: false,

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

  clearMessages: async () => {
    const { itemId } = get()
    if (itemId) {
      try {
        await fetch(`/api/ai/chat?itemId=${itemId}`, { method: 'DELETE' })
      } catch (e) {
        console.warn('⚠️ [Chat] Failed to clear history on server:', e)
      }
    }
    set({ messages: [], error: null })
  },

  loadHistory: async () => {
    const { itemId } = get()
    if (!itemId) return

    set({ isLoadingHistory: true })
    try {
      const res = await fetch(`/api/ai/chat?itemId=${itemId}`)
      if (res.ok) {
        const data = await res.json()
        set({ messages: data.messages ?? [] })
      }
    } catch (e) {
      console.warn('⚠️ [Chat] Failed to load history:', e)
    } finally {
      set({ isLoadingHistory: false })
    }
  },

  sendMessage: async (content) => {
    const { itemId } = get()
    console.log('📤 [Chat] sendMessage: starting', { content, itemId })
    if (!itemId) {
      set({ error: 'No item selected' })
      return
    }

    set({ isStreaming: true, error: null })
    set((state) => ({
      messages: [...state.messages, { role: 'user', content }],
    }))

    try {
      const requestBody = JSON.stringify({ itemId, message: { role: 'user', content } })
      console.log('📤 [Chat] sendMessage: fetching /api/ai/chat', { body: requestBody })
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })

      console.log('📤 [Chat] sendMessage: response status', { status: res.status })
      if (!res.ok) throw new Error('Chat request failed')
      if (!res.body) throw new Error('No response body')

      const reader = createSSEReader(res.body)
      let textBuffer = ''
      let hasAssistantText = false

      for await (const event of reader) {
        console.log('📤 [Chat] SSE event received:', event.type, event.type === 'tool_call' ? { name: event.data.name } : '')
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
          } else if (event.data.name === 'update_template_html') {
            applyTemplateChanges({
              html: event.data.args.html as string | undefined,
            })
            await useTemplateStore.getState().saveTemplate()
          } else if (event.data.name === 'update_page_format') {
            const css = event.data.args.css as string | undefined
            const pageFormatId = event.data.args.pageFormatId as number | undefined

            if (css !== undefined) {
              applyTemplateChanges({ css })
            }
            if (pageFormatId !== undefined) {
              const itemId = get().itemId
              if (itemId) {
                const body: Record<string, unknown> = { pageFormatId }
                if (css !== undefined) {
                  body.css = css
                }
                await fetch(`/api/items/${itemId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                })
                await useTemplateStore.getState().fetchTemplate()
              }
            } else if (css !== undefined) {
              await useTemplateStore.getState().saveTemplate()
            }
          } else if (event.data.name === 'update_export_settings') {
            const bleed = event.data.args.bleed as number | undefined
            const cropMarks = event.data.args.cropMarks as boolean | undefined
            const colorMode = event.data.args.colorMode as 'rgb' | 'cmyk' | undefined

            if (bleed !== undefined) {
              useExportStore.getState().setBleed(bleed)
            }
            if (cropMarks !== undefined) {
              useExportStore.getState().setCropMarks(cropMarks)
            }
            if (colorMode !== undefined) {
              useExportStore.getState().setColorMode(colorMode)
            }
          } else if (event.data.name === 'export_pdf') {
            const templateHtml = useTemplateStore.getState().html
            const templateCss = useTemplateStore.getState().css
            useExportStore.getState().exportPdf(templateHtml, templateCss)
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
                    {
                      id: event.data.id,
                      name: event.data.name,
                      args: event.data.args,
                      label: TOOL_LABELS_DE[event.data.name] || `Führe ${event.data.name} aus...`,
                    },
                  ],
              },
            ],
          }))
        } else if (event.type === 'error') {
          throw new Error(event.data)
        }
      }
    } catch (e) {
      console.error('❌ [Chat] sendMessage: error', e)
      set({ error: e instanceof Error ? e.message : 'Chat failed' })
    } finally {
      set({ isStreaming: false })
    }
  },
}))
