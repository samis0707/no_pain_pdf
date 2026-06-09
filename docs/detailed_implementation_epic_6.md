# Epic 6: Vision + Intelligence — Detailed Implementation Plan

## Architecture Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **File storage** | S3 via existing `src/lib/s3.ts` | Hetzner-compatible (`forcePathStyle: true`, configurable endpoint) |
| **File serving** | Proxy through `/api/assets/file/[filename]` route (reads from S3) | Stable URLs, no expiry, no CORS, works with any S3 |
| **PDF page limit** | Default 3, configurable via `PDF_VISION_PAGE_LIMIT` env var | User spec |
| **Chat attachments** | Transient — sent as base64 to AI, **not** persisted as assets | Separate from permanent asset storage |
| **Upload tab assets** | Images only — stored on S3, associated with `printItemId` | Usable in templates via S3 proxy URLs |
| **Multi-modal format** | OpenAI `content: [{ type: "text" }, { type: "image_url" }]` pattern | Works with Gemma 4 via vLLM + existing hot-plug |
| **PDF→images** | Client-side using `pdfjs-dist` (already a dependency) | Render pages to canvas, export as base64 JPEG |

## .env additions

```
# PDF Vision: how many pages to convert to images for AI analysis (default 3)
PDF_VISION_PAGE_LIMIT=3
```

No other env changes needed — existing `S3_*` vars and `LLM_*` vars cover everything.

---

## Phase 1: Asset Upload → S3

**Goal**: Rewrite upload API to use S3; accept `printItemId`; add list route; update file serve route; create asset store.

### Files
| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/app/api/assets/upload/route.ts` | Switch to S3, accept `printItemId`, validate image MIME types |
| MODIFY | `src/app/api/assets/file/[filename]/route.ts` | Proxy from S3 instead of local disk |
| CREATE | `src/app/api/assets/route.ts` | `GET` — list assets by `printItemId` |
| CREATE | `src/stores/assetStore.ts` | Zustand store for asset CRUD |

### Tests
| File | Key assertions |
|------|---------------|
| `api.assets-upload.test.ts` | POST image → calls S3 `uploadFile`; returns `{ id, filename, url }`; accepts `printItemId`; rejects non-image; rejects missing file |
| `api.assets-list.test.ts` | GET `?printItemId=N` → array of assets with `{ id, filename, originalName, mimeType, fileSize, url }`; empty for unknown |
| `store.asset-store.test.ts` | `uploadAsset` sets loading, POSTs, appends result; `fetchAssets` hydrates; `deleteAsset` calls DELETE |

---

## Phase 2: Asset UI in Upload Tab

**Goal**: Add image upload + browser to the Upload tab. Images only.

### Files
| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/components/DataImport/ImageUploader.tsx` | Drag-and-drop image upload zone |
| CREATE | `src/components/DataImport/AssetBrowser.tsx` | Image grid with thumbnails |
| MODIFY | `src/components/DataImport/DataImportPanel.tsx` | Add image section behind CSV section |

### Tests
| File | Key assertions |
|------|---------------|
| `ImageUploader.test.tsx` | Drop zone renders; accepts image files; calls `uploadAsset`; shows preview; shows error |
| `AssetBrowser.test.tsx` | Grid of images; thumbnails via S3 proxy; delete works; empty state |

---

## Phase 3: AI Asset Context

**Goal**: Fix `getAssets()` stub, feed real assets into system prompt.

### Files
| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/lib/ai/tools.ts` | `getAssets()` queries `prisma.asset` instead of returning empty |
| MODIFY | `src/lib/ai/system-prompt.ts` | Richer asset info + vision analysis instructions |

### Tests
| File | Key assertions |
|------|---------------|
| `ai.tools.test.ts` (augment) | `getAssets` queries DB by `printItemId`; returns real data |
| `ai.system-prompt-assets.test.ts` | Prompt includes asset details + vision section when assets > 0 |

---

## Phase 4: Vision + Document Analysis in Chat

**Goal**: Upload images + PDFs in chat; AI analyzes layout/style and generates matching template.

### 4a — ChatMessage type + attachments

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/lib/ai/types.ts` | Add `attachments?: Array<{ mimeType: string; data: string }>` to `ChatMessage` |
| MODIFY | `src/lib/ai/conversation.ts` | Serialize/deserialize attachments JSON |

### 4b — OpenAI provider multi-modal

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/lib/ai/providers/openai.ts` | `formatMessages` builds `content: [{ type: 'text' }, { type: 'image_url' }]` array when attachments present |

### 4c — PDF→images utility

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/utils/pdfToImages.ts` | Uses `pdfjs-dist` to render pages to JPEG base64; respects `PDF_VISION_PAGE_LIMIT` |

### 4d — MessageInput wired

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/components/Chat/MessageInput.tsx` | Wire upload button; accept images+PDF; render pages for PDFs |

### 4e — ChatStore attachments

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/stores/chatStore.ts` | Accept `attachments` in `sendMessage` |

### 4f — Chat API route attachments

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/app/api/ai/chat/route.ts` | Parse `attachments` from request body |

### 4g — System prompt vision guidance

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/lib/ai/system-prompt.ts` | Add "## Vision & Document Analysis" section |

### Tests
| File | Key assertions |
|------|---------------|
| `providers.openai.test.ts` (augment) | Multi-modal format for image attachments |
| `pdf-to-images.test.ts` | 3-page PDF → 3 images; respects `PDF_VISION_PAGE_LIMIT` |
| `MessageInput.test.tsx` (augment) | Image → attachment; PDF → multiple attachments |
| `chatStore.test.ts` (augment) | `sendMessage` includes attachments in body |
| `ai.chat-api-route.test.ts` (augment) | Parses attachments from request |
| `ai.system-prompt.test.ts` (augment) | Vision section when attachments present |
| `conversation.test.ts` (augment) | Attachments survive save/load round-trip |

---

## Phase 5: CSV Analysis Button in Chat

**Goal**: Button in chat sidebar triggers predefined analyze prompt.

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/components/Chat/ChatSidebar.tsx` | Add "Analyze Data" button → sends predefined prompt |

### Tests
| File | Key assertions |
|------|---------------|
| `chat.analyze-button.test.tsx` | Button renders; click fires `onSend` with analyze prompt |

---

## Phase 6: Collapsible Tool Calls

**Goal**: Tool call messages are collapsible.

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/components/Chat/MessageList.tsx` | Wrap tool calls in `<details><summary>` |

### Tests
| File | Key assertions |
|------|---------------|
| `chat-tool-calls.test.tsx` (augment) | Tool call renders as `<details>`; expanded shows args |

---

## Dependency Order

```
Phase 1 (S3 Assets) ──→ Phase 2 (Asset UI) ──→ Phase 3 (AI Assets)
                                                       │
Phase 4a (Types) ──→ 4b (OpenAI multi-modal) ──→ 4d (MessageInput) ──→ 4e (ChatStore) ──→ 4f (Chat API) ──→ 4g (System Prompt)
                         ↑                               ↑
                     4c (PDF→images) ─────────────────────┘

Phase 5 (CSV Button) ── independent of all above except chat store
Phase 6 (Collapsible) ── independent
```
