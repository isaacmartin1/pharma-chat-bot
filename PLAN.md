# FRUZAQLA Marketing Asset Creator — Implementation Plan

## Context

Build a greenfield pharmaceutical marketing compliance platform for an onsite interview session. The product lets non-technical pharma marketers chat with an AI to create FDA-compliant promotional assets (email-first) for FRUZAQLA® (fruquintinib). The user has already designed the system architecture; this plan implements a working POC that mirrors that architecture while simplifying infra (no queue/load balancer for POC).

---

## Architecture Clarification (from design review)

**User Content Blob Storage is not redundant.** It serves a different purpose than Brand Asset DB / Brand Writing DB:

| Store | Purpose | Who populates it |
|---|---|---|
| **User Content Blob Storage** | Ephemeral session-scoped reference files (clinical PDFs, campaign briefs, CSVs) — fed into AI context window only | Any user during a chat session |
| **Brand Writing DB** | Curated, compliance-approved claims. What the AI is *allowed to quote*. | Brand Asset Collection Service (admin ingestion path) |
| **Brand Asset DB** | Approved visual assets (logos, campaign images). | Brand Asset Collection Service (crawler + admin upload path) |

Auto-promoting session uploads to brand DBs is dangerous in pharma — it bypasses the compliance review that makes claims "approved."

### Brand Asset Collection Service

Two trigger paths, both calling the same ingest logic:

1. **Cron Scheduler (scheduled)** — APScheduler embedded in FastAPI fires on a schedule (e.g. daily). No external infra needed for POC.

2. **API Gateway → Load Balancer → Brand Asset Collection Service (admin-triggered)** — `POST /api/brand-assets/collect` kicks off an immediate crawl or accepts a direct file upload.

Both write to Brand Writing DB (claims) and Brand Asset DB (visuals). Assets land as `status = pending`; approval sets `status = approved`.

**Three distinct asset source types — priority order matters:**

| Priority | Source | Extraction method | Output |
|---|---|---|---|
| **1 (preferred)** | Website HTML | `httpx` + `BeautifulSoup` crawl | HTML/CSS artifact stored directly — perfect fidelity, no reconstruction |
| **2** | PDF / PPT / screenshot | `PyMuPDF` / `python-pptx` / user upload | Run through generator-discriminator loop → output is always HTML |
| **3 (never)** | AI image generation / inpainting | — | Not used — unprofessional, lossy, non-editable |

HTML assets are always preferred over raster images. When an asset cannot be extracted as HTML directly, the goal is still to produce HTML — not to store a raster.

**Generator-Discriminator Loop (for non-HTML sources):**

Used when the source is a raster image (PDF page render, PPT screenshot, uploaded photo). Output is always an HTML/CSS artifact.

```
Original image (PDF render / PPT screenshot / upload)
    │
    ▼
Generator (Claude vision + prompt):
  "Produce self-contained HTML/CSS that visually replicates this image.
   Use only brand colors and fonts. No external image URLs."
    │
    ▼
Render HTML → PNG screenshot via Playwright (headless browser)
    │
    ▼
Discriminator (Claude vision):
  Compare rendered screenshot vs. original image.
  Return: { score: 0-100, feedback: "headline font too small, background gradient wrong direction" }
    │
    ├── score ≥ 85 → PASS: store HTML as brand asset (status = pending, awaiting human approval)
    │
    └── score < 85 AND iterations < 3 → Generator receives feedback, refines HTML → repeat
                    iterations ≥ 3 → store best attempt, flag for human review
```

**Why this approach:**
- Both generator and discriminator are Claude API calls — no external image generation APIs
- Output is always editable HTML, not a lossy raster
- The discriminator feedback loop improves quality without a human reviewing every iteration
- Human approval is still required before any asset enters Brand Asset DB as `status = approved`
- Original raster stored as reference only (`asset_type = 'source_reference'`) — not served to Asset Creation Service

**POC auth simplification:** All seeded demo users get `role = 'admin'`. Role column stays in schema for production RBAC but the endpoint skips the role check for now.

### Legal DB — Population Strategy

The Legal Service checks generated assets against country-specific pharma advertising rules. The Legal DB needs to be populated. Three approaches layered by complexity:

**POC (seed manually):** Seed `~10` core FDA 21 CFR Part 202 rules as structured rows:

