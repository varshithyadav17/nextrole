# Version 14 verification — 17 October 2026 UTC

Status: local review candidate; no hosted version, deployment, production migration or production schedule change was made. The source is derived from the supplied v13 archive, which records upstream commit `70ae07d0419de03afcece1d34a1907ceb0073d52`. Its claim that v12 is live is historical documentation, not a new hosted-state check.

## Final results

| Check | Result | What it establishes |
| --- | --- | --- |
| Frozen-lockfile dependency installation | Passed with Node 24.19.0 / pnpm 11.25.0; install scripts disabled | The pinned graph resolves without weakening the seven-day age policy. The subsequent build exercised the installed toolchain. |
| `pnpm typecheck` | Passed | TypeScript compilation without emitting incremental artifacts. |
| `pnpm test:scale` | **514 checks passed** | Isolated Miniflare/D1 business-rule, API, ownership, migration, recovery and scale scenarios. |
| `pnpm build` | Passed | Supported production bundle, including `/api/sources` and `/api/preparation`. This does not establish browser or production readiness. |
| `pnpm verify` | Passed | Runs the type check, scale suite and build together. |
| New feature files ESLint | Passed | New career, preparation, PDF, import, source-registry/health, location/freshness, UI/API and regression-test files. |
| Global `pnpm lint` | **Failed: 46 errors, 21 warnings** | Inherited lint debt remains. Pre-change baseline: 55 errors, 22 warnings. Global lint is not claimed clean. |
| `pnpm audit --prod --json` | **Zero known advisories**, all severities | 254 production/optional dependency entries. Not an application-security certification or a full development-tree audit. |
| Actual public feed smoke check | **20/20 succeeded; 889 raw listings** | Read-only adapter requests, 23:46–23:47 UTC: Greenhouse 9 boards/263 records; Lever 7/391; Ashby 4/235. Counts can change and are not unique or relevant-job counts. No database write or LLM call. |
| PDF visual/text QA | Passed on synthetic fixtures | A clean one-page A4 resume and a three-page long-content fixture were rendered to PNG. No text blocks fell outside any page; normal text remained selectable and unconfirmed facts were absent. No hosted TeX compiler was used. |
| Source diff and archive checks | Passed before packaging | Whitespace, original migration preservation, safe archive paths/CRC and packaged source hashes. Run the included verifier before intentional local edits. |

## Regression coverage

The v13 baseline contained 429 isolated checks with scale. New checks cover whole-place/country matching; intersecting experience bounds and contradictions; incomplete evidence; stale, invalid and future timestamps; legacy card/detail/alert consistency; adversarial and cached AI output; host source configuration; retry cooldown persistence; private import ownership, canonical re-import and Applied-note preservation; imported reminders and deletion; JSON-LD compensation and date-only deadline uncertainty; profile confirmations and revision conflicts; idempotent preparation; cross-account history/download/deletion; immutable JD/profile snapshots; truthful resume content; blank critical answers; observed, pasted and practice-question provenance; AI fact-ID-only selection; real PDF and LaTeX downloads; and export/workspace deletion.

The suite uses isolated test databases, synthetic profiles and credentials, and mocked provider/push HTTP. It does not use real student API keys, submit applications, or alter production. Migration 0008 is tested locally; migrations 0000–0007 are unchanged.

The final synthetic scale run added 1,001 profiles and 500 listings, processed 1,004 profiles in 21 alert pages, and made 100 workspace reads at concurrency 10: p50 **801 ms**, p95 **891 ms**, largest response **719,082 bytes**. These are local observations, not campus capacity. The larger payload reinforces the need for indexed server pagination before materially expanding the catalogue.

## Reproduce

```sh
python3 handoff/verify-source.py
pnpm install --frozen-lockfile
pnpm verify
pnpm lint
pnpm audit --prod --json
node --experimental-strip-types scripts/check-public-sources.mjs
```

The last command uses real public networks and can fail because a source has changed or is unavailable. It is deliberately separate from the deterministic suite. `handoff/setup-local.mjs` generates only local development secrets; never overwrite production keys with them.

## Unverified rollout gates

Browser/device interaction, keyboard and screen-reader flows, real user-provider access, Web Push delivery, the actual hosted maintenance schedule, production load, hosting quotas/billing and backup/restore remain unverified here. Supported browser control was unavailable; no preview server or substitute browser was installed. See READINESS.md and CAMPUS-PILOT.md for the existing pilot procedure.

PDF export uses local rendering from the saved content model, alongside downloadable LaTeX source. Actual LaTeX compilation, full multilingual font coverage and arbitrary dynamic/authenticated form inspection are not claimed. Search-provider ingestion, automatic submissions and email digests are not implemented. See RELEASE-14.md and ROADMAP-14.md for the delivered scope and next acceptance criteria.
