# Sprint 1 Implementation Plan — Daily Learning Pack (MVP)

Goal: Ship a finite, high‑signal daily learning pack with 12 tiles (≈15 minutes) and an in‑app nudge. No infinite scroll. Light personalization via More/Less and Saves. Gemini summaries are optional; fall back cleanly when missing.

## Scope (In)
- Daily pack: 12 tiles per day with progress indicator and completion screen.
- Mix: 6 Research (≤14 days, arXiv DB), 3 HackerNews (≤48h), 3 Insights (topic‑matched or apply prompts).
- In‑app nudge only (no push) to start/finish today’s pack.
- Light controls: Save, More Like This, Less Like This.
- Topics: AI/ML, Cognitive & Behavioral Science, Productivity & Habits (choose one during onboarding).

## Scope (Out)
- Quizzes/knowledge checks, deep Q&A, cohorts/social, long‑tail topics, push notifications.

---

## Architecture Changes

- Backend (NestJS)
  - New Session module for building and serving daily packs.
  - Keep storage minimal: cache packs and feedback in Redis for MVP; defer DB migrations.
  - Make Gemini summarization optional; never block on missing keys.

- Mobile (React Native/Expo)
  - New Daily Pack screen with progress and finish UI.
  - Tile components for Research/HN/Insight with Save/More/Less actions.
  - In‑app nudge banner when today’s pack is incomplete.

---

## Backend Work

### 1) Session Module
- Files:
  - `social-learning-app/backend/src/session/session.module.ts`
  - `social-learning-app/backend/src/session/session.controller.ts`
  - `social-learning-app/backend/src/session/session.service.ts`
  - `social-learning-app/backend/src/session/dto/pack-item.dto.ts`
- Register module in `AppModule` imports.

#### Endpoints
- `GET /session/pack`
  - Auth required (JWT).
  - Returns idempotent pack for (userId, day). Cache in Redis with key `session:pack:${userId}:${YYYYMMDD}` TTL 24h.
  - Optional query: `topic` to override daily topic (for testing).

- `POST /content/feedback`
  - Auth required (JWT).
  - Body: `{ itemId: string|number, source: 'hackernews'|'research'|'insight', action: 'save'|'more'|'less'|'skip' }`.
  - Persist lightweight signal to Redis list/set `feedback:${userId}:${YYYYMMDD}` and increment counters per source.

#### Pack Composition Rules (MVP)
- 12 tiles total: Research 6, HackerNews 3, Insights 3.
- Topic routing: based on onboarding track (user profile) or `?topic=` override.
- Freshness: HN ≤48h; research ≤14 days.
- Ordering: Interleave sources to keep variety (e.g., R,R,H,R,I,R,H,R,I,H,R,I).
- Backfill if sparse: maintain 12 tiles by filling within the same track’s nearest categories; if still sparse, fall back to recency/popularity.
- Enrichment:
  - TL;DR: If Gemini key present, request concise 2–3 sentence summary; otherwise use existing `summary` (HN) or abstract excerpt (Research) limited to ~280 chars.
  - Why it matters: one‑line rationale derived from topic + tags (template based in MVP).
  - Reading time: estimate 200 wpm from available text (abstract/summary) and cap to [1–6 min] label.

#### Topic Mapping (initial)
- AI/ML → arXiv: `cs.AI`, `cs.LG`, `stat.ML`, `cs.CL`, `cs.CV`; HN keywords: `llm`, `transformer`, `inference`, `agents`, `fine-tune`.
- Cognitive & Behavioral Science → arXiv: `q-bio.NC` + keywords `attention`, `memory`, `decision making`, `learning`; HN keywords `psychology`, `behavioral`, `neuroscience`.
- Productivity & Habits → arXiv keywords `attention`, `habit`, `self-control`; HN keywords `GTD`, `timeboxing`, `deep work`, `PKM`, `habits`.

