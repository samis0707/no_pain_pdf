import { DATA_HELPER_NAMES } from '@/lib/handlebars-helpers.data'

interface HelperInfo {
  name: string
  params: string
  description: string
}

interface CustomHelper {
  name: string
  params: string[]
  body: string
}

interface SystemPromptContext {
  templateName: string
  templateHtml: string
  templateCss: string
  customHelpers: CustomHelper[]
  dataColumns: string[]
  sampleRows: Record<string, unknown>[]
  rowCount: number
  assets: Array<{ filename: string; url: string }>
  pageFormat: { id: number; name: string; widthMm: number; heightMm: number; category: string; isPreset: boolean } | null
  availablePageFormats: Array<{ id: number; name: string; widthMm: number; heightMm: number; category: string; isPreset: boolean }>
  bleed?: number
  cropMarks?: boolean
  colorMode?: string
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
]

export function buildSystemPrompt(context: SystemPromptContext): string {
  const lines: string[] = []

  lines.push(`You are an AI assistant helping design a print template called "${context.templateName}".`)
  lines.push('')
  lines.push('You have access to tools to view and modify the template, analyze data, and create custom Handlebars helpers.')
  lines.push('')

  lines.push('## Current Template')
  lines.push('')
  lines.push('### HTML')
  lines.push('```html')
  lines.push(context.templateHtml)
  lines.push('```')
  lines.push('')
  lines.push('### CSS')
  lines.push('```css')
  lines.push(context.templateCss)
  lines.push('```')
  lines.push('')

  lines.push('## Page Format')
  lines.push('')
  if (context.pageFormat) {
    lines.push(`- Current format: ${context.pageFormat.name} (${context.pageFormat.widthMm}×${context.pageFormat.heightMm}mm)`)
  } else {
    lines.push('- Current format: No format selected')
  }
  lines.push(`- Available formats: ${context.availablePageFormats.map(f => `${f.name} (${f.widthMm}×${f.heightMm}mm)`).join(', ')}`)
  lines.push('')
  lines.push('To change the page format or update CSS, use the `update_page_format` tool.')
  lines.push('To update only the template HTML, use the `update_template_html` tool.')
  lines.push('')
  lines.push('## Dataset')
  lines.push('')
  lines.push(`- Columns: ${context.dataColumns.join(', ')}`)
  lines.push(`- Row count: ${context.rowCount}`)
  lines.push('')
  lines.push('### Sample rows')
  lines.push('```json')
  lines.push(JSON.stringify(context.sampleRows, null, 2))
  lines.push('```')
  lines.push('')

  lines.push('## Available Handlebars Helpers')
  lines.push('')
  for (const helper of BUILT_IN_HELPERS) {
    lines.push(`- \`${helper.name}(${helper.params})\` — ${helper.description}`)
  }
  lines.push('')

  if (context.customHelpers.length > 0) {
    lines.push('## Custom Helpers Already Registered')
    lines.push('')
    for (const h of context.customHelpers) {
      lines.push(`- \`${h.name}(${h.params.join(', ')})\``)
      lines.push('  ```js')
      lines.push(`  ${h.body}`)
      lines.push('  ```')
    }
    lines.push('')
  }

  lines.push('## Creating Custom Helpers')
  lines.push('')
  lines.push('You can create custom Handlebars helpers using the `register_helper` tool.')
  lines.push('Each helper needs a name, parameter names, and a function body.')
  lines.push('The helper will be available immediately in the template.')
  lines.push('')

  if (context.assets.length > 0) {
    lines.push('## Available Assets')
    lines.push('')
    for (const asset of context.assets) {
      lines.push(`- ${asset.filename}: ${asset.url}`)
    }
    lines.push('')
  }

  lines.push('## CSS Paged Media')
  lines.push('')
  lines.push('You can use CSS Paged Media features for print-ready PDF output.')
  lines.push('')
  lines.push('- `@page` — defines the page box size, margins, bleed, and crop marks')
  lines.push('  - `size: 210mm 297mm;` sets the page dimensions')
  lines.push('  - `bleed: 3mm;` adds a bleed area (0–5mm)')
  lines.push('  - `marks: crop cross;` adds printer crop marks and crosshairs')
  lines.push('- `device-cmyk()` — use CMYK colors for print: `color: device-cmyk(0, 0.8, 0.7, 0);`')
  lines.push('- `running()` — capture running elements from the document for page headers/footers')
  lines.push('- Named pages — use `@page :first`, `@page :blank`, or custom named pages with `page: name;` on elements')
  lines.push('')
  lines.push('The `update_page_format` tool can update CSS with these features. When exporting,')
  lines.push('bleed, crop marks, and color mode (RGB/CMYK) can also be configured in the Export panel.')
  lines.push('')
  lines.push('To configure export settings for PDF output, use the `update_export_settings` tool.')
  lines.push('')

  if (context.bleed !== undefined || context.cropMarks !== undefined || context.colorMode !== undefined) {
    lines.push('## Export Settings')
    lines.push('')
    if (context.bleed !== undefined) {
      lines.push(`- Bleed: ${context.bleed}mm`)
    }
    if (context.cropMarks !== undefined) {
      lines.push(`- Crop marks: ${context.cropMarks ? 'enabled' : 'disabled'}`)
    }
    if (context.colorMode !== undefined) {
      lines.push(`- Color mode: ${context.colorMode.toUpperCase()}`)
    }
    lines.push('')
    lines.push('Use the `update_export_settings` tool to change these values.')
    lines.push('')
  }

  return lines.join('\n')
}
