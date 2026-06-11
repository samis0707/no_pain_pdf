'use client'

import { useEffect, useState } from 'react'
import {
  useTemplateLibraryStore,
  templateScopeLabel,
} from '@/stores/templateLibraryStore'

interface TemplatePickerProps {
  itemId: string
  projectId?: number
}

const SCOPE_STYLES: Record<string, string> = {
  preset: 'bg-zinc-100 text-zinc-600',
  user: 'bg-blue-100 text-blue-700',
  project: 'bg-emerald-100 text-emerald-700',
}

export default function TemplatePicker({ itemId, projectId }: TemplatePickerProps) {
  const { templates, isLoading, error, fetchTemplates, applyTemplate, saveAsTemplate } =
    useTemplateLibraryStore()
  const [newName, setNewName] = useState('')
  const [newScope, setNewScope] = useState<'user' | 'project'>('user')

  useEffect(() => {
    fetchTemplates(projectId)
  }, [fetchTemplates, projectId])

  return (
    <div className="flex flex-col gap-3 p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-semibold text-zinc-800">Templates</h3>

      {error && (
        <div data-testid="template-error" className="text-xs text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-zinc-400">Loading templates…</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((t) => {
            const scope = templateScopeLabel(t)
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 px-3 py-2 border rounded-md"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-zinc-800 truncate">{t.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${SCOPE_STYLES[scope]}`}
                  >
                    {scope}
                  </span>
                </div>
                <button
                  data-testid="apply-template-button"
                  type="button"
                  onClick={() => applyTemplate(itemId, t.id)}
                  className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shrink-0"
                >
                  Apply
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <input
          data-testid="template-name-input"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Save current design as…"
          className="flex-1 px-2 py-1 text-xs border rounded-md"
        />
        <select
          data-testid="template-scope-select"
          value={newScope}
          onChange={(e) => setNewScope(e.target.value as 'user' | 'project')}
          className="px-2 py-1 text-xs border rounded-md bg-white"
        >
          <option value="user">All my projects</option>
          <option value="project">This project</option>
        </select>
        <button
          data-testid="save-as-template-button"
          type="button"
          disabled={!newName.trim()}
          onClick={() => {
            saveAsTemplate(itemId, newName.trim(), newScope)
            setNewName('')
          }}
          className="px-2 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 rounded-md"
        >
          Save
        </button>
      </div>
    </div>
  )
}
