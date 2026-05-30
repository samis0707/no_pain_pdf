import Papa from 'papaparse'

export interface CsvMeta {
  rowCount: number
  columns: string[]
  rows: Record<string, string>[]
}

export function parseCsvMetadata(raw: string): CsvMeta {
  const result = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  const criticalErrors = result.errors.filter((e) => e.type !== 'Delimiter')
  if (criticalErrors.length > 0) {
    throw new Error(`CSV parse error: ${criticalErrors[0].message}`)
  }

  return {
    rowCount: result.data.length,
    columns: result.meta.fields ?? [],
    rows: result.data,
  }
}
