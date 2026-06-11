import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const { mockUseChat, mockSendMessage, mockSetMessages } = vi.hoisted(() => ({
  mockUseChat: vi.fn(),
  mockSendMessage: vi.fn(),
  mockSetMessages: vi.fn(),
}))

vi.mock('@ai-sdk/react', () => ({ useChat: mockUseChat }))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function chatState(messages: unknown[], status = 'ready') {
  return {
    messages,
    sendMessage: mockSendMessage,
    setMessages: mockSetMessages,
    status,
    error: undefined,
    clearError: vi.fn(),
    stop: vi.fn(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ messages: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  )
})

describe('SdkChat', () => {
  it('renders text parts as markdown and tool parts as collapsible details', async () => {
    const { default: SdkChat } = await import('@/components/Chat/SdkChat')
    mockUseChat.mockReturnValue(
      chatState([
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'make it blue' }] },
        {
          id: 'a1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-update_template',
              toolCallId: 'tc1',
              state: 'output-available',
              input: { css: 'h1{color:blue}' },
              output: { version: 2 },
            },
            { type: 'text', text: 'Done — it is **blue** now.' },
          ],
        },
      ])
    )

    render(<SdkChat itemId="7" />)

    expect(screen.getByText('make it blue')).toBeInTheDocument()
    expect(screen.getByText('blue')).toBeInTheDocument()
    expect(screen.getByTestId('tool-part-update_template')).toBeInTheDocument()
  })

  it('sends the typed message', async () => {
    const { default: SdkChat } = await import('@/components/Chat/SdkChat')
    mockUseChat.mockReturnValue(chatState([]))

    render(<SdkChat itemId="7" />)
    fireEvent.change(screen.getByTestId('chat-input'), {
      target: { value: 'design a flyer' },
    })
    fireEvent.click(screen.getByTestId('chat-send'))

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'design a flyer' })
    )
  })

  it('loads stored history into the chat on mount', async () => {
    const { default: SdkChat } = await import('@/components/Chat/SdkChat')
    mockUseChat.mockReturnValue(chatState([]))
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'old' }] }],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    )

    render(<SdkChat itemId="7" />)
    await vi.waitFor(() => {
      expect(mockSetMessages).toHaveBeenCalledWith([
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'old' }] },
      ])
    })
    expect(mockFetch.mock.calls[0][0]).toBe('/api/chat?itemId=7')
  })

  it('clears the conversation via DELETE', async () => {
    const { default: SdkChat } = await import('@/components/Chat/SdkChat')
    mockUseChat.mockReturnValue(chatState([]))

    render(<SdkChat itemId="7" />)
    fireEvent.click(screen.getByTestId('new-chat-button'))

    await vi.waitFor(() => {
      const deleteCall = mockFetch.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'DELETE'
      )
      expect(deleteCall?.[0]).toBe('/api/chat?itemId=7')
    })
  })
})

describe('ArtifactPanel', () => {
  it('switches between Preview, Code and Data tabs', async () => {
    vi.doMock('@/components/Preview/PreviewPanel', () => ({
      default: () => <div data-testid="preview-panel" />,
    }))
    vi.doMock('@/components/Editor/MonacoEditor', () => ({
      default: () => <div data-testid="monaco-editor" />,
    }))
    vi.doMock('@/components/DataImport/DataImportPanel', () => ({
      default: () => <div data-testid="data-import-panel" />,
    }))
    const { default: ArtifactPanel } = await import('@/components/artifact/ArtifactPanel')

    render(<ArtifactPanel itemId={7} />)

    expect(screen.getByTestId('preview-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('artifact-tab-code'))
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('artifact-tab-data'))
    expect(screen.getByTestId('data-import-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('artifact-tab-preview'))
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument()
  })
})
