import Handlebars from 'handlebars'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { registerDataHelpers, DATA_HELPER_NAMES } from '@/lib/handlebars-helpers.data'

beforeAll(() => {
  registerDataHelpers()
})

afterAll(() => {
  DATA_HELPER_NAMES.forEach((name) => {
    delete (Handlebars as any).helpers[name]
  })
})

describe('sortBy', () => {
  it('sorts array ascending by field', () => {
    const tpl = Handlebars.compile('{{#each (sortBy items "name")}}{{name}},{{/each}}')
    const result = tpl({ items: [{ name: 'zeta' }, { name: 'alpha' }, { name: 'beta' }] })
    expect(result).toBe('alpha,beta,zeta,')
  })

  it('handles empty array', () => {
    const tpl = Handlebars.compile('{{#each (sortBy items "name")}}{{name}},{{/each}}')
    expect(tpl({ items: [] })).toBe('')
  })

  it('handles null/undefined array', () => {
    const tpl = Handlebars.compile('{{#each (sortBy items "name")}}{{name}},{{/each}}')
    expect(tpl({ items: null })).toBe('')
    expect(tpl({})).toBe('')
  })

  it('sorts case-insensitively', () => {
    const tpl = Handlebars.compile('{{#each (sortBy items "name")}}{{name}},{{/each}}')
    const result = tpl({ items: [{ name: 'Zeta' }, { name: 'alpha' }, { name: 'Beta' }] })
    expect(result).toBe('alpha,Beta,Zeta,')
  })
})

describe('sortByDesc', () => {
  it('sorts array descending by field', () => {
    const tpl = Handlebars.compile('{{#each (sortByDesc items "name")}}{{name}},{{/each}}')
    const result = tpl({ items: [{ name: 'alpha' }, { name: 'zeta' }, { name: 'beta' }] })
    expect(result).toBe('zeta,beta,alpha,')
  })

  it('handles empty array', () => {
    const tpl = Handlebars.compile('{{#each (sortByDesc items "name")}}{{name}},{{/each}}')
    expect(tpl({ items: [] })).toBe('')
  })
})

describe('filterBy', () => {
  it('filters array by matching field value', () => {
    const tpl = Handlebars.compile('{{#each (filterBy items "active" "yes")}}{{name}},{{/each}}')
    const items = [
      { name: 'A', active: 'yes' },
      { name: 'B', active: 'no' },
      { name: 'C', active: 'yes' },
    ]
    expect(tpl({ items })).toBe('A,C,')
  })

  it('returns empty array when no matches', () => {
    const tpl = Handlebars.compile('{{#each (filterBy items "active" "yes")}}{{name}},{{/each}}')
    expect(tpl({ items: [{ name: 'A', active: 'no' }] })).toBe('')
  })

  it('handles null/undefined array', () => {
    const tpl = Handlebars.compile('{{#each (filterBy items "active" "yes")}}{{name}},{{/each}}')
    expect(tpl({ items: null })).toBe('')
  })
})

describe('filterNot', () => {
  it('excludes items matching field value', () => {
    const tpl = Handlebars.compile('{{#each (filterNot items "active" "yes")}}{{name}},{{/each}}')
    const items = [
      { name: 'A', active: 'yes' },
      { name: 'B', active: 'no' },
      { name: 'C', active: 'yes' },
    ]
    expect(tpl({ items })).toBe('B,')
  })
})

describe('groupBy', () => {
  it('groups array by field value', () => {
    const tpl = Handlebars.compile(
      '{{#each (groupBy items "type")}}{{key}}: {{#each items}}{{name}} {{/each}}|{{/each}}'
    )
    const items = [
      { name: 'A', type: 'fruit' },
      { name: 'B', type: 'veg' },
      { name: 'C', type: 'fruit' },
    ]
    expect(tpl({ items })).toBe('fruit: A C |veg: B |')
  })

  it('handles empty array', () => {
    const tpl = Handlebars.compile('{{#each (groupBy items "type")}}{{key}},{{/each}}')
    expect(tpl({ items: [] })).toBe('')
  })
})

describe('first', () => {
  it('returns first n items', () => {
    const tpl = Handlebars.compile('{{#each (first items 2)}}{{name}},{{/each}}')
    expect(tpl({ items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })).toBe('A,B,')
  })

  it('returns all items when n exceeds length', () => {
    const tpl = Handlebars.compile('{{#each (first items 10)}}{{name}},{{/each}}')
    expect(tpl({ items: [{ name: 'A' }, { name: 'B' }] })).toBe('A,B,')
  })

  it('handles empty array', () => {
    const tpl = Handlebars.compile('{{#each (first items 2)}}{{name}},{{/each}}')
    expect(tpl({ items: [] })).toBe('')
  })
})

describe('last', () => {
  it('returns last n items', () => {
    const tpl = Handlebars.compile('{{#each (last items 2)}}{{name}},{{/each}}')
    expect(tpl({ items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })).toBe('B,C,')
  })
})

describe('slice', () => {
  it('slices array from start to end', () => {
    const tpl = Handlebars.compile('{{#each (slice items 1 3)}}{{name}},{{/each}}')
    const items = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]
    expect(tpl({ items })).toBe('B,C,')
  })
})

