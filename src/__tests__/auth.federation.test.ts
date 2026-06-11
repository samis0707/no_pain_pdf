import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockSignInWithPassword,
  mockCreateClient,
  mockUserFindFirst,
  mockUserCreate,
  mockUserUpdate,
  mockAccountFindFirst,
  mockAccountCreate,
  mockHashPassword,
} = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockCreateClient: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockUserCreate: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockAccountFindFirst: vi.fn(),
  mockAccountCreate: vi.fn(),
  mockHashPassword: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

vi.mock('better-auth/crypto', () => ({
  hashPassword: mockHashPassword,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: mockUserFindFirst,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
    account: {
      findFirst: mockAccountFindFirst,
      create: mockAccountCreate,
    },
  },
}))

const SUPABASE_USER = {
  id: 'sb-uuid-1',
  email: 'legacy@example.com',
  user_metadata: { name: 'Legacy User' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://proj.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
  mockCreateClient.mockReturnValue({
    auth: { signInWithPassword: mockSignInWithPassword },
  })
  mockSignInWithPassword.mockResolvedValue({ data: { user: SUPABASE_USER }, error: null })
  mockHashPassword.mockResolvedValue('scrypt-hash')
  mockUserFindFirst.mockResolvedValue(null)
  mockAccountFindFirst.mockResolvedValue(null)
  mockUserCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 5,
    ...data,
  }))
  mockUserUpdate.mockResolvedValue({})
  mockAccountCreate.mockResolvedValue({})
})

describe('federateSupabaseUser', () => {
  it('provisions a new local user + credential account on first Supabase login', async () => {
    const { federateSupabaseUser } = await import('@/lib/supabase-federation')

    const result = await federateSupabaseUser('legacy@example.com', 'secret123')

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'legacy@example.com',
      password: 'secret123',
    })
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'legacy@example.com',
        supabaseUserId: 'sb-uuid-1',
        emailVerified: true,
      }),
    })
    // lazy migration: same password becomes the local credential
    expect(mockHashPassword).toHaveBeenCalledWith('secret123')
    expect(mockAccountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 5,
        providerId: 'credential',
        password: 'scrypt-hash',
      }),
    })
    expect(result).toEqual({ ok: true, created: true })
  })

  it('links an existing local user by email and creates the missing credential', async () => {
    const { federateSupabaseUser } = await import('@/lib/supabase-federation')
    mockUserFindFirst.mockResolvedValue({ id: 8, email: 'legacy@example.com', supabaseUserId: null })

    const result = await federateSupabaseUser('legacy@example.com', 'secret123')

    expect(mockUserCreate).not.toHaveBeenCalled()
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 8 },
      data: expect.objectContaining({ supabaseUserId: 'sb-uuid-1' }),
    })
    expect(mockAccountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 8, providerId: 'credential' }),
    })
    expect(result).toEqual({ ok: true, linked: true })
  })

  it('never overwrites an existing local credential', async () => {
    const { federateSupabaseUser } = await import('@/lib/supabase-federation')
    mockUserFindFirst.mockResolvedValue({ id: 8, email: 'legacy@example.com', supabaseUserId: 'sb-uuid-1' })
    mockAccountFindFirst.mockResolvedValue({ id: 1, userId: 8, providerId: 'credential' })

    const result = await federateSupabaseUser('legacy@example.com', 'different-pw')

    expect(result.ok).toBe(false)
    expect(mockAccountCreate).not.toHaveBeenCalled()
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('rejects when Supabase rejects the credentials', async () => {
    const { federateSupabaseUser } = await import('@/lib/supabase-federation')
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } })

    const result = await federateSupabaseUser('legacy@example.com', 'wrong')

    expect(result.ok).toBe(false)
    expect(mockUserCreate).not.toHaveBeenCalled()
    expect(mockAccountCreate).not.toHaveBeenCalled()
  })

  it('is disabled when Supabase env vars are missing', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    const { federateSupabaseUser } = await import('@/lib/supabase-federation')

    const result = await federateSupabaseUser('legacy@example.com', 'secret123')

    expect(result.ok).toBe(false)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })
})
