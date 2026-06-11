# No pain pdf
Create data driven PDFs accessible and ready to print.

## Quick Start (Docker)

```bash
# Copy environment config
cp .env.example .env

# Build and start all services (Next.js, Postgres, WeasyPrint, Ghostscript, MinIO)
docker compose up -d --build

# Apply migrations and seed the database
docker compose exec nextjs npx prisma migrate deploy
docker compose exec nextjs npx prisma db seed

# Open http://localhost:3000
```

> **Important**: After changing the Prisma schema, regenerate migrations and rebuild the image:
> ```bash
> npx prisma migrate dev --name <description>
> docker compose build --no-cache nextjs
> docker compose up -d --force-recreate nextjs
> ```

## Development (without Docker)

```bash
# Install dependencies
pnpm install

# Set up Postgres, WeasyPrint, Ghostscript, and MinIO manually,
# then configure .env per .env.example

# Run migrations
npx prisma migrate dev
npx prisma db seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication

Auth is handled by [Better Auth](https://better-auth.com) (email + password, DB sessions in Postgres). Set `BETTER_AUTH_SECRET` (e.g. `openssl rand -base64 32`) and `BETTER_AUTH_URL` in `.env`.

- The seed creates a dev login: `dev@example.com` / `devpassword`.
- **Legacy Supabase federation (optional):** set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to let users of the existing Supabase-auth app sign in here with their old credentials. On first login they are migrated to a local credential (same password, scrypt-hashed) and linked via `User.supabaseUserId`; subsequent logins are fully local. Removing the env vars (or `src/lib/supabase-federation.ts`) disables the fallback — migrated users keep working.

## Live API tests

The suites in `src/__tests__/api.*.test.ts` that exercise a real server are skipped by default. To run them:

```bash
BETTER_AUTH_URL=http://localhost:3010 PORT=3010 npm run dev &
TEST_API_URL=http://localhost:3010 npm run test
```



