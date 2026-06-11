import { NextRequest } from 'next/server'
import { applyTemplateToItem } from '@/lib/templates'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { templateId?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.templateId !== 'number') {
    return Response.json({ error: 'templateId (number) is required' }, { status: 400 })
  }

  try {
    const result = await applyTemplateToItem(id, body.templateId)
    return Response.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Apply failed'
    if (/not found/i.test(message)) {
      return Response.json({ error: message }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
