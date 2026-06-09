import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDeleteAsset, mockFetchAssets, mockUseAssetStore } = vi.hoisted(() => {
  const mockDeleteAsset = vi.fn()
  const mockFetchAssets = vi.fn()
  const mockUseAssetStore = Object.assign(vi.fn(), {
    getState: vi.fn(),
  })
  return { mockDeleteAsset, mockFetchAssets, mockUseAssetStore }
})

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: mockUseAssetStore,
}))

import AssetBrowser from '@/components/DataImport/AssetBrowser'
import type { Asset } from '@/stores/assetStore'

function createMockAssets(count: number): Asset[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    filename: `img${i + 1}.png`,
    originalName: `Image ${i + 1}.png`,
    mimeType: 'image/png',
    fileSize: 1024 * (i + 1),
    url: `https://example.com/img${i + 1}.png`,
    createdAt: '2025-01-01T00:00:00Z',
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  const defaultStore = {
    assets: [],
    deleteAsset: mockDeleteAsset,
    fetchAssets: mockFetchAssets,
  }
  mockUseAssetStore.mockReturnValue(defaultStore)
  mockUseAssetStore.getState.mockReturnValue(defaultStore)
})

describe('AssetBrowser', () => {
  it('renders empty state when no assets', () => {
    render(<AssetBrowser />)
    expect(screen.getByText('No images uploaded')).toBeInTheDocument()
  })

  it('renders grid of images', () => {
    const store = {
      assets: createMockAssets(2),
      deleteAsset: mockDeleteAsset,
      fetchAssets: mockFetchAssets,
    }
    mockUseAssetStore.mockReturnValue(store)
    render(<AssetBrowser />)
    expect(screen.getByText('Image 1.png')).toBeInTheDocument()
    expect(screen.getByText('Image 2.png')).toBeInTheDocument()
  })

  it('displays thumbnail with correct url', () => {
    const store = {
      assets: createMockAssets(1),
      deleteAsset: mockDeleteAsset,
      fetchAssets: mockFetchAssets,
    }
    mockUseAssetStore.mockReturnValue(store)
    render(<AssetBrowser />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/img1.png')
  })

  it('displays filename for each asset', () => {
    const store = {
      assets: createMockAssets(2),
      deleteAsset: mockDeleteAsset,
      fetchAssets: mockFetchAssets,
    }
    mockUseAssetStore.mockReturnValue(store)
    render(<AssetBrowser />)
    expect(screen.getByText('Image 1.png')).toBeInTheDocument()
    expect(screen.getByText('Image 2.png')).toBeInTheDocument()
  })

  it('delete button removes asset', () => {
    const store = {
      assets: createMockAssets(1),
      deleteAsset: mockDeleteAsset,
      fetchAssets: mockFetchAssets,
    }
    mockUseAssetStore.mockReturnValue(store)
    render(<AssetBrowser />)
    const deleteBtn = screen.getByTestId('delete-asset-1')
    fireEvent.click(deleteBtn)
    expect(mockDeleteAsset).toHaveBeenCalledWith(1)
  })

  it('fetches assets on mount when itemId prop provided', () => {
    render(<AssetBrowser itemId={42} />)
    expect(mockUseAssetStore.getState).toHaveBeenCalled()
    expect(mockFetchAssets).toHaveBeenCalledWith(42)
  })
})
