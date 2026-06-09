'use client'

import { useEffect, useState } from 'react'
import { useAssetStore } from '@/stores/assetStore'

interface AssetBrowserProps {
  itemId?: number
}

export default function AssetBrowser({ itemId }: AssetBrowserProps) {
  const { assets, deleteAsset } = useAssetStore()
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (itemId !== undefined) {
      useAssetStore.getState().fetchAssets(itemId)
    }
  }, [itemId])

  function handleImageError(id: number) {
    setFailedImages((prev) => new Set(prev).add(id))
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    deleteAsset(id)
  }

  if (assets.length === 0) {
    return (
      <div data-testid="asset-browser" className="flex flex-col items-center justify-center py-12 text-zinc-400">
        <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No images uploaded</p>
      </div>
    )
  }

  return (
    <div data-testid="asset-browser" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {assets.map((asset) => (
        <div key={asset.id} className="group relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
          {failedImages.has(asset.id) ? (
            <div className="flex items-center justify-center h-32 bg-zinc-100">
              <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : (
            <img
              src={asset.url}
              alt={asset.originalName}
              className="h-32 w-full object-cover"
              onError={() => handleImageError(asset.id)}
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-xs text-white truncate">{asset.originalName}</p>
          </div>
          <button
            data-testid={`delete-asset-${asset.id}`}
            onClick={(e) => handleDelete(e, asset.id)}
            className="absolute top-1 right-1 rounded-full bg-black/40 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            aria-label={`Delete ${asset.originalName}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
