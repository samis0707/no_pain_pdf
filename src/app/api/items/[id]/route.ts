import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const item = await prisma.printItem.findUnique({
    where: { id: parseInt(id) },
    include: { datasets: true },
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

  const item = await prisma.printItem.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.html !== undefined && { html: body.html }),
      ...(body.css !== undefined && { css: body.css }),
      ...(body.name !== undefined && { name: body.name }),
    },
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
