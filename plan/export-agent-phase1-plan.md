# Export Business Development Agent — Phase 1 Project Plan

**Scope:** Human-triggered prospect discovery (Level 1)
**Stack:** Next.js, NeonDB, shadcn/ui, tweakcn
**Audience:** Claude Code (execution agent)

---

## 1. Objective

Build a working Next.js application where a human types a natural-language research query (e.g. "cocoa butter importers in the UAE"), the system researches prospects via web search and contact-enrichment APIs, displays results as reviewable cards, and lets the human approve a prospect into the CRM and trigger an outreach draft.

This phase deliberately excludes: cron scheduling, autonomous outreach sending, LinkedIn/browser automation, and trade fair tooling. Those are Phase 2+.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Single app, server actions for backend logic |
| Database | NeonDB (Postgres) | Serverless Postgres, branch-friendly for dev |
| ORM | Drizzle ORM | Lightweight, type-safe, pairs well with NeonDB serverless driver |
| UI components | shadcn/ui | Installed via CLI, not a dependency — copies into repo |
| Theming | tweakcn | Used to generate the shadcn theme config (colors, radius, fonts) |
| Research | Claude API (web search tool) or Perplexity sonar-pro | Start with one provider; abstract behind an interface |
| Contact enrichment | Hunter.io (free tier) | Domain → email lookup |
| Auth | Not required for v1 | Single internal user; revisit if multi-user needed |
| Hosting | Vercel | Natural fit for Next.js + Neon |

---

## 3. Environment & Secrets

Claude Code should create a `.env.local.example` with the following keys (values left blank):

```
DATABASE_URL=
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
HUNTER_API_KEY=
```

Do not commit `.env.local`. Confirm `.gitignore` covers it before first commit.

---

## 4. Database Schema (Drizzle)

Three core tables for Phase 1.

### `prospects`
| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| company_name | text | |
| country | text | |
| product_interest | text[] | "cocoa_butter", "cocoa_powder" |
| website_url | text | nullable |
| contact_email | text | nullable |
| contact_name | text | nullable |
| linkedin_url | text | nullable |
| contact_form_url | text | nullable |
| match_score | integer | 0–100, from research step |
| source | text | which tool found it (perplexity, web_search) |
| status | text | "discovered", "approved", "rejected", "contacted" |
| created_at | timestamp | |
| updated_at | timestamp | |

### `outreach_log`
| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| prospect_id | uuid, fk → prospects | |
| method | text | "email", "linkedin", "contact_form" |
| draft_subject | text | nullable |
| draft_body | text | |
| status | text | "drafted", "sent", "queued_manual" |
| sent_at | timestamp | nullable |
| created_at | timestamp | |

### `search_runs`
| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| query | text | the natural-language query entered |
| filters | jsonb | product/region filters applied |
| result_count | integer | |
| created_at | timestamp | |

This is intentionally minimal — trade fair tracking and richer CRM fields come in Phase 2.

---

## 5. Application Structure

```
/app
  /discover
    page.tsx              — search bar + filters + results grid
  /prospects
    page.tsx               — CRM table view of all saved prospects
    [id]/page.tsx           — single prospect detail + outreach history
  /api
    /research/route.ts      — POST: runs research, returns candidate prospects (not yet saved)
    /prospects/route.ts      — GET/POST: list / approve a prospect into DB
    /outreach/draft/route.ts — POST: generates an email/linkedin/form draft for a prospect
    /outreach/send/route.ts  — POST: sends via Gmail MCP (stub in Phase 1 if MCP not yet wired)
/lib
  /db
    schema.ts               — Drizzle schema
    client.ts                — Neon connection
  /research
    provider.ts              — interface: search(query, filters) -> Prospect[]
    perplexity.ts             — implementation
    websearch.ts              — alternative implementation (Claude web search)
  /enrichment
    hunter.ts                 — email lookup by domain
  /outreach
    draftEmail.ts              — Claude API call to draft outreach copy
/components
  /ui                         — shadcn components (generated)
  search-bar.tsx
  prospect-card.tsx
  prospect-table.tsx
  draft-review-card.tsx
```

---

## 6. Build Phases for Claude Code

