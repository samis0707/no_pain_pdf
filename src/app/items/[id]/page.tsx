'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SdkChat from '@/components/Chat/SdkChat'
import ArtifactPanel from '@/components/artifact/ArtifactPanel'
import DebugBar from '@/components/DebugBar/DebugBar'
import { useTemplateStore } from '@/stores/templateStore'

type MobilePane = 'chat' | 'canvas'

export default function EditorPage() {
  const params = useParams<{ id: string }>()
  const itemId = parseInt(params.id)
  const { setItemId } = useTemplateStore()
  // Phones show one pane at a time; both stay mounted so chat and preview
  // state survive switching. md+ always shows both side by side.
  const [mobilePane, setMobilePane] = useState<MobilePane>('chat')

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
    <div className="flex flex-col h-dvh">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Projects
          </Link>
          <h1 className="text-lg font-semibold">No Pain PDF</h1>
        </div>
      </header>

      <DebugBar />

      <main className="flex flex-1 min-h-0">
        <div
          data-testid="chat-pane"
          className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-[440px] shrink-0 h-full`}
        >
          <SdkChat itemId={String(itemId)} />
        </div>
        <div
          data-testid="canvas-pane"
          className={`${mobilePane === 'canvas' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 h-full`}
        >
          <ArtifactPanel itemId={itemId} />
        </div>
      </main>

      <nav
        data-testid="mobile-nav"
        className="md:hidden flex border-t bg-white shrink-0 pb-[env(safe-area-inset-bottom)]"
      >
        <button
          data-testid="mobile-tab-chat"
          onClick={() => setMobilePane('chat')}
          className={`flex-1 py-3 text-sm font-medium ${
            mobilePane === 'chat' ? 'text-zinc-900 border-t-2 border-zinc-900 -mt-px' : 'text-zinc-400'
          }`}
          type="button"
        >
          💬 Chat
        </button>
        <button
          data-testid="mobile-tab-canvas"
          onClick={() => setMobilePane('canvas')}
          className={`flex-1 py-3 text-sm font-medium ${
            mobilePane === 'canvas' ? 'text-zinc-900 border-t-2 border-zinc-900 -mt-px' : 'text-zinc-400'
          }`}
          type="button"
        >
          🎨 Canvas
        </button>
      </nav>
    </div>
  )
}
