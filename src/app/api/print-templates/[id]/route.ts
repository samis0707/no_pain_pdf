import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteTemplate } from '@/lib/templates'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

function isPreset(template: { userId: number | null; projectId: number | null }): boolean {
  return template.userId === null && template.projectId === null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params
  const template = await prisma.printTemplate.findUnique({ where: { id: parseInt(id) } })
  if (!template) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }
  return Response.json(template)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params

  let body: { name?: string; html?: string; css?: string; category?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const template = await prisma.printTemplate.findUnique({ where: { id: parseInt(id) } })
  if (!template) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }
  if (isPreset(template)) {
    return Response.json({ error: 'Global presets cannot be modified' }, { status: 403 })
  }
  if (template.userId !== userId) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.html !== undefined) data.html = body.html
  if (body.css !== undefined) data.css = body.css
  if (body.category !== undefined) data.category = body.category

  const updated = await prisma.printTemplate.update({
    where: { id: template.id },
    data,
  })
  return Response.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params

  const template = await prisma.printTemplate.findUnique({ where: { id: parseInt(id) } })
  if (template && !isPreset(template) && template.userId !== userId) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }

  try {
    await deleteTemplate(parseInt(id))
    return Response.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    if (/preset/i.test(message)) {
      return Response.json({ error: message }, { status: 403 })
    }
    if (/not found/i.test(message)) {
      return Response.json({ error: message }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
