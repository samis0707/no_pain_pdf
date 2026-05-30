import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import path from 'path'

const mimeTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  const asset = await prisma.asset.findFirst({
    where: { filename },
  })

  if (!asset) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', filename)

  let fileBuffer: Buffer
  try {
    fileBuffer = await readFile(filePath)
  } catch {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ext = path.extname(filename).toLowerCase()
  const mimeType = mimeTypes[ext] || 'application/octet-stream'

  return new Response(new Uint8Array(fileBuffer), {
    headers: { 'Content-Type': mimeType },
  })
}
