import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import grapesjs, { type Editor } from 'grapesjs'
import { seedTemplates } from '../../prisma/seed-templates'
import hbsPlugin from '@/lib/grapes/plugin'
import { hbsToGrapesHtml, grapesHtmlToHbs, parseHandlebars } from '@/lib/grapes/transform'
import type { HbsNode } from '@/lib/grapes/handlebars-ast'

// The canvas owns the HTML and may normalize whitespace between tags; the
// fidelity contract is that every Handlebars construct survives exactly and
// content matches modulo whitespace.
function structure(nodes: HbsNode[]): HbsNode[] {
  return nodes.map((n) => {
    switch (n.kind) {
      case 'content':
        return { ...n, value: n.value.replace(/\s+/g, '') }
      case 'block':
        return {
          ...n,
          children: structure(n.children),
          inverse: n.inverse ? structure(n.inverse) : undefined,
        }
      default:
        return n
    }
  })
}

let editor: Editor

beforeEach(() => {
  editor = grapesjs.init({ headless: true, plugins: [hbsPlugin] })
})

afterEach(() => {
  editor.destroy()
})

describe('hbs grapes plugin', () => {
  it('recognizes variables, each blocks and if blocks as dedicated component types', () => {
    editor.setComponents(
      hbsToGrapesHtml(
        '{{#each rows}}{{#if special}}<em>{{name}}</em>{{/if}}{{/each}}'
      )
    )
    const wrapper = editor.getWrapper()!

    expect(wrapper.findType('hbs-each')).toHaveLength(1)
    expect(wrapper.findType('hbs-if')).toHaveLength(1)
    expect(wrapper.findType('hbs-variable')).toHaveLength(1)
  })

  it('registers palette blocks for Field, Repeating Block and Conditional', () => {
    const ids = editor.Blocks.getAll().map((b) => b.getId())
    expect(ids).toEqual(
      expect.arrayContaining(['hbs-variable', 'hbs-each', 'hbs-if'])
    )
  })

  for (const template of seedTemplates) {
    it(`canvas round-trip of "${template.name}" preserves the Handlebars structure`, () => {
      editor.setComponents(hbsToGrapesHtml(template.html))
      const roundTripped = grapesHtmlToHbs(editor.getWrapper()!.getInnerHTML())

      expect(structure(parseHandlebars(roundTripped))).toEqual(
        structure(parseHandlebars(template.html))
      )
    })
  }
})
