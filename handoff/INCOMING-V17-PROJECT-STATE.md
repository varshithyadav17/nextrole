> Current v17 local review: read RELEASE-17.md, handoff/RESUME-TEMPLATE.md and handoff/VERIFICATION.md. The supplied résumé layout is implemented for new preparations; existing documents keep their versions. No deployment or mail activation exists. Earlier release statements below are historical.

> Current v16 local review: read RELEASE-16.md, PM-EXECUTION-STATUS.md and handoff/VERIFICATION.md. No v16 deployment or mail activation exists. Earlier release statements below are historical.

> Current v15 review candidate: see ../RELEASE-15.md. Server-paged browsing and durable source history are implemented and tested locally. The earlier source/feature status below is historical; no v15 hosted version or deployment exists.

> Current v14 local review candidate: see ../RELEASE-14.md. Verified-fact preparation, private imports, configurable sources and security updates supersede the older feature/status descriptions below. No v14 hosted version or deployment was created. Historical release details remain for provenance.

# Project state at handoff

## Release identity

- Product: NextRole — Your next opportunity.
- Saved review release: version 13, not deployed. Live release remains version 12.
- Source commit: `70ae07d0419de03afcece1d34a1907ceb0073d52`.
- Existing Site project: `appgprj_6ad224df721c8191ba6037935d0477b6`.
- Saved version: `appgprj_6ad224df721c8191ba6037935d0477b6~appgver_72342345c7e88191a4701ea30c61a0d0`.
- Review release has no deployment. Production version 12 remains active pending owner approval.
- Source provenance was checked against the native saved-version record. The original checkout had no uncommitted changes when copied.

## Title evidence correction in review version 13

TITLE-EXPERIENCE-FIX.md records the exact screenshot reproduction and live verification of both Paytm records. Experience now combines title and description evidence, supports Exp/years forms and repairs old v12 metadata at read time. Cards/details, fit explanations, keyword/AI selection and alerts agree. The detailed excerpts name their source field. All 429 isolated checks, TypeScript and production build passed; no v13 deployment occurred. A real browser interaction test remains unavailable.

## Navigation update in version 11

The sidebar now has a touch/keyboard-scrollable middle region and persistent labelled Log out. The top-right avatar opens an accessible account menu with profile, personal AI, alerts/account, Help & feedback, privacy, host-only tools and Log out. Help/settings shortcuts use a single history entry; mobile Close/Escape and resize scroll-lock cleanup are included. Read `NAVIGATION-UPDATE.md` for behavior and the required real-device checks.

## Filtering correction in saved review version 13

ELIGIBILITY-FIX.md documents the reproduced cases, evidence-carrying experience parser, extended graduation handling and common strict/review selector. Company browsing no longer forces an unfiltered view; AI results are invalidated by profile changes. All 429 isolated checks, TypeScript and production build passed. No deployment, new migration or production/student data mutation was performed. Resume normal owner-authorized refresh after approved publication; old unversioned records stay under review until refreshed. The senior PM brief and implementation-gap table are included as handoff/PM-BRIEF.md and PM-EXECUTION-STATUS.md.

## Implemented product

- Trusted ChatGPT sign-in for personal workspaces; the configured owner gets Host workspace, other visitors get the student workspace. Roles are authorized on the server.
- Preferences for roles, experience, skills, location, work arrangement and opportunity type.
- Shared live employer feed catalogue (20 boards across Greenhouse, Lever and Ashby), transparent deterministic matching, keyword search, company/role browsing and filters.
- External Apply link, separate manual Applied confirmation, Interested, Not interested, archive/restore/undo, notes, stages, reminders, workspace export and deletion.
- Optional three-slot personal API key storage for OpenAI, Gemini or Groq, with encryption, model selection, pause/reorder, per-user limits, provider cooldowns and bounded fallback.
- No shared/global AI key fallback. Job fetching, ordinary search/matching/tracking/alerts and product analytics require no LLM credits.
- In-app updates, opt-in browser Web Push, bounded resumable source/alert/delivery/retention work, source health and queue backlog reporting.
- Animated original vector raccoon Scout, pause and reduced-motion behavior, responsive application layout, URL navigation state and tab-scoped draft recovery.
- Skippable smiley feedback after every Apply click; applying opens the employer page immediately. Ratings never mark an application Applied.
- Student Help & feedback, private owner replies, unread indication, and monthly on-visit surveys from the calendar month after onboarding, with Skip.
- Host usage and feature metrics, onboarding completion, exact day-7 return, voluntary rating summaries, feedback triage, support timings, operational health and metric JSON export.
- First-party bounded telemetry, usage opt-out/removal, author-controlled feedback deletion through workspace clearing. Host activity is excluded from product metrics.

