# No Pain PDF — Implementation Plan

> Organized by Epic (user-value iteration), not by technical layer.
> Each epic delivers a working, testable increment.

---

## Epic 1: Working Editor (~12h)

**User value:** "Upload a CSV, edit a template, preview it live, and download a PDF."

Build the core editor loop without AI or auth. This is the foundation everything else rests on.

### Execution Steps

**Step 1: Scaffold Next.js + TDD setup** (~1h)
- Delete existing `app/`, run `create-next-app` with TypeScript, Tailwind, App Router, src-dir
- Restore TDD infrastructure: `vitest.config.ts`, RED tests (projects, items, datasets), GREEN test (csvParser)
- Install deps: zustand, handlebars, papaparse, @monaco-editor/react, prisma, @prisma/client, puppeteer, vitest
- Flatten project structure (move Next.js to root, merge `.gitignore` and `AGENTS.md`, update CI)
- Seed `page.tsx` with 3-tab layout: Upload / Design / Export
- **Commits**: scaffold → test suite → flatten → 3-tab layout

**Step 2: Database + Prisma** (~1h)
- `npx prisma init` → PostgreSQL provider
- Prisma schema: `User`, `PrintProject`, `PrintItem`, `PrintTemplate`, `DataSet`, `ChatMessage`, `Asset`
  - All models with full field definitions per `docs/APPMV-422-MVP-PLAN.md`
  - `PrintTemplate` includes `category` field for preset seeding
  - `DataSet` has unique constraint `@@unique([printItemId, name])`
- `src/lib/prisma.ts` singleton (global cached client)
- `prisma/seed.ts` — 3 preset templates with HTML+CSS:
  - Event flyer (`quartierszentrum-boeckingen`)
  - Cooperation flyer (`sportpark-kooperation`)
  - General flyer (`linqr-allgemein`)
- `npx prisma migrate dev --name init` + seed
- Run tests (all RED API tests still fail — no routes yet, csvParser GREEN still passes)
- **Commits**: schema → seed → migration

**Step 3: REST API — Core CRUD** (~2h) → **turns RED tests GREEN**
- `src/app/api/projects/route.ts` — `GET` (list), `POST` (create, returns 201)
- `src/app/api/projects/[id]/route.ts` — `GET`, `PUT`, `DELETE` (404 for missing)
- `src/app/api/items/route.ts` — `POST` (create with projectId, returns 201)
- `src/app/api/items/[id]/route.ts` — `GET`, `PUT` (save html+css), `DELETE`
- `src/app/api/items/[id]/datasets/route.ts` — `POST` (CSV via FormData, parse with PapaParse server-side, store in DataSet), `GET` (list)
- `src/app/api/items/[id]/datasets/[dsId]/route.ts` — `GET`, `PUT` (update mapping), `DELETE`
- All routes: validate input, return proper status codes (201/200/400/404)
- All routes: export named async functions (`GET`, `POST`, `PUT`, `DELETE`)
- All routes: `await params` (Next.js v16 Promise-based params)
- **RED tests go GREEN** — `npm run test` shows 11 passed, 0 failed
- **Commits**: projects routes → items routes → datasets routes

**Step 4: CSV import frontend** (~1.5h)
- `src/stores/dataStore.ts` — Zustand store for dataset state
- `src/utils/csvParser.ts` — PapaParse-based CSV parser (already GREEN)
- `src/components/DataImport/CSVUploader.tsx` — drag-and-drop file upload
- `src/components/DataImport/DataPreview.tsx` — table showing first 20 rows
- `src/components/DataImport/FieldMapper.tsx` — bind CSV columns to `{{variables}}`
- `src/components/DataImport/DataImportPanel.tsx` — composite component
- **Commits**: dataStore → CSVUploader → DataPreview → FieldMapper

