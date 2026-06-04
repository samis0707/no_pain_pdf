import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { useDataStore } from '@/stores/dataStore'
import { loadHelpers } from '@/lib/helper-loader'
import { applyFieldMapping } from '@/utils/applyMapping'

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
  const mapping = useDataStore.getState().mapping
  const mappedRows = applyFieldMapping(dataRows, mapping)

  const data: Record<string, unknown> = mappedRows.length > 0
    ? { ...mappedRows[0], rows: mappedRows }
    : {}

  usePreviewStore.getState().compile(updated.html, updated.css, data, updated.miscText)
}