## Architecture and code map

| Area | Files |
| --- | --- |
| App shell, student workspace and navigation | `app/page.tsx`, `app/dashboard.tsx`, `app/use-radar-navigation.ts`, `lib/navigation.ts` |
| Account menu and sidebar | `app/account-menu.tsx`, `app/dashboard.tsx`, `app/globals.css` |
| Identity and host authorization | `app/chatgpt-auth.ts`, `lib/admin.ts` |
| Main authenticated API | `app/api/app/route.ts` |
| Host dashboard/API | `app/host-dashboard.tsx`, `app/api/host/route.ts`, `lib/host-metrics.ts` |
| Feedback, surveys and analytics | `app/community.tsx`, `app/api/community/route.ts`, `lib/product.ts`, `lib/community-types.ts` |
| Source adapters and ingestion | `lib/sources.ts`, `lib/job-feeds.ts`, `lib/sync.ts`, `lib/http-json.ts` |
| Academic rules and external discovery | `lib/eligibility.ts`, `lib/discovery.ts`, `app/eligibility-summary.tsx`, `app/source-explorer.tsx` |
| Matching and search | `lib/matching.ts`, `lib/experience.ts`, `lib/job-selection.ts`, `lib/search.ts`, `lib/categories.ts` |
| Personal AI | `app/api-connections.tsx`, `lib/keyring.ts`, `lib/providers.ts`, `lib/ai-router.ts`, `lib/ai.ts` |
| Persistence | `lib/store.ts`, `db/schema.ts`, `db/index.ts`, `drizzle/` |
| Alerts, queues and maintenance | `lib/alerts.ts`, `lib/reminders.ts`, `lib/webpush.ts`, `lib/lease.ts`, `lib/rate-limit.ts`, `app/mcp/route.ts` |
| Motion and styling | `app/scout.tsx`, `app/scout-motion.tsx`, `app/globals.css`, `public/` |
| Runtime/build | `vite.config.ts`, `build/`, `.openai/hosting.json`, `scripts/run-framework.mjs` |
| Integration checks | `scripts/verify-app.mjs`, `scripts/verify-host.mjs`, `scripts/verify-credit-isolation.mjs`, `scripts/verify-readiness.mjs` |

The stack is React 19.2.9, Vinext 1.0.0-beta.5, Vite 8.0.13, Cloudflare Workers/D1, Drizzle and Tailwind. Dependency versions and the pnpm release-age policy are preserved. The eight migrations `0000`–`0007` are schema history; append future migrations rather than rewriting them.

## Product boundaries to preserve

Applied, Interested, Not interested, notes and history belong to each authenticated user. A feed refresh must not reset them. Do not infer Applied from opening an external page. Unknown deadlines remain unknown. Failed sources retain last-known records. No source data is fabricated by an LLM.

AI receives only the permitted vacancy/profile fields on an explicit request and uses the requesting user's enabled keys. Do not add an operator fallback. Feedback and usage measurement use no AI calls. Host access cannot be granted by client-supplied role/email fields.

The catalogue currently covers 20 configured Greenhouse, Lever and Ashby employer boards; it is not the whole job market or a count of fresher-eligible vacancies. Adding sources requires an actual adapter, normalization and failure handling. Large catalogues eventually need indexed server pagination and measured capacity work.

## Remaining work before a broad campus launch

Read `READINESS.md` and `CAMPUS-PILOT.md` for the detailed gates. Engineering checks support a controlled public beta; they do not certify arbitrary scale.

- Run real mobile/desktop, keyboard, screen-reader, zoom and small-screen checks with at least two student accounts, including Host-only routes and feedback dialogs.
- Verify a consented real provider request and the actual user's model access/charges; tests mock provider HTTP.
- Verify a real device receives push with the app closed, and exercises disable/reminder windows.
- Review actual hosting/D1 quotas, billing, monitoring, backup retention and a restore drill with the correct stable encryption root.
- Run staged production load tests for intended campus concurrency, backlog age, response time and errors; review real matching relevance.

The owner dashboard exposes product/record aggregates. It is not the hosting bill, storage-byte usage, CPU usage or D1 read/write metering. Exact schedules and device delivery remain operational concerns described in `OPERATIONS.md`.
