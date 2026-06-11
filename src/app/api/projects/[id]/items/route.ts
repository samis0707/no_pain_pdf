import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

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
  const projectId = parseInt(id)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  const project = await prisma.printProject.findUnique({ where: { id: projectId } })
  if (!project || project.userId !== userId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const items = await prisma.printItem.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, updatedAt: true, thumbnailUrl: true },
  })

  return Response.json(items)
}
