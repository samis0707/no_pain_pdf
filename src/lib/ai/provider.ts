import { ChatMessage, ProviderConfig } from './types'

export abstract class AiProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  abstract chatStream(messages: ChatMessage[], tools?: unknown[]): AsyncGenerator<string>

  async chat(_messages: ChatMessage[], _tools?: unknown[]): Promise<ChatMessage> {
    throw new Error('chat() not implemented. Use a concrete provider subclass.')
  }

  supportsToolCalling(): boolean {
    return false
  }
}
