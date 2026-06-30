# Export Business Development Agent — Phase 1.1 Addendum

**Builds on:** Phase 1 Project Plan
**Scope:** Fix contact enrichment accuracy, add cost-aware model routing
**Audience:** Claude Code (execution agent)
**Status:** Phase 1 is implemented and running on Perplexity for research. This addendum covers fixes and additions identified during real-world testing — it does not replace Phase 1, only extends it.

---

## 1. Why this addendum exists

Two issues surfaced after running Phase 1 against real queries:

1. **Contact discovery is weak.** Perplexity reliably finds companies but frequently fails to surface an email or contact form even when one is visibly present on the company's own website. The original plan treated discovery and contact-finding as a single step — they need to be split.
2. **Cost.** Running every step (discovery, extraction, scoring, drafting) through Claude Sonnet is more expensive than necessary. Several of these steps are simple enough for a cheaper model.

This addendum changes the **enrichment pipeline** and introduces **model routing**. It does not change the database schema's core structure beyond two additive columns, and does not change the UI flow described in Phase 1.

---

## 2. Updated tech stack additions

| Layer | Choice | Notes |
|---|---|---|
| Research (unchanged) | Perplexity sonar-pro | Used for discovery only — company name, website, rough product fit |
| Contact scrape | Claude Haiku 4.5 + `web_fetch` tool | Visits the actual contact/about page and extracts email + form presence |
| Contact lookup fallback | Hunter.io (free tier) | Domain Search first, Email Finder second — only when scrape finds nothing |
| Outreach drafting (unchanged) | Claude Sonnet 4.6 | Kept on Sonnet — copy quality matters here |
| Classification / routing / extraction | Claude Haiku 4.5 | New — used for match scoring and contact-method decisions |

---

## 3. Corrected enrichment pipeline

Replaces Phase 1 Step 5 ("Enrichment on approve"). The order matters — most reliable source first:

```
1. Perplexity discovery
   → company name, website, rough description
        ↓
2. Direct scrape (Claude Haiku 4.5 + web_fetch)
   → fetch /contact, /contact-us, /about/contact, homepage nav fallback
   → extract: email (if visibly present), contact form presence
        ↓ found email?
   → YES: save with email_source = "scraped", email_confidence = "high"
   → NO: continue to step 3
        ↓
3. Hunter.io Domain Search (by website domain)
        ↓ found email?
   → YES: save with email_source = "hunter_domain", email_confidence = "medium"
   → NO: continue to step 4
        ↓
4. Hunter.io Email Finder (only if a contact name was captured during discovery)
        ↓ found email?
   → YES: save with email_source = "hunter_pattern", email_confidence = "low"
   → NO: continue to step 5
        ↓
5. No email found
   → rely on contact_form_url or linkedin_url already captured
   → if neither exists, status flagged for manual research
```

This runs when a prospect is approved (same trigger point as Phase 1 Step 5), but is now a multi-step pipeline instead of a single Hunter.io call.

---

## 4. Model routing

Each Claude API call in the pipeline should specify a model based on task complexity, not default to Sonnet everywhere.

| Task | Model | Reasoning |
|---|---|---|
| Contact page extraction (email/form detection from HTML) | Haiku 4.5 | Pattern extraction, not creative reasoning |
| Match score calculation | Haiku 4.5 | Classification-style task |
| Contact-method routing decision (email vs LinkedIn vs form) | Haiku 4.5 | Rule-following against the decision tree |
| Outreach email/LinkedIn/form draft generation | Sonnet 4.6 | Persuasive copy quality matters |
| Trade fair brief generation (future phase) | Sonnet 4.6 | Longer-form, higher-stakes document |

Implementation note: create a small `lib/ai/models.ts` constants file so the model choice per task is defined in one place rather than hardcoded inline in each API route — makes it trivial to adjust later without hunting through the codebase.

```typescript
// lib/ai/models.ts
export const MODELS = {
  extraction: "claude-haiku-4-5-20251001",
  classification: "claude-haiku-4-5-20251001",
  drafting: "claude-sonnet-4-6",
} as const;
```

### Prompt caching

The system prompt used across extraction and classification calls (decision-tree rules, schema definitions, tone guidelines) should be wrapped with `cache_control` so repeated calls within a session reuse the cached prefix rather than reprocessing it at full price each time. This applies most to the contact-scrape and classification calls since they run once per approved prospect and share a near-identical system prompt.

---

## 5. Schema additions

Two new columns on the existing `prospects` table (additive migration, no breaking changes):

