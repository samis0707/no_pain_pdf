import Handlebars from 'handlebars'
import { prisma } from '@/lib/prisma'

function parsePrintItemId(itemId: string): number {
  const id = parseInt(itemId)
  if (isNaN(id)) throw new Error(`Invalid item ID: ${itemId}`)
  return id
}

export async function getTemplate(
  itemId: string,
): Promise<{ html: string; css: string; name: string; pageFormat: { id: number; name: string; widthMm: number; heightMm: number; category: string; isPreset: boolean } | null }> {
  const id = parsePrintItemId(itemId)
  const item = await prisma.printItem.findUnique({
    where: { id },
    include: { pageFormat: true },
  })
  if (!item) throw new Error(`Item not found: ${itemId}`)
  return {
    html: item.html ?? '',
    css: item.css ?? '',
    name: item.name,
    pageFormat: item.pageFormat ?? null,
  }
}

export async function updateTemplate(
  itemId: string,
  html?: string,
  css?: string,
): Promise<{ html: string; css: string; version: number }> {
  const id = parsePrintItemId(itemId)
  const item = await prisma.printItem.findUnique({ where: { id } })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const data: { html?: string; css?: string; version: number } = { version: item.version + 1 }
  if (html !== undefined) data.html = html
  if (css !== undefined) data.css = css

  const updated = await prisma.printItem.update({
    where: { id },
    data,
  })
  return { html: updated.html ?? '', css: updated.css ?? '', version: updated.version }
}

export async function updateTemplateHtml(
  itemId: string,
  html: string,
): Promise<{ html: string; css: string; version: number }> {
  const id = parsePrintItemId(itemId)
  const item = await prisma.printItem.findUnique({ where: { id } })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const updated = await prisma.printItem.update({
    where: { id },
    data: { html, version: item.version + 1 },
  })
  return { html: updated.html ?? '', css: updated.css ?? '', version: updated.version }
}

export async function getPageFormats(
  itemId: string,
): Promise<{ formats: Array<{ id: number; name: string; widthMm: number; heightMm: number; category: string; isPreset: boolean }>; currentId: number | null }> {
  const id = parsePrintItemId(itemId)
  const [formats, item] = await Promise.all([
    prisma.pageFormat.findMany(),
    prisma.printItem.findUnique({ where: { id }, select: { pageFormatId: true } }),
  ])
  if (!item) throw new Error(`Item not found: ${itemId}`)
  return { formats, currentId: item.pageFormatId }
}

export async function updatePageFormat(
  itemId: string,
  pageFormatId?: number | null | undefined,
  css?: string | undefined,
): Promise<{ html: string; css: string; pageFormatId: number | null; version: number }> {
  const id = parsePrintItemId(itemId)
  const item = await prisma.printItem.findUnique({ where: { id } })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const data: { pageFormatId?: number | null; css?: string; version: number } = { version: item.version + 1 }
  if (pageFormatId !== undefined) data.pageFormatId = pageFormatId
  if (css !== undefined) data.css = css

  const updated = await prisma.printItem.update({
    where: { id },
    data,
    include: { pageFormat: true },
  })
  return {
    html: updated.html ?? '',
    css: updated.css ?? '',
    pageFormatId: updated.pageFormatId,
    version: updated.version,
  }
}

export async function getDataInfo(
  itemId: string,
): Promise<{ columns: string[]; rowCount: number; sampleRows: Record<string, unknown>[] }> {
  const id = parsePrintItemId(itemId)
  const dataset = await prisma.dataSet.findFirst({
    where: { printItemId: id },
    orderBy: { createdAt: 'desc' },
  })
  if (!dataset) return { columns: [], rowCount: 0, sampleRows: [] }

  const columns: string[] = (() => { try { return JSON.parse(dataset.columns) } catch { return [] } })()
  const rows: Record<string, unknown>[] = (() => { try { return JSON.parse(dataset.rows) } catch { return [] } })()
  return { columns, rowCount: dataset.rowCount, sampleRows: rows.slice(0, 5) }
}

