import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import {
  helperManager,
  type RegisteredHelper,
} from '@/lib/ai/helper-manager'

beforeEach(() => {
  helperManager.clear()
})

describe('helperManager', () => {
  it('returns an empty list when no helpers are registered', () => {
    expect(helperManager.list()).toEqual([])
  })

  it('returns registered helpers with name, params, and body', () => {
    helperManager.register({
      name: 'greet',
      params: ['name'],
      body: 'return `Hello, ${name}!`',
    })
    const helpers = helperManager.list()
    expect(helpers).toHaveLength(1)
    expect(helpers[0].name).toBe('greet')
    expect(helpers[0].params).toEqual(['name'])
    expect(helpers[0].body).toBe('return `Hello, ${name}!`')
  })

  it('deleting a helper removes it from the list', () => {
    helperManager.register({ name: 'a', params: [], body: 'return "A"' })
    helperManager.register({ name: 'b', params: [], body: 'return "B"' })
    expect(helperManager.list()).toHaveLength(2)

    helperManager.delete('a')
    const remaining = helperManager.list()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].name).toBe('b')
  })

  it('editing a helper updates its name', () => {
    helperManager.register({ name: 'oldName', params: [], body: 'return 1' })
    helperManager.update('oldName', { name: 'newName' })
    const helpers = helperManager.list()
    expect(helpers.find((h) => h.name === 'newName')).toBeDefined()
    expect(helpers.find((h) => h.name === 'oldName')).toBeUndefined()
  })

  it('editing a helper updates its params and body', () => {
    helperManager.register({
      name: 'add',
      params: ['a', 'b'],
      body: 'return a + b',
    })
    helperManager.update('add', { params: ['x'], body: 'return x * 2' })
    const h = helperManager.get('add')
    expect(h?.params).toEqual(['x'])
    expect(h?.body).toBe('return x * 2')
  })

  it('active helpers are flagged differently', () => {
    helperManager.register({ name: 'idle', params: ['v'], body: 'return v' })
    helperManager.register({ name: 'active', params: ['v'], body: 'return v' })
    helperManager.activate('active')
    const helpers = helperManager.list()
    const active = helpers.find((h) => h.name === 'active')
    const idle = helpers.find((h) => h.name === 'idle')
    expect(active?.active).toBe(true)
    expect(idle?.active).toBe(false)
  })

  it('persists helpers into templateStore miscText', () => {
    helperManager.register({
      name: 'double',
      params: ['n'],
      body: 'return n * 2',
    })
    helperManager.persist()
    const { miscText } = useTemplateStore.getState()
    expect(miscText).toBeTruthy()
    const parsed = JSON.parse(miscText)
    expect(parsed.customHelpers).toHaveLength(1)
    expect(parsed.customHelpers[0].name).toBe('double')
  })

  it('persisted helpers trigger preview recompilation', () => {
    helperManager.register({
      name: 'upper',
      params: ['s'],
      body: 'return String(s).toUpperCase()',
    })
    helperManager.persist()
    expect(usePreviewStore.getState().isCompiling).toBe(true)
  })
})
