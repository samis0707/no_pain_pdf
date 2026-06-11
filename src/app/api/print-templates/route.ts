import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listTemplates } from '@/lib/templates'
import { requireUserId, unauthorizedResponse } from '@/lib/auth-session'

export async function GET(request: NextRequest) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  const projectIdParam = request.nextUrl.searchParams.get('projectId')
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined

  if (projectIdParam && isNaN(projectId!)) {
    return Response.json({ error: 'projectId must be a number' }, { status: 400 })
  }

  const templates = await listTemplates(userId, projectId)
  return Response.json({ templates })
}

export async function POST(request: NextRequest) {
  let userId: number
  try {
    userId = await requireUserId()
  } catch {
    return unauthorizedResponse()
  }

  let body: { name?: string; html?: string; css?: string; category?: string; projectId?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || !body.html) {
    return Response.json({ error: 'name and html are required' }, { status: 400 })
  }

  const template = await prisma.printTemplate.create({
    data: {
      name: body.name,
      html: body.html,
      css: body.css ?? '',
      category: body.category ?? null,
      userId,
      projectId: body.projectId ?? null,
    },
  })

  return Response.json(template, { status: 201 })
}