**Step 5: Template editor + live preview** (~2.5h)
- `src/stores/templateStore.ts` — Zustand store for template HTML/CSS
- `src/stores/previewStore.ts` — Zustand store for preview state
- `src/lib/handlebars-helpers.ts` — shared Handlebars helpers (formatDate, truncate, ifEquals)
- `src/utils/handlebarsRenderer.ts` — client-side Handlebars compile with sample data
- `src/components/Editor/MonacoEditor.tsx` — Monaco Editor for HTML + CSS
- `src/components/Preview/PreviewPanel.tsx` — live iframe preview with sample data
- `src/components/Preview/ErrorBoundary.tsx` — error boundary for preview
- Debounced auto-save via `PUT /api/items/[id]` (300ms debounce)
- **Commits**: stores + helpers → MonacoEditor → PreviewPanel → auto-save

**Step 6: Other backend routes** (~1h)
- `src/app/api/templates/compile/route.ts` — Handlebars compile with data
- `src/app/api/templates/validate/route.ts` — Handlebars syntax validation
- `src/app/api/templates/helpers/route.ts` — list available helpers with descriptions
- `src/app/api/assets/upload/route.ts` — file upload, store, create Asset record
- `src/app/api/assets/file/[filename]/route.ts` — serve uploaded files
- **Commits**: template routes → asset routes

**Step 7: Export panel + PDF download** (~2h)
- `src/stores/exportStore.ts` — Zustand store for export settings
- `src/components/ExportPanel/ExportPanel.tsx` — export settings form (page size, orientation, margins)
- `src/app/api/pdf/generate/route.ts` — Puppeteer-based HTML→PDF generation
  - Accepts HTML+CSS, launches headless Chromium, generates PDF via `page.pdf()`
  - Returns PDF binary with correct Content-Type
- Wire download flow in ExportPanel
- **Epic 1 renders a basic PDF** (Puppeteer — full WeasyPrint pipeline deferred to Epic 3)
- **Commits**: exportStore → ExportPanel → PDF generate route

**Step 8: Handlebars helper system — subexpressions + data transforms + per-item custom helpers** (~3h)
- `src/lib/handlebars-helpers.data.ts` — 20 subexpression helpers across 3 categories:
  - **Data-transform** (return arrays for `#each`): `sortBy`, `sortByDesc`, `filterBy`, `filterNot`, `groupBy`, `first`, `last`, `slice`, `pluck`
  - **String**: `concat`, `lower`, `upper`, `defaultStr`
  - **Logic** (return booleans for `#if`): `eq`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `not`
- `src/lib/helper-loader.ts` — loads per-PrintItem custom helpers from `PrintItem.miscText.customHelpers[]`
  - Uses `new Function(...params, body)` to create helpers at render time
  - Unregisters previous item's helpers to prevent cross-contamination
  - Registered automatically in `handlebarsRenderer.ts` (client preview), `compile/route.ts` (server API), and `helpers/route.ts` (discovery)
- Wired through `templateStore.miscText` → `previewStore` → `PreviewPanel` for live preview
- `helpers/route.ts` returns dynamic list of all 23 helpers (3 original + 20 new)
- **Prepares for Epic 2**: `PrintItem.miscText.customHelpers` schema ready for AI agent to create custom helpers via `register_helper` tool
- **Commits**: data helpers → helper-loader → wire into pipeline

### Test coverage per step
- REST API: create project → create item → upload dataset → update template → retrieve (end-to-end via `curl`)
- API input validation (missing fields, invalid IDs return 400/404)
- CSV parsing edge cases (empty file, malformed rows, encoding)
- Handlebars compile errors
- DataSet creation and retrieval
- **New** — Subexpression helper unit tests (34 tests): sortBy, filterBy, groupBy, logic helpers, chained subexpressions
- **New** — Custom helper loader tests (11 tests): `new Function` registration, subexpression in `#if`/`#each`, this-context, unregister, error handling

### Acceptance criteria
- [ ] `curl -X POST /api/projects` → returns project JSON with id
- [ ] `curl -X POST /api/items` with projectId → returns item JSON
- [ ] `curl -F file=@data.csv POST /api/items/[id]/datasets` → returns DataSet with parsed rows
- [ ] `curl -X PUT /api/items/[id]` with html/css → saves and returns updated item
- [ ] Upload CSV via UI → see preview table
- [ ] Map a CSV column to `{{title}}` in the template
- [ ] Edit HTML in Monaco → preview updates live
- [ ] Click Export → download a PDF with data rendered
- [ ] `{{#each (sortBy items "name")}}...{{/each}}` sorts data in preview
- [ ] `{{#if (gt count 5)}}big{{else}}small{{/if}}` evaluates logic in templates
- [ ] Custom helper registered via `PrintItem.miscText` is usable in template and preview

