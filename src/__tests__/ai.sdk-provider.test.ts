import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveModel', () => {
  it('builds an anthropic model from env', async () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic')
    vi.stubEnv('LLM_API_KEY', 'key')
    vi.stubEnv('LLM_MODEL', 'claude-sonnet-4-6')

    const { resolveModel } = await import('@/lib/ai/sdk-provider')
    const model = resolveModel()

    expect(model.modelId).toBe('claude-sonnet-4-6')
    expect(model.provider).toContain('anthropic')
  })

  it('builds an openai-compatible model honoring LLM_BASE_URL', async () => {
    vi.stubEnv('LLM_PROVIDER', 'openai')
    vi.stubEnv('LLM_API_KEY', 'key')
    vi.stubEnv('LLM_MODEL', 'gpt-codex-6')
    vi.stubEnv('LLM_BASE_URL', 'https://api.eurouter.ai/api/v1')

    const { resolveModel } = await import('@/lib/ai/sdk-provider')
    const model = resolveModel()

    expect(model.modelId).toBe('gpt-codex-6')
    // Must target /chat/completions, not the OpenAI-only /responses API —
    // LLM_PROVIDER=openai covers OpenAI-compatible routers (eurouter etc.).
    expect(model.provider).toBe('openai.chat')
  })

  it('builds a google model from env', async () => {
    vi.stubEnv('LLM_PROVIDER', 'google')
    vi.stubEnv('LLM_API_KEY', 'key')
    vi.stubEnv('LLM_MODEL', 'gemini-3-pro')

    const { resolveModel } = await import('@/lib/ai/sdk-provider')
    const model = resolveModel()

    expect(model.modelId).toBe('gemini-3-pro')
  })

  it('throws a clear error for a missing provider', async () => {
    vi.stubEnv('LLM_PROVIDER', '')

    const { resolveModel } = await import('@/lib/ai/sdk-provider')

    expect(() => resolveModel()).toThrow(/LLM_PROVIDER/)
  })

  it('throws for an unknown provider name', async () => {
    vi.stubEnv('LLM_PROVIDER', 'clippy')
    vi.stubEnv('LLM_API_KEY', 'key')
    vi.stubEnv('LLM_MODEL', 'm')

    const { resolveModel } = await import('@/lib/ai/sdk-provider')

    expect(() => resolveModel()).toThrow(/clippy/)
  })
})
