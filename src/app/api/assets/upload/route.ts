import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/s3'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

export async function POST(request: NextRequest) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
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

  if (!file.type.startsWith('image/')) {
    return new Response(JSON.stringify({ error: 'Only image files are allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const printItemIdRaw = formData.get('printItemId')
  const printItemId = printItemIdRaw ? parseInt(printItemIdRaw as string, 10) : undefined

  const key = `assets/${printItemId ?? 0}/${Date.now()}-${file.name}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    await uploadFile(key, buffer, file.type)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const asset = await prisma.asset.create({
    data: {
      filename: key,
      originalName: file.name,
      mimeType: file.type,
      fileSize: buffer.length,
      printItemId: printItemId ?? null,
      userId,
    },
  })

  return new Response(
    JSON.stringify({
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      url: `/api/assets/file/${key.split('/').map(encodeURIComponent).join('/')}`,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
