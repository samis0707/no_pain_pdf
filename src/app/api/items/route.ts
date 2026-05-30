import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  let body: { projectId?: number; name?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const projectId = parseInt(String(body.projectId), 10)

  if (isNaN(projectId) || !body.name || !body.name.trim()) {
    return new Response(JSON.stringify({ error: 'projectId and name are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const project = await prisma.printProject.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const item = await prisma.printItem.create({
    data: {
      name: body.name.trim(),
      html: '',
      css: '',
      projectId,
    },
  })

  return new Response(JSON.stringify(item), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
