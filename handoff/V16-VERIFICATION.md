# Version 16 verification — 18 October 2026 UTC

Local review candidate. No production deployment/migration, mail activation, paid subscription, live schedule or audience change. Prior v15 evidence and source hashes are retained in V15-VERIFICATION.md, V15-VERIFICATION-RESULTS.json and V15-SOURCE-MANIFEST.json.

## Results

| Check | Result | Practical limit |
| --- | --- | --- |
| Full `pnpm verify` | Passed: **643 checks**, TypeScript and production build | Isolated Miniflare D1; synthetic identities and mocked upstream/AI/mail/push HTTP in the regression suite. |
| Feature-file ESLint | Passed: 0 errors, 0 warnings | New endpoints, components, business modules, relevant helpers and regression file. |
| Whole-project lint | Failed: 45 errors, 20 warnings | Same inherited totals as v15; not globally clean. |
| Production dependency audit | 0 known advisories, 254 production/optional entries | Same frozen dependency graph as v15; package/lockfile are byte-identical. No new package. |
| Schema generation | No changes pending | Generated 0011 snapshot agrees with schema. |
| Local migration helper | 0011 applied; repeat succeeded; local database records all 12 migrations | Fixed --local only. Original 0000–0010 and hosting identity preserved byte-for-byte. |
| Source checks | Existing 20 ATS feeds passed (889 raw listings); Jobicy bounded page passed (100 rows, more available) | Real read-only network checks; neither uniqueness, eligibility, full Jobicy traversal nor market coverage is proven. First Jobicy page contained 0 classified internships. |
| Résumé PDF | Rendered and visually inspected; one-page synthetic fixture; text extraction retains professional/repository/demo links | Current fixed template, not the user's unprovided Overleaf layout. Stable-byte equality with the submitted snapshot is tested. |
| Diff and source archive | Whitespace, previous-file preservation, safe paths/CRC and SHA-256 manifest checked | Does not prove browser or production operation. |

The initial monolithic Jobicy live traversal hit the safe memory budget. Shared ingestion was changed to bounded, checkpointed pages; the final page path passed live. Production ingestion of its entire rolling window is still unverified. Unknown region and unknown status are kept distinct from globally eligible and closed.

## Actual workflow evidence

Application tests cover anonymous/owner access, confirmed project/professional links, missing-skill reporting, consented AI drafts, exact quote support, rejected unsupported metrics/skills, blocked personal declarations and exclusion of contact fields from AI input. Preparation downloads and the confirmed submitted PDF are byte-identical, with SHA-256. Metadata corrections preserve that PDF and log history. An old lease cannot recreate record/tracking/event data after clear.

Response, OA and interview completions are independent. Future completion dates fail, stale revisions conflict, unknown application dates stay unknown, and arbitrary role labels cannot collide with object prototypes. Analytics retain actual counts; silence is never rejection. Career deletion removes submitted private document copies. Full export streams complete document/event records with a completion marker rather than buffering all PDFs.

Newsletter tests verify source evidence, escaping, no ordinary AI/network call for previews, the authenticated recipient, a complete CSV when more than 20 matches exist, explicit host activation, the nightly window, one send per person/day, unsubscribe, uncertain acceptance with automatic pause, daily budget exhaustion and workspace deletion. Provider requests are mocked; accepted never means delivered. No real student email, AI key or application submission was used.

Jobicy tests cover canonical attribution and actual employer identity, opaque pagination, invalid/repeated cursors, persisted continuation across shared sync invocations, hourly new-traversal limits even for forced refresh, preservation after rolling-window disappearance, and separate closed/unknown statuses. All retained eligibility, ownership, AI-key encryption/quota, recovery, pagination, tracking and export/deletion checks pass.

## Scale observations

The 10,000-listing fixture passed with a 31,833-byte first page, at most 250 metadata rows per scan, 41 cold queries and indexed hydration. Observed cold/warm times were 1,064/25 ms. Full-catalogue keyword search found a tail record. These are local observations, not a production capacity guarantee.

The retained compatibility scenario used 1,001 synthetic profiles, 500 additional listings, 21 alert pages and 100 full-workspace reads at concurrency 10; observed p50/p95 were 842/967 ms. The dashboard uses bootstrap plus pages; this older benchmark is not a controlled UI-speed comparison.

## Reproduce and rollout gates

```sh
python3 handoff/verify-source.py
pnpm install --frozen-lockfile
node handoff/setup-local.mjs
node handoff/migrate-local.mjs
pnpm verify
pnpm lint
pnpm audit --prod --json
node --experimental-strip-types scripts/check-public-sources.mjs --source=jobicy-public
```

The last command is a live, read-only bounded page check; respect the source's polling policy and use persisted cursor continuation for normal ingestion. Full machine-readable observations are in VERIFICATION-RESULTS.json.

Browser QA was not performed: [Sites SKILL.md](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) says, “If `$control-browser` is unavailable, skip browser QA.” That capability was unavailable. No preview server, alternative browser installation or improvised browser-control route was used. Keyboard/mobile/screen-reader flows, print output and downloads need browser validation.

Before rollout, compare actual hosted/source state, review storage/query/CPU quotas and backups, validate the real sender and inbox delivery, configure the nightly task, and obtain deployment/activation approval. No stage was published here. Larger subscriber volume, blob storage and automated cleanup/recovery need measured operational review. Rollback must preserve v16 deletion/export support for any v16 private data already created; do not drop the new tables or restore older cleanup handlers blindly.

RELEASE-16.md explicitly lists unfinished universal-platform discovery, optional role résumé uploads, conversational résumé editing/rewriting, exact Overleaf template, Auto-Apply and sourced OA/interview research. A passing build is not proof of those capabilities.
