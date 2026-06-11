import { rewriteAssetUrls } from '@/lib/asset-url-rewrite'

const WEASYPRINT_URL = process.env.WEASYPRINT_URL ?? 'http://localhost:3001'

export class PdfRenderError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PdfRenderError'
    this.status = status
  }
}

export interface RenderPdfInput {
  html: string
  css?: string
  options?: Record<string, unknown>
  base_url?: string
}

/**
 * Renders HTML+CSS to PDF via the WeasyPrint service. Asset references are
 * rewritten to presigned S3 URLs first so images resolve from the service.
 */
export async function renderPdf(input: RenderPdfInput): Promise<ArrayBuffer> {
  const { html, css } = await rewriteAssetUrls(input.html, input.css ?? '')

  const response = await fetch(`${WEASYPRINT_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      css,
      options: input.options ?? {},
      base_url: input.base_url ?? '',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'PDF generation failed' }))
    throw new PdfRenderError(err.error ?? 'PDF generation failed', response.status)
  }

  return response.arrayBuffer()
}
