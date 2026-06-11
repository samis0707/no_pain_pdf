'use client'

import { useEffect, useRef, useState } from 'react'
import { useTemplateStore } from '@/stores/templateStore'
import { hbsToGrapesHtml, grapesHtmlToHbs } from '@/lib/grapes/transform'
import hbsPlugin from '@/lib/grapes/plugin'
import type { Editor } from 'grapesjs'

/**
 * GrapeJS canvas for the current template. Loads the Handlebars template as
 * marker HTML; "Apply" serializes the canvas back to Handlebars and saves.
 */
export default function VisualEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const html = useTemplateStore((s) => s.html)
  const css = useTemplateStore((s) => s.css)

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return

    let cancelled = false
    void import('grapesjs').then(({ default: grapesjs }) => {
      if (cancelled || !containerRef.current) return
      const editor = grapesjs.init({
        container: containerRef.current,
        height: '100%',
        storageManager: false,
        plugins: [hbsPlugin],
      })
      editor.on('update', () => setIsDirty(true))
      editorRef.current = editor
      try {
        editor.setComponents(hbsToGrapesHtml(html))
        editor.setStyle(css)
        setIsDirty(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load template')
      }
    })

    return () => {
      cancelled = true
      editorRef.current?.destroy()
      editorRef.current = null
    }
    // The canvas owns its state after init; template changes flow back via Apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function apply() {
    const editor = editorRef.current
    if (!editor) return
    try {
      const nextHtml = grapesHtmlToHbs(editor.getWrapper()!.getInnerHTML())
      const nextCss = editor.getCss() ?? ''
      const store = useTemplateStore.getState()
      store.setHtml(nextHtml)
      store.setCss(nextCss)
      await store.saveTemplate()
      setIsDirty(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply changes')
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-zinc-50 shrink-0">
        <span className="text-xs font-medium text-zinc-600">Visual Editor</span>
        <button
          data-testid="visual-apply-button"
          onClick={() => void apply()}
          disabled={!isDirty}
          className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 rounded-md"
          type="button"
        >
          Apply changes
        </button>
      </div>
      {error && (
        <div data-testid="visual-error" className="px-3 py-2 text-xs text-red-600 border-b">
          {error}
        </div>
      )}
      <div ref={containerRef} data-testid="grapes-canvas" className="flex-1 min-h-0" />
    </div>
  )
}
