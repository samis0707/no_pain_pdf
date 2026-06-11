import { rewriteAssetUrls } from '@/lib/asset-url-rewrite'
import { compileBody, detectLang } from '@/utils/compileBody'
import { buildPreviewDocument } from '@/utils/previewDocument'
import { applyFieldMapping } from '@/utils/applyMapping'

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

export interface PreviewImage {
  mimeType: string
  data: string
}

export interface ItemPreviewResult {
  pageCount: number
  truncated: boolean
  images: PreviewImage[]
}

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  try {
    return json ? JSON.parse(json) : fallback
  } catch {
    return fallback
  }
}

/**
 * Renders a PrintItem's current template + dataset to JPEG page images for
 * AI vision feedback. Mirrors the export pipeline: field mapping, Handlebars
 * compile with custom helpers, paged CSS from the item's page format and
 * export settings, presigned asset URLs.
 */
export async function renderItemPreviewImages(
  itemId: string,
  opts?: { pageLimit?: number; dpi?: number }
): Promise<ItemPreviewResult> {
  // Lazy prisma import keeps this module loadable in contexts that never
  // touch the database (e.g. the plain renderPdf proxy routes).
  const { prisma } = await import('@/lib/prisma')

  const id = parseInt(itemId)
  if (isNaN(id)) throw new Error(`Invalid item ID: ${itemId}`)

  const item = await prisma.printItem.findUnique({
    where: { id },
    include: { pageFormat: true },
  })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const dataset = await prisma.dataSet.findFirst({
    where: { printItemId: id },
    orderBy: { createdAt: 'desc' },
  })

  const rows = safeParse<Record<string, string>[]>(dataset?.rows, [])
  const mappedRows = applyFieldMapping(rows, dataset?.mapping ?? '')
  const data = mappedRows.length > 0 ? { ...mappedRows[0], rows: mappedRows } : {}

  const body = compileBody(item.html ?? '', data, item.miscText ?? undefined)

  const exportSettings = safeParse<{ bleed?: number; cropMarks?: boolean }>(
    item.exportSettings,
    {}
  )
  const documentHtml = buildPreviewDocument(
    body,
    item.css ?? '',
    item.pageFormat?.widthMm ?? 210,
    item.pageFormat?.heightMm ?? 297,
    exportSettings.bleed,
    exportSettings.cropMarks,
    detectLang(item.html ?? '')
  )

  const { html } = await rewriteAssetUrls(documentHtml, '')

  const pageLimit =
    opts?.pageLimit ?? parseInt(process.env.PREVIEW_FEEDBACK_PAGES ?? '3', 10)
  const dpi = opts?.dpi ?? parseInt(process.env.PREVIEW_IMAGE_DPI ?? '96', 10)

  const response = await fetch(`${WEASYPRINT_URL}/preview-images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, css: '', page_limit: pageLimit, dpi }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Preview rendering failed' }))
    throw new PdfRenderError(err.error ?? 'Preview rendering failed', response.status)
  }

  const json = await response.json()
  return {
    pageCount: json.page_count,
    truncated: json.truncated,
    images: (json.pages as string[]).map((data) => ({ mimeType: 'image/jpeg', data })),
  }
}
