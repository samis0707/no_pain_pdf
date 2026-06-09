import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAssetStore, type Asset } from '@/stores/assetStore'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function createAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    filename: '1749000000000-photo.jpg',
    originalName: 'photo.jpg',
    mimeType: 'image/jpeg',
    fileSize: 102400,
    url: '/api/assets/file/1749000000000-photo.jpg',
    createdAt: '2026-06-09T12:00:00Z',
    ...overrides,
  }
}

describe('assetStore', () => {
  beforeEach(() => {
    useAssetStore.setState({
      assets: [],
      isUploading: false,
      error: null,
    })
    mockFetch.mockReset()
  })

  describe('uploadAsset', () => {
    it('sets isUploading, POSTs to /api/assets/upload, clears isUploading, adds asset to list', async () => {
      const file = new File(['filedata'], 'photo.jpg', { type: 'image/jpeg' })
      const returnedAsset = createAsset()
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(returnedAsset), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const uploadPromise = useAssetStore.getState().uploadAsset(file, 42)

      expect(useAssetStore.getState().isUploading).toBe(true)

      await uploadPromise

      expect(mockFetch).toHaveBeenCalledWith('/api/assets/upload', {
        method: 'POST',
        body: expect.any(FormData),
      })

      const formData = mockFetch.mock.calls[0][1].body as FormData
      expect(formData.get('file')).toBe(file)
      expect(formData.get('printItemId')).toBe('42')

      const state = useAssetStore.getState()
      expect(state.isUploading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.assets).toHaveLength(1)
      expect(state.assets[0]).toEqual(returnedAsset)
    })

    it('sets error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await useAssetStore.getState().uploadAsset(new File([], 'test.jpg'), 42)

      const state = useAssetStore.getState()
      expect(state.isUploading).toBe(false)
      expect(state.error).toBe('Network error')
      expect(state.assets).toHaveLength(0)
    })

    it('sets error on non-ok response', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'File too large' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      await useAssetStore.getState().uploadAsset(new File([], 'test.jpg'), 42)

      const state = useAssetStore.getState()
      expect(state.isUploading).toBe(false)
      expect(state.error).toBe('File too large')
      expect(state.assets).toHaveLength(0)
    })
  })

  describe('fetchAssets', () => {
    it('GETs from /api/assets?printItemId={id} and hydrates assets list', async () => {
      const assets = [createAsset({ id: 1 }), createAsset({ id: 2, originalName: 'logo.png' })]
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(assets), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      await useAssetStore.getState().fetchAssets(42)

      expect(mockFetch).toHaveBeenCalledWith('/api/assets?printItemId=42')
      expect(useAssetStore.getState().assets).toEqual(assets)
      expect(useAssetStore.getState().error).toBeNull()
    })
  })

  describe('deleteAsset', () => {
    it('sends DELETE to /api/assets/{id} and removes from list', async () => {
      const asset1 = createAsset({ id: 1 })
      const asset2 = createAsset({ id: 2, originalName: 'logo.png' })
      useAssetStore.setState({ assets: [asset1, asset2] })

      mockFetch.mockResolvedValue(new Response(null, { status: 200 }))

      await useAssetStore.getState().deleteAsset(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/assets/1', {
        method: 'DELETE',
      })
      expect(useAssetStore.getState().assets).toEqual([asset2])
      expect(useAssetStore.getState().error).toBeNull()
    })
  })

  describe('clearError', () => {
    it('resets error to null', () => {
      useAssetStore.setState({ error: 'Something went wrong' })

      useAssetStore.getState().clearError()

      expect(useAssetStore.getState().error).toBeNull()
    })
  })
})
