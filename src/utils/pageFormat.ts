const PAGE_FORMATS: Record<string, { widthMm: number; heightMm: number }> = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
  A3: { widthMm: 297, heightMm: 420 },
}

const VALID_ORIENTATIONS = new Set(['portrait', 'landscape'])

export function getPageFormatDimensions(format: string, orientation: string): { widthMm: number; heightMm: number } {
  const dims = PAGE_FORMATS[format]
  if (!dims) throw new Error(`Unknown page format: ${format}`)
  if (!VALID_ORIENTATIONS.has(orientation)) throw new Error(`Invalid orientation: ${orientation}`)

  if (orientation === 'landscape') {
    return { widthMm: dims.heightMm, heightMm: dims.widthMm }
  }

  return { widthMm: dims.widthMm, heightMm: dims.heightMm }
}
