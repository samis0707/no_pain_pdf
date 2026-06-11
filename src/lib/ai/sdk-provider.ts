import type { LanguageModel } from 'ai'

/**
 * Env-driven model factory — preserves the provider-agnostic contract of the
 * legacy registry (LLM_PROVIDER / LLM_API_KEY / LLM_MODEL / LLM_BASE_URL).
 */
export function resolveModel(): Extract<LanguageModel, object> {
  const provider = process.env.LLM_PROVIDER
  const apiKey = process.env.LLM_API_KEY ?? ''
  const model = process.env.LLM_MODEL ?? ''
  const baseURL = process.env.LLM_BASE_URL || undefined

  if (!provider) {
    throw new Error('LLM_PROVIDER is not set — configure it in .env (openai | anthropic | google)')
  }

  switch (provider) {
    case 'openai': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createOpenAI } = require('@ai-sdk/openai') as typeof import('@ai-sdk/openai')
      // .chat() targets /chat/completions — required for OpenAI-compatible
      // routers (eurouter, Groq, DeepSeek …) that don't serve /responses.
      return createOpenAI({ apiKey, baseURL }).chat(model)
    }
    case 'anthropic': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAnthropic } = require('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic')
      return createAnthropic({ apiKey, baseURL })(model)
    }
    case 'google': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createGoogleGenerativeAI } = require('@ai-sdk/google') as typeof import('@ai-sdk/google')
      return createGoogleGenerativeAI({ apiKey, baseURL })(model)
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER "${provider}" — supported: openai, anthropic, google`)
  }
}
