'use client'

import { useState, useEffect, useMemo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useTemplateStore } from '@/stores/templateStore'
import { extractTemplateVariables } from '@/utils/extractVariables'

function toVariableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export default function FieldMapper() {
  const { columns, mapping, setMapping, saveMapping } = useDataStore()
  const { html } = useTemplateStore()
  const [variableMap, setVariableMap] = useState<Record<string, string>>({})

  const templateVars = useMemo(() => extractTemplateVariables(html), [html])
  const mappedValues = new Set(Object.values(variableMap))

  useEffect(() => {
    if (columns.length > 0) {
      if (mapping) {
        try {
          const parsed = JSON.parse(mapping)
          setVariableMap(parsed)
        } catch {
          const initial: Record<string, string> = {}
          columns.forEach((col) => {
            initial[col] = toVariableName(col)
          })
          setVariableMap(initial)
        }
      } else {
        const initial: Record<string, string> = {}
        columns.forEach((col) => {
          initial[col] = toVariableName(col)
        })
        setVariableMap(initial)
      }
    }
  }, [columns, mapping])

  function updateVariable(column: string, value: string) {
    setVariableMap((prev) => ({ ...prev, [column]: value }))
  }

  async function handleApply() {
    const json = JSON.stringify(variableMap)
    setMapping(json)
    await saveMapping()
  }

  if (!columns.length) return null

  return (
    <div className="space-y-4">
      <div>
        {columns.map((col) => (
          <div
            key={col}
            className="flex items-center gap-3 py-2 border-b border-zinc-100"
          >
            <span className="text-sm font-medium text-zinc-700 w-1/3">
              {col}
            </span>
            <input
              type="text"
              value={variableMap[col] ?? ''}
              onChange={(e) => updateVariable(col, e.target.value)}
              className="flex-1 border rounded-md px-3 py-1.5 text-sm font-mono"
              placeholder={toVariableName(col)}
            />
          </div>
        ))}
      </div>

      {templateVars.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
            Template variables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templateVars.map((v) => {
              const isMapped = mappedValues.has(v)
              return (
                <span
                  key={v}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${
                    isMapped
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {'{{'}{v}{'}}'}
                  {isMapped ? '✓' : '⚠'}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(variableMap).map(([col, variable]) => (
          <span key={col} className="text-xs text-zinc-400 font-mono">
            {'{{'}
            {variable}
            {'}}'}
          </span>
        ))}
      </div>

      <button
        onClick={handleApply}
        className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800"
      >
        Apply Mapping
      </button>
    </div>
  )
}
