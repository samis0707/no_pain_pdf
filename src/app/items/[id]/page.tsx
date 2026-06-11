'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SdkChat from '@/components/Chat/SdkChat'
import ArtifactPanel from '@/components/artifact/ArtifactPanel'
import DebugBar from '@/components/DebugBar/DebugBar'
import { useTemplateStore } from '@/stores/templateStore'

export default function EditorPage() {
  const params = useParams<{ id: string }>()
  const itemId = parseInt(params.id)
  const { setItemId } = useTemplateStore()

  useEffect(() => {
    if (!isNaN(itemId)) {
      setItemId(itemId)
    }
  }, [itemId, setItemId])

  if (isNaN(itemId)) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-500">
        Invalid item — <Link href="/projects" className="underline ml-1">back to projects</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Projects
          </Link>
          <h1 className="text-lg font-semibold">No Pain PDF</h1>
        </div>
      </header>

      <DebugBar />

      <main className="flex flex-1 min-h-0">
        <div className="w-[440px] shrink-0 h-full">
          <SdkChat itemId={String(itemId)} />
        </div>
        <div className="flex-1 min-w-0 h-full">
          <ArtifactPanel itemId={itemId} />
        </div>
      </main>
    </div>
  )
}