#### Redis Keys
- Pack cache: `session:pack:${userId}:${YYYYMMDD}`
- Feedback log: `feedback:${userId}:${YYYYMMDD}` (store array of entries)
- For resilience: if Redis unavailable, generate pack on the fly; do not throw.

### 2) Adjust HackerNews Service (non‑blocking Gemini)
- File: `social-learning-app/backend/src/hackernews/hackernews.service.ts`
- Change: Do not throw in constructor when API key missing; set a flag `summarizationEnabled=false` and skip summarization.
- Ensure `/hackernews/stories` remains stable with and without Gemini key.

### 3) Research Selection Helper
- File: `social-learning-app/backend/src/arxiv/arxiv.service.ts`
- Add method: `getRecentByTopic(topic: string, limit: number)`
  - Filter `publishedDate >= NOW() - 14 days` and topic keyword/category match.
  - Return with `abstract` truncated if no TL;DR available.

### 4) Session Service Implementation Outline
- `buildPack(userId, topic): Pack`
  - Try Redis cache; return if hit.
  - Compute desired counts: 6/3/3.
  - Research: query via `getRecentByTopic` with small oversampling; pick distinct authors/papers.
  - HN: call repo for ≤48h, then keyword filter; oversample and pick top by score/time.
  - Insights: select by tags ~ topic; if insufficient, use generic apply prompts.
  - Interleave and enrich.
  - Cache and return.

### 5) API Contracts (MVP)
- `GET /session/pack` response shape:
```
{
  date: "YYYY-MM-DD",
  topic: string,
  items: Array<{
    id: string | number,
    source: 'research' | 'hackernews' | 'insight',
    title: string,
    tldr?: string,
    whyItMatters?: string,
    readingMinutes?: number,
    url?: string,
    domain?: string,
    author?: string | string[],
    publishedAt?: string,
    meta?: Record<string, any>
  }>
}
```
- `POST /content/feedback` request:
```
{ itemId, source, action } // action in {'save','more','less','skip'}
```
- Response: `{ ok: true }`

---

## Mobile Work

### 1) API Client
- File: `social-learning-app/mobile/src/services/api.ts`
  - Add `sessionService.getPack(): Promise<PackResponse>`.
  - Add `contentService.sendFeedback(itemId, source, action)`.

### 2) Screens/Components
- Files:
  - `social-learning-app/mobile/src/screens/DailyPack.tsx` — orchestrates the 12‑tile session with progress.
  - `social-learning-app/mobile/src/components/tiles/ResearchTile.tsx`
  - `social-learning-app/mobile/src/components/tiles/HackerNewsTile.tsx`
  - `social-learning-app/mobile/src/components/tiles/InsightTile.tsx`
  - `social-learning-app/mobile/src/components/NudgeBanner.tsx` — shows when pack incomplete.
  - `social-learning-app/mobile/src/screens/PackComplete.tsx` — completion card with streak and one apply suggestion.
- Update `App.tsx` to surface `NudgeBanner` on home and route to `DailyPack`.

### 3) Interactions
- Per‑tile actions: Save, More, Less → optimistic UI and `sendFeedback`.
- Link‑outs: open in browser; record `tile_open_link` event.

### 4) UX Notes
- Progress header: step X/12, optional elapsed timer (soft, not a gate).
- No infinite scroll; swipe/scroll within the finite list only.
- On completion: show `PackComplete` with summary and CTA to review saved items.

---

## Instrumentation (MVP)
- Minimal event logger (console or stub): `pack_start`, `tile_view`, `tile_open_link`, `tile_save`, `tile_more`, `tile_less`, `pack_complete`.
- Future: pipe to analytics; for MVP, keep local.

---

## Testing Plan (add these tests)

### Backend Unit/Integration
- `session/session.service.spec.ts`
  - Generates 12 items with 6/3/3 mix per track.
  - Enforces HN ≤48h and Research ≤14d.
  - Returns identical pack on repeated calls same day (cache hit).
  - Backfills when a category is sparse but still returns 12.
  - ReadingMinutes estimator returns a bounded [1..6] value.
