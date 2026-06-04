'use client'

import { useTemplateStore } from '@/stores/templateStore'
import { useDataStore } from '@/stores/dataStore'

export default function DebugBar() {
  const { itemId, projectId, name, version, pageFormat } = useTemplateStore()
  const { selectedDatasetId, datasets, rowCount } = useDataStore()

  const dataset = datasets.find((d) => d.id === selectedDatasetId)
  const pageSize = pageFormat
    ? `${pageFormat.name}`
    : 'A4'

  return (
    <div className="flex items-center gap-4 px-4 py-1 bg-zinc-900 text-zinc-300 text-[11px] font-mono border-b border-zinc-700 shrink-0">
      <span className="font-semibold text-zinc-500 tracking-wider uppercase text-[10px]">Debug</span>

      <span className="text-zinc-500">|</span>

      <span>
        Project <span className="text-zinc-100">{projectId ?? '—'}</span>
      </span>

      <span className="text-zinc-500">|</span>

      <span>
        Item <span className="text-zinc-100">#{itemId ?? '—'}</span>
        <span className="text-zinc-400 ml-1">{name || ''}</span>
      </span>

      <span className="text-zinc-500">|</span>

      <span>
        v<span className="text-zinc-100">{version}</span>
      </span>

      <span className="text-zinc-500">|</span>

      <span>
        Dataset <span className="text-zinc-100">{dataset?.name ?? '—'}</span>
        {dataset && <span className="text-zinc-400 ml-1">({rowCount} rows)</span>}
      </span>

      <span className="text-zinc-500">|</span>

      <span>
        Page <span className="text-zinc-100">{pageSize}</span>
      </span>
    </div>
  )
}
