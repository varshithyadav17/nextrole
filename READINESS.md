# Scout release readiness note

Current feature scope is in PM-EXECUTION-STATUS.md and current verification is in handoff/VERIFICATION.md. Scout chat, role-specific uploads, curated preparation and the controlled companion are implemented. Real Chrome/Edge/device/assistive-technology/employer-form checks remain pending because supported browser control was unavailable. Sender credentials/domain setup and inbox delivery remain unverified. Synthetic local load is not a production capacity claim. Follow a small observed campus pilot before distributing automatic submission.

The earlier readiness notes below are historical checks and still explain retained system boundaries.

> Current v17 local review: read RELEASE-17.md, handoff/RESUME-TEMPLATE.md and handoff/VERIFICATION.md. The supplied résumé layout is implemented for new preparations; existing documents keep their versions. No deployment or mail activation exists. Earlier release statements below are historical.

> Current v16 local review: read RELEASE-16.md, PM-EXECUTION-STATUS.md and handoff/VERIFICATION.md. No v16 deployment or mail activation exists. Earlier release statements below are historical.

> Current v15 review candidate: see RELEASE-15.md. Server-paged browsing and durable source history are implemented and tested locally. The earlier source/feature status below is historical; no v15 hosted version or deployment exists.

> Current v14 local review candidate: see RELEASE-14.md. Verified-fact preparation, private imports, configurable sources and security updates supersede the older feature/status descriptions below. No v14 hosted version or deployment was created. Historical release details remain for provenance.

# NextRole release readiness — 17 October 2026

Status: public beta for a controlled campus pilot. The engineering checks below support a pilot; they are not a certification of production capacity, accessibility or live-provider account access.

The source-expansion release passed 323 isolated checks with the scale flag and TypeScript. It adds 11 verified employer feeds (20 boards total), provider-specific pagination/detail checks, explicit academic requirement matching, external-platform discovery, registry-aware resume/progress and indexed canonical aliases while preserving personal tracking keys. Migration 0007 is additive. SOURCE-COVERAGE.md records current coverage, exact limits, checks and the distinction between external LinkedIn/Unstop searches and automatic imports. Real browser/assistive-device testing remains unverified.

## Title-experience correction prepared on 18 October 2026

Version 12 is the current live release. The follow-up review candidate passed 429 isolated checks with the scale flag, TypeScript and whitespace checks. The 34 additional checks reproduce the exact Paytm title from the owner's screenshot and exercise title evidence across all three ATS normalizers, title/description contradictions, optional wording, duration false positives, legacy metadata correction without database writes, consistent cards/details, searches, alerts and Applied-note preservation. The public Paytm feed was also fetched read-only: both reported listings normalized to 4–8 years and were rejected for a fresher. See TITLE-EXPERIENCE-FIX.md for evidence and source links. No deployment has occurred for this follow-up.

The latest isolated scale run reported p50 666 ms, p95 870 ms and largest workspace response 592,830 bytes for 100 reads at concurrency 10, after adding 1,001 profiles and 500 listings and processing 1,004 profiles in 21 alert pages. These are local Miniflare results, not production capacity. Browser/device testing remains unverified. No new dependency, migration, student API use or account-data change is needed.

## Prepared fresher-filtering correction — 18 October 2026

The review candidate passed 395 isolated checks with `node --experimental-strip-types scripts/verify-app.mjs --scale`, TypeScript and diff whitespace checks. The 72 checks added to the prior 323-check suite cover the reported zero-experience / 2027 case, experience wording and contradictions, batch boundaries, separate For you / Needs review scopes, full/detail agreement, keyword and optional AI candidates, notifications and existing Applied notes. The source is prepared for review; it is not live until the owner approves production deployment. See ELIGIBILITY-FIX.md and PM-EXECUTION-STATUS.md.

The latest isolated scenario added 1,001 profiles and 500 listings, completed 21 alert pages for 1,004 profiles and measured 100 workspace reads at concurrency 10: p50 673 ms, p95 750 ms, largest response 551,748 bytes. These are local Miniflare observations, not production capacity. Provider/push HTTP is mocked. No new migrations, secrets, source categories or production writes are introduced by preparing the fix. Browser/mobile/assistive-device checks remain unavailable.

## Completed engineering work

- Personal records and encrypted API connections are scoped to the trusted signed-in identity. Anonymous personal routes and maintenance are rejected. Owner maintenance is authenticated separately from public access.
- Source ingestion checkpoints after two employer boards per invocation. Due personal reminders can still be generated from saved last-known openings during a total feed outage; job records older than 24 hours do not generate new-match alerts. Refreshes resume a saved sweep, share a cooldown even after outages, validate complete feeds, cap response memory, and retain prior records on failure. Manual refresh continues through up to five bounded requests.
- Feed membership has a separate timestamp from detail verification. An interleaved detail request cannot incorrectly close a feed-present vacancy. Applied, Interested, dismissed states, notes and stages remain intact.
- Alert generation processes at most 50 profiles per invocation with a persisted cursor and a time budget. It rechecks account existence under a workspace lease, so a cleared account cannot be recreated by stale background work.
- In-app notification inserts and a coalesced push outbox entry commit in one transaction. Notification IDs make retry insertion idempotent. Queue workers lease their work, retain transient failures with backoff, stop retrying after five failures, and expose aggregate backlog/failure counts to the owner. Push delivery is best effort and may repeat after a process crash; it is not exactly once.
- Each account supports up to three push devices. Subscription key material is validated. Workers issue at most six concurrent push requests and preserve in-app notifications when device delivery fails.
- Feed and search queries remove full descriptions inside D1. Selected details load on demand. Indexes cover active listings, source/key joins, personal notification order, matching receipts, subscriptions, cache expiry and queue due times.
- AI usage has per-user quotas, a concurrent-request lease, provider cooldowns, a 128 KB response bound, seven-day cache expiry and a 200-result cap per account. Workspace writes and external source-check requests have minute limits. Unexpected database errors return a generic message.
- Gemini 3.5 Flash-Lite is the default for new Google connections; 3.8 Flash and legacy 2.5 connections remain selectable. A model or label can change without exposing or re-entering the saved key. Existing user selections are preserved.
- Account export includes notification history beyond the dashboard's 60-row preview. Clear-workspace and browser-alert disable also remove pending delivery records.
- React, React DOM and React Server DOM Webpack are pinned to 19.2.9, the patched 19.2 release identified by the React advisories published on 14 October. The installed package versions and dependency lockfile confirm this patch. The final build and deployment must retain it before closing the release. The general seven-day dependency age policy remains enabled, with documented exceptions for only these three exact emergency security patch versions.

