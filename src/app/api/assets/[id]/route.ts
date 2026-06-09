import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/s3'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const assetId = parseInt(id)
    if (isNaN(assetId)) {
      return Response.json({ error: 'Invalid asset ID' }, { status: 400 })
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 })
    }

    await deleteFile(asset.filename)

    await prisma.asset.delete({ where: { id: assetId } })

    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 },
    )
  }
}