---

## Epic 2: AI Agent (~10h)

**User value:** "Design by conversation — describe what you want, the AI builds it."

The differentiator. The user talks to an AI that edits the template, analyzes data, creates custom Handlebars helpers, and iterates with them.

**Provider-agnostic LLM integration:** The agent supports any LLM provider configured via `.env` — no UI selection. The user sets `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` in `.env` and the provider abstraction layer normalizes chat completions, streaming SSE, and tool calling across providers.

### Tasks

1. **Provider-agnostic LLM integration** (2h)
   - `lib/ai/types.ts` — ProviderConfig, ChatMessage, ToolCall, ToolResult types
   - `lib/ai/provider.ts` — abstract base class: `chat()`, `chatStream()`, `supportsToolCalling()`
   - `lib/ai/providers/openai.ts` — OpenAI-compatible (OpenAI, DeepSeek, Together, Groq, etc.)
   - `lib/ai/providers/anthropic.ts` — Anthropic Claude
   - `lib/ai/providers/mistral.ts` — Mistral AI
   - `lib/ai/providers/google.ts` — Google Gemini
   - `lib/ai/registry.ts` — reads `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` from env, instantiates correct provider
   - `lib/ai-service.ts` — SSE streaming endpoint using the resolved provider
   - `POST /api/ai/chat` — streaming endpoint
   - Tool-calling loop with the provider's function-calling API

2. **Tool definitions** (2.5h)
   - `get_template()` — returns current HTML + CSS
   - `update_template(html?, css?, name?)` — saves changes, increments version
   - `get_data_info()` — returns DataSet columns, row count, sample rows
   - `analyze_data()` — deep analysis (duplicates, nulls, suggestions)
   - `render_preview()` — returns base64 screenshot of preview
   - `get_assets()` — lists uploaded images
   - `register_helper(name, params, body)` — creates a custom Handlebars helper stored in `PrintItem.miscText.customHelpers`, usable immediately in template and preview

3. **Chat UI** (2.5h)
   - MessageList — markdown rendering, code blocks with "Apply" button
   - MessageInput — textarea, send, image upload button
   - ChatSidebar — resizable panel, scroll persistence
   - SSE stream reader — streams text and tool events in real-time

4. **System prompt + context** (1.5h)
   - Injects current template (HTML + CSS)
   - Injects DataSet schema (columns, sample rows, row count)
   - Injects all 23 available Handlebars helpers with signatures and examples (`lib/handlebars-helpers.ts` + `lib/handlebars-helpers.data.ts`)
   - Injects custom helpers already registered in `PrintItem.miscText.customHelpers`
   - Injects available assets
   - Instructions for creating custom helpers via `register_helper` tool

5. **"Apply" button flow** (1h)
   - Tool call display → diff summary → "Apply Changes" button
   - On click: updates Zustand templateStore → triggers preview → PUT to DB
   - Version increment on each change
   - For `register_helper` calls: reload helper registry and re-render preview

6. **Helper management UI** (0.5h)
   - Show registered custom helpers and their source code in chat sidebar
   - Option to delete or edit a custom helper
   - Clear visual when a helper is active in the current template

### Test coverage
- Provider abstraction — each provider returns correct ChatMessage format
- Tool handler unit tests (each returns correct JSON, including `register_helper`)
- SSE stream formatting
- System prompt construction (includes all 23 helpers + custom helpers)
- "Apply" flow — store updates correctly
- Helper registration round-trip: tool call → persist → re-render

