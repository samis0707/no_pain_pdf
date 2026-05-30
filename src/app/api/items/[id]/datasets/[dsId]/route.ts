import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; dsId: string }> }
) {
  const { id, dsId } = await params
  const printItemId = parseInt(id)
  const datasetId = parseInt(dsId)

  if (isNaN(printItemId) || isNaN(datasetId)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dataset = await prisma.dataSet.findUnique({
    where: { id: datasetId },
  })

  if (!dataset || dataset.printItemId !== printItemId) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(dataset), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dsId: string }> }
) {
  const { id, dsId } = await params
  const printItemId = parseInt(id)
  const datasetId = parseInt(dsId)

  if (isNaN(printItemId) || isNaN(datasetId)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const existing = await prisma.dataSet.findUnique({
    where: { id: datasetId },
  })

  if (!existing || existing.printItemId !== printItemId) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
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

  if (body.name !== undefined) data.name = body.name
  if (body.mapping !== undefined) data.mapping = body.mapping
  if (body.columns !== undefined) data.columns = body.columns
  if (body.rows !== undefined) data.rows = body.rows
  if (body.rowCount !== undefined) data.rowCount = body.rowCount

  if (Object.keys(data).length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dataset = await prisma.dataSet.update({
    where: { id: datasetId },
    data,
  })

  return new Response(JSON.stringify(dataset), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; dsId: string }> }
) {
  const { id, dsId } = await params
  const printItemId = parseInt(id)
  const datasetId = parseInt(dsId)

  if (isNaN(printItemId) || isNaN(datasetId)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const existing = await prisma.dataSet.findUnique({
    where: { id: datasetId },
  })

  if (!existing || existing.printItemId !== printItemId) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await prisma.dataSet.delete({
    where: { id: datasetId },
  })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
