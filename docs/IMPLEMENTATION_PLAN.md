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

## Epic 2: AI Agent (~11h)

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
   - `get_data(itemId)` — returns full dataset `{ columns: string[], rows: Record<string, unknown>[] }`
   - `update_data(itemId, rows)` — replaces dataset with AI-transformed rows (validates shape, rejects empty)
   - `get_helpers()` — returns list of all available Handlebars helpers with signatures, params, and descriptions

3. **Chat UI** (2.5h)
   - MessageList — markdown rendering, version badges per change, inline "[↩ Rollback]" link
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

5. **Auto-apply flow** (1h)
   - Tool calls execute immediately on arrival — no manual "Apply" step
   - Each `update_template` call: snapshot current state → apply new HTML/CSS → increment version → persist to DB
   - Preview re-renders live as changes stream in
   - Tool call display in chat shows diff summary with "(v3)" version badge and "[↩ Rollback]" link
   - For `register_helper` calls: reload helper registry and re-render preview immediately

6. **Helper management UI** (0.5h)
   - Show registered custom helpers and their source code in chat sidebar
   - Option to delete or edit a custom helper
   - Clear visual when a helper is active in the current template

### Test coverage
- Provider abstraction — each provider returns correct ChatMessage format (OpenAI, Anthropic, Mistral, Google)
- Provider error tolerance — returns error message on API failure instead of throwing
- Tool handler unit tests — all 10 tools return correct JSON, including `get_data`, `update_data`, `get_helpers`
- Tool-calling orchestration loop — tool dispatch → execution → result → final response
  - ⚠️ **UAT blocker (must fix before Epic 3):** `runToolLoop` tests are false positives — they pass on the error path (no credentials) without ever entering the tool-calling loop. Replace with a mock/fake provider that returns synthetic `toolCalls` and assert that `executeToolCall` is dispatched and results are fed back into the loop.
- SSE stream formatting + client-side SSE reader
- System prompt construction (includes all 23 helpers + custom helpers + dataset schema)
- Auto-apply flow — snapshot created before each change, store updates correctly, version increments
- Conversation persistence — save/load/clear messages per itemId
- Helper registration round-trip: tool call → persist → re-render
- Chat API route — streaming SSE endpoint with text + tool call events

### Acceptance criteria
- [ ] `LLM_PROVIDER=openai LLM_API_KEY=...` in `.env` → agent uses OpenAI
- [ ] `LLM_PROVIDER=anthropic LLM_API_KEY=...` → agent uses Claude
- [ ] Send "Make the title bigger and blue" → AI calls `update_template` → change appears in preview
- [ ] Send "What data do I have?" → AI calls `get_data_info` → shows column summary
- [ ] AI changes apply instantly — preview updates live, "[↩ Rollback]" shown per change, version increments
- [ ] Send "Create a helper that formats phone numbers" → AI calls `register_helper` → helper available in template
- [ ] Conversation persists on page refresh
- [ ] Send "What helpers can I use?" → AI calls `get_helpers` → lists helpers with signatures
- [ ] Send "Remove duplicate rows" → AI calls `get_data` → modifies JSON → calls `update_data` → data cleaned
- [ ] Conversation survives page refresh (saved per itemId)

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

3. **CSS Paged Media templates + dynamic @page from PageFormat** (~2h)
   - `src/utils/pagedCss.ts` — `buildPagedCss(pageFormat, bleed?, cropMarks?)` utility generating `@page { size, bleed, marks }` CSS
     - Refactor PreviewPanel and buildPreviewDocument to use this shared utility
     - Inject generated @page CSS into the export pipeline in exportStore
   - ExportPanel: add bleed slider (0–5mm), crop marks toggle, color mode selector (RGB/CMYK)
   - exportStore: new fields `bleed`, `cropMarks`, `colorMode`; `exportPdf()` builds full CSS via `buildPagedCss()` before sending to WeasyPrint
   - CMYK: pass `pdf_variant: "pdf/x-4"` in WeasyPrint options when colorMode=CMYK; embed ICC profile via `@color-profile` in generated CSS
   - System prompt: inject CSS Paged Media knowledge (`@page`, `bleed`, `marks`, `device-cmyk()`, running elements, named pages) so AI can generate print-ready CSS
   - **Note:** bleed/crop marks stored inline in `exportSettings` JSON on `PrintItem` (not on `PageFormat` — PageFormat defines dimensions only)
   - **Commits:** pagedCss utility → ExportPanel controls → CMYK pipeline → system prompt