### Acceptance criteria
- [ ] `LLM_PROVIDER=openai LLM_API_KEY=...` in `.env` → agent uses OpenAI
- [ ] `LLM_PROVIDER=anthropic LLM_API_KEY=...` → agent uses Claude
- [ ] Send "Make the title bigger and blue" → AI calls `update_template` → change appears in preview
- [ ] Send "What data do I have?" → AI calls `get_data_info` → shows column summary
- [ ] AI code suggestion shows "Apply" button → click it → template updates
- [ ] Send "Create a helper that formats phone numbers" → AI calls `register_helper` → helper available in template
- [ ] Conversation persists on page refresh

---

## Epic 3: Production PDF Pipeline (~6h)

**User value:** "Export a print-ready PDF with bleed, crop marks, and CMYK colors."

The output quality that makes this useful for real print shops.

### Tasks

1. **WeasyPrint service** (2.5h)
   - Python/FastAPI microservice in `pdf-service/`
   - `POST /generate` — accepts HTML + CSS + options, returns PDF binary
   - `FontConfiguration` for `@font-face` support
   - Custom `URLFetcher` resolving S3 asset URLs
   - Process-level isolation (subprocess with timeout + memory limits)

2. **Docker Compose** (1h)
   - `docker-compose.yml` with:
     - Next.js app
     - WeasyPrint service (port 3001)
     - PostgreSQL
     - MinIO (S3-compatible storage)
     - Ghostscript (port 3002)
   - `lib/s3.ts` — S3 client for MinIO

3. **CSS Paged Media templates** (1h)
   - @page rules for A4, custom sizes
   - Bleed and crop marks
   - Running headers/footers
   - Named pages for different sections
   - CMYK colors with `device-cmyk()`

4. **Export from chat** (1.5h)
   - AI can configure export settings via `update_template(exportSettings: {...})`
   - "Generate PDF" button in chat
   - `POST /api/pdf/generate` proxies to WeasyPrint → returns PDF
   - PDF/UA accessibility tagging (option, not default for print flyers)

### Test coverage
- WeasyPrint output matches expected page count and size
- API proxy returns correct Content-Type
- S3 upload/download round-trip

### Acceptance criteria
- [ ] Export an A4 PDF with 3mm bleed and crop marks
- [ ] PDF opens correctly in Acrobat/Preview
- [ ] Ask AI "Export as A4 CMYK with 3mm bleed" → settings configured → button appears → download works

---

## Epic 4: Multi-User & Projects (~4h)

**User value:** "Log in, save my projects, come back later."

Enables real usage beyond local dev.

### Tasks

1. **NextAuth.js setup** (1.5h)
   - Credentials provider (email + password)
   - Prisma adapter
   - JWT sessions
   - Login + register pages

2. **Project management UI** (1.5h)
   - `/projects` — grid of project cards with thumbnails, dates
   - "New Project" → name → create → redirect to editor
   - Project settings (name, status)
   - Item management within project

3. **Auth middleware** (0.5h)
   - Protect `/projects/*` routes
   - Redirect to login if unauthenticated

4. **Permission-scoped API** (0.5h)
   - All CRUD routes filter by `userId`
   - User sees only their own projects/items/assets

### Test coverage
- Auth flow: register → login → access protected route
- Unauthenticated requests return 401/403
- User A cannot see User B's projects

### Acceptance criteria
- [ ] Register a new account
- [ ] Log in → see empty project list
- [ ] Create project → redirected to editor
- [ ] Log out → projects page requires login
- [ ] Second user cannot see first user's projects

---

## Epic 5: Visual Editor (~8h)

**User value:** "Drag and drop to design, instead of writing HTML/CSS."

Lowers the skill bar. Non-technical users can now build templates.

### Tasks

1. **GrapeJS integration** (1h)
   - Install GrapeJS, basic config
   - Editor component with canvas + panels
   - Load initial HTML/CSS, listen for changes

2. **Handlebars plugin — core** (3h)
   - `EachBlock` — `{{#each items}}...{{/each}}` as a container
   - `IfBlock` — `{{#if condition}}...{{/if}}` as conditional
   - `Variable` — `{{field_name}}` as editable text node
   - Bidirectional sync: Handlebars ↔ GrapeJS DOM

