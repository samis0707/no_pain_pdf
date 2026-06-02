const MM_TO_PX = 3.7795
const DEFAULT_PADDING = 40

export function calculateScale(
  containerWidthPx: number,
  containerHeightPx: number,
  pageWidthMm: number,
  pageHeightMm: number,
  paddingPx: number = DEFAULT_PADDING,
): number {
  if (containerWidthPx <= 0 || containerHeightPx <= 0) return 0

  const usableW = containerWidthPx - paddingPx
  const usableH = containerHeightPx - paddingPx

  const pageWpx = pageWidthMm * MM_TO_PX
  const pageHpx = pageHeightMm * MM_TO_PX

  if (usableW <= 0 || usableH <= 0) return 0

  const scaleX = usableW / pageWpx
  const scaleY = usableH / pageHpx

  return Math.min(scaleX, scaleY)
}
