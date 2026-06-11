/**
 * Manual end-to-end check for snapshot/rollback against the real database.
 * Requires: docker compose postgres running. Run: npx tsx scripts/verify-rollback.ts
 */
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/nopainpdf'

async function main() {
  const { snapshotItem, rollbackItem, listVersions } = await import('@/lib/versioning')
  const { prisma } = await import('@/lib/prisma')

  const item = await prisma.printItem.findFirst()
  if (!item) {
    console.log('no item in DB — seed first (npx prisma db seed)')
    return
  }

  const id = String(item.id)
  const before = { html: item.html, version: item.version }

  await snapshotItem(id)
  await prisma.printItem.update({
    where: { id: item.id },
    data: { html: '<h1>live-rollback-test</h1>', version: item.version + 1 },
  })

  const restored = await rollbackItem(id, before.version)
  console.log('restored version:', restored.version)
  console.log('html restored:', restored.html === before.html)
  console.log('available versions:', (await listVersions(id)).map((v) => v.version))

  if (restored.html !== before.html || restored.version !== before.version) {
    console.error('FAIL: rollback did not restore the original state')
    process.exit(1)
  }
  console.log('PASS: snapshot → mutate → rollback round-trip restored the item')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})
