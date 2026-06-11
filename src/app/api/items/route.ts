import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

export async function POST(request: NextRequest) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  let body: { projectId?: number; name?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const projectId = parseInt(String(body.projectId), 10)

  if (isNaN(projectId) || !body.name || !body.name.trim()) {
    return Response.json({ error: 'projectId and name are required' }, { status: 400 })
  }

  const project = await prisma.printProject.findUnique({
    where: { id: projectId },
  })

  if (!project || project.userId !== userId) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  const item = await prisma.printItem.create({
    data: {
      name: body.name.trim(),
      html: '',
      css: '',
      projectId,
    },
  })

  return Response.json(item, { status: 201 })
}