| Column | Type | Notes |
|---|---|---|
| email_source | text | "scraped" \| "hunter_domain" \| "hunter_pattern" \| null |
| email_confidence | text | "high" \| "medium" \| "low" \| null |

The CRM table view (`/prospects`) should surface `email_confidence` as a small badge next to the contact email so it's visible at a glance which prospects have a verified-looking email versus a pattern guess.

---

## 6. Application structure additions

New files only — nothing in Phase 1's structure is removed.

```
/lib
  /ai
    models.ts                  — model routing constants (see Section 4)
  /enrichment
    contactScraper.ts           — Haiku + web_fetch contact page extraction
    hunter.ts                   — existing, now called only as fallback (Steps 3-4)
    enrichmentPipeline.ts        — orchestrates the 5-step pipeline in Section 3
```

`enrichmentPipeline.ts` is the new entry point called on prospect approval — it replaces the direct Hunter.io call that Phase 1 Step 5 originally wired up.

---

## 7. Build steps for Claude Code

### Step 1.1.a — Add model routing constants
- Create `lib/ai/models.ts` as shown in Section 4
- Update any existing Claude API calls (classification, drafting) to import from this file instead of hardcoding a model string

**Acceptance check:** grep the codebase for hardcoded `claude-sonnet` or `claude-haiku` strings outside `models.ts` — there should be none.

### Step 1.1.b — Build the contact scraper
- Implement `lib/enrichment/contactScraper.ts` using Claude Haiku 4.5 with the `web_fetch` tool
- Try common contact-page paths first (`/contact`, `/contact-us`, `/about/contact`), then fall back to fetching the homepage and locating a contact link in the nav
- Extract email (handle obfuscated formats like "info [at] domain [dot] com") and detect contact form presence
- Return `{ email: string | null, hasForm: boolean, sourceUrl: string }`

**Acceptance check:** run against 5 known prospect websites with visible contact-page emails; scraper correctly extracts at least 4/5.

### Step 1.1.c — Rebuild the enrichment pipeline
- Implement `lib/enrichment/enrichmentPipeline.ts` following the 5-step order in Section 3
- Replace the direct Hunter.io call in the prospect-approval flow with a call to this new pipeline
- Pipeline writes `email_source` and `email_confidence` alongside `contact_email`

**Acceptance check:** approving a prospect with a known visible contact-page email results in `email_source = "scraped"`. Approving one without a visible email but a real domain results in `email_source = "hunter_domain"` if Hunter finds a match.

### Step 1.1.d — Schema migration
- Add `email_source` and `email_confidence` columns to `prospects` via Drizzle migration
- Backfill existing rows: any row with a non-null `contact_email` and no source should be set to `email_source = "hunter_domain"`, `email_confidence = "medium"` (best guess for pre-addendum data) — or `null` if you'd rather re-run enrichment on them later

**Acceptance check:** migration runs cleanly against the existing Neon database without data loss.

### Step 1.1.e — Add prompt caching to shared system prompts
- Identify the system prompt(s) shared across extraction/classification calls
- Wrap the stable portion with `cache_control: { type: "ephemeral" }`
- Confirm via API response usage stats that cache hits are occurring on repeated calls within a session

**Acceptance check:** second and subsequent calls in a batch enrichment run show `cache_read_input_tokens` > 0 in the API response.

### Step 1.1.f — Surface confidence in the UI
- On `/prospects` table and prospect detail page, add a small badge next to the contact email showing `email_confidence` (high/medium/low)
- Use existing shadcn `Badge` component, color-coded (e.g. green/amber/gray)

**Acceptance check:** CRM table visibly distinguishes a scraped high-confidence email from a Hunter pattern-guessed one.

---

## 8. Explicitly out of scope for this addendum

- Switching research provider away from Perplexity
- Any change to the outreach drafting flow (Sonnet stays as-is)
- Playwright or browser-based scraping (the `web_fetch` approach is sufficient for static contact pages; revisit only if JS-rendered pages prove to be a recurring blocker)
- Batch API adoption (worth considering once Level 2 cron-based discovery is built, not now)

---

## 9. Definition of done for Phase 1.1

1. Approving a prospect triggers the 5-step enrichment pipeline, not a single Hunter.io call
2. Email source and confidence are visible in the CRM UI
3. Extraction and classification calls run on Haiku 4.5; drafting remains on Sonnet 4.6
4. Shared system prompts use prompt caching
5. A spot check of 5-10 prospects with known visible contact-page emails shows correct extraction in the majority of cases
