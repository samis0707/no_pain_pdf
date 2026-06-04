import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageList from '@/components/Chat/MessageList'
import type { ChatMessage } from '@/components/Chat/types'

describe('MessageList - tool call rendering', () => {
  it('renders tool calls with labels on assistant messages', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      id: '1',
      toolCalls: [
        { id: 'call_1', name: 'get_template', args: {}, label: 'Prüfe Design...' },
      ],
    }
    render(<MessageList messages={[msg]} isStreaming={false} />)

    expect(screen.getByText('Prüfe Design...')).toBeInTheDocument()
  })

  it('renders multiple tool calls', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      id: '2',
      toolCalls: [
        { id: 'call_1', name: 'get_template', args: {}, label: 'Prüfe Design...' },
        { id: 'call_2', name: 'analyze_data', args: {}, label: 'Analysiere Daten...' },
      ],
    }
    render(<MessageList messages={[msg]} isStreaming={false} />)

    expect(screen.getByText('Prüfe Design...')).toBeInTheDocument()
    expect(screen.getByText('Analysiere Daten...')).toBeInTheDocument()
  })

  it('shows fallback label for unknown tool names', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      id: '3',
      toolCalls: [
        { id: 'call_1', name: 'unknown_tool', args: {} },
      ],
    }
    render(<MessageList messages={[msg]} isStreaming={false} />)

    expect(screen.getByText(/Running/)).toBeInTheDocument()
  })

  it('does not render tool calls section when no toolCalls', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: 'Hello',
      id: '4',
    }
    render(<MessageList messages={[msg]} isStreaming={false} />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
