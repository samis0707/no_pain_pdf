'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useAssetStore } from '@/stores/assetStore'

export default function ImageUploader({ itemId }: { itemId?: number }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isUploading, error, clearError } = useAssetStore()

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    clearError()
    setFileName(file.name)
    setFileSize(formatSize(file.size))
    setPreviewUrl(URL.createObjectURL(file))
    useAssetStore.getState().uploadAsset(file, itemId)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onClick() {
    inputRef.current?.click()
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <img
            src={previewUrl}
            alt={fileName ?? 'Uploaded image'}
            className="w-full h-48 object-cover"
          />
          {fileName && (
            <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-200">
              <p className="text-xs text-zinc-500">
                {fileName} ({fileSize})
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onClick}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-zinc-300 bg-zinc-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="image-upload-input"
            onChange={onChange}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="animate-spin h-6 w-6 text-zinc-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span className="text-sm text-zinc-500">Uploading...</span>
            </div>
          ) : isDragOver ? (
            <p className="text-sm font-medium text-blue-600">Drop image here</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-zinc-500">
                Drag & drop an image file here, or click to browse
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <span className="text-sm text-red-600">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
