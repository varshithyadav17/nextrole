# Jobicy discovery milestone — 18 October 2026

Status: implemented for a saved review build; production deployment requires the owner's approval. The live release remains version 12 until an approved publication succeeds. This build also includes the version 13 title-experience correction.

## Acceptance and implementation

| Requirement | Implemented behavior |
| --- | --- |
| Genuine second source category | Jobicy's documented public Jobs API supplies actual listings, alongside 20 retained employer ATS boards. It is a public job board, not an external-search shortcut. |
| Honest scope | Only `geo=anywhere`: worldwide remote listings in the provider's seven-day publication window, with its three-hour delay. No claim of all Jobicy countries or whole-internet coverage. |
| No key dependency | Shared public HTTP reads need no student, operator or paid API key. No LLM is involved. Hosting/database usage still exists. |
| Bounded resume | One feed page of at most 100 jobs per invocation, opaque cursor preserved unchanged, at most 10 pages/1,000 discovered records per traversal. Excess, malformed or repeated pages fail visibly. Old availability checks resume in batches of at most 100 IDs. |
| Hourly fair use | New traversals share a persisted hourly budget across all users. Cursor continuations resume the current pass. HTTP 429 honors deferred Retry-After. Manual refresh and owner MCP use the same checkpoints. |
| Correct availability | Check each feed page's IDs before committing. Older imported jobs use the separate status endpoint, independent of the discovery window. Only an explicit `closed` status closes a row. Unknown status stays labelled unconfirmed, excluded from confident matches and reminders. |
| Evidence and freshness | Preserve actual employer, Jobicy seniority, canonical listing URL, original publication date, text retrieval time and availability-check time. Listing text older than seven days needs review even if availability was checked recently. |
| Consistent eligibility | Shared title-and-description experience, explicit batch and academic checks apply. Senior/mid-level source labels exclude freshers without inventing a number of years. Entry-level alone does not prove zero experience. |
| Personal history | Retain the existing job key when a provider listing is updated. Applied, Interested, Not interested, stages and notes remain account-scoped. Distinct provider IDs are not merged merely by title. |
| Clear navigation and attribution | Cards and details visibly credit Jobicy and preserve its canonical URL. Apply opens that Jobicy listing; the student continues to the application there. Applied remains manual. Company browsing includes actual employers from imported records. |
| Owner visibility | Source health and progress remain owner authenticated. Operations shows open/unconfirmed counts across employer and job-board categories. Counts are not personal relevance, market coverage, API bills or capacity claims. |

## Evidence

On 18 October 2026, the public worldwide feed returned 23 listings; the separate public status endpoint returned active for all 23. The exact public responses, with attribution and canonical URLs, are retained in `fixtures/jobicy-worldwide-2026-10-18.json`. They are a dated source sample, not current production counts. No student data is included.

`scripts/verify-jobicy.mjs` runs this real captured data through the common normalizer, availability validation, isolated D1 ingestion, lightweight workspace retrieval and full job details. Additional synthetic cases cover 101-job/two-page discovery, opaque cursor punctuation, more than 100 older status checks, explicit closed/unknown/active outcomes, user-state preservation, no-key requests, hourly sharing, title experience, seniority, source failures, deferred 429s and an interrupted database transaction. The normal suite retains the previous filtering, authentication, AI-credit isolation and delivery regressions. Test results are recorded in the handoff; mocks and local scale observations are not browser or production proof.

## Operational limits and remaining work

- The public API returns Jobicy URLs. Direct employer ATS URLs are an optional commercial feature and are not configured or purchased.
- A separate Jobicy listing and employer ATS listing can have different canonical URLs. They are not fuzzy-merged: doing so could hide distinct requisitions or apply the wrong personal decision. Cross-platform aliases require verified shared identity.
- After a discovery/page failure, existing rows and student history remain. Source health reports failure; later passes resume the saved valid continuation after its retry window. An expired or rejected cursor is reported and permits a new traversal only in a later pass.
- An old job may remain open while its description leaves the seven-day feed. Availability does not refresh its requirements; the UI shows both timestamps and sends stale requirements to review.
- LinkedIn and Unstop remain external searches. Internshala, search-engine ingestion and non-ATS career-page adapters are not implemented.
- The full resume/LaTeX/PDF Application Assistant, application-answer history, Auto-Apply and career-intelligence milestones remain separate work. No application is submitted by this release.
- No new database migration, dependency, student-data rewrite, sharing change, secret change or additional schedule is required. Real-device UI/push checks, staged production load and a backup/restore drill remain rollout checks.

## Primary source contract

- API and permitted integration use: https://jobicy.com/jobs-rss-feed
- Machine-readable specification: https://jobicy.com/api/openapi.json
- Configured public discovery: https://jobicy.com/api/v2/remote-jobs?count=100&geo=anywhere
- Status: https://jobicy.com/api/v2/remote-jobs/status?ids=LISTING_IDS

Recheck the provider's contract before expanding scope. A new traversal must not start more than hourly. The read-only `scripts/check-public-sources.mjs --source=jobicy-worldwide` diagnostic is for an intentional contract check; routine maintenance must use the owner-authorized shared refresh worker.
