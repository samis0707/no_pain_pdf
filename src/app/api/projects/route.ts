import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

export async function GET() {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const projects = await prisma.printProject.findMany({ where: { userId } })
  return Response.json(projects)
}

export async function POST(request: NextRequest) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const project = await prisma.printProject.create({
    data: { name: body.name, userId },
  })

  return Response.json(project, { status: 201 })
}