4. **Export from chat** (~1.5h)
   - AI can set page format (via `update_page_format`), bleed, crop marks, color mode via extended tools
   - System prompt already includes current page format + available formats (from Epic 2)
   - Add bleed/crop marks/colorMode to system prompt context
   - "Generate PDF" button in chat
   - `POST /api/pdf/generate` proxies to WeasyPrint with @page CSS generated from PageFormat + export settings
   - Ghostscript post-processing for strict PDF/X-1a compliance (optional, via `/api/cmyk/convert`)
   - PDF/UA accessibility tagging (option, not default for print flyers)

5. **Upgrade multi-page preview with WeasyPrint page images** (1.5h)
   - Replace client-side CSS clip/transform page splitting with WeasyPrint-rendered page images
   - Use pdf2image or pdf.js to render each PDF page as an image/canvas for the preview
   - Reuse existing `previewStore` pagination state (`currentPage`, `totalPages`, navigation actions) and `PageNavigator` component from the initial CSS-based implementation
   - Gives pixel-perfect preview respecting `@page`, `page-break-*`, bleed, crop marks, and CMYK

### Test coverage
- WeasyPrint output matches expected page count and size
- API proxy returns correct Content-Type
- S3 upload/download round-trip

### Acceptance criteria
- [ ] Export an A4 PDF with 3mm bleed and crop marks
- [ ] Export a CMYK PDF/X-4 PDF with embedded ICC profile
- [ ] Preview matches export @page size (both driven from same PageFormat entity)
- [ ] PDF opens correctly in Acrobat/Preflight without DeviceRGB warnings
- [ ] Ask AI "Export as A4 CMYK with 3mm bleed" → settings configured → button appears → download works

---

## Epic 3a: Multi-Page Preview, CSS Consistency & Accessibility (~8h)

**User value:** "Preview matches the exported PDF exactly. Multi-page documents show all pages. Accessible PDFs for EU compliance."

The preview currently hardcodes `@page { margin: 0 }` while the export uses `buildPagedCss()` with bleed/crop marks. This causes a CSS mismatch — content fits on page 1 in the preview but overflows to page 2 in the export, bleed/crop marks are invisible in preview, and the user can only see the first page of multi-page documents.

This epic fixes all of that and adds PDF/UA accessibility (EU standard) support.

### Tasks

**1. Fix preview/export CSS mismatch** (~2h)
- **ROOT CAUSE:** `PreviewPanel.tsx:41-43` injects hardcoded `@page { size: ...; margin: 0 }` which overrides the template's actual CSS. Export uses `buildPagedCss(widthMm, heightMm, bleed, cropMarks)` which respects template CSS.
- **Fix:** `PreviewPanel` calls `buildPagedCss()` with the same dimensions, bleed, and cropMarks as the export. Remove hardcoded `@page` injection. Import bleed/cropMarks from `useExportStore`.
- Inject bleed-area visual indicator (a transparent red overlay extending `bleed` mm beyond the trim box) so the user sees where content will be clipped.
- Inject crop-mark visual indicators (corner lines at trim edges) when `cropMarks` is enabled.
- **Result:** Preview shows the exact same layout as the exported PDF. The immediate impact: content no longer appears on page 1 in preview but page 2 in export.
- **Commits:** fix-css-mismatch → bleed-visual → crop-mark-visual

**2. Hybrid multi-page preview — WeasyPrint-backed** (~3h)
- **Current:** Preview renders a single page via client-side Handlebars in an `<iframe>`. Multi-page documents (`{{#each rows}}`) show only page 1.
- **Target:** Hybrid approach — instant client-side preview of page 1 (now with correct CSS from task 1) + async WeasyPrint-rendered multi-page preview.
- **New API route:** `POST /api/preview` — accepts `{ html, css, options }`, proxies to WeasyPrint `/generate`, returns PDF bytes (identical pipeline to `/api/pdf/generate`).
- **Client-side:** Install `pdfjs-dist`. `PreviewPanel` calls `/api/preview` on template changes (debounced 500ms). PDF.js renders each page as a `<canvas>`. Page navigation via prev/next buttons with page counter (`"Page 3 of 12"`).
- **New component:** `src/components/Preview/PageViewer.tsx` — PDF.js page renderer with:
  - `canvas` per page rendered at device-pixel ratio for crisp display
  - Prev/next navigation arrows
  - Page number input + total count
  - Loading spinner while WeasyPrint renders
  - Error state with retry button
- **State:** `previewStore` extended with `totalPages`, `currentPage`, `setPage()`, `pdfBlob` (cached PDF bytes).
- **Edge cases:** Empty template → show "No template". Compilation error → show error (client-side). WeasyPrint timeout → fall back to client-side preview with "Inaccurate preview" badge. Rapid edits → debounce prevents request flood.
- **Commits:** preview-api-route → pdfjs-integration → page-viewer-component → state-management

