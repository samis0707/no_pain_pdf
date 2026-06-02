import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { useDataStore } from '@/stores/dataStore'
import { loadHelpers } from '@/lib/helper-loader'

interface ApplyChanges {
  html?: string
  css?: string
  name?: string
  miscText?: string
}

export function applyTemplateChanges(changes: ApplyChanges): void {
  const store = useTemplateStore.getState()

  if (changes.html !== undefined) {
    useTemplateStore.setState({ html: changes.html })
  }
  if (changes.css !== undefined) {
    useTemplateStore.setState({ css: changes.css })
  }
  if (changes.name !== undefined) {
    useTemplateStore.setState({ name: changes.name })
  }

  const newVersion = store.version + 1
  useTemplateStore.setState({ version: newVersion })

  if (changes.miscText !== undefined) {
    useTemplateStore.setState({ miscText: changes.miscText })
    loadHelpers(changes.miscText)
  }

  const updated = useTemplateStore.getState()
  const dataRows = useDataStore.getState().rows

  const data: Record<string, unknown> = dataRows.length > 0
    ? { ...dataRows[0], rows: dataRows }
    : {}

  usePreviewStore.getState().compile(updated.html, updated.css, data, updated.miscText)
}
