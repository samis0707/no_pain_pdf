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

  registerDataHelpers()
}

registerHelpers()