**3. Accessibility toggle in ExportPanel UI** (~0.5h)
- `exportStore.enableAccessibility` already exists — no store changes needed.
- Add checkbox to `ExportPanel.tsx` below the color mode selector:
  - Label: "PDF/UA accessibility tagging"
  - Wires to `useExportStore().setEnableAccessibility()`
  - When checked, a note appears: "Generates EU-standard accessible PDF (ISO 14289-1 / PDF/UA)"
- **Commits:** accessibility-ui-toggle

**4. PDF/UA compliance improvements** (~1.5h)
- Ensure `lang` attribute is set on `<html>` in generated documents (both preview and export):
  - `handlebarsRenderer.ts`: add `<html lang="en">` (or a configurable lang) instead of `<html>`
  - `previewDocument.ts`: same treatment
  - Check if template already has `lang` — if so, preserve it; if not, default to `"en"`
- Add `<title>` metadata to generated documents for PDF metadata
- When `enableAccessibility=true`, inject accessible structure hints:
  - Ensure proper document language
  - WeasyPrint's `pdf_tags=True` generates tagged PDF structure automatically
- **Commits:** lang-attribute → title-metadata → accessible-structure

**5. AI system prompt: accessibility knowledge** (~1h)
- Add section to `system-prompt.ts`: "## PDF Accessibility (PDF/UA)"
- Content injected into the system prompt:
  - PDF/UA (ISO 14289-1) is the EU-standard for accessible PDFs
  - The `update_export_settings` tool supports `enableAccessibility: true`
  - Template guidelines for accessible output:
    - Use semantic HTML: `<h1>`-`<h6>` for headings, `<p>` for paragraphs, `<ul>`/`<ol>` for lists, `<table>`/`<th>` for data tables
    - Always include `lang` attribute on `<html>` (e.g., `<html lang="de">`)
    - Always include `<title>` in `<head>`
    - Add `alt` text to all `<img>` elements
    - Maintain proper heading hierarchy (h1 → h2, never skip levels)
    - Ensure sufficient color contrast (WCAG 2.1 AA: 4.5:1 for normal text)
    - Don't convey information through color alone
  - When generating templates or suggesting edits, the AI should follow these practices by default (not only when accessibility is toggled on)
- **Commits:** system-prompt-accessibility

**6. veraPDF validation (manual/CI)** (~0.5h)
- Script: `scripts/validate-pdfua.sh` — downloads veraPDF if not present, validates a PDF, exits with 0/1
- Documentation in `docs/PDFUA_VALIDATION.md`

### Test coverage

**RED tests (failing before implementation):**
- **preview-css-consistency.test.ts** — Preview uses `buildPagedCss()` not hardcoded `margin:0`. Bleed/crop marks from exportStore reflected in preview. Bleed area indicator rendered. Crop marks rendered.
- **multi-page-preview-api.test.ts** — `/api/preview` route exists, returns PDF with correct Content-Type, returns >1 page for multi-row data, rejects missing html with 400.
- **accessibility-toggle-ui.test.tsx** — ExportPanel renders a PDF/UA checkbox, toggling updates store state, checkbox reflects store value.
- **pdf-ua-compliance.test.ts** — `enableAccessibility=true` sets `pdf_tags: true` and `pdf_variant: 'pdf/ua-1'`. Rendered HTML has `lang` attribute. Rendered HTML has `<title>`. `enableAccessibility=false` sends neither option. lang defaults to "en" when not present in template.
- **system-prompt-accessibility.test.ts** — System prompt includes PDF/UA section, mentions `lang` attribute, mentions `enableAccessibility: true`, mentions semantic HTML.

**Existing tests that must remain GREEN:**
- All 50+ existing Vitest tests (`npm run test`)
- Python pytest suite (`cd pdf-service && pytest -v`)

### Acceptance criteria
- [ ] Preview shows same layout as export (same CSS `@page` rules)
- [ ] Preview shows bleed area (red overlay beyond trim) when bleed > 0
- [ ] Preview shows crop mark corner indicators when enabled
- [ ] Multi-page document shows page navigation (prev/next, page 3 of 12)
- [ ] Template with `{{#each rows}}` renders all pages via WeasyPrint
- [ ] ExportPanel has "PDF/UA accessibility tagging" checkbox
- [ ] Checking it sends `pdf_tags: true` and `pdf_variant: 'pdf/ua-1'` to WeasyPrint
- [ ] Generated accessible PDF has `lang` attribute and `<title>` metadata
- [ ] PDF passes veraPDF PDF/UA-1 validation (machine-checkable rules)
- [ ] AI system prompt includes accessibility guidelines
- [ ] AI-generated templates use semantic HTML by default

---

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

## Epic 7: Auto-Apply + Versioned Rollback (~4h)

