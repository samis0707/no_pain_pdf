import { AiProvider } from './provider'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { ProviderConfig } from './types'

export function createProvider(): AiProvider {
  const provider = process.env.LLM_PROVIDER
  const apiKey = process.env.LLM_API_KEY

  if (!provider) {
    throw new Error('LLM_PROVIDER environment variable is not set')
  }

  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is not set')
  }

  const model = process.env.LLM_MODEL || ''

  const config: ProviderConfig = {
    apiKey,
    model,
    baseUrl: process.env.LLM_BASE_URL,
  }

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'anthropic':
      return new AnthropicProvider(config)
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Supported providers: openai, anthropic`)
  }
}
