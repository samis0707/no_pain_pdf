import { describe, it, expect } from 'vitest'
import { ChatMessage, ToolCall, ToolResult, ProviderConfig } from '@/lib/ai/types'
import { AiProvider } from '@/lib/ai/provider'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import { AnthropicProvider } from '@/lib/ai/providers/anthropic'

describe('AI Provider Types', () => {
  it('ChatMessage has correct shape (role: string, content: string, toolCalls?: ToolCall[])', () => {
    const msg: ChatMessage = { role: 'user', content: 'Hello' }
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Hello')
  })

  it('ChatMessage can include optional toolCalls array', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      toolCalls: [],
    }
    expect(msg.toolCalls).toEqual([])
  })

  it('ToolCall has correct shape (id: string, name: string, args: Record<string, unknown>)', () => {
    const tc: ToolCall = { id: 'call_1', name: 'get_weather', args: { city: 'Paris' } }
    expect(tc.id).toBe('call_1')
    expect(tc.name).toBe('get_weather')
    expect(tc.args).toEqual({ city: 'Paris' })
  })

  it('ToolResult has correct shape (toolCallId: string, result: unknown)', () => {
    const tr: ToolResult = { toolCallId: 'call_1', result: { temperature: 22 } }
    expect(tr.toolCallId).toBe('call_1')
    expect(tr.result).toEqual({ temperature: 22 })
  })

  it('ProviderConfig has correct shape (apiKey: string, model: string, baseUrl?: string)', () => {
    const config: ProviderConfig = { apiKey: 'sk-test', model: 'gpt-4' }
    expect(config.apiKey).toBe('sk-test')
    expect(config.model).toBe('gpt-4')
  })

  it('ProviderConfig accepts optional baseUrl', () => {
    const config: ProviderConfig = {
      apiKey: 'sk-test',
      model: 'gpt-4',
      baseUrl: 'https://custom.example.com',
    }
    expect(config.baseUrl).toBe('https://custom.example.com')
  })
})

describe('AiProvider Base Class', () => {
  it('throws if chat() is called directly (abstract method enforcement)', async () => {
    class TestProvider extends AiProvider {
      async chatStream() {
        return (async function* () {})()
      }
    }
    const provider = new TestProvider({ apiKey: 'test', model: 'test' })
    await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow()
  })

  it('supportsToolCalling() returns false by default', () => {
    class TestProvider extends AiProvider {
      async chat() {
        return { role: 'assistant', content: '' }
      }
      async chatStream() {
        return (async function* () {})()
      }
    }
    const provider = new TestProvider({ apiKey: 'test', model: 'test' })
    expect(provider.supportsToolCalling()).toBe(false)
  })
})

describe('OpenAI Provider', () => {
  const config: ProviderConfig = { apiKey: 'sk-test', model: 'gpt-4' }

  it('constructor accepts ProviderConfig', () => {
    const provider = new OpenAIProvider(config)
    expect(provider).toBeInstanceOf(OpenAIProvider)
    expect(provider).toBeInstanceOf(AiProvider)
  })

  it('chat() returns Promise<ChatMessage>', async () => {
    const provider = new OpenAIProvider(config)
    const result = await provider.chat([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ])
    expect(result).toHaveProperty('role')
    expect(result).toHaveProperty('content')
  })

  it('supportsToolCalling() returns true', () => {
    const provider = new OpenAIProvider(config)
    expect(provider.supportsToolCalling()).toBe(true)
  })

  it('correctly formats a chat message with system + user roles', async () => {
    const provider = new OpenAIProvider(config)
    const result = await provider.chat([
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'What is 2+2?' },
    ])
    expect(result.role).toBe('assistant')
    expect(typeof result.content).toBe('string')
    expect(result.content.length).toBeGreaterThan(0)
  })

  it('handles empty response gracefully', async () => {
    const provider = new OpenAIProvider(config)
    const result = await provider.chat([])
    expect(result).toBeDefined()
    expect(result).toHaveProperty('content')
  })
})

describe('Anthropic Provider', () => {
  const config: ProviderConfig = {
    apiKey: 'sk-ant-test',
    model: 'claude-3-opus-20240229',
  }

  it('constructor accepts ProviderConfig', () => {
    const provider = new AnthropicProvider(config)
    expect(provider).toBeInstanceOf(AnthropicProvider)
    expect(provider).toBeInstanceOf(AiProvider)
  })

  it('chat() returns Promise<ChatMessage>', async () => {
    const provider = new AnthropicProvider(config)
    const result = await provider.chat([{ role: 'user', content: 'Hello' }])
    expect(result).toHaveProperty('role')
    expect(result).toHaveProperty('content')
  })

  it('supportsToolCalling() returns true', () => {
    const provider = new AnthropicProvider(config)
    expect(provider.supportsToolCalling()).toBe(true)
  })

  it('correctly formats a chat message with system + user roles', async () => {
    const provider = new AnthropicProvider(config)
    const result = await provider.chat([
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'What is the capital of France?' },
    ])
    expect(result.role).toBe('assistant')
    expect(typeof result.content).toBe('string')
    expect(result.content.length).toBeGreaterThan(0)
  })
})
