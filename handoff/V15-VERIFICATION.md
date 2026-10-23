# Version 15 verification — 18 October 2026 UTC

Status: local review candidate; no hosted version, deployment, production migration, new paid provider or schedule change. This continues the verified v14 source handoff. Its original verification record is retained in V14-VERIFICATION.md.

## Final results

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Frozen-lockfile install | Passed, Node 24.19.0 / pnpm 11.25.0, scripts disabled | Same pinned graph and supply-chain policy as v14; no new dependency. |
| `pnpm verify` | **Passed: 585 isolated checks, TypeScript, production build** | Real API/business rules in isolated Miniflare D1, with synthetic identities and mocked source/provider/push HTTP. No production data or actual application submission. |
| Feature-file ESLint | Passed, zero errors/warnings | Catalogue types/ranking/scan/API/hook and shared lease helper; source metrics; company/coverage views; streaming search/sync; new regression file. |
| Global lint | **Failed: 45 errors, 20 warnings** | Inherited debt remains, improved from v14's 46/21. Not claimed globally clean. |
| `pnpm audit --prod --json` | **Zero known advisories at every severity** | 254 production/optional dependency entries. Not a whole-application security certification or full development-tree scan. |
| Drizzle generation consistency | Passed: no schema changes | Both new snapshots agree with the schema. Custom invalidation triggers and the existing-workspace seed are retained in migration 0010. |
| Local migration CLI | Passed, all 11 migrations; repeat reported no migrations to apply | Actual handoff helper and Wrangler with fixed `--local`; no production database. |
| Migration/identity preservation | Passed | All nine original SQL migrations 0000–0008 and the hosting identity are byte-for-byte identical to the v14 ZIP. |
| Diff/archive checks | Passed | Whitespace; runtime/secret/cache exclusions; ZIP CRC and paths; actual source SHA-256 manifest. |

Machine-readable captured results are in VERIFICATION-RESULTS.json. Build output includes Vinext's existing static route-classification limitation for dynamic usage; a passing bundle does not establish a browser or production rollout.

## Actual regression scenarios

New tests compare every page of For you, Needs review and All openings with the existing selection/ranking policy; reject anonymous requests and invalid page sizes; keep cards description-free; preserve strong-identity deduplication; verify stable, account/filter-bound cursors; reject cursors after job, tracking, profile or time changes; confirm whole-snapshot company/coverage totals; resolve off-page notifications and descriptions; export 41 applications across pages; isolate private imports; and delete derived cache/revision data. Empty AI selections stay empty in the actual URL/API contract.

The migration test seeds an existing v14 workspace before applying 0009/0010. Unique personal revisions prevent deletion/recreation from reusing an old generation. Concurrent tests pause actual D1 writes: clearing waits for a live cache writer; clearing succeeds after its lease expires and the old writer cannot recreate a snapshot; an older request waiting for its lease is invalidated when an empty workspace is cleared. Lease tests check holder-defined expiry, recovery of legacy values and release by a stale holder. The actual source-sync tests populate success, failure and closure history. Additional tests cover independent cooldown outcomes, observed row denominators and bounded cleanup. All retained application-assistant, ownership, eligibility, encrypted-key, export/deletion and recovery regressions also pass.

## 10,000-listing catalogue measurement

A synthetic cohort of 10,000 additional openings exercised the real ranking and hydration paths, alongside the earlier regression fixtures:

- Cold ranking/page: **1,141 ms**.
- Next indexed page: **26 ms**.
- Default first-page JSON: **31,833 bytes**, including full-snapshot counts.
- Cold scan: **41 queries**, at most **250 metadata rows per query**.
- Warm paging: no new full scan; SQLite integer primary-key hydration was checked with EXPLAIN QUERY PLAN.
- Two pages returned 40 distinct records. Full keyword search found the unique matching record at the end of the cohort.

These are isolated observations, not production capacity. Cold ranking still scans metadata, and the safe operational ranking/search budget is 20,000 representatives. Actual Worker CPU, D1 query/write limits, concurrency and billing need hosted measurements before materially increasing catalogue or user volume.

The retained legacy scale scenario added 1,001 profiles and 500 listings, processed 1,004 profiles in 21 alert pages and made 100 full compatibility-workspace reads at concurrency 10: p50 **779 ms**, p95 **948 ms**, largest response **719,668 bytes**. That benchmark uses the retained legacy full-data path; the dashboard now uses bootstrap plus paged responses. Do not compare these two different workloads as a controlled speedup claim.

## Reproduce

```sh
python3 handoff/verify-source.py
pnpm install --frozen-lockfile
pnpm verify
pnpm lint
pnpm audit --prod --json
```

The optional `node --experimental-strip-types scripts/check-public-sources.mjs` is a real read-only network smoke check. It was not repeated for v15 because the provider adapters/dependencies did not change. The last live 20/20 feed check and PDF visual QA belong to v14 and are documented in V14-VERIFICATION.md; they are not new live/provider/browser evidence.

## Remaining rollout gates

Supported browser control was unavailable; no preview server or alternative browser was installed. Mobile, keyboard, screen reader, pagination interaction, direct Apply/eye flows and downloads still need browser QA. Actual user-provider accounts, push delivery, hosted scheduling, load/quotas/billing and backup/restore remain unverified. Production migrations and deployment require the user's explicit approval and comparison with the actual hosted/source state.

Search-provider ingestion, arbitrary-site crawling, dynamic/authenticated form inspection, hosted LaTeX compilation, Auto-Apply and email digests are not delivered by this milestone. The v14 manual assistant remains available. See RELEASE-15.md for operating details and the next discovery milestone.
