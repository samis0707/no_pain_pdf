# No Pain PDF — Implementation Plan

> Organized by Epic (user-value iteration), not by technical layer.
> Each epic delivers a working, testable increment.

---

## Epic 1: Working Editor (~12h)

**User value:** "Upload a CSV, edit a template, preview it live, and download a PDF."

Build the core editor loop without AI or auth. This is the foundation everything else rests on.

### Tasks

1. **Scaffold Next.js app** (1h)
   - `create-next-app` with TypeScript, Tailwind, App Router
   - Install deps: Zustand, handlebars, papaparse, Prisma, S3 client
   - Basic page layout with tabs (Upload / Design / Export)

2. **Database + schema** (1h)
   - Prisma schema: User, PrintProject, PrintItem, PrintTemplate, DataSet, ChatMessage, Asset
   - Seed 3 preset templates (event flyer, cooperation, general)
   - Run migration, create `lib/prisma.ts` singleton

3. **REST API — Core CRUD** (2h)
   - `api/projects` — `GET` (list), `POST` (create)
   - `api/projects/[id]` — `GET`, `PUT`, `DELETE`
   - `api/items` — `POST` (create with projectId)
   - `api/items/[id]` — `GET`, `PUT` (save html, css), `DELETE`
   - `api/items/[id]/datasets` — `POST` (upload CSV, parse with PapaParse server-side, store rows + columns in DataSet), `GET` (list)
   - `api/items/[id]/datasets/[dsId]` — `GET`, `PUT` (update mapping), `DELETE`
   - All routes return JSON, validate input, return proper status codes
   - Testable via `curl` without a browser

4. **CSV import frontend** (1.5h)
   - CSVUploader — drag-and-drop file upload
   - DataPreview — table showing first 20 rows
   - FieldMapper — bind CSV columns to template variables
   - Calls `POST /api/items/[id]/datasets` on upload

5. **Template editor** (2.5h)
   - Monaco Editor for HTML + CSS
   - Client-side Handlebars compile with `handlebarsRenderer.ts`
   - Live iframe preview with sample data from DataSet
   - Saves via `PUT /api/items/[id]`

6. **Other backend routes** (1h)
   - `api/templates/compile`, `api/templates/validate`, `api/templates/helpers`
   - `api/assets/upload`, `api/assets/file/[filename]`

7. **Export panel + PDF** (2h)
   - Export settings form (page size, orientation, margins)
   - `POST /api/pdf/generate` → download PDF
   - **Epic 1 renders a basic PDF** (browser print-to-PDF or placeholder PDF service)

### Test coverage
- REST API: create project → create item → upload dataset → update template → retrieve (end-to-end via `curl`)
- API input validation (missing fields, invalid IDs return 400/404)
- CSV parsing edge cases (empty file, malformed rows, encoding)
- Handlebars compile errors
- DataSet creation and retrieval

### Acceptance criteria
- [ ] `curl -X POST /api/projects` → returns project JSON with id
- [ ] `curl -X POST /api/items` with projectId → returns item JSON
- [ ] `curl -F file=@data.csv POST /api/items/[id]/datasets` → returns DataSet with parsed rows
- [ ] `curl -X PUT /api/items/[id]` with html/css → saves and returns updated item
- [ ] Upload CSV via UI → see preview table
- [ ] Map a CSV column to `{{title}}` in the template
- [ ] Edit HTML in Monaco → preview updates live
- [ ] Click Export → download a PDF with data rendered

---

## Epic 2: AI Agent (~8h)

**User value:** "Design by conversation — describe what you want, the AI builds it."

The differentiator. The user talks to an AI that edits the template, analyzes data, and iterates with them.

### Tasks

1. **Mistral SDK integration** (1.5h)
   - `lib/ai-service.ts` — SSE streaming with Mistral
   - `POST /api/ai/chat` — streaming endpoint
   - Tool-calling loop with Mistral's function-calling API

2. **Tool definitions** (2h)
   - `get_template()` — returns current HTML + CSS
   - `update_template(html?, css?, name?)` — saves changes, increments version
   - `get_data_info()` — returns DataSet columns, row count, sample rows
   - `analyze_data()` — deep analysis (duplicates, nulls, suggestions)
   - `render_preview()` — returns base64 screenshot of preview
   - `get_assets()` — lists uploaded images

3. **Chat UI** (2.5h)
   - MessageList — markdown rendering, code blocks with "Apply" button
   - MessageInput — textarea, send, image upload button
   - ChatSidebar — resizable panel, scroll persistence
   - SSE stream reader — streams text and tool events in real-time

4. **System prompt + context** (1h)
   - Injects current template (HTML + CSS)
   - Injects DataSet schema (columns, sample rows, row count)
   - Injects available Handlebars helpers
   - Injects available assets

5. **"Apply" button flow** (1h)
   - Tool call display → diff summary → "Apply Changes" button
   - On click: updates Zustand templateStore → triggers preview → PUT to DB
   - Version increment on each change

### Test coverage
- Tool handler unit tests (each returns correct JSON)
- SSE stream formatting
- System prompt construction
- "Apply" flow — store updates correctly

### Acceptance criteria
- [ ] Send "Make the title bigger and blue" → AI calls `update_template` → change appears in preview
- [ ] Send "What data do I have?" → AI calls `get_data_info` → shows column summary
- [ ] AI code suggestion shows "Apply" button → click it → template updates
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
| **2** AI Agent | Design by conversation | ~8h | Epic 1 |
| **3** Production PDF | Print-ready export with CMYK, bleed, crop marks | ~6h | Epic 1 |
| **4** Multi-User | Login, save projects, collaborate | ~4h | Epic 1 |
| **5** Visual Editor | Drag-and-drop template editing | ~8h | Epic 1 |
| **6** Vision + Intelligence | Screenshot → template, auto data analysis | ~5h | Epic 2 |
| **Total** | | **~43h** | |

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
