import Handlebars from 'handlebars'
import { describe, it, expect, beforeEach } from 'vitest'
import { loadHelpers, unregisterCustomHelpers } from '@/lib/helper-loader'

beforeEach(() => {
  unregisterCustomHelpers()
})

describe('loadHelpers', () => {
  it('registers a custom helper from miscText JSON', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        { name: 'greet', params: ['name'], body: 'return `Hello, ${name}!`' },
      ],
    }))
    const tpl = Handlebars.compile('{{greet "World"}}')
    expect(tpl({})).toBe('Hello, World!')
  })

  it('registers a helper with subexpression in #if', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        {
          name: 'startsWith',
          params: ['str', 'prefix'],
          body: 'return String(str).startsWith(String(prefix))',
        },
      ],
    }))
    const tpl = Handlebars.compile('{{#if (startsWith name "A")}}match{{else}}no{{/if}}')
    expect(tpl({ name: 'Alice' })).toBe('match')
    expect(tpl({ name: 'Bob' })).toBe('no')
  })

  it('registers a helper with subexpression in #each', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        {
          name: 'activeUsers',
          params: ['users'],
          body: 'return users.filter(u => u.active)',
        },
      ],
    }))
    const tpl = Handlebars.compile('{{#each (activeUsers users)}}{{name}},{{/each}}')
    expect(tpl({
      users: [
        { name: 'Alice', active: true },
        { name: 'Bob', active: false },
        { name: 'Carol', active: true },
      ],
    })).toBe('Alice,Carol,')
  })

  it('custom helper can access template data', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        { name: 'uppercase', params: ['str'], body: 'return String(str).toUpperCase()' },
      ],
    }))
    const tpl = Handlebars.compile('{{uppercase title}}')
    expect(tpl({ title: 'hello' })).toBe('HELLO')
  })

  it('unregisters previous custom helpers when loading new ones', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        { name: 'helperA', params: [], body: 'return "A"' },
      ],
    }))
    expect(Handlebars.compile('{{helperA}}')({})).toBe('A')

    loadHelpers(JSON.stringify({
      customHelpers: [
        { name: 'helperB', params: [], body: 'return "B"' },
      ],
    }))
    expect(Handlebars.compile('{{helperB}}')({})).toBe('B')
    expect(Handlebars.compile('{{helperA}}')({})).toBe('')
  })

  it('handles empty miscText gracefully', () => {
    expect(() => loadHelpers('')).not.toThrow()
    expect(() => loadHelpers(undefined)).not.toThrow()
    expect(() => loadHelpers('{}')).not.toThrow()
  })

  it('handles malformed JSON gracefully', () => {
    expect(() => loadHelpers('not valid json')).not.toThrow()
  })

  it('handles invalid helper body gracefully', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        { name: 'bad', params: [], body: 'this is not valid js {{{' },
      ],
    }))
  })

  it('handles miscText without customHelpers field', () => {
    expect(() => loadHelpers(JSON.stringify({ someOtherField: 'value' }))).not.toThrow()
  })

  it('multiple custom helpers can be loaded together', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        { name: 'double', params: ['n'], body: 'return n * 2' },
        { name: 'triple', params: ['n'], body: 'return n * 3' },
      ],
    }))
    expect(Handlebars.compile('{{double 5}}')({})).toBe('10')
    expect(Handlebars.compile('{{triple 5}}')({})).toBe('15')
  })

  it('custom helper works inside an #each block with this context', () => {
    loadHelpers(JSON.stringify({
      customHelpers: [
        {
          name: 'fullName',
          params: ['person'],
          body: 'return person.first + " " + person.last',
        },
      ],
    }))
    const tpl = Handlebars.compile('{{#each people}}{{fullName this}},{{/each}}')
    expect(tpl({
      people: [
        { first: 'John', last: 'Doe' },
        { first: 'Jane', last: 'Smith' },
      ],
    })).toBe('John Doe,Jane Smith,')
  })
})
