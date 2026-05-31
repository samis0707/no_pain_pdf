import { describe, it, expect, beforeEach } from 'vitest'
import { createProvider } from '@/lib/ai/registry'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import { AnthropicProvider } from '@/lib/ai/providers/anthropic'

describe('AI Provider Registry', () => {
  const OLD_ENV = { ...process.env }

  beforeEach(() => {
    process.env = { ...OLD_ENV }
    delete process.env.LLM_PROVIDER
    delete process.env.LLM_API_KEY
    delete process.env.LLM_MODEL
  })

  it('returns OpenAI provider when LLM_PROVIDER=openai', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.LLM_API_KEY = 'sk-test123'
    process.env.LLM_MODEL = 'gpt-4'
    const provider = createProvider()
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('returns Anthropic provider when LLM_PROVIDER=anthropic', () => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.LLM_API_KEY = 'sk-ant-test456'
    process.env.LLM_MODEL = 'claude-3-opus-20240229'
    const provider = createProvider()
    expect(provider).toBeInstanceOf(AnthropicProvider)
  })

  it('throws error for unknown provider', () => {
    process.env.LLM_PROVIDER = 'unknown-vendor'
    process.env.LLM_API_KEY = 'sk-test'
    expect(() => createProvider()).toThrow()
  })

  it('throws error when API key is missing (LLM_API_KEY not set)', () => {
    process.env.LLM_PROVIDER = 'openai'
    delete process.env.LLM_API_KEY
    expect(() => createProvider()).toThrow()
  })

  it('reads custom model name from LLM_MODEL env var', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.LLM_API_KEY = 'sk-test'
    process.env.LLM_MODEL = 'gpt-4-turbo'
    const provider = createProvider()
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })
})