describe('pluck', () => {
  it('extracts field values', () => {
    const tpl = Handlebars.compile('{{#each (pluck items "name")}}{{this}},{{/each}}')
    const items = [{ name: 'A' }, { name: 'B' }]
    expect(tpl({ items })).toBe('A,B,')
  })
})

describe('string helpers', () => {
  it('concat joins multiple values', () => {
    const tpl = Handlebars.compile('{{concat "Hello" " " "World" "!"}}')
    expect(tpl({})).toBe('Hello World!')
  })

  it('lower converts to lowercase', () => {
    const tpl = Handlebars.compile('{{lower "Hello World"}}')
    expect(tpl({})).toBe('hello world')
  })

  it('upper converts to uppercase', () => {
    const tpl = Handlebars.compile('{{upper "Hello"}}')
    expect(tpl({})).toBe('HELLO')
  })

  it('defaultStr returns fallback for empty value', () => {
    const tpl = Handlebars.compile('{{defaultStr title "Untitled"}}')
    expect(tpl({ title: '' })).toBe('Untitled')
    expect(tpl({ title: 'My Title' })).toBe('My Title')
  })
})

describe('logic helpers', () => {
  it('eq compares equality', () => {
    const tpl = Handlebars.compile('{{#if (eq status "active")}}yes{{else}}no{{/if}}')
    expect(tpl({ status: 'active' })).toBe('yes')
    expect(tpl({ status: 'inactive' })).toBe('no')
  })

  it('gt compares greater than', () => {
    const tpl = Handlebars.compile('{{#if (gt count 5)}}big{{else}}small{{/if}}')
    expect(tpl({ count: 10 })).toBe('big')
    expect(tpl({ count: 3 })).toBe('small')
  })

  it('gte compares greater than or equal', () => {
    const tpl = Handlebars.compile('{{#if (gte count 5)}}yes{{else}}no{{/if}}')
    expect(tpl({ count: 5 })).toBe('yes')
    expect(tpl({ count: 4 })).toBe('no')
  })

  it('lt compares less than', () => {
    const tpl = Handlebars.compile('{{#if (lt count 5)}}small{{else}}big{{/if}}')
    expect(tpl({ count: 3 })).toBe('small')
    expect(tpl({ count: 10 })).toBe('big')
  })

  it('lte compares less than or equal', () => {
    const tpl = Handlebars.compile('{{#if (lte count 5)}}yes{{else}}no{{/if}}')
    expect(tpl({ count: 5 })).toBe('yes')
    expect(tpl({ count: 6 })).toBe('no')
  })

  it('and returns true when all args are truthy', () => {
    const tpl = Handlebars.compile('{{#if (and a b)}}yes{{else}}no{{/if}}')
    expect(tpl({ a: true, b: true })).toBe('yes')
    expect(tpl({ a: true, b: false })).toBe('no')
  })

  it('or returns true when any arg is truthy', () => {
    const tpl = Handlebars.compile('{{#if (or a b)}}yes{{else}}no{{/if}}')
    expect(tpl({ a: true, b: false })).toBe('yes')
    expect(tpl({ a: false, b: false })).toBe('no')
  })

  it('not negates value', () => {
    const tpl = Handlebars.compile('{{#if (not active)}}inactive{{else}}active{{/if}}')
    expect(tpl({ active: false })).toBe('inactive')
    expect(tpl({ active: true })).toBe('active')
  })
})

describe('complex patterns', () => {
  it('chained subexpressions: first of sortBy', () => {
    const tpl = Handlebars.compile(
      '{{#each (first (sortBy items "name") 2)}}{{name}},{{/each}}'
    )
    const items = [
      { name: 'Charlie' },
      { name: 'Alpha' },
      { name: 'Bravo' },
      { name: 'Delta' },
    ]
    expect(tpl({ items })).toBe('Alpha,Bravo,')
  })

  it('groupBy with nested each', () => {
    const tpl = Handlebars.compile(
      '{{#each (groupBy items "cat")}}{{key}}:{{#each items}}{{name}},{{/each}}|{{/each}}'
    )
    const items = [
      { name: 'A', cat: 'x' },
      { name: 'B', cat: 'y' },
      { name: 'C', cat: 'x' },
    ]
    expect(tpl({ items })).toBe('x:A,C,|y:B,|')
  })

  it('filterBy in each with template data', () => {
    const tpl = Handlebars.compile(
      '{{#each (filterBy items "department" "eng")}}{{name}} ({{role}}),{{/each}}'
    )
    const items = [
      { name: 'Alice', department: 'eng', role: 'dev' },
      { name: 'Bob', department: 'sales', role: 'rep' },
      { name: 'Carol', department: 'eng', role: 'lead' },
    ]
    expect(tpl({ items })).toBe('Alice (dev),Carol (lead),')
  })

  it('sortBy with numeric field stored as string', () => {
    const tpl = Handlebars.compile('{{#each (sortBy items "order")}}{{name}},{{/each}}')
    const items = [
      { name: 'C', order: '3' },
      { name: 'A', order: '1' },
      { name: 'B', order: '2' },
    ]
    expect(tpl({ items })).toBe('A,B,C,')
  })
})
