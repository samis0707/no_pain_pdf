import { create } from 'zustand'

interface DataState {
  itemId: number | null
  datasets: { id: number; name: string; columns: string; rows: string; rowCount: number; mapping: string }[]
  selectedDatasetId: number | null
  columns: string[]
  rows: Record<string, string>[]
  rowCount: number
  isUploading: boolean
  isLoading: boolean
  error: string | null

  setItemId: (id: number) => void
  fetchDatasets: () => Promise<void>
  uploadCsv: (file: File) => Promise<void>
  selectDataset: (id: number | null) => void
  mapping: string
  setMapping: (mapping: string) => void
  clearError: () => void
}

function serializeField(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value ?? [])
}

function normalizeDatasets(
  data: Record<string, unknown>[]
): DataState['datasets'] {
  return data.map((d) => ({
    id: d.id as number,
    name: d.name as string,
    columns: serializeField(d.columns),
    rows: serializeField(d.rows),
    rowCount: d.rowCount as number,
    mapping: serializeField(d.mapping),
  }))
}

export const useDataStore = create<DataState>()((set, get) => ({
  itemId: null,
  datasets: [],
  selectedDatasetId: null,
  columns: [],
  rows: [],
  rowCount: 0,
  isUploading: false,
  isLoading: false,
  mapping: '',
  error: null,

  setItemId: (id) => {
    set({
      itemId: id,
      datasets: [],
      selectedDatasetId: null,
      columns: [],
      rows: [],
      rowCount: 0,
      mapping: '',
      error: null,
    })
  },

  fetchDatasets: async () => {
    const { itemId } = get()
    if (!itemId) return

    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`/api/items/${itemId}/datasets`)
      if (!res.ok) throw new Error('Failed to fetch datasets')
      const data: Record<string, unknown>[] = await res.json()
      set({ datasets: normalizeDatasets(data) })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch datasets' })
    } finally {
      set({ isLoading: false })
    }
  },

  uploadCsv: async (file) => {
    const { itemId } = get()
    if (!itemId) return

    set({ isUploading: true, error: null })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/items/${itemId}/datasets`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      const dataset = await res.json()

      set({
        selectedDatasetId: dataset.id,
        columns: dataset.columns,
        rows: dataset.rows,
        rowCount: dataset.rowCount,
      })

      await get().fetchDatasets()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Upload failed' })
    } finally {
      set({ isUploading: false })
    }
  },

  selectDataset: (id) => {
    if (id === null) {
      set({ selectedDatasetId: null, columns: [], rows: [], rowCount: 0, mapping: '' })
      return
    }

    const dataset = get().datasets.find((d) => d.id === id)
    if (!dataset) return

    try {
      const columns: string[] = JSON.parse(dataset.columns)
      const rows: Record<string, string>[] = JSON.parse(dataset.rows)
      set({
        selectedDatasetId: id,
        columns,
        rows,
        rowCount: dataset.rowCount,
        mapping: dataset.mapping,
      })
    } catch {
      set({ error: 'Failed to parse dataset' })
    }
  },

  setMapping: (mapping) => {
    set({ mapping })
  },

  clearError: () => {
    set({ error: null })
  },
}))
