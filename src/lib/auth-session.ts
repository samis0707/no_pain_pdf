import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

/** Resolves the authenticated user's id or throws UnauthorizedError. */
export async function requireUserId(): Promise<number> {
  const session = await auth.api.getSession({ headers: await headers() })
  const id = session?.user?.id
  if (id == null) throw new UnauthorizedError()
  const userId = typeof id === 'number' ? id : parseInt(String(id))
  if (isNaN(userId)) throw new UnauthorizedError()
  return userId
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
