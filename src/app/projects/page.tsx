'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface Project {
  id: number
  name: string
  status: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => (res.ok ? res.json() : []))
      .then(setProjects)
      .catch(() => setError('Failed to load projects'))
  }, [])

  async function createProject() {
    if (!newName.trim()) return
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (!res.ok) {
      setError('Failed to create project')
      return
    }
    const project = await res.json()
    router.push(`/projects/${project.id}`)
  }

  async function signOut() {
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <h1 className="text-lg font-semibold text-zinc-900">My Projects</h1>
        <button
          data-testid="sign-out-button"
          onClick={signOut}
          className="px-3 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50"
          type="button"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center gap-2">
          <input
            data-testid="new-project-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name…"
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-white"
          />
          <button
            data-testid="new-project-button"
            onClick={createProject}
            disabled={!newName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-400 rounded-md"
            type="button"
          >
            Create
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              data-testid="project-card"
              onClick={() => router.push(`/projects/${p.id}`)}
              className="flex flex-col items-start gap-1 p-4 bg-white border rounded-lg hover:border-zinc-400 text-left"
              type="button"
            >
              <span className="text-sm font-medium text-zinc-900">{p.name}</span>
              <span className="text-xs text-zinc-500">{p.status}</span>
            </button>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-zinc-400 col-span-full">
              No projects yet — create your first one above.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
