import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { useDataStore } from '@/stores/dataStore'
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
    version: 0,
  })
  usePreviewStore.setState({
    compiledBody: '',
    isCompiling: false,
    compileError: null,
  })
  useDataStore.setState({
    itemId: null,
    datasets: [],
    selectedDatasetId: null,
    columns: [],
    rows: [],
    rowCount: 0,
    isUploading: false,
    isLoading: false,
    error: null,
    mapping: '',
  })
  unregisterCustomHelpers()
})

describe('applyTemplateChanges data passthrough', () => {
  it('compiles template with data from dataStore rows', () => {
    useDataStore.setState({
      rows: [{ name: 'Alice' }, { name: 'Bob' }],
    })

    applyTemplateChanges({ html: '{{#each rows}}{{name}},{{/each}}', css: '' })

    const preview = usePreviewStore.getState()
    expect(preview.compiledBody).toContain('Alice')
    expect(preview.compiledBody).toContain('Bob')
  })

  it('compiles template with first row fields as top-level variables', () => {
    useDataStore.setState({
      rows: [{ title: 'Hello World' }],
    })

    applyTemplateChanges({ html: '<h1>{{title}}</h1>', css: '' })

    const preview = usePreviewStore.getState()
    expect(preview.compiledBody).toContain('<h1>Hello World</h1>')
  })

  it('renders empty when dataStore has no rows', () => {
    applyTemplateChanges({ html: '{{#each rows}}{{name}},{{/each}}', css: '' })

    const preview = usePreviewStore.getState()
    expect(preview.compiledBody).not.toContain('undefined')
    expect(typeof preview.compiledBody).toBe('string')
  })

  it('exposes rows array for {{#each}} iteration', () => {
    useDataStore.setState({
      rows: [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ],
    })

    applyTemplateChanges({
      html: '{{#each rows}}{{firstName}} {{lastName}},{{/each}}',
      css: '',
    })

    const preview = usePreviewStore.getState()
    expect(preview.compiledBody).toContain('John Doe,')
    expect(preview.compiledBody).toContain('Jane Smith,')
  })

  it('compiles with combined template and data variables', () => {
    useDataStore.setState({
      rows: [{ name: 'Target' }],
    })

    applyTemplateChanges({
      html: '<h1>{{name}}</h1><p>Count: {{count}}</p>',
      css: '',
    })

    const preview = usePreviewStore.getState()
    expect(preview.compiledBody).toContain('<h1>Target</h1>')
    expect(preview.compiledBody).toContain('Count: ')
  })

  it('uses updated data after dataStore rows change', () => {
    useDataStore.setState({
      rows: [{ label: 'First' }],
    })

    applyTemplateChanges({ html: '{{label}}', css: '' })
    expect(usePreviewStore.getState().compiledBody).toContain('First')

    useDataStore.setState({
      rows: [{ label: 'Second' }],
    })

    applyTemplateChanges({ html: '{{label}}', css: '' })
    expect(usePreviewStore.getState().compiledBody).toContain('Second')
  })
})
