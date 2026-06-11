import { describe, it, expect } from 'vitest'
import { seedTemplates } from '../../prisma/seed-templates'
import { parseHandlebars, serializeHandlebars } from '@/lib/grapes/handlebars-ast'

describe('parse → serialize identity', () => {
  for (const template of seedTemplates) {
    it(`round-trips the "${template.name}" seed template byte-identically`, () => {
      const nodes = parseHandlebars(template.html)
      expect(serializeHandlebars(nodes)).toBe(template.html)
    })
  }

  it('round-trips nested each inside if', () => {
    const tpl =
      '{{#if hasEvents}}<ul>{{#each events}}<li>{{title}} — {{date}}</li>{{/each}}</ul>{{else}}<p>No events</p>{{/if}}'
    expect(serializeHandlebars(parseHandlebars(tpl))).toBe(tpl)
  })

  it('round-trips if inside each with whitespace preserved', () => {
    const tpl =
      '{{#each rows}}\n  <div>\n    {{#if highlight}}<strong>{{name}}</strong>{{else}}{{name}}{{/if}}\n  </div>\n{{/each}}\n'
    expect(serializeHandlebars(parseHandlebars(tpl))).toBe(tpl)
  })

  it('round-trips triple-stash (unescaped) variables', () => {
    const tpl = '<div>{{{rawHtml}}}</div>'
    expect(serializeHandlebars(parseHandlebars(tpl))).toBe(tpl)
  })

  it('round-trips helper expressions with arguments', () => {
    const tpl = '{{#each (sortBy items "name")}}<p>{{formatDate date "DD.MM.YYYY"}}</p>{{/each}}'
    expect(serializeHandlebars(parseHandlebars(tpl))).toBe(tpl)
  })
})

describe('parse structure', () => {
  it('exposes variables with their paths', () => {
    const nodes = parseHandlebars('<h1>{{title}}</h1>')
    expect(nodes).toHaveLength(3)
    expect(nodes[1]).toMatchObject({ kind: 'variable', path: 'title' })
  })

  it('exposes block helpers with params and children', () => {
    const nodes = parseHandlebars('{{#each events}}<p>{{title}}</p>{{/each}}')
    expect(nodes).toHaveLength(1)
    const block = nodes[0] as {
      kind: string
      helper: string
      params: string[]
      children: Array<{ kind: string }>
    }
    expect(block.kind).toBe('block')
    expect(block.helper).toBe('each')
    expect(block.params).toEqual(['events'])
    expect(block.children).toHaveLength(3)
  })

  it('exposes the inverse (else) branch', () => {
    const nodes = parseHandlebars('{{#if x}}A{{else}}B{{/if}}')
    const block = nodes[0] as { inverse?: Array<{ kind: string; value: string }> }
    expect(block.inverse).toHaveLength(1)
    expect(block.inverse![0]).toMatchObject({ kind: 'content', value: 'B' })
  })

  it('throws a useful error on invalid syntax', () => {
    expect(() => parseHandlebars('{{#each x}}unclosed')).toThrow()
  })
})
