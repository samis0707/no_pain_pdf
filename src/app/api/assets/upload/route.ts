import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const uploadDir = path.join(process.cwd(), 'public', 'uploads')

mkdir(uploadDir, { recursive: true }).catch(() => {})

export async function POST(request: NextRequest) {
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

  const ext = path.extname(file.name)
  const uniqueFilename = `${Date.now()}-${file.name}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    await writeFile(path.join(uploadDir, uniqueFilename), buffer)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to save file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const asset = await prisma.asset.create({
    data: {
      filename: uniqueFilename,
      originalName: file.name,
      mimeType: file.type,
      fileSize: buffer.length,
      userId: 1,
    },
  })

  return new Response(
    JSON.stringify({
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      url: `/api/assets/file/${asset.filename}`,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
