import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