## Isolated test evidence

The host-workspace release passed 272 checks with `node --experimental-strip-types scripts/verify-app.mjs --scale`. New checks cover host/student authorization, cross-origin rejection, per-user feedback isolation, duplicate-safe submissions, 1–5 rating validation, secret-safe feedback, private owner replies and unread state, genuine Applied transitions, monthly eligibility/skip/period assignment, analytics opt-out/export/deletion, accurate active/activation/day-7/ratings denominators, bounded inbox search and resumable 500-row analytics cleanup. The expanded synthetic run again used 1,001 profiles and 500 added listings, completed 21 alert pages for 1,004 profiles, and measured 100 workspace reads at concurrency 10 (p50 586 ms, p95 660 ms, maximum 444,497 bytes). This is isolated Miniflare evidence, not production throughput or browser interaction. TypeScript and production build passed; final publication uses additive migrations 0004–0006.

The owner dashboard does not expose individual activity logs, account emails, API keys, private notes or search text. It shows submitted feedback plus aggregates. Provider billing/CPU/storage counters remain outside the app. Browser and assistive-device QA for the new dialogs, host views and mobile layout remains unverified because browser control is unavailable here.

The credit-isolation release passed 192 integration checks with `node --experimental-strip-types scripts/verify-app.mjs`, plus TypeScript and the production build. Its additional scenarios use the actual API handlers with synthetic keys: no-key discovery/search/fit checks, paused and removed connections, server-enforced keyword-only search even with enabled keys, exact per-account provider credential selection, independent daily limits, and 20 student refreshes reusing one source cooldown. Deliberately configured synthetic global keys are ignored. Provider HTTP is mocked; no actual student or operator credits were used. Browser/device interaction was not reverified in this environment.

The keyword-only action is distinct from AI search. A key enabled in another tab cannot make a previously rendered keyword-search button issue an LLM call. The Discover screen, AI Connections, sign-in guidance and privacy page explain employer feeds, account identity and optional personal AI separately.

Command: `node --experimental-strip-types scripts/verify-app.mjs --scale`

The earlier full synthetic scale run passed 185 checks against an isolated Miniflare D1. Provider and push HTTP responses were mocked; push payload encryption used generated test keys. No synthetic profiles, fake jobs or test keys were sent to production.

The synthetic scenario added 1,001 profiles and 500 listings. It completed 21 alert batches and processed 1,004 total profiles, including existing fixtures. It then executed 100 workspace reads with concurrency 10. The measured run reported p50 637 ms, p95 731 ms and a maximum response of 444,497 bytes. These values describe this local test setup. They are not internet latency, real browser performance, active-user capacity or a service-level objective.

TypeScript, production build, public HTTP boundaries and authenticated owner maintenance are separate release checks. Record their final deployment results in the release handoff.

## Gates for broader campus promotion

1. Use two real student accounts on mobile and desktop to complete onboarding, Back/Forward, note recovery, filters, Apply, Applied, correction, export and deletion. Observe keyboard and screen-reader use, 320px reflow and text zoom.
2. Make one consented, paid-or-free requested AI call with an actual user's provider key; verify that account's model access and charges. Adapter mocks cannot establish this.
3. Enable a real device's push notifications and receive an update with the app closed; exercise disable and a published reminder window.
4. Observe at least one actual scheduled execution at 09:00, 14:00 or 19:00 IST. A successful manual owner-tool invocation verifies the writer path, not future schedule execution.
5. Verify the hosting account's database/Worker quotas, cost monitoring, backup retention, an actual database restore and access to the stable encryption root. The supported Sites interface does not expose a production restore drill here.
6. Run a staged load test against the intended production concurrency with latency, errors, database rows read/written and backlog age. Obtain user feedback on relevance across the actual target roles and locations.

Begin with 10–20 students for a week, review failures and relevance, then expand in measured cohorts. The catalogue covers 20 configured employer boards across Greenhouse, Lever and Ashby; a vacancy total is not a fresher-eligibility count. Large catalogues need indexed server pagination and, as needed, dedicated managed queue/worker infrastructure. A single D1 database has finite throughput and storage. Vinext remains a beta dependency and needs a monitored release process.

## Primary references

- React security advisories: https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3 and https://github.com/react/react/security/advisories/GHSA-h3gv-c5rc-p453
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Gemini model availability: https://ai.google.dev/gemini-api/docs/deprecations
