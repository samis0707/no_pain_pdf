import { NextRequest } from 'next/server'
import { loadMessages } from '@/lib/ai/conversation'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { getTemplate, getDataInfo, getHelpers, getAssets } from '@/lib/ai/tools'
import { handleChatRequest } from '@/lib/ai/chat-route'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, message } = body as { itemId: string; message: { role: string; content: string } }
    console.log('🌐 [API] POST /api/ai/chat', { itemId, role: message?.role, content: message?.content?.slice(0, 100) })

    if (!itemId) {
      return Response.json({ error: 'itemId is required' }, { status: 400 })
    }

    if (!message || !message.role || !message.content) {
      return Response.json({ error: 'message with role and content is required' }, { status: 400 })
    }

    console.log('🌐 [API] Loading context: messages, template, data, helpers, assets')
    const id = parseInt(itemId)
    const [existing, template, dataInfo, helpers, assetsResult, itemWithFormat, allFormats] = await Promise.all([
      loadMessages(itemId),
      getTemplate(itemId).catch(() => ({ name: 'Untitled', html: '', css: '', pageFormat: null })),
      getDataInfo(itemId).catch(() => ({ columns: [], rowCount: 0, sampleRows: [] })),
      getHelpers(itemId).catch(() => ({ builtIn: [], custom: [] })),
      getAssets(itemId).catch(() => ({ assets: [] })),
      isNaN(id) ? Promise.resolve(null) : prisma.printItem.findUnique({
        where: { id },
        include: { pageFormat: true },
      }).catch(() => null),
      prisma.pageFormat.findMany().catch(() => []),
    ])

    let exportBleed: number | undefined
    let exportCropMarks: boolean | undefined
    let exportColorMode: string | undefined
    if (itemWithFormat?.exportSettings) {
      try {
        const parsed = JSON.parse(itemWithFormat.exportSettings)
        if (typeof parsed.bleed === 'number') exportBleed = parsed.bleed
        if (typeof parsed.cropMarks === 'boolean') exportCropMarks = parsed.cropMarks
        if (typeof parsed.colorMode === 'string') exportColorMode = parsed.colorMode
      } catch { /* ignore parse errors */ }
    }

    const systemPrompt = buildSystemPrompt({
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
      bleed: exportBleed,
      cropMarks: exportCropMarks,
      colorMode: exportColorMode,
    })

    console.log('🌐 [API] System prompt length:', systemPrompt.length, 'chars')

    const messages = [
      { role: 'system', content: systemPrompt },
      ...existing,
      message,
    ]

    console.log('🌐 [API] Sending', messages.length, 'messages to provider')
    const stream = await handleChatRequest(itemId, messages)

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  } catch (error) {
    console.error('❌ [API] Error:', error)
    if (error instanceof Error && error.stack) {
      console.error('❌ [API] Stack:', error.stack)
    }
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