3. **Handlebars plugin — parser** (2h)
   - On load: parse `{{#each}}` / `{{#if}}` / `{{variable}}` into custom components
   - On save: serialize GrapeJS DOM back to Handlebars string
   - Handle nesting (each inside if, if inside each)

4. **Component palette** (1h)
   - Left sidebar with drag-and-drop blocks
   - Layout (Container, Grid, Grid Item)
   - Data (Repeating Block, Conditional, Field)
   - Print (Header, Footer, Page Break)

5. **Properties panel** (1h)
   - Data tab: bind element to CSV field, set fallback
   - Style tab: CSS (colors, fonts, spacing)
   - Advanced: raw Handlebars expression override

### Test coverage
- Handlebars ↔ GrapeJS round-trip serialization
- EachBlock renders correct `{{#each}}` syntax
- Variable component renders `{{field}}` correctly
- Nested components survive serialize → parse → serialize

### Acceptance criteria
- [ ] Drag "Repeating Block" onto canvas → banner appears in HTML
- [ ] Change its "Loop over" property to "items" → HTML shows `{{#each items}}`
- [ ] Drop "Field" inside → shows `{{field_name}}`
- [ ] Edit CSS in panels → style updates in preview
- [ ] Toggle between GrapeJS and Monaco → content in sync

---

## Epic 6: Vision + Intelligence (~5h)

**User value:** "Upload a screenshot → get a matching template. Spot data issues automatically."

Speed boost for common workflows.

### Tasks

1. **Vision in chat** (2h)
   - Image upload button in MessageInput
   - Send image as base64 to Mistral vision
   - System prompt: analyze layout, colors, typography, spacing
   - AI generates matching Handlebars template + CSS
   - Auto-apply → user sees it in GrapeJS instantly

2. **Text-to-template** (1h)
   - "Create a modern event flyer with blue/yellow, 3-column grid"
   - AI generates HTML + CSS + field mapping suggestions
   - Auto-apply to editor

3. **Auto CSV analysis** (1h)
   - On CSV upload: auto-run `analyze_data` tool
   - Show results in chat: row count, duplicates, nulls, date detection
   - AI proposes cleanup and field mapping

4. **Chat improvements** (1h)
   - Typing indicator during AI response
   - Streaming markdown rendering
   - Collapsible tool call details
   - "Clear conversation" button

### Test coverage
- Image attachment serialization
- CSV analysis edge cases (all nulls, no headers, empty rows)

### Acceptance criteria
- [ ] Upload a screenshot → AI generates matching template
- [ ] Type "Create a 3-column event grid with header/footer" → full template appears
- [ ] Upload CSV with duplicates → AI says "Found 3 duplicate rows" and offers to fix

---

## Summary

| Epic | Value | Time | Dependencies |
|------|-------|------|-------------|
| **1** Working Editor | Upload CSV, edit template, preview, download PDF | ~12h | None |
| **2** AI Agent | Design by conversation, any LLM via `.env`, custom Handlebars helpers | ~10h | Epic 1 |
| **3** Production PDF | Print-ready export with CMYK, bleed, crop marks | ~6h | Epic 1 |
| **4** Multi-User | Login, save projects, collaborate | ~4h | Epic 1 |
| **5** Visual Editor | Drag-and-drop template editing | ~8h | Epic 1 |
| **6** Vision + Intelligence | Screenshot → template, auto data analysis | ~5h | Epic 2 |
| **Total** | | **~45h** | |

### Parallelization

```
Epic 1 ─────────→ Epic 2 ─────→ Epic 6
    ↘                ↘
     Epic 3          Epic 5
      ↘
       Epic 4
```

- **Epic 3** (WeasyPrint) can start once Epic 1's API routes are done — no dependency on AI
- **Epic 4** (Auth) can start once the database schema is stable — parallel with Epics 2-3
- **Epic 5** (GrapeJS) is independent of AI — can build alongside Epic 2
- **Epic 6** (Vision) depends on AI core from Epic 2

### Technical Reference

For detailed schema, route mapping, and file structure, see `docs/APPMV-422-MVP-PLAN.md`.
For the ER diagram, see `docs/entity_design.md`.
