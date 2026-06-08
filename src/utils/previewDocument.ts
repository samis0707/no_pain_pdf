import { buildPagedCss } from '@/utils/pagedCss'

export function buildPreviewDocument(
  bodyHtml: string,
  userCss: string,
  pageWidthMm: number,
  pageHeightMm: number,
  bleed?: number,
  cropMarks?: boolean,
  lang = 'en',
): string {
  const pageCss = buildPagedCss(pageWidthMm, pageHeightMm, bleed, cropMarks)
  const fullCss = `${pageCss}\n\n${userCss}`
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>Preview</title>
  <style>${fullCss}</style>
</head>
<body>${bodyHtml}</body>
</html>`
}