| Rule ID | Rule text (abbreviated) | Severity | Country |
|---|---|---|---|
| FDA-202-1 | Fair balance: safety info must receive comparable prominence to efficacy claims | red | US |
| FDA-202-2 | Brief summary: all ads must reference or include full prescribing information | red | US |
| FDA-202-3 | No false or misleading claims about efficacy, safety, or mechanism | red | US |
| FDA-202-4 | Substantial evidence: efficacy claims require adequate clinical trials | red | US |
| FDA-202-5 | Boxed warning must be presented with adequate prominence | red | US |
| FDA-202-6 | Established name must appear prominently with brand name | yellow | US |
| FDA-202-7 | No reminder ads for drugs with boxed warnings | red | US |
| FDA-202-8 | Quantitative claims must be accurate and not misleading | red | US |

**Production extension:** Add a `legal_data_ingestion` scheduled job (similar to Brand Asset Collection) that crawls FDA.gov / EMA.europa.eu for regulatory updates and diffs against existing rules.

**Legal DB schema addition:**
```sql
CREATE TABLE legal_rules (
    id         TEXT PRIMARY KEY,
    country    TEXT NOT NULL DEFAULT 'US',
    rule_id    TEXT NOT NULL,           -- e.g. 'FDA-202-1'
    rule_text  TEXT NOT NULL,
    severity   TEXT NOT NULL CHECK(severity IN ('red', 'yellow')),
    source_url TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_legal_rules_country ON legal_rules(country, active);
```

The Legal Service queries `WHERE country = ? AND active = 1`, runs each rule as a check against the generated HTML content, and returns pass/warning/fail per rule.

### Mandatory Checks Service — Fan-Out Orchestrator

Mandatory Checks Service calls all four sub-services **in parallel** (independent checks, no sequential dependency):

```
Mandatory Checks Service
  ├── Legal Service         → country-specific FDA rules, fair balance requirements
  ├── Evidence Service      → clinical citation backing for each claim
  ├── Brand Wording Service → exact phrasing matches approved wording (no paraphrasing)
  └── Brand Assets Service  → all visuals from approved library (status = approved only)
```

Each returns `pass / warning / fail`. Mandatory Checks aggregates into overall compliance result. Adding future check types (e.g. Channel Compatibility Service) requires only a new sub-service — interface unchanged. Parallel execution prevents one slow DB lookup from blocking the full compliance report.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Python FastAPI + uvicorn
- **Scheduler:** APScheduler (embedded in FastAPI process — no extra infra)
- **Database:** SQLite via SQLAlchemy (no Docker needed for POC)
- **LLM:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Asset reconstruction:** Generator-discriminator loop (Claude vision as both generator and discriminator)
- **HTML rendering to screenshot:** `playwright` (headless Chromium) for discriminator comparison
- **PDF extraction:** `PyMuPDF` (`fitz`) for page-to-image rendering
- **PPT extraction:** `python-pptx` for slide image rendering
- **HTML scraping:** `httpx` + `BeautifulSoup4`
- **Storage:** Local filesystem (simulated blob storage)
- **Asset type focus:** Email (extensible to banner/PDF)
- **Auth (POC):** All users seeded as `role = 'admin'`; JWT middleware present but role checks skipped

---

## Project Structure

