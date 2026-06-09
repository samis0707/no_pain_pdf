# No Pain PDF — Agent Instructions

<!-- BEGIN:nextjs-agent-rules -->
> **This is NOT the Next.js you know** — v16 has breaking changes. APIs, conventions, and file structure may all differ from your training data. `params`, `searchParams`, `cookies()`, `headers()` are all Promises (must `await`). Route handlers export named `GET`/`POST` functions. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

## Git Philosophy

- **Small, clear commits**: Each commit is a single logical change with a descriptive message. No mixed concerns, no "and also" commits.
- **Commit early, commit often**: Prefer many small commits over one large one. Makes review, bisect, and rollback easier.
- **Linear history**: Rebase onto main before merging. No merge bubbles.
- **Messages**: Use conventional commits — `type: short description` (e.g., `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`). Description explains *what* and *why*, not *how*.

## Development Practices

- **TDD**: Use red/green testing for every implementation. Write the test first (red), implement until it passes (green), then refactor.
- **Test first**: Before writing any implementation code, write the test that defines the expected behavior. NO IMPLEMENTATION if there is no RED test available.
- **Commit strategy**: RED commit (test written, fails) → GREEN commit (implementation passes test) → REFACTOR commit (clean up).
- **Run tests locally**: `npm run test` (Next.js) or `cd pdf-service && pytest -v` (Python).
- **CI**: Tests run automatically on every push/PR via `.github/workflows/test.yml`.
- **Docker Compose**: The full stack runs via `docker compose up` (Next.js, Postgres, WeasyPrint, Ghostscript, MinIO). For local dev without Docker, set env vars from `.env.example` and run services individually.
- **Docker rebuild pitfall**: The Docker image includes `prisma/migrations/` at build time. If you delete or regenerate migrations, you **must** rebuild the image with `docker compose build --no-cache nextjs` (cached layers will skip the updated prisma directory). The container's `entrypoint.sh` runs `prisma migrate deploy` on start — if no migration files are present in the image, the DB stays empty and all API routes return 500.
- **S3/MinIO**: `src/lib/s3.ts` provides upload/download/delete/signed-URL helpers against a MinIO bucket. Tests mock `@aws-sdk/client-s3`. Configure via `S3_*` env vars in `.env`.

## Testing Stack

| Layer | Tool | Command |
|-------|------|---------|
| **Next.js API routes + utils** | Vitest | `npm run test` |
| **React components** | Vitest + React Testing Library | `npm run test` |
| **Python WeasyPrint service** | pytest + httpx | `cd pdf-service && pytest -v` |
| **Docker Compose infrastructure** | Vitest (file-system assertions) | `npm run test` |
| **E2E (future)** | Playwright | `npx playwright test` |

## The TDD Cycle

```
1. RED:   Write a test for the desired behavior → run it → it fails
2. GREEN: Write the minimum code to make it pass → run it → it passes
3. REFACTOR: Clean up the code while keeping tests green
```

### Avoiding false positives

Tests must assert **behavior** (side effects, state changes, branch coverage), not just **shape** (presence/type of properties). A test is a false positive if it passes when the entire function body is `return { role: 'assistant', content: '' }`.

- Prefer mock/fake providers over real network calls for deterministic tests
- For branching logic (e.g. tool-calling loops, conditional returns), write a test per branch that verifies the branch was actually taken
- If a property can only be set by executing real logic, assert on it rather than on a property that a default/empty value also satisfies

## Related Documents

- `docs/IMPLEMENTATION_PLAN.md` — Epic-based implementation plan with user value per iteration
- `docs/APPMV-422-MVP-PLAN.md` — Detailed technical reference (schema, routes, architecture)
- `docs/entity_design.md` — ER diagram
- `docker-compose.yml` — Full-stack orchestration (Next.js, WeasyPrint, MinIO)
- `.env.example` — All required environment variables for local development without Docker
