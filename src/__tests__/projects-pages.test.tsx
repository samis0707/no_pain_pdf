import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useParams: () => ({ id: '3' }),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: vi.fn().mockResolvedValue({}) },
}))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('projects overview page', () => {
  it('lists the user projects', async () => {
    const { default: ProjectsPage } = await import('@/app/projects/page')
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1, name: 'Flyers 2026', status: 'draft' }]), {
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<ProjectsPage />)

    await waitFor(() => {
      expect(screen.getByText('Flyers 2026')).toBeInTheDocument()
    })
    expect(mockFetch.mock.calls[0][0]).toBe('/api/projects')
  })

  it('creates a project and navigates to it', async () => {
    const { default: ProjectsPage } = await import('@/app/projects/page')
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 9, name: 'New Project' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByTestId('new-project-input')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('new-project-input'), {
      target: { value: 'New Project' },
    })
    fireEvent.click(screen.getByTestId('new-project-button'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/projects/9')
    })
    const [url, init] = mockFetch.mock.calls[1]
    expect(url).toBe('/api/projects')
    expect(JSON.parse(init.body)).toEqual({ name: 'New Project' })
  })
})

describe('project detail page', () => {
  it('lists items and creates a new one, navigating to the workspace', async () => {
    const { default: ProjectPage } = await import('@/app/projects/[id]/page')
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 3, name: 'Flyers 2026' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 7, name: 'June flyer' }]), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 8, name: 'July flyer' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    render(<ProjectPage />)

    await waitFor(() => {
      expect(screen.getByText('June flyer')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('new-item-input'), {
      target: { value: 'July flyer' },
    })
    fireEvent.click(screen.getByTestId('new-item-button'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/items/8')
    })
    const createCall = mockFetch.mock.calls[2]
    expect(createCall[0]).toBe('/api/items')
    expect(JSON.parse(createCall[1].body)).toEqual({ projectId: 3, name: 'July flyer' })
  })
})
