import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const printItemId = searchParams.get('printItemId')
    
    if (!printItemId) {
      return Response.json({ error: 'printItemId is required' }, { status: 400 })
    }
    
    const id = parseInt(printItemId)
    if (isNaN(id)) {
      return Response.json({ error: 'Invalid printItemId' }, { status: 400 })
    }
    
    const assets = await prisma.asset.findMany({
      where: { printItemId: id },
      orderBy: { createdAt: 'desc' },
    })
    
    return Response.json(
      assets.map((a) => ({
        id: a.id,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        url: `/api/assets/file/${a.filename.split('/').map(encodeURIComponent).join('/')}`,
        createdAt: a.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}
