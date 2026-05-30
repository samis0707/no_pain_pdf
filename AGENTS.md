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
- **Test first**: Before writing any implementation code, write the test that defines the expected behavior.
- **Commit strategy**: RED commit (test written, fails) → GREEN commit (implementation passes test) → REFACTOR commit (clean up).
- **Run tests locally**: `npm run test` (Next.js) or `cd pdf-service && pytest -v` (Python).
- **CI**: Tests run automatically on every push/PR via `.github/workflows/test.yml`.

## Testing Stack

| Layer | Tool | Command |
|-------|------|---------|
| **Next.js API routes + utils** | Vitest | `npm run test` |
| **React components** | Vitest + React Testing Library | `npm run test` |
| **Python WeasyPrint service** | pytest + httpx | `cd pdf-service && pytest -v` |
| **E2E (future)** | Playwright | `npx playwright test` |

## The TDD Cycle

```
1. RED:   Write a test for the desired behavior → run it → it fails
2. GREEN: Write the minimum code to make it pass → run it → it passes
3. REFACTOR: Clean up the code while keeping tests green
```

## Related Documents

- `docs/IMPLEMENTATION_PLAN.md` — Epic-based implementation plan with user value per iteration
- `docs/APPMV-422-MVP-PLAN.md` — Detailed technical reference (schema, routes, architecture)
- `docs/entity_design.md` — ER diagram
