import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      // Keep Better Auth compatible with the existing Int autoincrement ids
      // (User.id and 8 FK-bearing tables predate auth).
      useNumberId: true,
    },
  },
})
