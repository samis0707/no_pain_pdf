import { describe, it, expect } from 'vitest'
import {
  formatTextEvent,
  formatToolCallEvent,
  formatStreamEnd,
  formatErrorEvent,
} from '@/lib/ai/sse'

describe('SSE event formatting', () => {
  it('formats a text event correctly as data: {...}\n\n', () => {
    const result = formatTextEvent('Hello, world!')
    expect(result).toBe(
      'event: message\ndata: {"type":"text","content":"Hello, world!"}\n\n'
    )
  })

  it('formats a tool call event correctly', () => {
    const result = formatToolCallEvent('update_template', {
      html: '<h1>New</h1>',
      css: 'h1 { color: red; }',
    })
    expect(result).toBe(
      'event: message\ndata: {"type":"tool_call","tool":"update_template","args":{"html":"<h1>New</h1>","css":"h1 { color: red; }"}}\n\n'
    )
  })

  it('formats stream end event', () => {
    const result = formatStreamEnd('msg_abc123')
    expect(result).toBe('event: done\ndata: {"id":"msg_abc123"}\n\n')
  })

  it('handles encoding of JSON content with special characters', () => {
    const content = 'Line 1\nLine 2\tTabbed\nUnicode: ñ💡'
    const result = formatTextEvent(content)
    expect(result).toContain('\\n')
    expect(result).toContain('\\t')
    expect(result).toContain('ñ')
    expect(result).toContain('💡')
  })

  it('includes trailing double newline for SSE framing', () => {
    const result = formatTextEvent('test')
    expect(result).toMatch(/\n\n$/)
  })

  it('formats error event', () => {
    const result = formatErrorEvent('Internal server error')
    expect(result).toBe(
      'event: error\ndata: {"type":"error","content":"Internal server error"}\n\n'
    )
  })
})
