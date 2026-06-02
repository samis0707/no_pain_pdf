import Handlebars from 'handlebars'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerHelpers } from '@/lib/handlebars-helpers'

const DISPLAY_HELPER_NAMES = ['formatDate', 'truncate', 'ifEquals', 'ifContains', 'formatTime', 'sortByPrimary']

beforeAll(() => {
  registerHelpers()
})

afterAll(() => {
  DISPLAY_HELPER_NAMES.forEach((name) => {
    delete (Handlebars as any).helpers[name]
  })
})

describe('ifContains', () => {
  it('renders block when string contains substring', () => {
    const tpl = Handlebars.compile('{{#ifContains text "Hello"}}YES{{/ifContains}}')
    expect(tpl({ text: 'Hello World' })).toBe('YES')
  })

  it('renders inverse when string does not contain substring', () => {
    const tpl = Handlebars.compile('{{#ifContains text "Hello"}}YES{{else}}NO{{/ifContains}}')
    expect(tpl({ text: 'Goodbye World' })).toBe('NO')
  })

  it('handles null/undefined string', () => {
    const tpl = Handlebars.compile('{{#ifContains text "Hello"}}YES{{else}}NO{{/ifContains}}')
    expect(tpl({ text: null })).toBe('NO')
    expect(tpl({})).toBe('NO')
  })

  it('handles null/undefined substring', () => {
    const tpl = Handlebars.compile('{{#ifContains text substring}}YES{{else}}NO{{/ifContains}}')
    expect(tpl({ text: 'Hello' })).toBe('YES')
  })
})

describe('formatTime', () => {
  it('formats HH:mm from ISO datetime string', () => {
    const tpl = Handlebars.compile('{{formatTime date "HH:mm"}}')
    expect(tpl({ date: '2025-12-03T08:30:00+00:00' })).toBe('08:30')
  })

  it('formats HH:mm:ss when format includes seconds', () => {
    const tpl = Handlebars.compile('{{formatTime date "HH:mm:ss"}}')
    const result = tpl({ date: '2025-12-03T14:05:30+00:00' })
    expect(result).toBe('14:05:30')
  })

  it('returns the original string for invalid dates', () => {
    const tpl = Handlebars.compile('{{formatTime date "HH:mm"}}')
    expect(tpl({ date: 'not-a-date' })).toBe('not-a-date')
  })

  it('handles empty date', () => {
    const tpl = Handlebars.compile('{{formatTime date "HH:mm"}}')
    expect(tpl({ date: '' })).toBe('')
  })
})

describe('sortByPrimary', () => {
  it('sorts array ascending by field', () => {
    const tpl = Handlebars.compile('{{#each (sortByPrimary items "category")}}{{category}},{{/each}}')
    const result = tpl({ items: [{ category: 'zeta' }, { category: 'alpha' }, { category: 'beta' }] })
    expect(result).toBe('alpha,beta,zeta,')
  })

  it('handles empty array', () => {
    const tpl = Handlebars.compile('{{#each (sortByPrimary items "category")}}{{category}},{{/each}}')
    expect(tpl({ items: [] })).toBe('')
  })

  it('handles null/undefined array', () => {
    const tpl = Handlebars.compile('{{#each (sortByPrimary items "category")}}{{category}},{{/each}}')
    expect(tpl({ items: null })).toBe('')
    expect(tpl({})).toBe('')
  })

  it('sorts case-insensitively', () => {
    const tpl = Handlebars.compile('{{#each (sortByPrimary items "name")}}{{name}},{{/each}}')
    const result = tpl({ items: [{ name: 'Zebra' }, { name: 'apple' }, { name: 'Banana' }] })
    expect(result).toBe('apple,Banana,Zebra,')
  })

  it('can be used with #each and nested helper', () => {
    const tpl = Handlebars.compile('{{#each (sortByPrimary (sortByPrimary items "category") "name")}}{{name}}-{{category}},{{/each}}')
    const result = tpl({
      items: [
        { name: 'Bob', category: 'B' },
        { name: 'Alice', category: 'A' },
        { name: 'Charlie', category: 'A' },
      ],
    })
    expect(result).toBe('Alice-A,Bob-B,Charlie-A,')
  })
})
