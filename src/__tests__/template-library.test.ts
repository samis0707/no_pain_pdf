import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTemplateLibraryStore } from '@/stores/templateLibraryStore'
import { useTemplateStore } from '@/stores/templateStore'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const TEMPLATES = [
  { id: 1, name: 'Event flyer', category: 'event-flyer', userId: null, projectId: null },
  { id: 10, name: 'ACME', category: 'corporate', userId: 1, projectId: null },
]

beforeEach(() => {
  vi.clearAllMocks()
  useTemplateLibraryStore.setState({ templates: [], isLoading: false, error: null })
})

describe('templateLibraryStore', () => {
  it('fetchTemplates loads the scoped list', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ templates: TEMPLATES }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await useTemplateLibraryStore.getState().fetchTemplates(3)

    expect(mockFetch.mock.calls[0][0]).toBe('/api/print-templates?projectId=3')
    expect(useTemplateLibraryStore.getState().templates).toHaveLength(2)
  })

  it('applyTemplate POSTs and refreshes the template store', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 7, html: '<header/>', css: '', templateId: 10, version: 3 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const fetchTemplate = vi.fn().mockResolvedValue(undefined)
    useTemplateStore.setState({ fetchTemplate })

    await useTemplateLibraryStore.getState().applyTemplate('7', 10)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/items/7/apply-template')
    expect(JSON.parse(init.body)).toEqual({ templateId: 10 })
    expect(fetchTemplate).toHaveBeenCalled()
  })

  it('saveAsTemplate POSTs name and scope and refreshes the list', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 11, name: 'My Brand' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ templates: TEMPLATES }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )

    await useTemplateLibraryStore.getState().saveAsTemplate('7', 'My Brand', 'user')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/items/7/save-as-template')
    expect(JSON.parse(init.body)).toEqual({ name: 'My Brand', scope: 'user' })
  })

  it('records an error on failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'boom' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await useTemplateLibraryStore.getState().applyTemplate('7', 10)

    expect(useTemplateLibraryStore.getState().error).toContain('boom')
  })
})
