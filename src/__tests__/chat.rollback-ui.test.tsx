import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageList from '@/components/Chat/MessageList'
import ChatSidebar from '@/components/Chat/ChatSidebar'
import type { ChatMessage } from '@/components/Chat/types'

const mutatorMsg: ChatMessage = {
  role: 'assistant',
  content: '',
  id: 'm1',
  version: 4,
  toolCalls: [{ id: 'tc_1', name: 'update_template', args: { html: '<h1>x</h1>' } }],
}

const readOnlyMsg: ChatMessage = {
  role: 'assistant',
  content: '',
  id: 'm2',
  toolCalls: [{ id: 'tc_2', name: 'get_data_info', args: {} }],
}

describe('rollback link on mutating tool calls', () => {
  it('shows a rollback link for assistant messages with a mutating tool call', () => {
    const onRollback = vi.fn()
    render(<MessageList messages={[mutatorMsg]} isStreaming={false} onRollback={onRollback} />)

    const link = screen.getByTestId('rollback-link')
    fireEvent.click(link)

    expect(onRollback).toHaveBeenCalledWith(mutatorMsg)
  })

  it('does not show a rollback link for read-only tool calls', () => {
    render(<MessageList messages={[readOnlyMsg]} isStreaming={false} onRollback={vi.fn()} />)

    expect(screen.queryByTestId('rollback-link')).not.toBeInTheDocument()
  })
})

describe('ChatSidebar undo + rollback wiring', () => {
  const baseProps = {
    messages: [mutatorMsg],
    isStreaming: false,
    error: null,
    onSend: vi.fn(),
    onClear: vi.fn(),
  }

  it('renders an Undo button that triggers onUndo', () => {
    const onUndo = vi.fn()
    render(<ChatSidebar {...baseProps} onUndo={onUndo} />)

    fireEvent.click(screen.getByTestId('undo-button'))

    expect(onUndo).toHaveBeenCalled()
  })

  it('forwards rollback clicks from the message list', () => {
    const onRollback = vi.fn()
    render(<ChatSidebar {...baseProps} onRollback={onRollback} />)

    fireEvent.click(screen.getByTestId('rollback-link'))

    expect(onRollback).toHaveBeenCalledWith(mutatorMsg)
  })
})
