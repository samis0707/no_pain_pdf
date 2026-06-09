import { defineConfig, env } from 'prisma/config'
import { loadEnvFile } from 'process'

try {
  loadEnvFile('.env')
} catch {
  // .env may not exist at build time (e.g. Docker)
}

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
