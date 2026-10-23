# NextRole v15 — bounded browsing and measured discovery

Status: local review candidate, not deployed. This release continues the approved discovery scalability milestone from ROADMAP-14.md. It builds on the verified v14 archive, SHA-256 `a18fb10208d8a7623500d135a781d196ca139b32bdc75b38ea46465c9c904c5e`. No hosted Site version, production database, audience, secrets, billing or maintenance schedule was changed.

## Problem and outcome

The v14 dashboard fetched every visible job, then filtered, sorted and paginated in the browser. A small card grid therefore required a full-catalogue response on every workspace reload. Source health retained only the latest outcome, preventing useful historical denominators.

The dashboard now bootstraps preferences and account metadata with `/api/app?workspace=1`, then requests `/api/catalogue` pages. Ranking waits until the search profile is completed. Default pages contain 20 cards; each response allows at most 100. The same deterministic eligibility and ranking functions remain authoritative. For you, Needs review, All openings, company/role/arrangement filters, keyword filtering, sorting, saved jobs and application history retain their policy.

## Implementation and tradeoffs

- `lib/job-scan.ts` reads metadata in keyset batches of at most 250 shared records, with user-scoped private imports. It chooses a stable representative for strong duplicate identities using the new `jobs_representative_idx`. Long descriptions are omitted except when an old parser version requires a bounded read-time repair.
- A cold ranking pass streams the catalogue and retains compact ordered references plus aggregate counts. It does **not** retain every job card or description in memory. Later pages hydrate only their referenced records through indexed SQLite primary-key lookups. Cold ranking still examines the catalogue; this is not a claim that arbitrary personalized matching is now a constant-time SQL query.
- One temporary snapshot per account is keyed by query, matching preferences, source-registry state and data revisions. Cursors are opaque snapshot identifiers and offsets; another account or filter cannot reuse them. A query in another tab can replace the account's snapshot; an older tab then reloads safely instead of mixing result sets.
- Database triggers invalidate shared rankings on job writes and personal rankings on profile, tracking or private-import writes. Personal generations use unique tokens, seeded for existing v14 workspaces. Clearing/recreating a workspace cannot reuse an old generation. Profile and revision are captured in one SQLite statement, and generation is checked after ranking and page hydration.
- Cold ranking and cache persistence share the existing workspace-mutation lease with deletion. The cache INSERT checks that exact lease in the same SQLite statement, so a worker overtaken after lease expiry cannot recreate deleted derived data. Generation also includes the already-retained engagement-settings timestamp, covering an initially empty workspace cleared while an older request waits for its lease. No additional personal record is retained for this protection.
- Leases now record the holder's expiry in a versioned value. A shorter timeout requested by another caller cannot shorten an active holder's lease. Old start-time values remain recoverable; exact-token release prevents a stale holder from removing its successor. An uninterrupted cold ranking briefly blocks competing workspace writes with a retryable 409; warm pages do not take this mutation lease.
- Snapshots expire within five minutes, or earlier at a known freshness/deadline boundary. Subsequent requests reject expired cursors. The client cancels obsolete requests, debounces catalogue changes, and reloads after a cursor conflict. Cards already displayed remain a last-known view until another request; opening a job performs the existing availability check.
- The current ranking/search budget is 20,000 visible representatives, not a capacity certification. Exceeding it returns a recoverable error without deleting records or presenting a partial catalogue as complete. Large cohort growth needs measured background projection/indexing work before raising the budget.
- The new revision triggers add database writes for changed records. Actual Worker/D1 CPU, query, write, concurrency and billing behavior must be measured before production rollout. No new package, paid provider or infrastructure commitment was added.

The legacy full `/api/app` response and `getJobs` remain for compatibility and regression comparison; the dashboard no longer uses that path. Retire or limit that compatibility surface after consumers are inventoried. Explicit exports remain complete, not paginated subsets.

## Preserved workflows

Company cards, sidebar totals and coverage counts describe the complete snapshot, rather than the current page. Off-page notifications carry a user-safe job identifier, and details/deep links fetch the actual record independently of the loaded grid. CSV and workspace exports use the full tracked set. Applied, Interested, archived records, notes and stages survive paging and source refresh. Empty AI shortlists stay empty rather than accidentally returning ordinary keyword results.

Keyword search now streams the full permitted catalogue while retaining only its best 20 results. Optional AI search retains at most 80 supplied candidates, as before. No additional provider call is introduced by browsing. The eye assistant, confirmed career facts, preparation versions and local PDF/LaTeX exports from v14 remain.

## Source-run measurements

`source_run_history` records actual successful, failed and cooldown-skipped source checks. Successful observations include normalized rows, distinct keys within that feed, newly observed source IDs, source-record closures, shortened evidence and retrieval/normalization duration. Error codes are sanitized; provider diagnostics and student information are not stored in this history.

Career sources displays the latest 60 observations and aggregate counters from the retained window. Cooldown skips are separate from attempted checks. History starts with v15; older outcomes are not fabricated. Cleanup follows completed existing source sweeps in bounded batches, targeting the latest 30 days and 10,000 observations. Expired account snapshots are cleaned there too, and workspace deletion removes them immediately.

Repeated feed rows are not unique jobs; within-feed keys are not cross-source coverage; newly observed source IDs are not necessarily relevant jobs. Extraction accuracy, broken-link rates, market coverage and cost per usable job still need independently observed denominators. The UI says so explicitly.

## Migration, acceptance and continuation

Append-only migrations `0009_paged_catalogue.sql` and `0010_catalogue_indexes_and_revisions.sql` add the cache/history tables, an index and invalidation triggers. Migrations 0000–0008 and the hosting identity are byte-for-byte unchanged. Migration and v14-upgrade behavior are tested only in isolated databases. Apply both pending migrations before a future approved Worker deployment.

Acceptance includes full-policy comparison across all pages; ownership and filter-bound cursors; data/profile/tracking/time invalidation; duplicate handling; complete counts and exports; off-page details; private imports; deletion/recreation; actual source-history outcomes; and a 10,000-listing fixture with bounded reads and a default first-page payload below 160 KiB. Exact results are in `handoff/VERIFICATION.md`.

Browser/device/keyboard/screen-reader QA, actual provider access, real push/schedule execution, production load, quotas/billing and backup/restore remain rollout gates. No browser control was available through the supported workflow. No deployment was attempted. Global inherited lint debt remains documented separately from clean checks on new feature files.

The next product priority is permissioned search discovery and a labelled relevance/coverage sample, with the account, storage/use rights and budget decision described in ROADMAP-14.md. Browser pilot validation should precede publication. Search-engine ingestion, Auto-Apply and email digests are not implemented by this release. They must not be represented as available features.
