import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCsvMetadata } from '@/utils/csvParser'
import { requireUserId, unauthorizedResponse, findOwnedItem } from '@/lib/auth-session'

export async function POST(
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
  const printItemId = parseInt(id)

  if (isNaN(printItemId)) {
    return new Response(JSON.stringify({ error: 'Invalid item ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const item = await findOwnedItem(printItemId, userId)

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

  let raw: string
  try {
    raw = await file.text()
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read file' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let parsed: ReturnType<typeof parseCsvMetadata>
  try {
    parsed = parseCsvMetadata(raw)
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'CSV parse failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const name = `${(file.name || 'dataset').replace(/\.[^.]+$/, '')}-${Date.now()}`

  let dataset
  try {
    dataset = await prisma.dataSet.create({
      data: {
        printItemId,
        name,
        columns: JSON.stringify(parsed.columns),
        rows: JSON.stringify(parsed.rows),
        rowCount: parsed.rowCount,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create dataset'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      id: dataset.id,
      columns: parsed.columns,
      rows: parsed.rows,
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
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const { id } = await params
  const printItemId = parseInt(id)

  if (isNaN(printItemId)) {
    return new Response(JSON.stringify({ error: 'Invalid item ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!(await findOwnedItem(printItemId, userId))) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
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
