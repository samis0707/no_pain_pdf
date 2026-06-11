import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params

  const item = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
    include: { datasets: true, pageFormat: true, project: true },
  })

  if (!item || item.project.userId !== userId) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  return Response.json(item)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params

  const existing = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
    include: { project: true },
  })

  if (!existing || existing.project.userId !== userId) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.html !== undefined) data.html = body.html
  if (body.css !== undefined) data.css = body.css
  if (body.name !== undefined) data.name = body.name
  if (body.miscText !== undefined) data.miscText = body.miscText
  if (body.exportSettings !== undefined) {
    data.exportSettings = JSON.stringify(body.exportSettings)
  }
  if (body.pageFormatId !== undefined) {
    if (body.pageFormatId === null) {
      data.pageFormatId = null
    } else {
      const format = await prisma.pageFormat.findUnique({
        where: { id: body.pageFormatId as number },
      })
      if (!format) {
        return Response.json({ error: 'PageFormat not found' }, { status: 404 })
      }
      data.pageFormatId = body.pageFormatId
    }
  }

  const item = await prisma.printItem.update({
    where: { id: existing.id },
    data,
  })

  return Response.json(item)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params

  const existing = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
    include: { project: true },
  })

  if (!existing || existing.project.userId !== userId) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  await prisma.printItem.delete({ where: { id: existing.id } })

  return Response.json({ success: true })
}
