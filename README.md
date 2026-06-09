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



