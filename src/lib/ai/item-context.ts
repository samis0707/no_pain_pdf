import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from './system-prompt'
import { getTemplate, getDataInfo, getHelpers, getAssets } from './tools'

/**
 * Assembles the full system prompt for an item: template, dataset schema,
 * helpers, assets, page formats and export settings. Shared by the legacy
 * SSE chat route and the AI SDK chat route.
 */
export async function buildItemSystemPrompt(itemId: string): Promise<string> {
  const id = parseInt(itemId)
  const [template, dataInfo, helpers, assetsResult, itemWithFormat, allFormats] =
    await Promise.all([
      getTemplate(itemId).catch(() => ({ name: 'Untitled', html: '', css: '', pageFormat: null })),
      getDataInfo(itemId).catch(() => ({ columns: [], rowCount: 0, sampleRows: [] })),
      getHelpers(itemId).catch(() => ({ builtIn: [], custom: [] })),
      getAssets(itemId).catch(() => ({ assets: [] })),
      isNaN(id)
        ? Promise.resolve(null)
        : prisma.printItem
            .findUnique({ where: { id }, include: { pageFormat: true } })
            .catch(() => null),
      prisma.pageFormat.findMany().catch(() => []),
    ])

  let bleed: number | undefined
  let cropMarks: boolean | undefined
  let colorMode: string | undefined
  if (itemWithFormat?.exportSettings) {
    try {
      const parsed = JSON.parse(itemWithFormat.exportSettings)
      if (typeof parsed.bleed === 'number') bleed = parsed.bleed
      if (typeof parsed.cropMarks === 'boolean') cropMarks = parsed.cropMarks
      if (typeof parsed.colorMode === 'string') colorMode = parsed.colorMode
    } catch {
      // ignore parse errors
    }
  }

  return buildSystemPrompt({
    templateName: template.name,
    templateHtml: template.html,
    templateCss: template.css,
    customHelpers: helpers.custom,
    dataColumns: dataInfo.columns,
    sampleRows: dataInfo.sampleRows,
    rowCount: dataInfo.rowCount,
    assets: assetsResult.assets,
    pageFormat: itemWithFormat?.pageFormat ?? null,
    availablePageFormats: allFormats,
    bleed,
    cropMarks,
    colorMode,
  })
}
