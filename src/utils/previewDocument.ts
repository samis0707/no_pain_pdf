import { buildPagedCss } from '@/utils/pagedCss'

export function buildPreviewDocument(
  bodyHtml: string,
  userCss: string,
  pageWidthMm: number,
  pageHeightMm: number,
): string {
  const pageCss = buildPagedCss(pageWidthMm, pageHeightMm, undefined, undefined, '0')
  const fullCss = `${pageCss}\n\n${userCss}`
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${fullCss}</style>
</head>
<body>${bodyHtml}</body>
</html>`
}
