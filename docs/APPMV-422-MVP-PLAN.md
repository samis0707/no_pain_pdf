# APPMV-422: Agentic Print Generator — MVP Plan

> **Status:** Draft  
> **Target:** Next.js App (replace Vite + Express) with Prisma + PostgreSQL  
> **Est. Total:** ~42h

---

## Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema (Prisma)](#3-database-schema-prisma)
4. [Route Mapping: Express → Next.js API](#4-route-mapping-express--nextjs-api)
5. [Phase 0: Scaffold Next.js & Migrate Frontend](#5-phase-0-scaffold-nextjs--migrate-frontend)
6. [Phase 1: Database Foundation (Prisma)](#6-phase-1-database-foundation-prisma)
7. [Phase 2: Extract pdf-service (Puppeteer Microservice)](#7-phase-2-extract-pdf-service-puppeteer-microservice)
8. [Phase 3: Rewrite Backend Routes → Next.js API](#8-phase-3-rewrite-backend-routes--nextjs-api)
9. [Phase 4: Auth & Project Management](#9-phase-4-auth--project-management)
10. [Phase 5: Chat Interface + AI Backend](#10-phase-5-chat-interface--ai-backend)
11. [Phase 6: GrapeJS WYSIWYG Editor](#11-phase-6-grapejs-wysiwyg-editor)
12. [Phase 7: Vision Support + CSV Intelligence](#12-phase-7-vision-support--csv-intelligence)
13. [Phase 8: Export Pipeline + Polish](#13-phase-8-export-pipeline--polish)
14. [File Structure](#14-file-structure)
15. [Implementation Order Summary](#15-implementation-order-summary)

---

## 1. Vision & Problem Statement

### Current State

The PoC is a functional print PDF generator with:

- **Frontend**: React 18 + Vite, Zustand, Monaco Editor, Handlebars
- **Backend**: Express + Puppeteer + Ghostscript (CMYK)
- **Workflow**: Upload CSV → Map fields → Edit HTML/CSS in Monaco → Preview → Export PDF

The user currently designs templates by editing `templateStore.ts` directly in Claude Code — pasting screenshots, describing layouts, and manually instructing changes.

### MVP Goal

Build an **agentic workflow** where the user:

1. Describes their desired design via **text prompts** or **image uploads** (screenshots, mockups, PDFs)
2. The AI agent **generates and refines** the full Handlebars template (HTML + CSS)
3. A **GrapeJS WYSIWYG editor** replaces Monaco for visual editing
4. The existing **Puppeteer → Ghostscript PDF pipeline** produces print-ready output
5. Everything persists to **PostgreSQL via Prisma**

### Core Principles

- **Agentic-first**: The AI drives template creation; the user supervises and refines
- **Visual editing**: GrapeJS replaces raw code editing for non-technical users
- **Production PDF**: Bleed, crop marks, CMYK, PDF/X metadata — all preserved
- **Conversation persists**: Chat history per design item survives sessions

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Next.js App (Frontend + API Routes)                             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ GrapeJS  │  │ Preview  │  │  Chat    │  │  DataImport   │  │
│  │ WYSIWYG  │  │  iframe  │  │  Panel   │  │  (CSV upload) │  │
│  └────┬─────┘  └──────────┘  └────┬──────┘  └───────┬───────┘  │
│       │                           │                  │           │
│  ┌────┴───────────────────────────┴──────────────────┴──────┐  │
│  │              Zustand Stores                               │  │
│  │    template | data | export | chat | auth                │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │              API Route Handlers                           │  │
│  │  /api/ai/*  /api/projects/*  /api/items/*  /api/assets/*  │  │
│  │  /api/cmyk/*  /api/auth/*  /api/templates/*  /api/pdf/*   │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │  Prisma ORM → PostgreSQL                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────┴────────┐     ┌──────────┴──────────┐
     │ pdf-service     │     │ Ghostscript (Docker) │
     │ (Puppeteer)     │     │ CMYK Conversion      │
     │ Port 3001       │     │ Port 3002            │
     └─────────────────┘     └─────────────────────┘
```

### Service Breakdown

| Service | Role | Notes |
|---------|------|-------|
| **Next.js app** | UI + API routes | Replaces Vite frontend + Express backend |
| **pdf-service** | Puppeteer HTML→PDF | Standalone microservice. Kept separate because Chromium is heavy and PDF gen can take 30s+ |
| **Ghostscript** | CMYK conversion | Existing Docker container, unchanged |

---

## 3. Database Schema (Prisma)

```prisma
model User {
  id          Int       @id @default(autoincrement())
  name        String?
  email       String    @unique
  passwordHash String?
  image       String?
  preferences Json?     @default("{}")
  projects    PrintProject[]
  assets      Asset[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model PrintProject {
  id        Int          @id @default(autoincrement())
  userId    Int
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  status    String       @default("draft") // draft | active | archived
  items     PrintItem[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model PrintTemplate {
  id        Int          @id @default(autoincrement())
  name      String
  category  String?      // "event-flyer" | "cooperation" | "general" | etc.
  html      String
  css       String
  metadata  Json?        @default("{}") // thumbnail, description, tags
  items     PrintItem[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model PrintItem {
  id             Int            @id @default(autoincrement())
  projectId      Int
  project        PrintProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  templateId     Int?
  template       PrintTemplate? @relation(fields: [templateId], references: [id])
  name           String
  html           String         // Handlebars template HTML
  css            String         // Template CSS
  assetLinks     Json?          @default("[]") // ["/api/assets/file/uuid.jpg", ...]
  dataMapping    Json?          @default("[]") // [{ csvColumn, templateVariable, transform }]
  dataSet        Json?          @default("[]") // cached CSV data (headers + sample)
  exportSettings Json?          @default("{}") // { format, bleed, colorMode, iccProfile, ... }
  miscText       Json?          @default("{}") // flexible metadata
  thumbnailUrl   String?
  version        Int            @default(1)
  chatMessages   ChatMessage[]
  assets         Asset[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model ChatMessage {
  id           Int        @id @default(autoincrement())
  printItemId  Int
  printItem    PrintItem  @relation(fields: [printItemId], references: [id], onDelete: Cascade)
  role         String     // "user" | "assistant" | "system" | "tool"
  content      String     // Markdown-formatted message text
  attachments  Json?      @default("[]") // [{ type: "image", url: "...", alt: "..." }]
  toolCalls    Json?      @default("[]") // [{ tool, args, result }]
  createdAt    DateTime   @default(now())
}

model Asset {
  id           Int         @id @default(autoincrement())
  printItemId  Int?
  printItem    PrintItem?  @relation(fields: [printItemId], references: [id], onDelete: SetNull)
  userId       Int?
  user         User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  filename     String      // UUID-based filename on disk
  originalName String      // Original upload filename
  mimeType     String      // "image/png", "image/jpeg", etc.
  fileSize     Int         // bytes
  createdAt    DateTime    @default(now())
}
```

### Seed Data

Migrate existing preset templates into `PrintTemplate`:

- `Quartierszentrum Böckingen` — Community event flyer (multi-page, 3-col grid)
- `Sportpark × linqr Kooperationsflyer` — Single-page cooperation flyer
- `linqr Allgemein` — General local news flyer

---

## 4. Route Mapping: Express → Next.js API

### Existing Express Routes → Next.js API Handlers

| Method | Express Path | Next.js Route Handler | Notes |
|--------|-------------|----------------------|-------|
| GET | `/api/health` | Drop | Not needed in Next.js |
| POST | `/api/templates/compile` | `api/templates/compile/route.ts` | Handlebars compile |
| POST | `/api/templates/validate` | `api/templates/validate/route.ts` | Syntax check |
| GET | `/api/templates/helpers` | `api/templates/helpers/route.ts` | List helpers |
| POST | `/api/pdf/generate` | `api/pdf/generate/route.ts` | Proxy to pdf-service:3001 |
| POST | `/api/pdf/batch` | `api/pdf/batch/route.ts` | Proxy to pdf-service:3001 |
| GET | `/api/cmyk/health` | `api/cmyk/health/route.ts` | Proxy to Ghostscript |
| GET | `/api/cmyk/profiles` | `api/cmyk/profiles/route.ts` | Proxy to Ghostscript |
| POST | `/api/cmyk/convert` | `api/cmyk/convert/route.ts` | Proxy to Ghostscript |
| GET | `/api/assets/file/:filename` | `api/assets/file/[filename]/route.ts` | Serve files |
| POST | `/api/assets/upload` | `api/assets/upload/route.ts` | File upload |

### New Next.js API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/chat` | AI chat with tool-calling + SSE streaming |
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Get project with items |
| PUT | `/api/projects/[id]` | Update project |
| DELETE | `/api/projects/[id]` | Delete project |
| GET | `/api/items` | List items (with filters) |
| POST | `/api/items` | Create item |
| GET | `/api/items/[id]` | Get item (full template, settings) |
| PUT | `/api/items/[id]` | Update item |
| DELETE | `/api/items/[id]` | Delete item |
| GET | `/api/items/[id]/chat` | Get chat history |
| POST | `/api/items/[id]/chat` | Send message |
| POST | `/api/auth/[...nextauth]` | Auth (NextAuth.js) |

---

## 5. Phase 0: Scaffold Next.js & Migrate Frontend

**Est. time:** 6h

### Steps

1. **Create Next.js app** in the monorepo root
   ```bash
   npx create-next-app@latest app --typescript --tailwind --app --src-dir
   ```
   Move into `service-opo/app/`

2. **Install dependencies**
   - Zustand, @monaco-editor/react (temporary, until GrapeJS replaces it)
   - handlebars, papaparse
   - @prisma/client, next-auth, bcryptjs
   - @anthropic-ai/sdk (or openai)

3. **Migrate existing frontend components** from `print-generator/frontend/src/`:
   - `stores/` → Zustand stores (mostly unchanged)
   - `components/DataImport/` → CSV upload, DataPreview, FieldMapper
   - `components/Preview/` → PreviewPanel, ErrorBoundary
   - `components/ExportPanel/` → Export settings form
   - `components/Editor/` → **(will be replaced by GrapeJS in Phase 6, but keep temporarily)**
   - `utils/` → handlebarsRenderer, csvParser
   - `index.css` → migrate to Tailwind or keep as CSS modules

4. **Configure App Router layout** — tabs (Upload / Design / Download) become client components

5. **Set up proxy routes** for development (Next.js rewrites to pdf-service, Ghostscript)

### Key Files Created

```
app/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Main editor page
│   │   ├── projects/
│   │   │   ├── page.tsx          ← Project list (New)
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← Single project view (New)
│   │   └── globals.css
│   ├── components/
│   │   ├── DataImport/
│   │   ├── Preview/
│   │   ├── ExportPanel/
│   │   └── Editor/               (temporary, replaced by GrapeJS)
│   ├── stores/                   (from existing frontend)
│   ├── utils/                    (from existing frontend)
│   └── lib/
│       └── handlebars-helpers.ts (shared between client + API)
└── public/
```

---

## 6. Phase 1: Database Foundation (Prisma)

**Est. time:** 2h

### Steps

1. **Install Prisma**
   ```bash
   cd app
   npm install prisma @prisma/client
   npx prisma init
   ```

2. **Write schema** — as defined in Section 3 above

3. **Create seed script** — migrate three existing presets into `PrintTemplate`
   - `quartierszentrum-boeckingen` — multi-page event flyer
   - `sportpark-kooperation` — single-page cooperation
   - `linqr-allgemein` — local news flyer

4. **Run migration**
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. **Create Prisma client singleton** in `src/lib/prisma.ts`

### Key Files Created

```
app/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
└── src/
    └── lib/
        └── prisma.ts
```

---

## 7. Phase 2: Extract pdf-service (Puppeteer Microservice)

**Est. time:** 2h

### Why Separate?

- Puppeteer runs a full Chromium browser — heavy process that shouldn't live inside Next.js
- PDF generation can exceed Next.js serverless function timeouts (60s on Vercel)
- Clean separation: scale PDF workers independently if needed

### Steps

1. **Create `pdf-service/` directory** (standalone Node.js app)

2. **Copy relevant files** from `print-generator/backend/src/services/`:
   - `pdf.service.ts` — PDF generation with Puppeteer (almost unchanged)
   - `template.service.ts` — Handlebars compilation
   - `pdfbox.service.ts` — PDF box metadata
   - `asset.service.ts` — Asset path resolution (simplified)

3. **Create simple Express server** with one endpoint:
   ```
   POST /generate
   Body: { html, css, data: Record<string, unknown>[], options: PDFOptions }
   Response: application/pdf binary
   ```

4. **Add health endpoint**
   ```
   GET /health → { status: "ok" }
   ```

5. **Dockerize** (optional — can run as a simple Node process too)

### Key Files Created

```
pdf-service/
├── package.json
├── tsconfig.json
├── Dockerfile
└── src/
    ├── index.ts              ← Express server, port 3001
    ├── pdf.service.ts
    ├── template.service.ts
    ├── pdfbox.service.ts
    └── asset.service.ts
```

---

## 8. Phase 3: Rewrite Backend Routes → Next.js API

**Est. time:** 4h

### Steps

Create API route handlers for each existing Express endpoint:

| Route Handler | What It Does |
|--------------|-------------|
| `api/templates/compile/route.ts` | Compiles Handlebars with data (uses client-side equivalent or calls a lightweight Node.js compile) |
| `api/templates/validate/route.ts` | Validates Handlebars syntax |
| `api/templates/helpers/route.ts` | Returns available Handlebars helpers with descriptions |
| `api/pdf/generate/route.ts` | Proxies to `pdf-service:3001/generate`, returns PDF |
| `api/pdf/batch/route.ts` | Proxies to `pdf-service:3001/batch`, returns PDF |
| `api/cmyk/health/route.ts` | Proxies to Ghostscript health check |
| `api/cmyk/profiles/route.ts` | Returns available ICC profiles |
| `api/cmyk/convert/route.ts` | Proxies CMYK conversion to Ghostscript |
| `api/assets/file/[filename]/route.ts` | Serves uploaded files |
| `api/assets/upload/route.ts` | Handles file upload via `formidable` or native `Request.formData()` |

### Key Design Decisions

- **Handlebars compile on client**: The frontend already does Handlebars compilation via `handlebarsRenderer.ts`. Keep it client-side for instant preview. The API route is only needed if the backend needs to compile (e.g., for PDF generation — but that's handled by pdf-service now).
- **File uploads**: Use Next.js Route Handlers with `formidable` or the native `Request.formData()` API. Store files in `public/assets/` or a configurable upload directory.
- **PDF proxy**: Simple passthrough — no heavy processing in Next.js.

---

## 9. Phase 4: Auth & Project Management

**Est. time:** 4h

### Steps

1. **Set up NextAuth.js**
   - Credentials provider (email + password)
   - Optional: Google/GitHub OAuth
   - JWT sessions (simpler for API routes)
   - Prisma adapter for user persistence

2. **Create auth UI**
   - Login page (`/login`)
   - Registration page (`/register`)
   - Auth middleware to protect `/projects/*` routes

3. **Create Project CRUD UI**
   - `/projects` — Grid of project cards with thumbnails, status badges, dates
   - "New Project" button → name it → redirect to editor
   - Each project has one or more `PrintItem`s (designs)
   - Project settings: name, status

4. **Create API routes** for CRUD:
   - `api/projects/` — List, Create
   - `api/projects/[id]/` — Get, Update, Delete
   - `api/items/` — List, Create
   - `api/items/[id]/` — Get, Update, Delete

### Key Pages Created

```
app/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── projects/
│   ├── page.tsx          ← Project grid
│   └── [id]/
│       └── page.tsx      ← Editor (tabs: items in project)
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts
```

---

## 10. Phase 5: Chat Interface + AI Backend

**Est. time:** 8h

### Steps

#### 5a. Chat UI Component (`src/components/Chat/`)

- **MessageList** — scrollable list of messages
  - User messages (right-aligned, with optional image attachments)
  - Assistant messages (left-aligned, Markdown-rendered)
  - Code blocks with syntax highlighting and "Apply" button
  - Tool call indicators (collapsible)
  - Loading state (typing indicator)
- **MessageInput** — textarea + send button + image upload button
  - Image upload: preview thumbnail, can remove before sending
  - Shift+Enter for newline, Enter to send
  - Disabled while AI is responding
- **ChatSidebar** — resizable right panel in the Design tab
  - Collapsible on small screens
  - Persists scroll position
  - "Clear conversation" button

#### 5b. AI Backend API (`api/ai/chat/route.ts`)

**POST /api/ai/chat**

Request:
```json
{
  "printItemId": 1,
  "messages": [
    { "role": "user", "content": "Make the title bigger and blue" }
  ]
}
```

Response: **Server-Sent Events (SSE) stream**

```
event: message
data: {"type": "text", "content": "I'll adjust..."}

event: message
data: {"type": "tool_call", "tool": "update_template", "args": {...}}

event: message
data: {"type": "result", "tool": "update_template", "success": true}

event: done
data: {"id": "msg_123"}
```

**System prompt construction:**

The backend builds a system prompt with full context:
```
You are an AI print designer assistant. You help users create beautiful print PDFs.

CURRENT TEMPLATE:
<name>Event Flyer</name>
<HTML>... (truncated Handlebars template)</HTML>
<CSS>... (truncated styles)</CSS>

DATA SCHEMA:
<headers>title, description, date, location, contact</headers>
<row_count>47</row_count>
<sample_rows>[{...}, {...}]</sample_rows>

AVAILABLE HELPERS:
- {{formatDate date "DD.MM.YYYY"}} - Format date in German locale
- {{truncate text 100}} - Truncate text
- {{#ifEquals a b}}...{{/ifEquals}} - Conditional comparison
... (full list)

AVAILABLE ASSETS:
- /api/assets/file/abc.jpg (logo, 200x100)
- /api/assets/file/def.png (qr-code, 150x150)

AVAILABLE TOOLS:
1. get_template() - returns full HTML + CSS
2. update_template(html?, css?, name?) - saves changes
3. get_data_info() - returns CSV analysis
4. get_assets() - returns asset list
5. render_preview() - returns base64 screenshot
```

**Tool definitions** (function-calling):

```typescript
const tools = [
  {
    name: "get_template",
    description: "Get the current template HTML and CSS",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "update_template",
    description: "Update the template HTML and/or CSS",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Full Handlebars template HTML" },
        css: { type: "string", description: "Full CSS styles" },
        name: { type: "string", description: "Template name" }
      }
    }
  },
  {
    name: "get_data_info",
    description: "Get CSV data analysis (columns, row count, duplicates, nulls)",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "analyze_data",
    description: "Deep analysis: duplicate groups, missing values, suggestions",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "render_preview",
    description: "Render the current template and return a screenshot",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_assets",
    description: "Get the list of uploaded assets/images",
    parameters: { type: "object", properties: {} }
  }
]
```

**AI provider integration:**

```typescript
// src/lib/ai-service.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function streamChat(messages, tools, context, onChunk) {
  const response = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    system: buildSystemPrompt(context),
    messages: messages.map(formatMessage),
    tools: tools,
    max_tokens: 8192,
  })

  // Handle streaming + tool calls
  for await (const event of response) {
    if (event.type === 'content_block_delta') {
      onChunk({ type: 'text', content: event.delta.text })
    }
    if (event.type === 'tool_use') {
      const result = await executeTool(event.name, event.input)
      onChunk({ type: 'tool_result', tool: event.name, result })
    }
  }
}
```

#### 5c. Chat Store (`src/stores/chatStore.ts`)

```typescript
interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  printItemId: number | null

  sendMessage: (content: string, attachments?: Attachment[]) => void
  applySuggestion: (html?: string, css?: string) => void
  clearConversation: () => void
  loadHistory: (printItemId: number) => Promise<void>
}
```

#### 5d. "Apply" Button Flow

When the AI suggests code changes via a tool call to `update_template`:

1. The tool call result is displayed in the chat as a diff summary
2. A floating "Apply Changes" button appears at the bottom of the chat
3. User clicks → updates Zustand template store → triggers preview re-render
4. The change is persisted to the database via `PUT /api/items/[id]`
5. `print_item.version` increments

---

## 11. Phase 6: GrapeJS WYSIWYG Editor

**Est. time:** 8h

### Steps

#### 6a. Install & Configure GrapeJS

```bash
npm install grapejs
```

#### 6b. GrapeJS Component (`src/components/GrapeJSEditor/GrapeJSEditor.tsx`)

```typescript
'use client'

import { useEffect, useRef } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

interface Props {
  html: string
  css: string
  onSave: (html: string, css: string) => void
}

export function GrapeJSEditor({ html, css, onSave }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInstance = useRef<any>(null)

  useEffect(() => {
    if (!editorRef.current) return

    editorInstance.current = grapesjs.init({
      container: editorRef.current,
      fromElement: false,
      height: '100%',
      storageManager: false,
      undoManager: { trackSelection: false },
      canvas: {
        styles: [css],
      },
      plugins: [
        'gjs-blocks-basic',
        // Custom Handlebars plugin
      ],
      pluginsOpts: {
        'gjs-blocks-basic': { flexGrid: true },
      },
    })

    // Load initial HTML
    editorInstance.current.setComponents(html)
    editorInstance.current.setStyle(css)

    // Listen for changes
    editorInstance.current.on('update', () => {
      const updatedHtml = editorInstance.current.getHtml()
      const updatedCss = editorInstance.current.getCss()
      onSave(updatedHtml, updatedCss)
    })

    return () => editorInstance.current?.destroy()
  }, [])

  return <div ref={editorRef} style={{ height: '100%' }} />
}
```

#### 6c. Custom Handlebars Plugin (`src/grapejs-plugins/handlebars-blocks.ts`)

This is the critical piece. GrapeJS doesn't natively understand Handlebars syntax.

**Architecture:**

```
GrapeJS Canvas (visual DOM)
        ↕ bidirectional sync
Handlebars Template (text with {{ }} expressions)
```

**Components to register:**

| Component | Handlebars Syntax | GrapeJS Behavior |
|-----------|------------------|------------------|
| **EachBlock** | `{{#each items}}...{{/each}}` | Droppable container. Renders 2-3 item previews. Setting binds to CSV array field. |
| **IfBlock** | `{{#if condition}}...{{/if}}` | Conditional container with toggle. Shows/hides children in preview. |
| **Variable** | `{{field_name}}` | Editable text node with dashed border. Shows current value in preview (or placeholder). |
| **Image** | `<img src="...">` | Standard GrapeJS image. Can bind to `{{picture_urls}}`. |
| **Text** | Regular HTML | Standard GrapeJS text. Handlebars expressions inside are detected and parsed. |

**Plugin logic:**

```typescript
export function handlebarsPlugin(editor: any, opts: any) {
  const domc = editor.DomComponents
  const tm = editor.TraitManager

  // --- EachBlock component ---
  domc.addType('each-block', {
    model: {
      defaults: {
        name: 'Repeating Block',
        tagName: 'div',
        draggable: true,
        traits: [
          { type: 'text', name: 'each', label: 'Loop over' },
          { type: 'text', name: 'as', label: 'Variable name' },
        ],
        // Store the Handlebars open/close tags as attributes
        'data-hbs-each': '',
      },
      init() {
        const each = this.get('attributes')?.['data-hbs-each'] || 'items'
        this.set('data-hbs-each', each)
      },
      toHTML() {
        const each = this.get('data-hbs-each') || 'items'
        const children = this.get('components')?.map((c: any) => c.toHTML()).join('') || ''
        return `{{#each ${each}}}${children}{{/each}}`
      }
    },
    view: { ... }
  })

  // --- Variable component ---
  domc.addType('hbs-variable', {
    model: {
      defaults: {
        name: 'Variable',
        tagName: 'span',
        draggable: true,
        traits: [
          { type: 'text', name: 'variable', label: 'Variable name' },
          { type: 'text', name: 'fallback', label: 'Fallback text' },
        ],
      },
      toHTML() {
        const varName = this.get('attributes')?.['data-hbs-var'] || 'variable'
        return `{{${varName}}}`
      }
    },
    view: {
      // Render with fallback for canvas preview
      init() {
        const fallback = this.model.get('attributes')?.['data-fallback'] || '{{variable}}'
        this.model.set('content', fallback)
      }
    }
  })

  // --- Bidirectional parsing ---
  // On load: parse {{#each}} blocks into EachBlock components
  editor.on('load', () => {
    const html = opts.getInitialHtml?.() || editor.getHtml()
    const parsed = parseHandlebarsToGrapeJS(html)
    editor.setComponents(parsed)
  })

  // On save: serialize GrapeJS DOM back to Handlebars
  editor.on('update', () => {
    const components = editor.getComponents()
    const handlebars = serializeToHandlebars(components)
    opts.onTemplateChange?.(handlebars, editor.getCss())
  })
}
```

#### 6d. Properties Panel

Add a custom properties panel for Handlebars-aware components:

- **Data tab**: Bind element to CSV field, set fallback value, apply Handlebars transforms
- **Style tab**: Standard CSS (colors, fonts, spacing, borders)
- **Advanced tab**: Raw Handlebars expression override

#### 6e. Component Palette

Left sidebar with drag-and-drop blocks:

```
Components
├── Layout
│   ├── Container (div)
│   ├── Grid (3-column)
│   └── Grid Item
├── Data
│   ├── Repeating Block ({{#each}})
│   ├── Conditional Block ({{#if}})
│   └── Field ({{variable}})
├── Basic
│   ├── Text
│   ├── Image
│   ├── Button
│   └── Divider
├── Print
│   ├── QR Code
│   ├── Header
│   ├── Footer
│   └── Page Break
└── Custom
    └── (user-saved components)
```

---

## 12. Phase 7: Vision Support + CSV Intelligence

**Est. time:** 5h

### Steps

#### 7a. Vision Support (`/api/ai/chat` with image input)

User uploads a screenshot/mockup/PDF:

1. Image is attached to chat message as base64
2. AI backend sends image to vision-capable model (Claude Sonnet 4 / GPT-4o)
3. System prompt includes vision instructions:
   ```
   Analyze this design screenshot and create a matching HTML/CSS template.
   Describe:
   - Layout structure (columns, sections, hierarchy)
   - Color palette (extract hex values)
   - Typography (fonts, sizes, weights)
   - Spacing (margins, padding, gaps)
   - Component types (headers, cards, grids, footers)
   
   Then generate a complete Handlebars template and CSS that reproduces this design.
   ```
4. AI returns template → auto-applies → user sees it in GrapeJS instantly
5. User refines via text: "The header should be taller", "Use yellow instead of orange"

#### 7b. CSV Intelligence

On CSV upload + after chat analysis requests:

```typescript
// Tool: analyze_data
async function analyzeData(printItemId: number) {
  const item = await prisma.printItem.findUnique({ where: { id: printItemId } })
  const data = item?.dataSet as Record<string, string>[] | null
  if (!data) return { error: 'No data found' }

  const analysis = {
    rowCount: data.length,
    columns: Object.keys(data[0] || {}),
    duplicates: findDuplicates(data),
    nullCounts: countNulls(data),
    dateColumns: detectDateColumns(data),
    suggestions: generateSuggestions(data),
  }

  return analysis
}

// Auto-run on CSV upload → show results in chat
```

**Chat integration:**
```
System: I've analyzed your CSV. Found:
- 47 rows, 8 columns
- 3 duplicate entries (events #12, #24, #35)
- 5 missing phone numbers
- Detected date column: "start_datetime"

Shall I clean up the duplicates and auto-map the fields?
```

#### 7c. Text-to-Template Generation

User prompt: *"Create a modern event flyer for a community center. Use blue and yellow, show events in a 3-column grid with date, title, and description."*

AI:
1. Generates complete Handlebars template HTML
2. Generates matching CSS
3. Generates field mapping suggestions
4. Returns all three → auto-applies → GrapeJS renders it

---

## 13. Phase 8: Export Pipeline + Polish

**Est. time:** 3h

### Steps

#### 8a. Export from Chat

User prompt: *"Export this as A4 CMYK with 3mm bleed"*

AI configures export settings and triggers the pipeline:

1. AI calls `update_template(exportSettings: { format: 'A4', colorMode: 'cmyk', bleed: 3 })`
2. AI responds: "Setting CMYK export with 3mm bleed. Ready to generate PDF."
3. "Generate PDF" button appears in chat
4. Click → frontend calls `POST /api/pdf/generate` with current template + data + settings
5. Backend proxies to pdf-service → Puppeteer generates PDF
6. If CMYK: backend proxies to Ghostscript → converts to CMYK
7. Sets PDF/X metadata (TrimBox, BleedBox, ArtBox)
8. Returns PDF → download prompt appears

#### 8b. Undo/Redo

- Each AI edit persists a new version in `print_item.version`
- Chat message stores the diff (`prevHtml`, `prevCss`)
- "Undo" reverts to previous version via DB
- "Redo" reapplies

#### 8c. Save/Load Sessions

- Auto-save chat history per `print_item` (every message persisted)
- Switching between items loads the correct conversation
- "Save as template" button → saves current design as a `PrintTemplate` preset

#### 8d. Onboarding Flow

1. User lands on `/projects` (or is prompted to log in)
2. "New Project" → name it
3. Two paths:
   - **Quick start**: Upload CSV → AI auto-generates template → refine via chat
   - **From scratch**: Pick a preset → customize via chat or GrapeJS
4. Export when ready

---

## 14. File Structure

```
service-opo/
│
├── app/                                    ← NEW: Next.js app
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    ← Main editor page
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx                ← Project grid
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            ← Editor per project
│   │   │   ├── api/
│   │   │   │   ├── ai/
│   │   │   │   │   └── chat/route.ts       ← SSE streaming
│   │   │   │   ├── projects/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/route.ts
│   │   │   │   ├── items/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       └── chat/route.ts
│   │   │   │   ├── templates/
│   │   │   │   │   ├── compile/route.ts
│   │   │   │   │   ├── validate/route.ts
│   │   │   │   │   └── helpers/route.ts
│   │   │   │   ├── pdf/
│   │   │   │   │   ├── generate/route.ts
│   │   │   │   │   └── batch/route.ts
│   │   │   │   ├── cmyk/
│   │   │   │   │   ├── convert/route.ts
│   │   │   │   │   └── profiles/route.ts
│   │   │   │   ├── assets/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── file/[filename]/route.ts
│   │   │   │   └── auth/
│   │   │   │       └── [...nextauth]/route.ts
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── CodeSuggestion.tsx
│   │   │   ├── GrapeJSEditor/
│   │   │   │   ├── GrapeJSEditor.tsx
│   │   │   │   └── PropertiesPanel.tsx
│   │   │   ├── Preview/
│   │   │   │   ├── PreviewPanel.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   ├── DataImport/
│   │   │   │   ├── CSVUploader.tsx
│   │   │   │   ├── DataPreview.tsx
│   │   │   │   ├── FieldMapper.tsx
│   │   │   │   └── DataImportPanel.tsx
│   │   │   ├── ExportPanel/
│   │   │   │   └── ExportPanel.tsx
│   │   │   └── ui/                        ← Shared UI (buttons, inputs, etc.)
│   │   ├── stores/
│   │   │   ├── templateStore.ts
│   │   │   ├── dataStore.ts
│   │   │   ├── previewStore.ts
│   │   │   ├── exportStore.ts
│   │   │   ├── chatStore.ts               ← NEW
│   │   │   └── authStore.ts               ← NEW
│   │   ├── grapejs-plugins/
│   │   │   ├── handlebars-blocks.ts       ← NEW
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts                  ← NEW
│   │   │   ├── ai-service.ts             ← NEW
│   │   │   ├── ai-tools/                 ← NEW
│   │   │   │   ├── template.tool.ts
│   │   │   │   ├── data.tool.ts
│   │   │   │   └── preview.tool.ts
│   │   │   └── handlebars-helpers.ts      (shared)
│   │   └── utils/
│   │       ├── handlebarsRenderer.ts
│   │       └── csvParser.ts
│   ├── public/
│   │   └── assets/                        ← Uploaded files
│   └── package.json
│
├── pdf-service/                            ← NEW: Standalone Puppeteer
│   ├── src/
│   │   ├── index.ts
│   │   ├── pdf.service.ts
│   │   ├── template.service.ts
│   │   └── pdfbox.service.ts
│   ├── package.json
│   └── Dockerfile
│
├── ghostscript-service/                    ← Existing (unchanged)
│
├── supabase/                               ← Existing (or migrate to Prisma)
│
├── package.json                            ← Root workspace
└── turbo.json
```

---

## 15. Implementation Order Summary

| Phase | What | Est. Time | Delivers |
|-------|------|-----------|----------|
| **0** | Scaffold Next.js, migrate frontend | 6h | Working Next.js app with existing UI |
| **1** | Prisma schema + seed data | 2h | Database foundation |
| **2** | Extract pdf-service (Puppeteer) | 2h | PDF generation as microservice |
| **3** | Rewrite Express routes → API routes | 4h | All existing API endpoints in Next.js |
| **4** | Auth + project management | 4h | User login, project CRUD, navigation |
| **5** | Chat UI + AI backend | 8h | Agentic chat with tool-calling |
| **6** | GrapeJS WYSIWYG editor | 8h | Visual template editor with Handlebars |
| **7** | Vision + CSV intelligence | 5h | Screenshot → template, duplicate detection |
| **8** | Export pipeline + polish | 3h | End-to-end flow, undo/redo, onboarding |
| **Total** | | **42h** | |

### Parallelization Opportunities

```
Timeline →
───────────────────────────────────────────────────

Phase 0 ──→ Phase 1 ──→ Phase 4 (auth)
     ↘              ↘
      Phase 2 ─────→ Phase 3 (API routes)
                           ↘
                      Phase 5 (AI chat) ──→ Phase 7 (vision)
                           ↘
                      Phase 6 (GrapeJS) ──→ Phase 8 (polish)
```

- **Phase 2 (pdf-service)** can run in parallel with Phase 1
- **Phase 3 (API routes)** depends on Phase 0 + 2
- **Phase 5 (AI chat)** and **Phase 6 (GrapeJS)** can be built in parallel after Phase 3
- **Phase 7 (vision)** depends on Phase 5
- **Phase 8 (polish)** is final integration

---

## Appendix A: Key Technology Choices

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Framework | Next.js 14+ App Router | Consolidates frontend + API, good DX |
| Database | PostgreSQL + Prisma | Type-safe ORM, migrations, good DX |
| Visual Editor | GrapeJS | Mature, extensible, Handlebars plugin possible |
| AI Provider | Anthropic Claude Sonnet 4 | Best at vision + code generation + tool use |
| Auth | NextAuth.js (Credentials + OAuth) | Prisma adapter built-in, easy setup |
| PDF Engine | Puppeteer (standalone) | Already works, separate for performance |
| CMYK | Ghostscript (Docker) | Already works, unchanged |
| State | Zustand | Already used, works well with Next.js client components |
| Streaming | Server-Sent Events | Simple, one-way, perfect for AI chat |

## Appendix B: Open Questions

1. **File storage**: Local filesystem for MVP? Or S3-compatible (Supabase Storage, MinIO)?
2. **AI model access**: Self-hosted or API-key based? User provides key or app has a central key?
3. **Deployment**: Docker Compose for MVP? Or Vercel + Railway/Render?
4. **Multi-tenancy**: Single-user MVP or multi-user from the start?
