import { create } from 'zustand'

export interface Asset {
  id: number
  filename: string
  originalName: string
  mimeType: string
  fileSize: number
  url: string
  createdAt?: string
}

interface AssetState {
  assets: Asset[]
  isUploading: boolean
  error: string | null

  uploadAsset: (file: File, itemId?: number) => Promise<Asset | null>
  fetchAssets: (itemId: number) => Promise<void>
  deleteAsset: (id: number) => Promise<void>
  clearError: () => void
}

export const useAssetStore = create<AssetState>()((set, get) => ({
  assets: [],
  isUploading: false,
  error: null,

  uploadAsset: async (file, itemId) => {
    set({ isUploading: true, error: null })

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (itemId !== undefined) {
        formData.append('printItemId', String(itemId))
      }

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        set({ error: err.error || 'Upload failed' })
        return null
      }

      const asset: Asset = await res.json()
      set({ assets: [asset, ...get().assets] })
      return asset
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Upload failed' })
      return null
    } finally {
      set({ isUploading: false })
    }
  },

  fetchAssets: async (itemId) => {
    set({ error: null })

    try {
      const res = await fetch(`/api/assets?printItemId=${itemId}`)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch assets' }))
        set({ error: err.error || 'Failed to fetch assets' })
        return
      }

      const data: Asset[] = await res.json()
      set({ assets: data })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch assets' })
    }
  },

  deleteAsset: async (id) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete asset' }))
        set({ error: err.error || 'Failed to delete asset' })
        return
      }

      set({ assets: get().assets.filter((a) => a.id !== id) })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete asset' })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