```
pharma-chat-bot/
├── backend/
│   ├── main.py                          # FastAPI app, CORS, router registration, static mount
│   ├── requirements.txt
│   ├── .env                             # ANTHROPIC_API_KEY
│   ├── database.py                      # SQLAlchemy engine, create_all()
│   ├── models.py                        # ORM models
│   ├── schemas.py                       # Pydantic schemas
│   ├── routers/
│   │   ├── sessions.py                  # CRUD for sessions
│   │   ├── messages.py                  # SSE streaming endpoint
│   │   ├── assets.py                    # GET/PUT asset, POST export
│   │   ├── uploads.py                   # POST multipart upload
│   │   ├── compliance.py                # POST compliance check
│   │   ├── brand_collection.py          # POST /brand-assets/collect (admin only)
│   │   └── auth.py                      # POST /auth/login, /auth/register, GET /auth/me
│   ├── services/
│   │   ├── chat_service.py              # Orchestrates LLM, detects READY_TO_GENERATE
│   │   ├── asset_creation_service.py    # Generates HTML via Anthropic
│   │   ├── mandatory_checks_service.py  # Fan-out orchestrator: calls all 4 sub-services in parallel
│   │   ├── legal_service.py             # Country-specific FDA rules, fair balance
│   │   ├── evidence_service.py          # Clinical citation validation per claim
│   │   ├── brand_wording_service.py     # Exact phrasing match against Brand Writing DB
│   │   ├── brand_assets_service.py      # Approved visual asset lookup (status=approved only)
│   │   └── brand_asset_collection_service.py  # Crawler + admin ingestion → Brand DBs
│   ├── prompts/
│   │   ├── chat_system.py
│   │   ├── asset_generation.py
│   │   └── edit_mode.py
│   ├── scheduler/
│   │   └── cron.py                      # APScheduler setup; registers daily crawl job
│   ├── storage/
│   │   └── local_blob.py                # Read/write local filesystem (simulates blob)
│   ├── seed/
│   │   ├── seed_claims.py               # 10 approved FRUZAQLA claims
│   │   └── seed_brand_assets.py         # Downloads logo from fruzaqlahcp.com
│   └── static/brand/
│       └── fruzaqla_logo.png            # Cached after seed
│
└── frontend/
    ├── package.json
    ├── next.config.ts                   # Rewrites /api/* → localhost:8000/api/*
    ├── tailwind.config.ts               # Brand color tokens
    └── src/app/
        ├── layout.tsx                   # Rubik font (Google Fonts), root layout
        ├── page.tsx                     # Redirect to /chat
        ├── chat/page.tsx                # Three-panel layout: sidebar | chat | preview
        ├── components/
        │   ├── layout/AppShell.tsx      # grid-cols-[260px_1fr_480px], full viewport
        │   ├── layout/Sidebar.tsx       # Session list + New Chat button
        │   ├── chat/ChatPanel.tsx       # Owns messages[], isStreaming
        │   ├── chat/MessageList.tsx
        │   ├── chat/ChatInput.tsx       # textarea + send + file attach
        │   ├── chat/FileAttachment.tsx
        │   ├── preview/PreviewPanel.tsx       # Owns assetHtml, editMode, checks
        │   ├── preview/AssetIframe.tsx         # <iframe srcdoc> sandboxed
        │   ├── preview/InlineEditOverlay.tsx   # contentEditable div, saves on blur
        │   ├── preview/EditModeToggle.tsx
        │   ├── preview/ExportButton.tsx
        │   └── compliance/CompliancePanel.tsx  # Green/yellow/red badges
        ├── hooks/
        │   ├── useChat.ts               # fetch + ReadableStream SSE reader
        │   ├── useAsset.ts              # PUT asset on edit save
        │   └── useCompliance.ts         # POST compliance check
        └── lib/
            ├── api.ts                   # Typed fetch wrappers
            └── types.ts                 # Shared interfaces
```

---

## Database Schema (SQLite)

