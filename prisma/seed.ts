import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedTemplates } from './seed-templates'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const templates = seedTemplates

const pageFormats = [
  { name: 'A4', widthMm: 210, heightMm: 297, category: 'ISO', isPreset: true },
  { name: 'A4 Landscape', widthMm: 297, heightMm: 210, category: 'ISO', isPreset: true },
  { name: 'Letter', widthMm: 215.9, heightMm: 279.4, category: 'ANSI', isPreset: true },
  { name: 'Letter Landscape', widthMm: 279.4, heightMm: 215.9, category: 'ANSI', isPreset: true },
  { name: 'A3', widthMm: 297, heightMm: 420, category: 'ISO', isPreset: true },
  { name: 'A3 Landscape', widthMm: 420, heightMm: 297, category: 'ISO', isPreset: true },
]

async function main() {
  console.log('Seeding default user...')
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: { email: 'dev@example.com', name: 'Dev User', emailVerified: true },
  })
  // Better Auth credential so the dev user can actually log in (dev only).
  const existingCredential = await prisma.account.findFirst({
    where: { userId: devUser.id, providerId: 'credential' },
  })
  if (!existingCredential) {
    const { hashPassword } = await import('better-auth/crypto')
    await prisma.account.create({
      data: {
        userId: devUser.id,
        providerId: 'credential',
        accountId: String(devUser.id),
        password: await hashPassword('devpassword'),
      },
    })
  }
  console.log('  ✓ dev@example.com (password: devpassword)')

  console.log('Seeding page format presets...')

  for (const format of pageFormats) {
    await prisma.pageFormat.upsert({
      where: { name_widthMm_heightMm: { name: format.name, widthMm: format.widthMm, heightMm: format.heightMm } },
      update: {},
      create: format,
    })
    console.log(`  ✓ ${format.name}`)
  }

  console.log('Seeding preset templates...')

  for (const template of templates) {
    const existing = await prisma.printTemplate.findFirst({
      where: { name: template.name },
    })
    if (existing) {
      await prisma.printTemplate.update({
        where: { id: existing.id },
        data: {
          ...template,
          metadata: JSON.stringify({
            thumbnail: null,
            description: `${template.name} preset template`,
            tags: [template.category, 'preset'],
          }),
        },
      })
    } else {
      await prisma.printTemplate.create({
        data: {
          ...template,
          metadata: JSON.stringify({
            thumbnail: null,
            description: `${template.name} preset template`,
            tags: [template.category, 'preset'],
          }),
        },
      })
    }
    console.log(`  ✓ ${template.name}`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
