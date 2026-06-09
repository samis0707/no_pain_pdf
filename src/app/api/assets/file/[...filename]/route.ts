import { prisma } from '@/lib/prisma'
import { getFile } from '@/lib/s3'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const filename = (await params).filename.join('/')

  const asset = await prisma.asset.findFirst({
    where: { filename },
  })

  if (!asset) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let s3Response: Awaited<ReturnType<typeof getFile>>
  try {
    s3Response = await getFile(filename)
  } catch {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!s3Response) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const bytes = await new Response(s3Response as BodyInit).bytes()

  return new Response(bytes, {
    headers: { 'Content-Type': asset.mimeType },
  })
}