- `session/session.controller.e2e-spec.ts`
  - `GET /session/pack` requires JWT (401 without).
  - Returns 200 with correct shape and counts; stable within a day.
  - `POST /content/feedback` validates payload; persists in Redis; returns `{ ok: true }`.
- `hackernews/hackernews.service.spec.ts` (adjust/add)
  - Does not throw when Gemini key missing; summaries skipped gracefully.
  - 48h freshness filter verified.
- `arxiv/arxiv.service.spec.ts`
  - `getRecentByTopic` returns only ≤14d papers and respects topic filters.

### Mobile (lightweight)
- Component tests (if test infra present):
  - `DailyPack` shows 12 steps and advances progress.
  - NudgeBanner shows when pack incomplete; hides after completion.
  - Tile components call `sendFeedback` on actions (mocked API).

---

## Milestones & Tasks (4 Weeks)

Week 1 — Session Builder and API
- [ ] Create Session module files and wire in `AppModule`.
- [ ] Implement `GET /session/pack` with Redis caching.
- [ ] Topic mapping utilities for the 3 tracks.
- [ ] Interleave logic and enrichment (reading time, why‑it‑matters template).
- [ ] Unit tests for service and basic e2e for auth + shape.

Week 2 — Summaries and Fallbacks
- [ ] Make Gemini optional in HN service (no throws); add flag.
- [ ] ArXiv helper `getRecentByTopic`; TL;DR fallback to abstract excerpt.
- [ ] Plug summaries into Session enrichment when available.
- [ ] Expand tests for 48h/14d constraints and Gemini‑absent paths.

Week 3 — Mobile Session UI
- [ ] Add `sessionService` and `contentService` to `api.ts`.
- [ ] Build `DailyPack.tsx` with progress and 12‑tile flow.
- [ ] Implement Research/HN/Insight tiles with Save/More/Less and link‑out.
- [ ] Add `NudgeBanner` and route from home; `PackComplete` screen.

Week 4 — Polish, Signals, and Instrumentation
- [ ] Implement `POST /content/feedback` and wire mobile actions.
- [ ] Optimistic UI for Save/More/Less; adjust next‑day knobs slightly (server‑side).
- [ ] Instrumentation: fire minimal events; log to console or stub service.
- [ ] Finalize tests; fix edge cases (sparse topics, Redis down, partial fetch).

---

## Acceptance Criteria (MVP)
- Pack returns exactly 12 items (6 research, 3 HN, 3 insights), stable per day.
- Freshness constraints enforced: HN ≤48h; Research ≤14d.
- App shows finite progress and completion; no infinite scroll anywhere in session flow.
- In‑app nudge appears only when pack incomplete and is dismissible.
- Save/More/Less actions persist and do not break flow; next‑day pack reflects signals modestly.
- Works with and without Gemini key; no crashes when Redis unavailable.

---

## Risks & Mitigations
- Sparse content days → oversample + backfill within track; maintain 12 tiles.
- Gemini dependency → flag off and fall back to metadata/abstract excerpt.
- Over‑scope → quizzes/Q&A/social deferred to Phase 2 after signal.

---

## File/Code Touch List (for convenience)
- Backend
  - `src/session/*` (new)
  - `src/app.module.ts` (import SessionModule)
  - `src/hackernews/hackernews.service.ts` (make Gemini optional)
  - `src/arxiv/arxiv.service.ts` (add helper)
  - Tests under `src/session/*.spec.ts`, update/add HN/ArXiv specs
- Mobile
  - `src/services/api.ts` (add session + feedback)
  - `src/screens/DailyPack.tsx` (new)
  - `src/screens/PackComplete.tsx` (new)
  - `src/components/tiles/*` (new)
  - `App.tsx` (nudge + routing)

This plan is intentionally lean: it nails the core “12 tiles in 15 minutes” experience, keeps dependencies optional, and sets us up to layer quizzes and deeper personalization in Phase 2 once we see user signal.