**User value:** "Changes apply instantly when the AI acts. Every change is a recoverable snapshot — roll back any AI edit with one click."

Enables safe live editing. The user never needs to manually approve changes; instead every mutation creates a snapshot that can be reverted at any time.

### Tasks

1. **`PrintItemVersion` model** (0.5h)
   - New Prisma model: `PrintItemVersion { id, printItemId, version, html, css, miscText, createdAt }`
   - Unique constraint on `[printItemId, version]`
   - Migration to create the table
   - `PrintItem.html` / `PrintItem.css` / `PrintItem.miscText` remain the *current* live state

2. **Snapshot-on-write in `applyTemplateChanges()`** (1h)
   - Before applying any change, read current `PrintItem` state and persist a snapshot at `version + 1`
   - Snapshot captures: `html`, `css`, `miscText` (includes `customHelpers[]`)
   - Then apply the new change and increment `PrintItem.version`
   - Works for both `update_template` and `register_helper` calls (via miscText)
   - Future: extend to `DataSet` snapshots for `update_data` rollback

3. **Rollback API** (1h)
   - `POST /api/items/[id]/rollback` — body: `{ version: number }`
   - Fetches the `PrintItemVersion` snapshot for that version
   - Restores `PrintItem.html`, `PrintItem.css`, `PrintItem.miscText` from the snapshot
   - Sets `PrintItem.version` to the restored version
   - Returns the restored state
   - 404 if the requested version doesn't exist or predates the first snapshot

4. **Rollback lib function** (0.5h)
   - `src/lib/ai/rollback.ts` — `rollbackToVersion(itemId, version)` → restores snapshot + reloads helpers
   - `rollbackToVersion` also unregisters any custom helpers added after the target version
   - Callable from both API route and chat store

5. **Chat UI: rollback interaction** (1h)
   - Each tool call card shows a version badge e.g. "(v3)" with "[↩ Rollback]" link
   - Clicking rollback: calls rollback API → templateStore updates → preview re-renders → chat message shows "Reverted to v3"
   - Global "Undo" button in chat header → steps back one version
   - Optional: "Redo" button if subsequent versions are preserved (not deleted on rollback)

### Test coverage
- Snapshot created before each `update_template` — version matches expected
- Rollback restores html + css + miscText to exact prior state
- Version sequence correct: v5 → rollback to v3 → version is now 3
- Rollback to non-existent version returns 404
- `register_helper` changes are included in miscText snapshot → restored on rollback
- Optimistic locking: concurrent manual edit detected via version mismatch
- Rollback to initial state (version 0) works

### Acceptance criteria
- [ ] Every AI `update_template` creates a versioned snapshot in `PrintItemVersion`
- [ ] Click "[↩ Rollback]" on a chat change → template and preview revert to prior state
- [ ] Global "Undo" steps back one version
- [ ] Rollback restores custom helpers (unregisters ones added after target version)
- [ ] Redo steps forward if versions are preserved
- [ ] `curl -X POST /api/items/1/rollback -d '{"version":2}'` restores version 2

---

## Summary

| Epic | Value | Time | Dependencies |
|------|-------|------|-------------|
| **1** Working Editor | Upload CSV, edit template, preview, download PDF | ~12h | None |
| **2** AI Agent | Design by conversation, any LLM via `.env`, custom Handlebars helpers | ~11h | Epic 1 |
| **3** Production PDF | Print-ready export with CMYK, bleed, crop marks | ~6h | Epic 1 |
| **4** Multi-User | Login, save projects, collaborate | ~4h | Epic 1 |
| **5** Visual Editor | Drag-and-drop template editing | ~8h | Epic 1 |
| **6** Vision + Intelligence | Screenshot → template, auto data analysis | ~5h | Epic 2 |
| **7** Auto-Apply + Rollback | Instant live changes, every AI edit is a recoverable snapshot | ~4h | Epic 2 |
| **Total** | | **~49h** | |

### Parallelization

```
Epic 1 ─────────→ Epic 2 ─────→ Epic 6
    ↘                ↘               ↘
     Epic 3          Epic 5         Epic 7
      ↘
       Epic 4
```

- **Epic 3** (WeasyPrint) can start once Epic 1's API routes are done — no dependency on AI
- **Epic 4** (Auth) can start once the database schema is stable — parallel with Epics 2-3
- **Epic 5** (GrapeJS) is independent of AI — can build alongside Epic 2
- **Epic 6** (Vision) depends on AI core from Epic 2
- **Epic 7** (Auto-Apply + Rollback) depends on Epic 2's apply infrastructure; can build alongside Epic 5-6

### Technical Reference

For detailed schema, route mapping, and file structure, see `docs/APPMV-422-MVP-PLAN.md`.
For the ER diagram, see `docs/entity_design.md`.
