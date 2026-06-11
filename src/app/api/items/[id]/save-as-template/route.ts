import { NextRequest } from 'next/server'
import { saveItemAsTemplate } from '@/lib/templates'

// TODO(Epic D): replace with the session user once auth lands.
const CURRENT_USER_ID = 1

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { name?: string; scope?: string; category?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || (body.scope !== 'user' && body.scope !== 'project')) {
    return Response.json(
      { error: 'name and scope ("user" | "project") are required' },
      { status: 400 }
    )
  }

  try {
    const template = await saveItemAsTemplate(id, {
      name: body.name,
      scope: body.scope,
      category: body.category,
      userId: CURRENT_USER_ID,
    })
    return Response.json(template, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Save failed'
    if (/not found/i.test(message)) {
      return Response.json({ error: message }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
