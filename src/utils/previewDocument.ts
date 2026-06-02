export function buildPreviewDocument(
  bodyHtml: string,
  userCss: string,
  pageWidthMm: number,
  pageHeightMm: number,
): string {
  const pageCss = `@page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }`
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
