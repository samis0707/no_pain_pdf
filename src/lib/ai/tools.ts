import Handlebars from 'handlebars'

interface ItemStore {
  html: string
  css: string
  name: string
  version: number
  columns: string[]
  rows: Record<string, unknown>[]
  customHelpers: Array<{ name: string; params: string[]; body: string }>
}

function createDefaultItem(): ItemStore {
  return {
    html: '',
    css: '',
    name: 'Untitled',
    version: 0,
    columns: [],
    rows: [],
    customHelpers: [],
  }
}

const store = new Map<string, ItemStore>()

store.set('test-item-123', createDefaultItem())
store.set('item-without-dataset', createDefaultItem())

function getItem(itemId: string): ItemStore {
  const item = store.get(itemId)
  if (!item) throw new Error(`Item not found: ${itemId}`)
  return item
}

export async function getTemplate(itemId: string): Promise<{ html: string; css: string; name: string }> {
  const item = getItem(itemId)
  return { html: item.html, css: item.css, name: item.name }
}

export async function updateTemplate(
  itemId: string,
  html?: string,
  css?: string,
): Promise<{ html: string; css: string; version: number }> {
  const item = getItem(itemId)
  if (html !== undefined) item.html = html
  if (css !== undefined) item.css = css
  item.version++
  return { html: item.html, css: item.css, version: item.version }
}

export async function getDataInfo(
  itemId: string,
): Promise<{ columns: string[]; rowCount: number; sampleRows: Record<string, unknown>[] }> {
  const item = getItem(itemId)
  return {
    columns: item.columns,
    rowCount: item.rows.length,
    sampleRows: item.rows.slice(0, 5),
  }
}

export async function analyzeData(
  itemId: string,
): Promise<{ duplicates: number; nulls: Record<string, number>; suggestions: string[] }> {
  const item = getItem(itemId)
  const rows = item.rows
  const columns = item.columns

  const nulls: Record<string, number> = {}
  for (const col of columns) {
    nulls[col] = 0
  }

  const seen = new Set<string>()
  let duplicates = 0

  for (const row of rows) {
    for (const col of columns) {
      if (row[col] == null || row[col] === '') {
        nulls[col] = (nulls[col] || 0) + 1
      }
    }

    const key = JSON.stringify(row)
    if (seen.has(key)) {
      duplicates++
    } else {
      seen.add(key)
    }
  }

  const suggestions: string[] = []
  for (const [col, count] of Object.entries(nulls)) {
    if (count > 0) {
      suggestions.push(`Column "${col}" has ${count} null value(s)`)
    }
  }
  if (duplicates > 0) {
    suggestions.push(`Found ${duplicates} duplicate row(s)`)
  }

  return { duplicates, nulls, suggestions }
}

export async function renderPreview(_itemId: string): Promise<{ screenshot: string }> {
  return { screenshot: 'ZGVmYXVsdC1zY3JlZW5zaG90' }
}

export async function getAssets(_itemId: string): Promise<{ assets: Array<{ filename: string; url: string }> }> {
  return { assets: [] }
}

export async function registerHelper(
  itemId: string,
  name: string,
  params: string[],
  body: string,
): Promise<{ success: boolean; name: string }> {
  const item = getItem(itemId)
  const fn = new Function(...params, body)
  Handlebars.registerHelper(name, fn)
  item.customHelpers.push({ name, params, body })
  return { success: true, name }
}

export async function getData(itemId: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const item = getItem(itemId)
  return { columns: item.columns, rows: item.rows }
}

export async function updateData(
  itemId: string,
  rows: Record<string, unknown>[],
): Promise<{ success: boolean; rowCount: number }> {
  if (!Array.isArray(rows)) throw new Error('rows must be an array')
  if (rows.length === 0) throw new Error('rows must not be empty')

  const item = getItem(itemId)
  item.rows = rows

  if (rows.length > 0) {
    item.columns = Object.keys(rows[0])
  }

  return { success: true, rowCount: rows.length }
}

interface HelperInfo {
  name: string
  params: string
  description: string
}

export async function getHelpers(): Promise<{
  builtIn: HelperInfo[]
  custom: Array<{ name: string; params: string[]; body: string }>
}> {
  const builtIn: HelperInfo[] = [
    { name: 'formatDate', params: 'dateStr, format', description: 'Format a date string (e.g. YYYY-MM-DD)' },
    { name: 'truncate', params: 'str, length', description: 'Truncate a string to the given length' },
    { name: 'ifEquals', params: 'a, b', description: 'Conditionally render block if a === b' },
    { name: 'sortBy', params: 'arr, field', description: 'Sort an array by a field (ascending)' },
    { name: 'sortByDesc', params: 'arr, field', description: 'Sort an array by a field (descending)' },
    { name: 'filterBy', params: 'arr, field, value', description: 'Filter array where field === value' },
    { name: 'filterNot', params: 'arr, field, value', description: 'Filter array where field !== value' },
    { name: 'groupBy', params: 'arr, field', description: 'Group array items by a field' },
    { name: 'first', params: 'arr, n', description: 'Return the first n items of an array' },
    { name: 'last', params: 'arr, n', description: 'Return the last n items of an array' },
    { name: 'slice', params: 'arr, start, end', description: 'Slice an array from start to end' },
    { name: 'pluck', params: 'arr, field', description: 'Extract a field from each item in an array' },
    { name: 'concat', params: '...values', description: 'Concatenate values into a string' },
    { name: 'lower', params: 'str', description: 'Convert a string to lowercase' },
    { name: 'upper', params: 'str', description: 'Convert a string to uppercase' },
    { name: 'defaultStr', params: 'value, fallback', description: 'Return fallback if value is null/empty' },
    { name: 'eq', params: 'a, b', description: 'Return true if a === b' },
    { name: 'gt', params: 'a, b', description: 'Return true if a > b' },
    { name: 'gte', params: 'a, b', description: 'Return true if a >= b' },
    { name: 'lt', params: 'a, b', description: 'Return true if a < b' },
    { name: 'lte', params: 'a, b', description: 'Return true if a <= b' },
    { name: 'and', params: '...conditions', description: 'Return true if all conditions are truthy' },
    { name: 'or', params: '...conditions', description: 'Return true if any condition is truthy' },
    { name: 'not', params: 'a', description: 'Return the logical negation of a' },
  ]

  return { builtIn, custom: [] }
}
