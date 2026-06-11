import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '@/stores/chatStore'
import { useTemplateStore } from '@/stores/templateStore'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('chatStore.rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({ itemId: '1', messages: [], error: null })
  })

  it('POSTs the version to the rollback API and refreshes the template', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, html: '<h1>old</h1>', css: '', version: 3 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const fetchTemplate = vi
      .spyOn(useTemplateStore.getState(), 'fetchTemplate')
      .mockResolvedValue(undefined)
    useTemplateStore.setState({ fetchTemplate })

    await useChatStore.getState().rollback(3)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/items/1/rollback')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ version: 3 })
    expect(fetchTemplate).toHaveBeenCalled()

    const messages = useChatStore.getState().messages
    expect(messages[messages.length - 1].content).toContain('v3')
  })

  it('performs an undo when called without a version', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, html: '', css: '', version: 2 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
    useTemplateStore.setState({ fetchTemplate: vi.fn().mockResolvedValue(undefined) })

    await useChatStore.getState().rollback()

    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({})
  })

  it('sets an error when the snapshot does not exist', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'No snapshot for version 9' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await useChatStore.getState().rollback(9)

    expect(useChatStore.getState().error).toContain('No snapshot')
  })

  it('does nothing without an itemId', async () => {
    useChatStore.setState({ itemId: null })

    await useChatStore.getState().rollback(1)

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
