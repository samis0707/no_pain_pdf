'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Item {
  id: number
  name: string
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = parseInt(params.id)

  const [projectName, setProjectName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(projectId)) return
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((p) => p && setProjectName(p.name))
      .catch(() => setError('Failed to load project'))
    fetch(`/api/projects/${projectId}/items`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setItems)
      .catch(() => {})
  }, [projectId])

  async function createItem() {
    if (!newName.trim()) return
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: newName.trim() }),
    })
    if (!res.ok) {
      setError('Failed to create item')
      return
    }
    const item = await res.json()
    router.push(`/items/${item.id}`)
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Projects
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">{projectName}</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center gap-2">
          <input
            data-testid="new-item-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New print item name…"
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-white"
          />
          <button
            data-testid="new-item-button"
            onClick={createItem}
            disabled={!newName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-400 rounded-md"
            type="button"
          >
            Create
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              data-testid="item-card"
              onClick={() => router.push(`/items/${item.id}`)}
              className="flex flex-col items-start gap-1 p-4 bg-white border rounded-lg hover:border-zinc-400 text-left"
              type="button"
            >
              <span className="text-sm font-medium text-zinc-900">{item.name}</span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-zinc-400 col-span-full">
              No print items yet — create one above.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
