import { NextRequest } from 'next/server'
import { rollbackItem, listVersions, VersionNotFoundError } from '@/lib/versioning'
import { requireUserId, unauthorizedResponse, findOwnedItem } from '@/lib/auth-session'

export async function POST(
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

  if (!(await findOwnedItem(id, userId))) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  let body: { version?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // empty body means undo to the latest snapshot
  }

  if (body.version !== undefined && typeof body.version !== 'number') {
    return Response.json({ error: 'version must be a number' }, { status: 400 })
  }

  try {
    const restored = await rollbackItem(id, body.version)
    return Response.json(restored)
  } catch (error: unknown) {
    if (error instanceof VersionNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    const message = error instanceof Error ? error.message : 'Rollback failed'
    return Response.json({ error: message }, { status: 500 })
  }
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

  if (!(await findOwnedItem(id, userId))) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  const versions = await listVersions(id)
  return Response.json({ versions })
}