```sql
-- Companies table (one row per pharmaceutical brand/tenant)
CREATE TABLE companies (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,       -- partition key in Brand DBs
    country    TEXT NOT NULL DEFAULT 'US', -- drives Legal DB/Cache selection
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table (auth + role + company membership)
CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,           -- bcrypt hash
    name          TEXT NOT NULL,
    company_id    TEXT NOT NULL REFERENCES companies(id),
    role          TEXT NOT NULL DEFAULT 'marketer'
                    CHECK(role IN ('admin', 'brand_manager', 'marketer', 'reviewer')),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME
);
CREATE INDEX idx_users_email ON users(email);
-- Role permissions:
--   marketer      → create sessions, upload context files, generate/edit assets
--   reviewer      → above + approve/reject brand assets
--   brand_manager → above + submit assets to Brand Asset DB
--   admin         → full access including brand collection ingestion

-- Sessions table (scoped to user)
CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    title      TEXT NOT NULL DEFAULT 'New Session',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_messages_session ON messages(session_id, created_at);

CREATE TABLE assets (
    id           TEXT PRIMARY KEY,
    session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    asset_type   TEXT NOT NULL DEFAULT 'email',
    html_content TEXT,
    ready        INTEGER NOT NULL DEFAULT 0,  -- 0=draft, 1=finalized
    version      INTEGER NOT NULL DEFAULT 1,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Asset version history (enables undo)
CREATE TABLE asset_versions (
    id           TEXT PRIMARY KEY,
    asset_id     TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    html_content TEXT NOT NULL,
    version      INTEGER NOT NULL,
    source       TEXT NOT NULL CHECK(source IN ('ai_generated', 'ai_edit', 'manual_edit')),
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_asset_versions ON asset_versions(asset_id, version DESC);
-- Undo = SELECT html_content FROM asset_versions WHERE asset_id=? ORDER BY version DESC LIMIT 1 OFFSET 1

-- User Content Blob Storage (session-scoped, ephemeral reference material)
CREATE TABLE uploads (
    id            TEXT PRIMARY KEY,
    session_id    TEXT REFERENCES sessions(id),
    user_id       TEXT NOT NULL REFERENCES users(id),
    original_name TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Brand Writing DB (partitioned by company_id)
CREATE TABLE claims (
    id          TEXT PRIMARY KEY,
    company_id  TEXT NOT NULL REFERENCES companies(id),
    claim_text  TEXT NOT NULL,
    category    TEXT NOT NULL,  -- 'efficacy'|'safety'|'dosing'|'indication'|'isi'
    source_ref  TEXT,
    active      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_claims_company ON claims(company_id, active);

-- Brand Asset DB (partitioned by company_id, with approval workflow)
CREATE TABLE brand_assets (
    id           TEXT PRIMARY KEY,
    company_id   TEXT NOT NULL REFERENCES companies(id),
    asset_type   TEXT NOT NULL,  -- 'logo'|'color_palette'|'font_rule'|'html_component'|'source_reference'
    key          TEXT NOT NULL,
    value        TEXT NOT NULL,
    file_path    TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending', 'approved', 'rejected')),
    source       TEXT NOT NULL DEFAULT 'crawler'
                   CHECK(source IN ('crawler', 'admin_upload')),
    submitted_by TEXT REFERENCES users(id),
    approved_by  TEXT REFERENCES users(id),
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_brand_assets_company ON brand_assets(company_id, status);
-- Brand Assets Service only queries WHERE status = 'approved'
```

---

## API Endpoints

```
# Auth (JWT — all other endpoints require Authorization: Bearer <token>)
POST   /api/auth/register    Body: { email, password, name, company_id } → { user, token }
POST   /api/auth/login       Body: { email, password }                   → { user, token }
GET    /api/auth/me                                                       → { user }
# Token payload: { user_id, company_id, role, exp }
# Middleware extracts company_id → passed to all service calls for DB partitioning

# Sessions (scoped to authenticated user)
POST   /api/sessions                          → { id, title, created_at }
GET    /api/sessions                          → { sessions: [...] }
GET    /api/sessions/{id}                     → { session, messages, asset }

# Streaming chat (SSE via fetch + ReadableStream — NOT EventSource, POST body needed)
POST   /api/sessions/{id}/messages
  Body: { content: string, upload_ids?: string[] }
  SSE events:
    text_delta        → { delta: string }
    asset_created     → { asset_id: string, html: string }
    asset_updated     → { asset_id: string, html: string }
    compliance_result → { checks: ComplianceCheck[] }
    done              → { message_id: string }
    error             → { message: string }

# Assets
GET    /api/assets/{id}          → { id, html_content, version, ... }
PUT    /api/assets/{id}          Body: { html_content }  → { id, version }
POST   /api/assets/{id}/export   → application/zip (html + compliance JSON)

# Uploads → User Content Blob Storage
POST   /api/uploads              Body: multipart { file, session_id? }
  → { id, original_name, mime_type, size_bytes }

# Compliance
POST   /api/compliance/check     Body: { asset_id }
  → { overall: 'pass'|'warning'|'fail', checks: ComplianceCheck[] }

# Brand Asset Collection (admin-triggered crawl or upload)
POST   /api/brand-assets/collect Body: { url?: string, asset?: file }
  → { queued: true, job_id: string }
```

---

## LLM Prompt Design

### chat_system.py
Injected with `{claims_context}` (numbered list from claims table).
- Role: pharma marketing AI assistant for FRUZAQLA
- Gather requirements in 2–3 exchanges (content type, audience, goal, tone, claims)
- When ready, respond with exactly: `READY_TO_GENERATE: <one-sentence summary>`
- Never invent claims — only use the injected claims library
- Always recommend including ISI footer

