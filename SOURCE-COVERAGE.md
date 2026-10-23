# Current Scout source coverage — 18 October 2026

The current registry has 21 employer ATS boards plus Jobicy. Zeta (Lever token zeta) was verified with 24 postings, 21 India locations, on 18 October before being appended; live counts can change. Existing IDs/order remain intact. This is configured coverage, not every job platform. Deliberate companion capture reads one embedded JobPosting from an individual LinkedIn/Unstop/ATS page and saves it privately as unverified. It does not establish ongoing platform ingestion or inclusion in shared-source emails.

The following sections are historical context for earlier releases; current implementation and limits are in PM-EXECUTION-STATUS.md and handoff/SCOUT-COMPANION.md.

> Current v17 local review: read RELEASE-17.md, handoff/RESUME-TEMPLATE.md and handoff/VERIFICATION.md. The supplied résumé layout is implemented for new preparations; existing documents keep their versions. No deployment or mail activation exists. Earlier release statements below are historical.

> Current v16 local review: read RELEASE-16.md, PM-EXECUTION-STATUS.md and handoff/VERIFICATION.md. No v16 deployment or mail activation exists. Earlier release statements below are historical.

> Current v15 review candidate: see RELEASE-15.md. Server-paged browsing and durable source history are implemented and tested locally. The earlier source/feature status below is historical; no v15 hosted version or deployment exists.

> Current v14 local review candidate: see RELEASE-14.md. Verified-fact preparation, private imports, configurable sources and security updates supersede the older feature/status descriptions below. No v14 hosted version or deployment was created. Historical release details remain for provenance.

# Source coverage and eligibility — 17 October 2026

NextRole automatically imports 20 configured public employer boards across Greenhouse, Lever and Ashby. It does not import the whole internet. Public catalogue counts are not a count of roles for which a particular student is eligible.

## Automatically connected sources

The original nine Greenhouse boards remain in their original order and keep their identifiers: Razorpay, CloudSEK, Forma.ai's India campus board, Instawork, Karya, SingleStore, Zinnov, Skild AI and Forma.ai's other board.

The 11 verified additions are:

| Employer | Provider | Board token |
| --- | --- | --- |
| Sarvam | Ashby | `sarvam` |
| Sprinto | Lever | `Sprinto` (case-sensitive) |
| Drivetrain | Lever | `drivetrain` |
| Paytm | Lever | `paytm` |
| Meesho | Lever | `meesho` |
| Dozee | Lever | `dozee` |
| Hevo Data | Lever | `hevodata` |
| CRED | Lever | `cred` |
| Notion | Ashby | `notion` |
| Supabase | Ashby | `supabase` |
| Zapier | Ashby | `zapier` |

Live public JSON checks on 17 October confirmed all 11 additions and found 626 postings at that time. A separate live run exercised the actual adapters for the original and added sources. It identified Greenhouse prospect forms in SingleStore's feed; the corrected adapter excludes those non-vacancy forms and its targeted recheck passed. Source and posting counts can change after these checks.

## LinkedIn, Unstop and company-web search

The source page offers clearly labelled external searches:

- LinkedIn Jobs receives the selected role/location and supported broad job-type, entry-level and arrangement parameters. Visitors must review LinkedIn's own applied filters and detailed eligibility.
- Unstop Jobs and Internships open the site's public listing pages. Copy search text and apply the platform's own filters; no unsupported URL-filter contract is claimed.
- Company-web search helps find employers outside the imported catalogue. Search-engine results can be stale, so the user checks the actual employer page.

Those external results are not automatically imported, added to tracking or included in NextRole alerts. Search URLs contain selected role/location and broad filters, not account identity, grades or API secrets. Optional product analytics record only a generic external-search action.

No suitable LinkedIn or Unstop job-import plugin was found in the available plugin directory. LinkedIn's documented Job Posting API is a partner posting/lifecycle API, not a configured broad job-search import connection for this app. An appropriate authorized read feed/integration remains necessary before claiming imported coverage for either platform. Student LLM keys do not establish that access. No LinkedIn session scraping, browser-cookie forwarding, private endpoint or undocumented Unstop bulk API was added.

## Eligibility behavior

Role, location, arrangement, opportunity type, explicit minimum experience and skill relevance still apply. Normalized jobs now also carry bounded requirement excerpts for explicit graduation batches/ranges, minimum qualification levels and supported academic cutoffs.

