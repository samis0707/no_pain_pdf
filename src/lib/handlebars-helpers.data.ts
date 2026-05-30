import Handlebars from 'handlebars'

export function sortBy<T extends Record<string, unknown>>(arr: T[], field: string): T[] {
  if (!Array.isArray(arr)) return []
  return [...arr].sort((a, b) => {
    const aVal = String(a?.[field] ?? '').toLowerCase()
    const bVal = String(b?.[field] ?? '').toLowerCase()
    if (aVal < bVal) return -1
    if (aVal > bVal) return 1
    return 0
  })
}

export function sortByDesc<T extends Record<string, unknown>>(arr: T[], field: string): T[] {
  if (!Array.isArray(arr)) return []
  return [...arr].sort((a, b) => {
    const aVal = String(a?.[field] ?? '').toLowerCase()
    const bVal = String(b?.[field] ?? '').toLowerCase()
    if (aVal > bVal) return -1
    if (aVal < bVal) return 1
    return 0
  })
}

export function filterBy<T extends Record<string, unknown>>(arr: T[], field: string, value: unknown): T[] {
  if (!Array.isArray(arr)) return []
  return arr.filter((item) => item?.[field] === value)
}

export function filterNot<T extends Record<string, unknown>>(arr: T[], field: string, value: unknown): T[] {
  if (!Array.isArray(arr)) return []
  return arr.filter((item) => item?.[field] !== value)
}

export function groupBy<T extends Record<string, unknown>>(arr: T[], field: string): Array<{ key: string; items: T[] }> {
  if (!Array.isArray(arr)) return []
  const groups = new Map<string, T[]>()
  for (const item of arr) {
    const key = String(item?.[field] ?? '')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return Array.from(groups.entries()).map(([key, items]) => ({ key, items }))
}

export function first<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return []
  return arr.slice(0, n)
}

export function last<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return []
  return arr.slice(-n)
}

export function slice<T>(arr: T[], start: number, end?: number): T[] {
  if (!Array.isArray(arr)) return []
  return arr.slice(start, end)
}

export function pluck<T extends Record<string, unknown>>(arr: T[], field: string): unknown[] {
  if (!Array.isArray(arr)) return []
  return arr.map((item) => item?.[field])
}

function stripMeta(args: unknown[]): unknown[] {
  const result = [...args]
  while (result.length > 0) {
    const last = result[result.length - 1]
    if (typeof last === 'object' && last !== null && 'name' in last && !Array.isArray(last)) {
      result.pop()
    } else {
      break
    }
  }
  return result
}

export function concat(...args: unknown[]): string {
  return stripMeta(args).join('')
}

export function lower(str: unknown): string {
  return String(str ?? '').toLowerCase()
}

export function upper(str: unknown): string {
  return String(str ?? '').toUpperCase()
}

export function defaultStr(value: unknown, fallback: unknown): unknown {
  return (value == null || value === '') ? fallback : value
}

export function eq(a: unknown, b: unknown): boolean {
  return a === b
}

export function gt(a: unknown, b: unknown): boolean {
  return Number(a) > Number(b)
}

export function gte(a: unknown, b: unknown): boolean {
  return Number(a) >= Number(b)
}

export function lt(a: unknown, b: unknown): boolean {
  return Number(a) < Number(b)
}

export function lte(a: unknown, b: unknown): boolean {
  return Number(a) <= Number(b)
}

export function and(...args: unknown[]): boolean {
  return stripMeta(args).every(Boolean)
}

export function or(...args: unknown[]): boolean {
  return stripMeta(args).some(Boolean)
}

export function not(a: unknown): boolean {
  return !a
}

export const DATA_HELPER_NAMES = [
  'sortBy', 'sortByDesc', 'filterBy', 'filterNot', 'groupBy',
  'first', 'last', 'slice', 'pluck',
  'concat', 'lower', 'upper', 'defaultStr',
  'eq', 'gt', 'gte', 'lt', 'lte', 'and', 'or', 'not',
]

export function registerDataHelpers(): void {
  Handlebars.registerHelper('sortBy', sortBy)
  Handlebars.registerHelper('sortByDesc', sortByDesc)
  Handlebars.registerHelper('filterBy', filterBy)
  Handlebars.registerHelper('filterNot', filterNot)
  Handlebars.registerHelper('groupBy', groupBy)
  Handlebars.registerHelper('first', first)
  Handlebars.registerHelper('last', last)
  Handlebars.registerHelper('slice', slice)
  Handlebars.registerHelper('pluck', pluck)
  Handlebars.registerHelper('concat', concat)
  Handlebars.registerHelper('lower', lower)
  Handlebars.registerHelper('upper', upper)
  Handlebars.registerHelper('defaultStr', defaultStr)
  Handlebars.registerHelper('eq', eq)
  Handlebars.registerHelper('gt', gt)
  Handlebars.registerHelper('gte', gte)
  Handlebars.registerHelper('lt', lt)
  Handlebars.registerHelper('lte', lte)
  Handlebars.registerHelper('and', and)
  Handlebars.registerHelper('or', or)
  Handlebars.registerHelper('not', not)
}
