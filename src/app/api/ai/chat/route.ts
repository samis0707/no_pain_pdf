import { NextRequest } from 'next/server'
import { loadMessages } from '@/lib/ai/conversation'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { getTemplate, getDataInfo, getHelpers, getAssets } from '@/lib/ai/tools'
import { handleChatRequest } from '@/lib/ai/chat-route'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { itemId, message } = body as { itemId: string; message: { role: string; content: string } }

  if (!itemId) {
    return Response.json({ error: 'itemId is required' }, { status: 400 })
  }

  if (!message || !message.role || !message.content) {
    return Response.json({ error: 'message with role and content is required' }, { status: 400 })
  }

  const [existing, template, dataInfo, helpers, assetsResult] = await Promise.all([
    loadMessages(itemId),
    getTemplate(itemId).catch(() => ({ name: 'Untitled', html: '', css: '' })),
    getDataInfo(itemId).catch(() => ({ columns: [], rowCount: 0, sampleRows: [] })),
    getHelpers(itemId).catch(() => ({ builtIn: [], custom: [] })),
    getAssets(itemId).catch(() => ({ assets: [] })),
  ])

  const systemPrompt = buildSystemPrompt({
    templateName: template.name,
    templateHtml: template.html,
    templateCss: template.css,
    customHelpers: helpers.custom,
    dataColumns: dataInfo.columns,
    sampleRows: dataInfo.sampleRows,
    rowCount: dataInfo.rowCount,
    assets: assetsResult.assets,
  })

  const messages = [
    { role: 'system', content: systemPrompt },
    ...existing,
    message,
  ]

  const stream = await handleChatRequest(itemId, messages)

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
