import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

async function findOwnedProject(id: string, userId: number) {
  const projectId = parseInt(id)
  if (isNaN(projectId)) return null
  const project = await prisma.printProject.findUnique({ where: { id: projectId } })
  if (!project || project.userId !== userId) return null
  return project
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
  const project = await findOwnedProject(id, userId)
  if (!project) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json(project)
}

export async function PUT(
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const existing = await findOwnedProject(id, userId)
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (Object.keys(body).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  const project = await prisma.printProject.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined && { name: body.name as string }),
      ...(body.status !== undefined && { status: body.status as string }),
    },
  })

  return Response.json(project)
}

export async function DELETE(
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
  const existing = await findOwnedProject(id, userId)
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.printProject.delete({ where: { id: existing.id } })
  return Response.json({ success: true })
}
