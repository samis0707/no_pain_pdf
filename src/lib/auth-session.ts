export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Resolves the authenticated user's id or throws UnauthorizedError.
 * Imports are lazy so importing a route module never drags better-auth and
 * the Prisma client into contexts that immediately mock this module.
 */
export async function requireUserId(): Promise<number> {
  let session: { user?: { id?: unknown } } | null
  try {
    const { headers } = await import('next/headers')
    const { auth } = await import('@/lib/auth')
    session = await auth.api.getSession({ headers: await headers() })
  } catch {
    throw new UnauthorizedError()
  }
  const id = session?.user?.id
  if (id == null) throw new UnauthorizedError()
  const userId = typeof id === 'number' ? id : parseInt(String(id))
  if (isNaN(userId)) throw new UnauthorizedError()
  return userId
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Loads an item only if it belongs to the user (via its project). Returns
 * null both for missing and foreign items so routes answer a uniform 404.
 */
export async function findOwnedItem(itemId: string | number, userId: number) {
  const { prisma } = await import('@/lib/prisma')
  const id = typeof itemId === 'number' ? itemId : parseInt(itemId)
  if (isNaN(id)) return null
  const item = await prisma.printItem.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!item || item.project.userId !== userId) return null
  return item
}
