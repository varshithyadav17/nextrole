# Integrated verification — 18 October 2026 UTC

This evidence applies to the merged live-v14 plus supplied-v17 source. The original other-account verification remains in V17-VERIFICATION.md and V17-VERIFICATION-RESULTS.json. Native publication/build evidence is recorded separately in the final ZIP's DEPLOYMENT-RECEIPT.json.

| Check | Result | Practical limit |
| --- | --- | --- |
| TypeScript | Passed, no emit or incremental cache | Static typing does not verify browser behavior |
| Full isolated suite with scale fixtures | 717 checks passed | Synthetic identities and isolated Miniflare D1; upstream/AI/mail HTTP mocked; not real delivery or production capacity |
| Live-schema upgrade test | 12 checks passed separately | Original eight migrations → four new migrations, old source cursor resumed normally, choices/notes/stage/closed history preserved; no production rows |
| Focused Jobicy suite | 63 checks passed, overlapping full suite | Captured public response and deterministic page/status fixtures; no live mutation |
| Feature ESLint | 16 files, 0 errors and 0 warnings | Profile/preparation/records/digests/resume modules and upgrade test, not whole-project lint |
| Global lint | Not rerun | Incoming baseline remains 45 errors, 20 warnings; no claim of project-wide lint cleanliness |
| Template-specific verification | 21 checks passed, overlapping full suite | Confirmed facts, escaping, links, glyph handling, determinism, legacy bytes, overflow and page budget |
| PDF visual QA | Native reference 1 page, overflow 3 pages, Unicode 1 page; compiled TeX reference 1 page | All six pages visually inspected using synthetic facts; not a real employer ATS parser test |
| Local LaTeX | Compiled successfully with shell escape disabled | Installed local pdfLaTeX only; no hosted compiler added |
| PDF text/glyph checks | Reader warnings 0; fact titles and all 24 overflow markers preserved after typography/whitespace normalization | Supported Unicode only; not every language |
| Migration/legacy integrity | Original 0000–0007 SQL and incoming legacy PDF renderer byte-identical | New 0008–0011 migrations are additive; hosted completion must be checked in rollout receipt |
| Diff whitespace | Passed | Narrow upstream license/manifest exceptions retained |
| Supported production build | Required packaging gate | Final build/publication result is in deployment receipt; no browser QA performed |

## Measured local performance

The synthetic 1,001-profile fixture processed 1,004 profile rows over 21 alert pages. At concurrency 10, 100 workspace reads had p50 841 ms and p95 1,060 ms; largest JSON workspace was 720,101 bytes. This is an isolated benchmark, not a campus capacity promise.

The 10,000-listing catalogue fixture measured 1,057 ms cold and 23 ms warm, a 33,340-byte first page, 41 bounded cold-scan queries and at most 250 rows per scan. It hydrates by SQLite integer primary key. Production CPU, D1 read/write/storage use and real concurrency remain unmeasured.

The new reference PDF is 192,642 bytes (256,856 bytes as base64 before metadata); the compiled LaTeX reference is 115,934 bytes. Immutable résumé versions require measured retention/storage planning.

## Workflow and upgrade coverage

Tests cover account isolation and owner-only maintenance, durable preferences/choices, manual Apply versus Applied, job evidence/experience/batch/location matching, failed-source recovery, no absent-row closure, atomic Jobicy page/cursor commits, bounded old-listing status checks, reminders and delivery retries, encrypted personal AI keys/no global fallback, verified facts and optional AI consent, document/version preservation, explicit submitted snapshots, independent milestones/unknown dates, analytics/exports/deletion, and newsletter consent/preview/budget/unsubscribe behavior.

The live-schema upgrade test retains the real source ID and geo=anywhere filter, seeded saved choices, notes, stage and closed records. Existing title-based 4–8-year requirements still exclude freshers after old metadata is repaired. A legacy Jobicy 'Anywhere' display does not become an invented India eligibility guarantee. Existing source checkpoints resume without force or restart. Sending remains inactive without configuration.

## Unverified or inactive

Browser/mobile/accessibility interactions could not be exercised because supported browser control was unavailable. Real user-key AI, device push, mail acceptance/inbox delivery, production load, metering, backup and restore were not proven. Mail sender activation, actual nightly scheduling, automated applications and broader platform scraping were not performed. No student API key or application was used by verification.

## Hosted-runtime correction

The initial integrated publication (native saved version 15) exposed a Worker compatibility error in the incoming redirect mode: `redirect: error` is unsupported by the deployed runtime. All 20 employer source checks failed before completing requests; old listings and personal choices were preserved. Public read-only checks of representative Greenhouse, Lever and Ashby boards succeeded in Node, isolating the runtime difference.

The corrected adapters and inactive mail sender use `redirect: manual`; their existing non-2xx handling still refuses redirection. A separate 26-check regression bundles the actual adapters into a native Miniflare Worker, with an isolated outbound service. It verifies successful normalization for Greenhouse, Lever, Ashby, Jobicy page/status requests, and rejects 302 responses without following their destinations. It now runs in the normal verification suite. The full 717-check suite passed again after this correction; these counts are separate and not silently combined. TypeScript, the 16-file feature lint check and diff whitespace checks also passed. The public-source smoke script now uses the retained checkpoint-compatible Jobicy adapter.

The final deployment receipt records the corrective publication and the subsequent normal, unforced source/delivery health check. An initial successful native deployment alone was not treated as proof of working live ingestion.
