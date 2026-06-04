export function applyFieldMapping(
  rows: Record<string, string>[],
  mapping: string
): Record<string, string>[] {
  if (!mapping) return rows

  let fieldMap: Record<string, string> = {}
  try {
    fieldMap = JSON.parse(mapping)
  } catch {
    return rows
  }

  return rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const key of Object.keys(row)) {
      mapped[fieldMap[key] ?? key] = row[key]
    }
    return mapped
  })
}
