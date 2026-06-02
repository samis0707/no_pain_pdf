import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const item = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
    include: { datasets: true, pageFormat: true },
  })

  if (!item) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(item), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const existing = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
  })

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
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
        return new Response(JSON.stringify({ error: 'PageFormat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      data.pageFormatId = body.pageFormatId
    }
  }

  const item = await prisma.printItem.update({
    where: { id: parseInt(id) },
    data,
  })

  return new Response(JSON.stringify(item), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const existing = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
  })

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await prisma.printItem.delete({
    where: { id: parseInt(id) },
  })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
