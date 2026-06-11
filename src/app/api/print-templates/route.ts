import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listTemplates } from '@/lib/templates'

// TODO(Epic D): replace with the session user once auth lands.
const CURRENT_USER_ID = 1

export async function GET(request: NextRequest) {
  const projectIdParam = request.nextUrl.searchParams.get('projectId')
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined

  if (projectIdParam && isNaN(projectId!)) {
    return Response.json({ error: 'projectId must be a number' }, { status: 400 })
  }

  const templates = await listTemplates(CURRENT_USER_ID, projectId)
  return Response.json({ templates })
}

export async function POST(request: NextRequest) {
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
      userId: CURRENT_USER_ID,
      projectId: body.projectId ?? null,
    },
  })

  return Response.json(template, { status: 201 })
}
