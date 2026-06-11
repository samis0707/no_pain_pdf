import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockSignInEmail, mockSignUpEmail, mockPush } = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
  mockSignUpEmail: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { email: mockSignInEmail },
    signUp: { email: mockSignUpEmail },
    signOut: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillAndSubmit() {
  fireEvent.change(screen.getByTestId('email-input'), {
    target: { value: 'user@example.com' },
  })
  fireEvent.change(screen.getByTestId('password-input'), {
    target: { value: 'secret123' },
  })
  fireEvent.click(screen.getByTestId('submit-button'))
}

describe('login page', () => {
  it('signs in locally and redirects to /projects', async () => {
    const { default: LoginPage } = await import('@/app/login/page')
    mockSignInEmail.mockResolvedValue({ data: { user: { id: 1 } }, error: null })

    render(<LoginPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com', password: 'secret123' })
      )
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('falls back to federated login when local sign-in fails', async () => {
    const { default: LoginPage } = await import('@/app/login/page')
    mockSignInEmail.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } })
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 1 }, migrated: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<LoginPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/federated-login',
        expect.objectContaining({ method: 'POST' })
      )
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })
  })

  it('shows an error when both local and federated login fail', async () => {
    const { default: LoginPage } = await import('@/app/login/page')
    mockSignInEmail.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } })
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
    )

    render(<LoginPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByTestId('auth-error')).toHaveTextContent(/invalid/i)
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('register page', () => {
  it('registers and redirects to /projects', async () => {
    const { default: RegisterPage } = await import('@/app/register/page')
    mockSignUpEmail.mockResolvedValue({ data: { user: { id: 1 } }, error: null })

    render(<RegisterPage />)
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Sam' } })
    await fillAndSubmit()

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sam',
          email: 'user@example.com',
          password: 'secret123',
        })
      )
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })
  })
})
