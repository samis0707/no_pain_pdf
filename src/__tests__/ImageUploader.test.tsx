import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUploadAsset, mockClearError, mockStore } = vi.hoisted(() => {
  const mockUploadAsset = vi.fn()
  const mockClearError = vi.fn()
  const mockStore = vi.fn(() => ({
    uploadAsset: mockUploadAsset,
    isUploading: false,
    error: null,
    clearError: mockClearError,
  }))
  mockStore.getState = vi.fn(() => ({
    uploadAsset: mockUploadAsset,
  }))
  return { mockUploadAsset, mockClearError, mockStore }
})

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: mockStore,
}))

import ImageUploader from '@/components/DataImport/ImageUploader'

beforeEach(() => {
  vi.clearAllMocks()
  mockStore.mockReturnValue({
    uploadAsset: mockUploadAsset,
    isUploading: false,
    error: null,
    clearError: mockClearError,
  })
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
})

function createFile(name = 'test.png', type = 'image/png', size = 1024) {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('ImageUploader', () => {
  it('renders drop zone with accept image/*', () => {
    render(<ImageUploader />)
    expect(screen.getByText(/Drag & drop an image file here/i)).toBeInTheDocument()
    const input = screen.getByTestId('image-upload-input')
    expect(input).toHaveAttribute('accept', 'image/*')
  })

  it('calls uploadAsset on file selection', () => {
    render(<ImageUploader />)
    const file = createFile()
    fireEvent.change(screen.getByTestId('image-upload-input'), {
      target: { files: [file] },
    })
    expect(mockUploadAsset).toHaveBeenCalledWith(file, undefined)
  })

  it('passes itemId to uploadAsset when prop is set', () => {
    render(<ImageUploader itemId={42} />)
    const file = createFile()
    fireEvent.change(screen.getByTestId('image-upload-input'), {
      target: { files: [file] },
    })
    expect(mockUploadAsset).toHaveBeenCalledWith(file, 42)
  })

  it('shows uploading state', () => {
    mockStore.mockReturnValue({
      uploadAsset: mockUploadAsset,
      isUploading: true,
      error: null,
      clearError: mockClearError,
    })
    render(<ImageUploader />)
    expect(screen.getByText(/Uploading/i)).toBeInTheDocument()
  })

  it('shows error banner when error is set', () => {
    mockStore.mockReturnValue({
      uploadAsset: mockUploadAsset,
      isUploading: false,
      error: 'Invalid file',
      clearError: mockClearError,
    })
    render(<ImageUploader />)
    expect(screen.getByText('Invalid file')).toBeInTheDocument()
  })

  it('dismisses error on click', () => {
    mockStore.mockReturnValue({
      uploadAsset: mockUploadAsset,
      isUploading: false,
      error: 'Invalid file',
      clearError: mockClearError,
    })
    render(<ImageUploader />)
    fireEvent.click(screen.getByText('Dismiss'))
    expect(mockClearError).toHaveBeenCalled()
  })

  it('shows preview after upload', async () => {
    render(<ImageUploader />)
    const file = createFile()
    fireEvent.change(screen.getByTestId('image-upload-input'), {
      target: { files: [file] },
    })
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  it('accepts only image MIME types', () => {
    render(<ImageUploader />)
    const input = screen.getByTestId('image-upload-input')
    expect(input).toHaveAttribute('accept', 'image/*')
  })
})
