FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nopainpdf
ENV DATABASE_URL=$DATABASE_URL
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nopainpdf
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./
RUN npm install --no-save prisma @prisma/adapter-pg pg
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/effect ./node_modules/effect
COPY --from=builder /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder /app/node_modules/pure-rand ./node_modules/pure-rand
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
