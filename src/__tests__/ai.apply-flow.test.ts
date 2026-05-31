import Handlebars from 'handlebars'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { applyTemplateChanges } from '@/lib/ai/apply-flow'
import { unregisterCustomHelpers } from '@/lib/helper-loader'

beforeEach(() => {
  useTemplateStore.setState({
    itemId: null,
    html: '',
    css: '',
    name: '',
    miscText: '',
    isSaving: false,
    lastSaved: null,
    error: null,
  })
  usePreviewStore.setState({
    compiledHtml: '',
    isCompiling: false,
    compileError: null,
  })
  unregisterCustomHelpers()
})

describe('applyTemplateChanges', () => {
  it('updates templateStore html state', () => {
    applyTemplateChanges({ html: '<h1>{{title}}</h1>' })
    expect(useTemplateStore.getState().html).toBe('<h1>{{title}}</h1>')
  })

  it('updates templateStore css state', () => {
    applyTemplateChanges({ css: 'h1 { color: red; }' })
    expect(useTemplateStore.getState().css).toBe('h1 { color: red; }')
  })

  it('increments version number on each change', () => {
    applyTemplateChanges({ html: '<p>first</p>' })
    expect(useTemplateStore.getState().version).toBe(1)
    applyTemplateChanges({ html: '<p>second</p>' })
    expect(useTemplateStore.getState().version).toBe(2)
  })

  it('triggers previewStore compilation', () => {
    applyTemplateChanges({ html: '<h1>{{title}}</h1>', css: '' })
    const preview = usePreviewStore.getState()
    expect(preview.compiledHtml).toBeTruthy()
  })

  it('reloads helper registry when miscText contains register_helper call', () => {
    applyTemplateChanges({
      html: '<p>{{greet "World"}}</p>',
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'greet', params: ['name'], body: 'return `Hello, ${name}!`' },
        ],
      }),
    })
    const tpl = Handlebars.compile('{{greet "World"}}')
    expect(tpl({})).toBe('Hello, World!')
  })

  it('versions increment sequentially: 1 → 2 → 3', () => {
    applyTemplateChanges({ html: '<p>a</p>' })
    expect(useTemplateStore.getState().version).toBe(1)
    applyTemplateChanges({ html: '<p>b</p>' })
    expect(useTemplateStore.getState().version).toBe(2)
    applyTemplateChanges({ html: '<p>c</p>' })
    expect(useTemplateStore.getState().version).toBe(3)
  })
})
