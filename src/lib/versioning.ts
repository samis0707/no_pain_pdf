import { prisma } from '@/lib/prisma'

export class VersionNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VersionNotFoundError'
  }
}

function parseItemId(itemId: string): number {
  const id = parseInt(itemId)
  if (isNaN(id)) throw new Error(`Invalid item ID: ${itemId}`)
  return id
}

/**
 * Persists the item's CURRENT state under its current version number.
 * Called before every mutating write, so each version number maps to the
 * state the item had while it carried that number. Upsert keeps re-edits
 * after a rollback idempotent.
 */
export async function snapshotItem(itemId: string): Promise<void> {
  const id = parseItemId(itemId)
  const item = await prisma.printItem.findUnique({ where: { id } })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const snapshot = {
    printItemId: id,
    version: item.version,
    html: item.html ?? '',
    css: item.css ?? '',
    miscText: item.miscText ?? '{}',
  }

  await prisma.printItemVersion.upsert({
    where: { printItemId_version: { printItemId: id, version: item.version } },
    create: snapshot,
    update: snapshot,
  })
}

/**
 * Restores the item to a snapshot. Without an explicit version this is an
 * undo to the most recent snapshot.
 */
export async function rollbackItem(
  itemId: string,
  version?: number
): Promise<{ id: number; html: string; css: string; miscText: string; version: number }> {
  const id = parseItemId(itemId)

  const snapshot =
    version !== undefined
      ? await prisma.printItemVersion.findUnique({
          where: { printItemId_version: { printItemId: id, version } },
        })
      : (
          await prisma.printItemVersion.findMany({
            where: { printItemId: id },
            orderBy: { version: 'desc' },
            take: 1,
          })
        )[0] ?? null

  if (!snapshot) {
    throw new VersionNotFoundError(
      version !== undefined
        ? `No snapshot for version ${version} of item ${itemId}`
        : `No snapshots exist for item ${itemId}`
    )
  }

  const restored = await prisma.printItem.update({
    where: { id },
    data: {
      html: snapshot.html,
      css: snapshot.css,
      miscText: snapshot.miscText,
      version: snapshot.version,
    },
  })

  return {
    id: restored.id,
    html: restored.html ?? '',
    css: restored.css ?? '',
    miscText: restored.miscText ?? '{}',
    version: restored.version,
  }
}

export async function listVersions(
  itemId: string
): Promise<Array<{ version: number; createdAt: Date }>> {
  const id = parseItemId(itemId)
  return prisma.printItemVersion.findMany({
    where: { printItemId: id },
    orderBy: { version: 'desc' },
    select: { version: true, createdAt: true },
  })
}