### Step 1 — Project scaffold
- `create-next-app` with TypeScript, App Router, Tailwind
- Install and init shadcn/ui
- Generate theme via tweakcn, apply resulting CSS variables to `globals.css`
- Install Drizzle, Neon serverless driver, set up `lib/db/client.ts`
- Confirm `npx drizzle-kit push` connects to a Neon dev branch successfully

**Acceptance check:** app runs locally, renders a blank shadcn-styled page, DB connection confirmed.

### Step 2 — Database layer
- Write `schema.ts` for the three tables above
- Run migrations against Neon
- Write minimal seed script with 2–3 fake prospects for UI development

**Acceptance check:** `prospects` table visible in Neon console with seed data.

### Step 3 — Research provider
- Define `ResearchProvider` interface: `search(query: string, filters: Filters): Promise<CandidateProspect[]>`
- Implement one provider first (recommend Claude web search tool to avoid a second API key initially)
- Each candidate result should include: company name, country guess, website, snippet/source, and a heuristic match score
- Do not write to DB at this stage — results are ephemeral until approved

**Acceptance check:** hitting `/api/research` with a query returns a JSON array of candidate prospects within ~10–15s.

### Step 4 — Discovery UI (`/discover`)
- Search bar (shadcn `Input` + `Button`)
- Filter pills for product type and region (shadcn `Badge` or `ToggleGroup`)
- Results render as cards (reuse the prospect card pattern: company, score badge, tags, source line)
- Loading state while research runs
- "Approve and add to CRM" button per card → calls `/api/prospects` POST, writes to `prospects` table with status `approved`
- "Reject" simply discards the candidate client-side (no DB write)

**Acceptance check:** can type a query, see results, approve one, and see it appear in Neon.

### Step 5 — Enrichment on approve
- When a prospect is approved and has no `contact_email`, call Hunter.io using the website domain before saving
- Store result; if no email found, leave null and rely on `linkedin_url` or `contact_form_url` already captured from research

**Acceptance check:** approving a prospect with a known domain populates `contact_email` automatically when Hunter finds one.

### Step 6 — CRM view (`/prospects`)
- Table view (shadcn `Table` or `DataTable` pattern) of all approved prospects
- Columns: company, country, product interest, contact method available, status, last updated
- Row click → detail page

**Acceptance check:** approved prospects from Step 4 are visible and sortable here.

### Step 7 — Outreach draft generation
- On prospect detail page, "Draft outreach" button
- Calls `/api/outreach/draft`, which uses Claude API to generate subject + body based on prospect data and method (email/linkedin/form) per the decision tree (email if `contact_email` present, else linkedin if `linkedin_url` present, else contact form)
- Draft is saved to `outreach_log` with status `drafted`, shown in a review card (editable textarea)

**Acceptance check:** clicking "Draft outreach" produces an editable draft tied to the correct contact method.

### Step 8 — Send stub
- "Send" button updates `outreach_log.status` to `sent` and sets `sent_at`
- Actual Gmail MCP integration is out of scope for Phase 1 — stub this as a manual status change for now, with a comment in code marking where MCP wiring goes in Phase 2

**Acceptance check:** clicking send updates status and timestamp; prospect status updates to `contacted`.

---

## 7. Explicitly Out of Scope for Phase 1

- Cron-based / scheduled discovery (Level 2)
- Gmail MCP actual send integration
- LinkedIn automation
- Playwright contact-form automation
- Trade fair tracker
- Deduplication against external sources beyond simple DB-level domain/name matching
- Multi-user auth

---

## 8. Definition of Done for Phase 1

A single user can:
1. Open `/discover`, type a query like "cocoa powder buyers in Germany"
2. See a results grid of candidate prospects within ~15 seconds
3. Approve 1+ prospects into the CRM, with email enrichment attempted automatically
4. View all approved prospects in `/prospects`
5. Open a prospect, generate an outreach draft appropriate to its available contact method
6. Mark that draft as sent and see status reflected in the CRM

---

## 9. Suggested Claude Code Working Style

- Work step by step through Section 6 in order; each step has its own acceptance check — don't proceed to the next until the current one is verifiably working
- Commit after each step
- Keep the research provider behind an interface from day one, even with only one implementation, so Perplexity can be added later without refactoring callers
- Favor server actions or route handlers over a separate backend — no need for a second service in Phase 1