### asset_generation.py
Injected with `{requirements_summary}`, `{selected_claims}`, `{logo_url}`, brand colors.
- Generate complete, self-contained HTML email (TABLE-based layout, inline CSS only)
- Email specs: Arial body font, purple (#8C4799) header, navy (#002855) headlines, squared-corner CTA buttons
- Logo in header: `<img src="{logo_url}">`
- Required compliance HTML comments:
  - `<!-- FRUZAQLA_LOGO_PRESENT -->`
  - `<!-- ISI_PRESENT -->`
  - `<!-- CLAIM_ID:{id} -->` (one per claim used)
- Mandatory ISI footer block with exact prescribed text
- Output: raw HTML only, no markdown, starts with `<!DOCTYPE html>`

### edit_mode.py
Injected with `{current_html}` and `{user_instruction}`.
- Make ONLY the requested change
- Preserve all compliance HTML comments
- Never remove ISI footer content
- Return complete updated HTML

---

## chat_service.py — Orchestration Logic

```python
async def stream_chat(session_id, user_content, upload_ids, db):
    # 1. Load message history from DB
    # 2. Check if session has an existing asset → if yes, use edit_mode prompt
    # 3. Fetch claims from brand_wording_service, inject into system prompt
    # 4. Call anthropic.messages.stream() → yield text_delta SSE events
    # 5. After stream completes, inspect full assembled response:
    #    - If contains "READY_TO_GENERATE:" → call asset_creation_service.generate()
    #      → yield asset_created SSE event
    #      → call mandatory_checks_service.run_checks()
    #      → yield compliance_result SSE event
    #    - If session has existing asset → response is edited HTML
    #      → yield asset_updated SSE event
    #      → re-run compliance checks
    # 6. Persist user + assistant messages to DB
    # 7. Yield done event
```

---

## Brand Asset Seeding

```python
LOGO_URL = "https://www.fruzaqlahcp.com/sites/default/files/2024-04/fruzaqla_logo_r_rgb.png"
# Downloads to: backend/static/brand/fruzaqla_logo.png
# Served at: http://localhost:8000/static/brand/fruzaqla_logo.png
```

Brand color tokens seeded into `brand_assets` table:
- `color_primary` → `#8C4799`
- `color_secondary` → `#59CBE8`
- `color_navy` → `#002855`
- `color_lime` → `#97D700`
- `color_yellow` → `#FFC72C`
- `email_body_font` → `Arial, Helvetica, sans-serif`

---

## Claims Seed Data (10 approved claims)

| Category | Claim (abbreviated) | Source |
|---|---|---|
| indication | FRUZAQLA® indicated for previously treated mCRC in adults | PI Section 1 |
| efficacy | FRESCO-2: OS 7.4 vs 4.8 months; HR=0.66; P<0.001 | PI Section 14.1; NEJM 2023 |
| efficacy | FRESCO-2: PFS 3.7 vs 1.8 months; HR=0.32; P<0.001 | PI Section 14.1 |
| efficacy | Consistent efficacy across subgroups regardless of prior therapy | FRESCO-2 supplementary |
| dosing | 5 mg orally once daily, first 21 days of 28-day cycle, with or without food | PI Section 2.1 |
| dosing | No dose adjustment for age, sex, race, or mild-moderate renal impairment | PI Section 2.2 |
| safety | Most common ARs (≥15%): hypertension, HFSR, proteinuria, diarrhea | PI Section 6.1 |
| safety | BOXED WARNING: risk of severe or fatal hemorrhage | PI Boxed Warning |
| safety | Embryo-fetal toxicity: contraception required during treatment + 1 week after | PI Section 5.7 |
| efficacy | Selectively inhibits VEGFR-1, -2, -3 with minimal off-target activity | PI Section 12.1 |
| isi | Full ISI text with indication statement | PI Full ISI |

---

## Build Order (fastest path to demoable)

**Phase 1 — Backend foundation (30 min)**
1. `requirements.txt` + `pip install`
2. `database.py` + `models.py` → `create_all()`
3. Run seed scripts (claims + logo download)
4. `main.py` with CORS + StaticFiles mount
5. Verify `uvicorn main:app --reload` + `/docs` works

**Phase 2 — Core chat + streaming (45 min)**
1. Sessions router (POST/GET/GET-by-id)
2. `chat_service.py` with Anthropic streaming
3. Messages router with SSE `StreamingResponse`
4. Test via curl: create session → send message → see streamed reply

**Phase 3 — Asset generation (30 min)**
1. `brand_assets_service.py` — returns brand config dict
2. `asset_creation_service.py` — generates HTML via Anthropic
3. `mandatory_checks_service.py` — compliance checks against HTML comments
4. Wire READY_TO_GENERATE detection in `chat_service.py`

**Phase 4 — Frontend foundation (30 min)**
1. `create-next-app` scaffold
2. `tailwind.config.ts` with brand colors
3. `next.config.ts` with `/api/*` proxy rewrite
4. Three-panel layout (`AppShell.tsx` grid)
5. `lib/api.ts` typed fetch wrappers

**Phase 5 — Frontend features (45 min)**
1. Sidebar with session list + New Chat
2. `useChat.ts` hook — fetch + ReadableStream SSE reader
3. ChatPanel, MessageList, ChatInput
4. PreviewPanel with `<iframe srcdoc>` rendering

**Phase 6 — Inline editing (20 min)**
1. Edit/Preview toggle
2. `InlineEditOverlay.tsx` — `contentEditable` div, saves on blur via PUT `/api/assets/{id}`
3. CompliancePanel with green/yellow/red badges

**Phase 7 — Export + file upload (15 min)**
1. POST `/api/assets/{id}/export` → zip download
2. FileAttachment component → POST `/api/uploads`

---

## Key Implementation Notes

- **SSE from POST:** Browser `EventSource` only supports GET. Use `fetch` + `response.body.getReader()` and parse `data: {...}\n\n` manually in `useChat.ts`.
- **SQLite concurrency:** `create_engine(..., connect_args={"check_same_thread": False}, poolclass=StaticPool)`
- **Inline edit simplification:** Render `<div dangerouslySetInnerHTML contentEditable>` in edit mode — avoids iframe sandbox complications entirely.
- **CORS:** Include `expose_headers=["Content-Disposition"]` for export zip download to work.
- **Edit detection:** If session has a non-null asset, `chat_service.py` switches to `EDIT_MODE_PROMPT` automatically.
- **State reconciliation:** `useAsset.ts` fires `PUT /api/assets/{id}` on `contentEditable` blur. `chat_service.py` always pulls `html_content` from DB before building edit prompt — never cached state.

---

## Compliance Checks (fan-out, parallel via asyncio.gather)

| Sub-service | Check | Indicator |
|---|---|---|
| **Legal Service** | `<!-- FRUZAQLA_LOGO_PRESENT -->` in HTML | 🔴 if missing |
| **Legal Service** | `FRUZAQLA®` registered trademark present | 🟡 if missing |
| **Legal Service** | Takeda trademark sign-off line present | 🟡 if missing |
| **Evidence Service** | Each `<!-- CLAIM_ID:{id} -->` has valid `source_ref` in claims table | 🔴 if no citation |
| **Brand Wording Service** | Each claim_id in Brand Writing DB with `active=1` | 🔴 if not in library |
| **Brand Assets Service** | `<!-- ISI_PRESENT -->` in HTML | 🔴 if missing |
| **Brand Assets Service** | Image src URLs exist in Brand Asset DB with `status=approved` | 🔴 if unauthorized |

---

## Architecture Discussion Points (for interview Q&A)

- **Why User Content Blob ≠ Brand DBs:** Uploads are ephemeral AI context only. Auto-promoting bypasses compliance review — dangerous in pharma.
- **Queue + SSE incompatibility:** A traditional queue (SQS/RabbitMQ) severs the HTTP connection, breaking SSE. At scale: replace SSE with WebSockets backed by Redis Pub/Sub — LLM worker publishes tokens to Redis channel, API node holding the WebSocket subscribes and forwards.
- **HTML comment compliance is a POC shortcut:** LLMs won't always emit hidden formatting reliably. Production fix: vector similarity search mapping generated text back to the claims DB natively.
- **Undo via asset_versions:** Every save snapshots the previous HTML with a `source` tag (`ai_generated / ai_edit / manual_edit`). Undo = fetch previous version row.
- **Cron Scheduler dual trigger:** APScheduler for automated daily crawl; `POST /api/brand-assets/collect` through Load Balancer for admin-triggered runs. Both call the same function.
