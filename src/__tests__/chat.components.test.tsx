import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import MessageList from '@/components/Chat/MessageList'
import MessageInput from '@/components/Chat/MessageInput'
import ChatSidebar from '@/components/Chat/ChatSidebar'
import type { ChatMessage } from '@/components/Chat/types'

describe('MessageList', () => {
  const userMsg: ChatMessage = { role: 'user', content: 'Hello', id: '1' }
  const assistantMsg: ChatMessage = { role: 'assistant', content: 'Hi there!', id: '2' }
  const toolMsg: ChatMessage = {
    role: 'tool',
    content: 'Applied template change',
    id: '3',
    version: 2,
  }

  it('renders user and assistant messages with correct styling', () => {
    render(<MessageList messages={[userMsg, assistantMsg]} isStreaming={false} />)

    const userEl = screen.getByTestId('message-user')
    const assistantEl = screen.getByTestId('message-assistant')

    expect(userEl).toBeInTheDocument()
    expect(userEl).toHaveTextContent('Hello')
    expect(userEl.className).toContain('bg-blue-500')

    expect(assistantEl).toBeInTheDocument()
    expect(assistantEl).toHaveTextContent('Hi there!')
    expect(assistantEl.className).toContain('bg-zinc-100')
  })

  it('shows empty state when no messages', () => {
    render(<MessageList messages={[]} isStreaming={false} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument()
  })

  it('shows version badges and rollback links for tool messages', () => {
    render(<MessageList messages={[toolMsg]} isStreaming={false} />)

    const toolEl = screen.getByTestId('message-tool')
    expect(toolEl).toBeInTheDocument()
    expect(toolEl).toHaveTextContent('Applied template change')

    const badge = screen.getByTestId('version-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('v2')

    const rollback = screen.getByTestId('rollback-link')
    expect(rollback).toBeInTheDocument()
    expect(rollback).toHaveTextContent('↩ Rollback')
  })

  it('shows streaming indicator when isStreaming is true', () => {
    render(<MessageList messages={[userMsg]} isStreaming={true} />)
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument()
  })

  it('does not show streaming indicator when isStreaming is false', () => {
    render(<MessageList messages={[userMsg]} isStreaming={false} />)
    expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument()
  })
})

describe('MessageInput', () => {
  it('calls onSend with the message text when send button is clicked', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    const input = screen.getByTestId('message-input')
    await user.type(input, 'Hello world')

    const sendBtn = screen.getByTestId('send-button')
    await user.click(sendBtn)

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('Hello world')
  })

  it('clears the input after sending', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    const input = screen.getByTestId('message-input') as HTMLTextAreaElement
    await user.type(input, 'Clear me')
    await user.click(screen.getByTestId('send-button'))

    expect(input.value).toBe('')
  })

  it('disables input and shows Sending... when disabled is true', () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />)

    const input = screen.getByTestId('message-input')
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('placeholder', 'Sending...')

    const sendBtn = screen.getByTestId('send-button')
    expect(sendBtn).toBeDisabled()
    expect(sendBtn).toHaveTextContent('Sending...')
  })

  it('sends on Enter but not on Shift+Enter', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<MessageInput onSend={onSend} disabled={false} />)

    const input = screen.getByTestId('message-input')
    await user.type(input, 'Enter send')

    await user.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('Enter send')
  })
})

describe('ChatSidebar', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello', id: '1' },
    { role: 'assistant', content: 'Hi!', id: '2' },
  ]

  it('renders MessageList and MessageInput as children', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByTestId('message-user')).toBeInTheDocument()
    expect(screen.getByTestId('message-assistant')).toBeInTheDocument()
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
    expect(screen.getByTestId('send-button')).toBeInTheDocument()
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
  })

  it('calls onClear when New Chat button is clicked', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={onClear}
      />,
    )

    await user.click(screen.getByTestId('new-chat-button'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('disables input when isStreaming is true', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByTestId('message-input')).toBeDisabled()
  })

  it('shows error banner when error prop is set', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error="LLM_API_KEY environment variable is not set"
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByTestId('chat-error-banner')).toBeInTheDocument()
    expect(screen.getByText(/LLM_API_KEY/)).toBeInTheDocument()
  })

  it('enriches env var error messages with actionable advice', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error="LLM_PROVIDER environment variable is not set"
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByText(/Set LLM_PROVIDER/)).toBeInTheDocument()
  })

  it('does not show error banner when error is null', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('chat-error-banner')).not.toBeInTheDocument()
  })
})