export async function analyzeData(
  itemId: string,
): Promise<{ duplicates: number; nulls: Record<string, number>; suggestions: string[] }> {
  const { columns, rows } = await getData(itemId)

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

export async function getAssets(
  _itemId: string,
): Promise<{ assets: Array<{ filename: string; url: string }> }> {
  return { assets: [] }
}

export async function registerHelper(
  itemId: string,
  name: string,
  params: string[],
  body: string,
): Promise<{ success: boolean; name: string }> {
  const id = parsePrintItemId(itemId)
  const item = await prisma.printItem.findUnique({ where: { id } })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const fn = new Function(...params, body) as Handlebars.HelperDelegate
  Handlebars.registerHelper(name, fn)

  const miscText = (() => { try { return JSON.parse(item.miscText ?? '{}') } catch { return {} } })() as Record<string, unknown>
  const customHelpers: Array<{ name: string; params: string[]; body: string }> = Array.isArray(miscText.customHelpers)
    ? miscText.customHelpers as Array<{ name: string; params: string[]; body: string }>
    : []
  customHelpers.push({ name, params, body })

  await prisma.printItem.update({
    where: { id },
    data: { miscText: JSON.stringify({ ...miscText, customHelpers }) },
  })

  return { success: true, name }
}

export async function getData(
  itemId: string,
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const id = parsePrintItemId(itemId)
  const dataset = await prisma.dataSet.findFirst({
    where: { printItemId: id },
    orderBy: { createdAt: 'desc' },
  })
  if (!dataset) return { columns: [], rows: [] }

  const columns: string[] = (() => { try { return JSON.parse(dataset.columns) } catch { return [] } })()
  const rows: Record<string, unknown>[] = (() => { try { return JSON.parse(dataset.rows) } catch { return [] } })()
  return { columns, rows }
}

export async function updateData(
  itemId: string,
  rows: Record<string, unknown>[],
): Promise<{ success: boolean; rowCount: number }> {
  if (!Array.isArray(rows)) throw new Error('rows must be an array')
  if (rows.length === 0) throw new Error('rows must not be empty')

  const id = parsePrintItemId(itemId)
  const columns = Object.keys(rows[0])

  const name = `ai-updated-${Date.now()}`
  await prisma.dataSet.create({
    data: {
      printItemId: id,
      name,
      columns: JSON.stringify(columns),
      rows: JSON.stringify(rows),
      rowCount: rows.length,
    },
  })

  return { success: true, rowCount: rows.length }
}

interface HelperInfo {
  name: string
  params: string
  description: string
}

const BUILT_IN_HELPERS: HelperInfo[] = [
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
  { name: 'sortByPrimary', params: 'arr, field', description: 'Sort an array by a field (ascending)' },
  { name: 'formatTime', params: 'dateStr, format', description: 'Format a date string to time (e.g. HH:mm)' },
  { name: 'ifContains', params: 'str, substring', description: 'Conditionally render block if str contains substring' },
]

export async function getHelpers(
  itemId?: string,
): Promise<{
  builtIn: HelperInfo[]
  custom: Array<{ name: string; params: string[]; body: string }>
}> {
  const custom: Array<{ name: string; params: string[]; body: string }> = []

  if (itemId) {
    const id = parsePrintItemId(itemId)
    const item = await prisma.printItem.findUnique({ where: { id } })
    if (item?.miscText) {
      try {
        const parsed = JSON.parse(item.miscText) as Record<string, unknown>
        if (Array.isArray(parsed.customHelpers)) {
          custom.push(...parsed.customHelpers as Array<{ name: string; params: string[]; body: string }>)
        }
      } catch { /* ignore parse errors */ }
    }
  }

  return { builtIn: BUILT_IN_HELPERS, custom }
}
