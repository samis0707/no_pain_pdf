'use client'

import { useEffect } from 'react'
import { useDataStore } from '@/stores/dataStore'

export default function DataPreview() {
  const {
    columns,
    rows,
    rowCount,
    isLoading,
    datasets,
    selectedDatasetId,
    selectDataset,
    fetchDatasets,
    itemId,
  } = useDataStore()

  useEffect(() => {
    if (itemId) fetchDatasets()
  }, [itemId, fetchDatasets])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
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
      </div>
    )
  }

  if (!columns.length) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-sm text-zinc-400">No data</p>
      </div>
    )
  }

  const displayedRows = rows.slice(0, 20)

  return (
    <div className="space-y-3">
      {datasets.length > 1 && (
        <select
          value={selectedDatasetId ?? ''}
          onChange={(e) => selectDataset(e.target.value ? Number(e.target.value) : null)}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          {datasets.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.name}
            </option>
          ))}
        </select>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-xs font-medium text-zinc-700 uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, i) => (
              <tr key={i}>
                {columns.map((col, j) => (
                  <td
                    key={col}
                    className={`text-sm text-zinc-600 border-b border-zinc-200 px-3 py-2 ${
                      j === 0 ? 'pl-6' : ''
                    }`}
                  >
                    {row[col] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-400">
        Showing {displayedRows.length} of {rowCount} rows
      </p>
    </div>
  )
}
