'use client'

import { useEffect } from 'react'
import { useDataStore } from '@/stores/dataStore'
import CSVUploader from './CSVUploader'
import DataPreview from './DataPreview'
import FieldMapper from './FieldMapper'

export default function DataImportPanel({ itemId }: { itemId: number }) {
  const { setItemId, fetchDatasets, columns, datasets, selectedDatasetId, selectDataset } = useDataStore()

  useEffect(() => {
    setItemId(itemId)
    fetchDatasets()
  }, [itemId, setItemId, fetchDatasets])

  useEffect(() => {
    if (datasets.length > 0 && selectedDatasetId === null) {
      selectDataset(datasets[0].id)
    }
  }, [datasets, selectedDatasetId, selectDataset])

  const hasData = columns.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">Import Data</h2>
        <p className="text-zinc-500 text-sm">
          Upload a CSV file to populate your template with data.
        </p>
      </div>

      <CSVUploader />

      {hasData && <DataPreview />}

      {hasData && <FieldMapper />}
    </div>
  )
}
