import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCsvMetadata } from '@/utils/csvParser'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const printItemId = parseInt(id)

  if (isNaN(printItemId)) {
    return new Response(JSON.stringify({ error: 'Invalid item ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const item = await prisma.printItem.findUnique({
    where: { id: printItemId },
  })

  if (!item) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const file = formData.get('file') as File | null

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const raw = await file.text()
  const parsed = parseCsvMetadata(raw)

  const dataset = await prisma.dataSet.create({
    data: {
      printItemId,
      name: file.name || 'default',
      columns: JSON.stringify(parsed.columns),
      rows: JSON.stringify(parsed.rows),
      rowCount: parsed.rowCount,
    },
  })

  return new Response(
    JSON.stringify({
      id: dataset.id,
      columns: parsed.columns,
      rowCount: dataset.rowCount,
      name: dataset.name,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const printItemId = parseInt(id)

  if (isNaN(printItemId)) {
    return new Response(JSON.stringify({ error: 'Invalid item ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const datasets = await prisma.dataSet.findMany({
    where: { printItemId },
  })

  return new Response(JSON.stringify(datasets), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