Users may save a degree/field, graduation year, optional CGPA with a 4- or 10-point scale, and an optional overall percentage. A new account starts with a blank graduation year; existing saved years are preserved. A clearly mismatching explicit batch, lower qualification level or comparable score below an explicit cutoff is excluded from matched results. All openings remains an intentional broader browsing view.

Equivalent qualification routes, discipline restrictions, missing profile details, unstated/mismatched grading scales, and school/semester-specific requirements remain for review. No CGPA/percentage conversion is assumed. Preferred qualifications do not become mandatory cutoffs. Requirements are extracted conservatively from text; they are not a complete semantic verification of every eligibility condition. Always review discipline, work authorization and the full employer criteria. A relevant/uncertain match is not a certificate of eligibility.

Requirement excerpts remain visible in job details without AI. Saved numeric grades are not sent as raw values to optional AI providers or external-search URLs. Requested AI help can receive a derived requirement-check result, alongside the already disclosed profile/vacancy fields.

## Ingestion, duplicates and recovery

- Lever uses bounded 100-posting pages, preserving all description/list/additional sections and multiple locations. Repeated or incomplete pages fail visibly rather than silently truncating the catalogue.
- Ashby excludes `isListed: false` direct-link-only postings. Structured workplace and employment labels are combined conservatively with explicit intern titles.
- Greenhouse excludes prospect forms with no underlying internal job. Other malformed published rows fail the source so a partial list cannot close prior jobs.
- Each feed has an 18-second request budget, an 8 MiB response limit, a 1,000-job ceiling and a bounded normalized-description budget. Exceeding a cap preserves prior records and marks source health unavailable.
- A normal invocation advances at most two boards. A registry fingerprint updates progress correctly when boards are appended. Saved cursors continue into the appended sources without forcing or restarting a sweep; completed current-registry sweeps retain a shared cooldown measured from completion. Even a slow sweep gets a delivery window before another source check starts.
- Nullable indexed `jobs.canonical_url` supports strong URL-based aliases while retaining existing job keys. Known ATS apply/tracking variants share a canonical identity when it is specific to a vacancy and belongs to the same employer identity. Jobs are not merged merely because title, company and location match. Uncertain duplicates without a shared strong identity can remain separate.
- Existing Applied, Interested, Not interested, notes, stages, notification history and provider connections are not rewritten. New duplicate copies can share the original tracking key. Individual detail rechecks use the proper provider and preserve that key.

MCP source progress now derives its total from the registry instead of the old fixed nine. The existing owner-authorized maintenance connection and schedule remain in use; no new automation or global AI credential is required.

Migration `0007_smart_storm.sql` adds only a nullable public-job canonical URL column and an index. It has no student-data backfill or destructive operation. Profile score fields stay within existing user-scoped profile JSON.

## Verification and operating limits

The expanded isolated suite passed 323 checks including the optional 1,001-profile/500-listing scale scenario. New checks cover feed adapters, pagination, hidden rows, malformed-feed preservation, legacy cursor continuation, dynamic source totals, canonical duplicate tracking, same-title distinct requisitions, academic validation, score isolation, missing/alternative grading rules and external-link privacy. TypeScript passed. The final release workflow also builds the production artifact.

The synthetic scale run completed 21 alert pages for 1,004 profiles and 100 workspace reads at concurrency 10, with p50 601 ms, p95 643 ms and a maximum response of 490,125 bytes. These local observations do not establish production campus capacity. Browser control is unavailable here; actual mobile, keyboard, screen-reader and external-platform navigation checks remain part of the campus pilot. See READINESS.md and CAMPUS-PILOT.md.

## Primary integration references

- Ashby public postings schema and `isListed` semantics: https://developers.ashbyhq.com/docs/public-job-posting-api
- Lever public postings and pagination: https://github.com/lever/postings-api
- LinkedIn's documented partner job-posting API scope/access: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/sync-job-postings
- Unstop public jobs entry point: https://unstop.com/job

## Filtering correction prepared on 18 October 2026

For you and new-match alerts now require relevant, non-uncertain results. Needs review is separate. Company counts and exploration preserve that selected scope; All openings warns that experience and batch preferences are off. Experience rules carry source excerpts and an extraction version; old unversioned records are reviewed until a normal source refresh. See ELIGIBILITY-FIX.md for exact cases and limitations. This source change is prepared for approval and does not itself change the live version.
