import { describe, it, expect } from 'vitest'
import { seedTemplates } from '../../prisma/seed-templates'
import { hbsToGrapesHtml, grapesHtmlToHbs } from '@/lib/grapes/transform'

describe('handlebars ↔ grapes html transform', () => {
  it('wraps variables in editable marker elements', () => {
    const html = hbsToGrapesHtml('<h1>{{title}}</h1>')
    expect(html).toContain('data-hbs-var="title"')
    expect(html).toContain('{{title}}')
  })

  it('wraps each blocks in container marker elements', () => {
    const html = hbsToGrapesHtml('{{#each events}}<p>{{title}}</p>{{/each}}')
    expect(html).toContain('data-hbs-block="each"')
    expect(html).toContain('data-hbs-params="events"')
    expect(html).toContain('data-hbs-var="title"')
  })

  it('represents if/else with separate branch containers', () => {
    const html = hbsToGrapesHtml('{{#if x}}A{{else}}B{{/if}}')
    expect(html).toContain('data-hbs-block="if"')
    expect(html).toContain('data-hbs-branch="else"')
  })

  for (const template of seedTemplates) {
    it(`round-trips the "${template.name}" seed through the grapes representation`, () => {
      const grapesHtml = hbsToGrapesHtml(template.html)
      expect(grapesHtmlToHbs(grapesHtml)).toBe(template.html)
    })
  }

  it('round-trips nested blocks through the grapes representation', () => {
    const tpl =
      '{{#each rows}}<div>{{#if highlight}}<strong>{{name}}</strong>{{else}}{{name}}{{/if}}</div>{{/each}}'
    expect(grapesHtmlToHbs(hbsToGrapesHtml(tpl))).toBe(tpl)
  })
})
