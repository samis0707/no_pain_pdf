import Handlebars from 'handlebars'
import { registerDataHelpers } from './handlebars-helpers.data'

export function registerHelpers(): void {
  Handlebars.registerHelper('formatDate', (dateStr: string, format: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    if (format.includes('YYYY')) {
      const year = date.getFullYear().toString()
      return format.replace('YYYY', year)
    }
    if (format.includes('MM')) {
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return format.replace('MM', month)
    }
    if (format.includes('DD')) {
      const day = String(date.getDate()).padStart(2, '0')
      return format.replace('DD', day)
    }

    return dateStr
  })

  Handlebars.registerHelper('truncate', (str: string, length: number) => {
    if (str.length > length) {
      return str.slice(0, length) + '...'
    }
    return str
  })

  Handlebars.registerHelper('ifEquals', function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    if (a === b) return options.fn(this)
    return options.inverse(this)
  })

  Handlebars.registerHelper('ifContains', function (this: unknown, str: unknown, substring: unknown, options: Handlebars.HelperOptions) {
    if (String(str ?? '').includes(String(substring ?? ''))) return options.fn(this)
    return options.inverse(this)
  })

  Handlebars.registerHelper('formatTime', (dateStr: string, format: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')

    let result = format
    result = result.replace('HH', hours)
    result = result.replace('mm', minutes)
    result = result.replace('ss', seconds)
    return result
  })

  Handlebars.registerHelper('sortByPrimary', <T extends Record<string, unknown>>(arr: T[], field: string): T[] => {
    if (!Array.isArray(arr)) return []
    return [...arr].sort((a, b) => {
      const aVal = String(a?.[field] ?? '').toLowerCase()
      const bVal = String(b?.[field] ?? '').toLowerCase()
      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
      return 0
    })
  })

  registerDataHelpers()
}

registerHelpers()
