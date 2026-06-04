import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDataStore } from '@/stores/dataStore'

beforeEach(() => {
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
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('selectDataset with mapping edge cases', () => {
  it('treats DB default "[]" mapping as empty string', () => {
    useDataStore.setState({
      datasets: [{
        id: 1,
        name: 'test',
        columns: '["col1","col2"]',
        rows: '[{"col1":"a","col2":"b"}]',
        rowCount: 1,
        mapping: '[]',
      }],
    })

    useDataStore.getState().selectDataset(1)
    expect(useDataStore.getState().mapping).toBe('')
  })

  it('loads valid mapping JSON strings correctly', () => {
    const mapping = JSON.stringify({ 'Full Name': 'fullName' })
    useDataStore.setState({
      datasets: [{
        id: 1,
        name: 'test',
        columns: '["Full Name"]',
        rows: '[{"Full Name":"Alice"}]',
        rowCount: 1,
        mapping,
      }],
    })

    useDataStore.getState().selectDataset(1)
    expect(useDataStore.getState().mapping).toBe(mapping)
  })

  it('sets mapping to empty when selecting null', () => {
    useDataStore.setState({
      mapping: JSON.stringify({ a: 'b' }),
    })

    useDataStore.getState().selectDataset(null)
    expect(useDataStore.getState().mapping).toBe('')
  })
})

describe('saveMapping action', () => {
  it('calls PUT with mapping body and correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    useDataStore.setState({
      itemId: 5,
      selectedDatasetId: 10,
      mapping: JSON.stringify({ col: 'var' }),
      datasets: [],
    })

    await useDataStore.getState().saveMapping()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const putCall = mockFetch.mock.calls[0]
    expect(putCall[0]).toBe('/api/items/5/datasets/10')
    expect(putCall[1]?.method).toBe('PUT')
    expect(putCall[1]?.headers).toEqual({ 'Content-Type': 'application/json' })

    const body = JSON.parse(putCall[1]?.body as string)
    expect(body).toEqual({ mapping: JSON.stringify({ col: 'var' }) })
  })

  it('does nothing when no itemId is set', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    useDataStore.setState({ itemId: null, selectedDatasetId: null })
    await useDataStore.getState().saveMapping()

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does nothing when no selectedDatasetId is set', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    useDataStore.setState({ itemId: 1, selectedDatasetId: null })
    await useDataStore.getState().saveMapping()

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('re-fetches datasets after successful save', async () => {
    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    useDataStore.setState({
      itemId: 1,
      selectedDatasetId: 2,
      mapping: '{}',
    })

    await useDataStore.getState().saveMapping()

    expect(callCount).toBe(2)
    expect(mockFetch.mock.calls[1][0]).toBe('/api/items/1/datasets')
  })
})
