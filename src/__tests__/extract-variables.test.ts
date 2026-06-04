import { describe, it, expect } from 'vitest'
import { extractTemplateVariables } from '@/utils/extractVariables'

describe('extractTemplateVariables', () => {
  it('extracts a simple {{var}}', () => {
    expect(extractTemplateVariables('<h1>{{title}}</h1>')).toEqual(['title'])
  })

  it('extracts multiple unique variables', () => {
    const vars = extractTemplateVariables('<p>{{name}}</p><p>{{email}}</p>')
    expect(vars.sort()).toEqual(['email', 'name'])
  })

  it('returns unique variable names only', () => {
    const vars = extractTemplateVariables('{{name}}{{name}}{{name}}')
    expect(vars).toEqual(['name'])
  })

  it('extracts variables inside {{#each}}...{{/each}} blocks', () => {
    const vars = extractTemplateVariables('{{#each rows}}<li>{{name}}</li>{{/each}}')
    expect(vars.sort()).toEqual(['name', 'rows'])
  })

  it('extracts variables from nested blocks', () => {
    const template = '{{#each items}}{{#if active}}<p>{{title}}</p>{{/if}}{{/each}}'
    const vars = extractTemplateVariables(template)
    expect(vars.sort()).toEqual(['active', 'items', 'title'])
  })

  it('extracts params from sub-expressions like (eq a b)', () => {
    const template = '{{#if (eq status "active")}}<span>{{label}}</span>{{/if}}'
    const vars = extractTemplateVariables(template)
    expect(vars.sort()).toEqual(['label', 'status'])
  })

  it('extracts params from helper calls like {{formatDate date "YYYY"}}', () => {
    const template = '{{formatDate date "YYYY"}}'
    const vars = extractTemplateVariables(template)
    expect(vars).toEqual(['date'])
  })

  it('extracts variable from helper-only call like {{upper name}}', () => {
    const vars = extractTemplateVariables('{{upper name}}')
    expect(vars).toEqual(['name'])
  })

  it('skips block helpers: #each, #if, #unless', () => {
    const vars = extractTemplateVariables('{{#each items}}{{/each}}{{#if x}}{{/if}}{{#unless y}}{{/unless}}')
    expect(vars).toEqual(['items', 'x', 'y'])
  })

  it('skips partials {{> header}}', () => {
    const vars = extractTemplateVariables('{{> header}}<p>{{content}}</p>')
    expect(vars).toEqual(['content'])
  })

  it('skips comments {{! this is a comment}}', () => {
    const vars = extractTemplateVariables('{{! comment}}<p>{{text}}</p>')
    expect(vars).toEqual(['text'])
  })

  it('returns empty array for empty template', () => {
    expect(extractTemplateVariables('')).toEqual([])
  })

  it('returns empty array for template with no variables', () => {
    expect(extractTemplateVariables('<p>No variables here</p>')).toEqual([])
  })

  it('handles dot paths like {{person.name}}', () => {
    const vars = extractTemplateVariables('{{person.name}}')
    expect(vars).toEqual(['person.name'])
  })

  it('handles complex template with mixed constructs', () => {
    const template = `
      <h1>{{title}}</h1>
      {{#each rows}}
        <p>{{firstName}} {{lastName}}</p>
      {{/each}}
      {{#if (gte total "100")}}
        <span>{{totalLabel}}</span>
      {{/if}}
      {{formatDate createdAt "MM/DD/YYYY"}}
    `
    const vars = extractTemplateVariables(template)
    expect(vars.sort()).toEqual([
      'createdAt',
      'firstName',
      'lastName',
      'rows',
      'title',
      'total',
      'totalLabel',
    ])
  })
})
