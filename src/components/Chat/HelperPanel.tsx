'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTemplateStore } from '@/stores/templateStore'
import { helperManager } from '@/lib/ai/helper-manager'

interface ParsedHelper {
  name: string
  params: string[]
  body: string
}

function parseHelpers(miscText: string): ParsedHelper[] {
  if (!miscText) return []
  try {
    const parsed = JSON.parse(miscText)
    if (Array.isArray(parsed.customHelpers)) {
      return parsed.customHelpers.filter(
        (h: unknown): h is ParsedHelper =>
          typeof h === 'object' && h !== null && typeof (h as ParsedHelper).name === 'string',
      )
    }
    return []
  } catch {
    return []
  }
}

interface EditForm {
  name: string
  params: string
  body: string
}

export default function HelperPanel() {
  const miscText = useTemplateStore((s) => s.miscText)
  const helpers = parseHelpers(miscText)

  const [editingName, setEditingName] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', params: '', body: '' })

  useEffect(() => {
    helperManager.clear()
    for (const h of helpers) {
      helperManager.register(h)
    }
  }, [miscText])

  const handleDelete = useCallback(
    (name: string) => {
      helperManager.delete(name)
      helperManager.persist()
    },
    [],
  )

  const startEdit = useCallback(
    (helper: ParsedHelper) => {
      setEditingName(helper.name)
      setEditForm({
        name: helper.name,
        params: helper.params.join(', '),
        body: helper.body,
      })
    },
    [],
  )

  const cancelEdit = useCallback(() => {
    setEditingName(null)
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingName) return
    const params = editForm.params
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    helperManager.update(editingName, { name: editForm.name, params, body: editForm.body })
    helperManager.persist()
    setEditingName(null)
  }, [editingName, editForm])

  if (helpers.length === 0) {
    return (
      <div className="px-4 py-3 border-t border-zinc-200">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Custom Helpers
        </h3>
        <p className="text-xs text-zinc-400 italic">No custom helpers registered.</p>
      </div>
    )
  }

  return (
    <div className="border-t border-zinc-200">
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Custom Helpers
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {helpers.map((helper) => {
            const isEditing = editingName === helper.name
            return (
              <div
                key={helper.name}
                data-testid={`helper-card-${helper.name}`}
                className="text-xs bg-zinc-50 rounded border border-zinc-200 p-2"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-zinc-400 mb-0.5">Name</label>
                      <input
                        data-testid="edit-name-input"
                        className="w-full border border-zinc-300 rounded px-2 py-1 text-xs font-mono"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5">Params</label>
                      <input
                        data-testid="edit-params-input"
                        className="w-full border border-zinc-300 rounded px-2 py-1 text-xs font-mono"
                        value={editForm.params}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, params: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5">Body</label>
                      <textarea
                        data-testid="edit-body-input"
                        className="w-full border border-zinc-300 rounded px-2 py-1 text-xs font-mono h-16"
                        value={editForm.body}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, body: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        data-testid="save-helper-btn"
                        onClick={saveEdit}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        data-testid="cancel-edit-btn"
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs bg-zinc-200 text-zinc-600 rounded hover:bg-zinc-300"
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-700">{helper.name}</span>
                      <div className="flex gap-1">
                        <button
                          data-testid={`edit-helper-${helper.name}`}
                          onClick={() => startEdit(helper)}
                          className="text-zinc-400 hover:text-blue-500 px-1"
                          type="button"
                        >
                          ✏️
                        </button>
                        <button
                          data-testid={`delete-helper-${helper.name}`}
                          onClick={() => handleDelete(helper.name)}
                          className="text-zinc-400 hover:text-red-500 px-1"
                          type="button"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {helper.params.length > 0 && (
                      <div className="text-zinc-400 mb-0.5">
                        ({helper.params.join(', ')})
                      </div>
                    )}
                    <pre className="text-zinc-500 bg-white rounded p-1 border border-zinc-100 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                      {helper.body}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
