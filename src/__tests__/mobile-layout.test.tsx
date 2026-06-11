import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/Chat/SdkChat', () => ({
  default: () => <div data-testid="sdk-chat" />,
}))

vi.mock('@/components/artifact/ArtifactPanel', () => ({
  default: () => <div data-testid="artifact-panel" />,
}))

vi.mock('@/components/DebugBar/DebugBar', () => ({
  default: () => null,
}))

vi.mock('@/stores/templateStore', () => ({
  useTemplateStore: Object.assign(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = { setItemId: vi.fn(), html: '', css: '' }
      return selector ? selector(state) : state
    },
    { getState: () => ({ setItemId: vi.fn() }) }
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workspace mobile layout', () => {
  it('shows a mobile pane switcher that is hidden on desktop', async () => {
    const { default: EditorPage } = await import('@/app/items/[id]/page')
    render(<EditorPage />)

    const nav = screen.getByTestId('mobile-nav')
    expect(nav.className).toContain('md:hidden')
    expect(screen.getByTestId('mobile-tab-chat')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-canvas')).toBeInTheDocument()
  })

  it('starts on the chat pane; the canvas pane is hidden on mobile but kept mounted', async () => {
    const { default: EditorPage } = await import('@/app/items/[id]/page')
    render(<EditorPage />)

    const chatPane = screen.getByTestId('chat-pane')
    const canvasPane = screen.getByTestId('canvas-pane')

    expect(chatPane.className).not.toContain('hidden')
    expect(canvasPane.className).toContain('hidden')
    // desktop always shows both
    expect(chatPane.className).toContain('md:flex')
    expect(canvasPane.className).toContain('md:flex')
    // both panes stay mounted so chat/preview state survives switching
    expect(screen.getByTestId('sdk-chat')).toBeInTheDocument()
    expect(screen.getByTestId('artifact-panel')).toBeInTheDocument()
  })

  it('switches panes via the mobile tabs without unmounting them', async () => {
    const { default: EditorPage } = await import('@/app/items/[id]/page')
    render(<EditorPage />)

    fireEvent.click(screen.getByTestId('mobile-tab-canvas'))

    expect(screen.getByTestId('canvas-pane').className).not.toContain('hidden')
    expect(screen.getByTestId('chat-pane').className).toContain('hidden')
    expect(screen.getByTestId('sdk-chat')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mobile-tab-chat'))
    expect(screen.getByTestId('chat-pane').className).not.toContain('hidden')
    expect(screen.getByTestId('canvas-pane').className).toContain('hidden')
  })

  it('keeps the chat column from forcing horizontal scroll on phones', async () => {
    const { default: EditorPage } = await import('@/app/items/[id]/page')
    render(<EditorPage />)

    // full width on mobile, fixed column only from md upward
    const chatPane = screen.getByTestId('chat-pane')
    expect(chatPane.className).toContain('w-full')
    expect(chatPane.className).toContain('md:w-[440px]')
  })
})
