import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ChatSidebar from '@/components/Chat/ChatSidebar'
import type { ChatMessage } from '@/components/Chat/types'

const messages: ChatMessage[] = [
  { role: 'user', content: 'Hello', id: '1' },
  { role: 'assistant', content: 'Hi!', id: '2' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Export PDF button in ChatSidebar', () => {
  it('renders Export PDF button when not streaming', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onExportPdf={vi.fn()}
      />,
    )

    const btn = screen.getByTestId('export-pdf-button')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent(/export.*pdf/i)
  })

  it('does not render Export PDF button when streaming', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={true}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onExportPdf={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('export-pdf-button')).not.toBeInTheDocument()
  })

  it('calls onExportPdf when button is clicked', async () => {
    const onExportPdf = vi.fn()
    const user = userEvent.setup()

    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onExportPdf={onExportPdf}
      />,
    )

    await user.click(screen.getByTestId('export-pdf-button'))
    expect(onExportPdf).toHaveBeenCalledTimes(1)
  })

  it('shows loading state on button when isExporting prop is true', () => {
    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onExportPdf={vi.fn()}
        isExporting={true}
      />,
    )

    const btn = screen.getByTestId('export-pdf-button')
    expect(btn).toBeDisabled()
    expect(btn.textContent?.toLowerCase()).toContain('generating')
  })

  it('is disabled when isExporting is true', async () => {
    const onExportPdf = vi.fn()
    const user = userEvent.setup()

    render(
      <ChatSidebar
        messages={messages}
        isStreaming={false}
        error={null}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onExportPdf={onExportPdf}
        isExporting={true}
      />,
    )

    const btn = screen.getByTestId('export-pdf-button')
    expect(btn).toBeDisabled()

    await user.click(btn)
    expect(onExportPdf).not.toHaveBeenCalled()
  })
})
