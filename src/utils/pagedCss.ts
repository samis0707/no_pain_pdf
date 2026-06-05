export function buildPagedCss(
  widthMm: number,
  heightMm: number,
  bleed?: number,
  cropMarks?: boolean,
  margin?: string,
): string {
  const rules: string[] = []
  rules.push(`size: ${widthMm}mm ${heightMm}mm`)

  if (margin !== undefined) {
    rules.push(`margin: ${margin}`)
  }

  if (bleed !== undefined && bleed > 0) {
    rules.push(`bleed: ${bleed}mm`)
  }

  if (cropMarks) {
    rules.push('marks: crop cross')
  }

  return `@page { ${rules.join('; ')} }`
}
