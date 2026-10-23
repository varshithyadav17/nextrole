# Version 17 verification — 18 October 2026 UTC

Local review candidate. No production deployment, database migration, mail activation, account connection, paid plan or schedule change. Exact parent evidence is retained in V16-VERIFICATION.md, V16-VERIFICATION-RESULTS.json and V16-SOURCE-MANIFEST.json.

## Results and limits

| Check | Result | Practical limit |
| --- | --- | --- |
| Full pnpm verify | Passed: **665 checks**, TypeScript and production build | Isolated Miniflare D1, synthetic identities and mocked upstream/AI/mail HTTP; not production/browser proof |
| Template-specific checks | 21 passed | Preamble, verified inputs, own identity, escaping, links, font metadata, deterministic bytes, legacy output, overflow, glyph fallback/refusal and page budget |
| Actual legacy-edit API workflow | Passed | An unversioned preparation updated through POST /api/preparation retains its renderer and exact downloaded PDF bytes |
| Feature-file ESLint | 0 errors, 0 warnings | Changed profile/preparation/export modules, UI and regression files |
| Whole-project lint | 45 errors, 20 warnings | Same inherited totals as v16; project-wide lint remains failing |
| Portable PDF | Reference 1 Letter page; long fixture 3 pages; supported Unicode fixture 1 page | Synthetic data; all pages visually inspected, normalized fact text and safe ink bounds verified |
| Local LaTeX compilation | Passed, 1 Letter page, no overfull boxes | Installed pdfLaTeX 1.40.25, TeX Live 2022/Debian; no shell escape; no hosted compiler |
| Links and fonts | PDF/TeX annotations verified; query/percent/fragment URL survives compilation; 0 PDF reader/render warnings | Not proof of an employer ATS parser or all languages |
| Legacy source and archive | Legacy PDF renderer byte-identical to v16; fixed reference hash passes | New template versions must preserve prior rendering paths |
| Database/dependencies/identity | Schema, all 12 migrations, package/lockfile and hosting identity unchanged | No new migration or dependency audit needed for this phase; earlier audit is retained as historical evidence |

The earlier attempted CFF subset path failed and full-font metadata initially produced reader warnings. The final code embeds the three OTFs intact and corrects their PDF stream/descendant types. The final extraction and rendering logs are clean. These final results supersede intermediate attempts; loading a PDF alone was not used as a font validity check. Diff whitespace checks preserve two unmodified upstream license/manifest files through narrowly scoped .gitattributes exceptions.

The reference portable PDF is 192,642 bytes (256,856 bytes as base64 before record metadata). The long fixture is 194,730 bytes; the supported Unicode variant is 198,858 bytes. These are measurable storage costs. Hosted D1 capacity, retention/export volume and actual worker CPU remain rollout gates; none were inferred from a passing local build.

## Workflow coverage

The full retained suite still checks profile persistence, ownership, verified facts, public-form question provenance, optional AI quotas/consent and exact answer evidence; immutable submitted PDFs/hashes, metadata corrections, independent milestones, analytics, streamed exports and deletion; source checkpointing/freshness/deduplication and optional newsletter consent/budgets/uncertainty/unsubscribe.

New checks prove that unconfirmed summary text and unconfirmed grade/technology facts stay out of generated documents. A second candidate receives their own identity. TeX commands are escaped, unsafe URL schemes/private endpoints/mail headers are refused and long content is preserved. The internal compatibility check includes confirmed rendered summary text; it remains an internal text metric. No live AI key, student email or application submission was used.

The representative portable and compiled-TeX fixtures retained every selected fact title/detail after normalization of whitespace, ligatures and LaTeX dash typography. All 24 long-content markers survived across three pages. All final pages were rendered and inspected. PDF and LaTeX engines differ in paragraph justification, font metrics and line breaks; pixel identity is not claimed.

## Local scale observations

The retained 10,000-listing fixture had a 31,833-byte first page, 41 cold queries, at most 250 metadata rows per scan and indexed hydration. Cold/warm times were 1,003/23 ms. The retained 1,001-profile compatibility scenario observed p50/p95 892/1,108 ms for 100 workspace reads at concurrency 10. These are synthetic local measurements, not controlled UI comparisons or production capacity guarantees.

Discovery code is unchanged in v17. The real 20-ATS and bounded Jobicy page observations in V16-VERIFICATION.md were not rerun or relabelled as new checks. Wider coverage and complete live Jobicy traversal remain unproven.

## Reproduce

```sh
python3 handoff/verify-source.py
pnpm install --frozen-lockfile
node handoff/setup-local.mjs
node handoff/migrate-local.mjs
pnpm verify
pnpm lint
mkdir -p /tmp/nextrole-resume-qa
node --experimental-strip-types scripts/verify-app.mjs --template-samples=/tmp/nextrole-resume-qa
cd /tmp/nextrole-resume-qa
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error template.tex
pdftoppm -png template.pdf template
```

Browser QA was not performed: [Sites SKILL.md](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) instructs, “If `$control-browser` is unavailable, skip browser QA.” That capability was unavailable. No alternate preview/browser route was used. Actual profile-field editing, keyboard/mobile flows, print behavior and browser downloads remain unverified.

Before deployment, compare actual hosted/source state, review capacities and backups, validate those browser workflows, and obtain rollout approval. The new profile fields need no SQL migration, but older profile write handlers can strip unfamiliar fields on rollback. Retain v16 private-document deletion/export behavior. Auto-Apply, universal-platform discovery, résumé upload/chat/rewriting and sourced company preparation remain unfinished.
