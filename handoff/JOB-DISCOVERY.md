# Wider job discovery — 21 October 2026

## Existing stack and product workflow

The NextRole frontend is Next.js/React/TypeScript on Vercel. Its retained authenticated backend is a Vinext/Cloudflare Worker with D1 and private R2. Owner maintenance runs through the authenticated Site MCP. Existing identity, database, personal API-key encryption, tracking, notes and history remain in place.

Discovery, bookmarking, résumé preparation and direct apply links are distinct from the opt-in browser-companion application beta. This discovery connection never fills or submits applications. Personal Scout BYOK slots are never used for shared ingestion.

The existing three public ATS adapters (Greenhouse, Lever, Ashby) and Jobicy remain enabled independently. Their catalogue is configured employer by employer; having an adapter does not automatically discover every customer of that ATS. There is no verified basis for claiming these ATSs cover 70% of tech careers pages or all Y Combinator startups.

## Implemented optional Google Jobs discovery

`lib/discovery-settings.ts`, `lib/discovery-feed.ts`, `lib/discovery-sync.ts` and owner-only `/api/discovery` implement a fixed SerpApi Google Jobs endpoint. The host controls searches and budgets from Career sources. GET configuration and all mutations require the existing host role. Mutations require same-origin requests. Ordinary student refreshes do not call this funded provider.

The retained owner `nextrole_refresh_sources` tool resumes at most one discovery page after its ordinary ATS sweep has completed. The existing recurring refresh can resume `workPending`; no new schedule is created. Status includes `searchDiscovery`. The email tool does not activate or call search discovery.

Defaults: **off**, three India role searches, one page per search, at least 24 hours between passes, six requests per UTC day and 200 per UTC calendar month. Up to ten results can be supplied on each provider page. These are request bounds, not promised job counts. The owner may configure up to six searches, three pages each, an interval of 6–168 hours, daily cap 1–100 and monthly cap 1–5,000. The pilot stores at most 2,000 source records; updates to an existing record still work at capacity. Skipped records and truncated queries are visible. This cap needs a capacity/retention decision before expanding production coverage.

### Activation — no secret is included in the project

1. Create a SerpApi account and verify its current quota, pricing and terms. As checked on 21 October 2026, the official pricing page advertises a free plan with 250 searches/month; provider conditions can change.
2. Add `SERPAPI_API_KEY` as a **secret** to the retained NextRole backend's environment. Preserve all existing environment variables. Do not put it in Vercel, a NEXT_PUBLIC variable, a repository, a browser extension, a feedback form or chat. The key belongs to the product owner, not a student.
3. In the host account, open Career sources → Discover beyond connected employers → Configure searches and request limits.
4. Review permitted content use, set a cap within the provider allowance, then explicitly enable discovery and save. The key by itself does not activate requests.
5. Use Run / resume one page for a small live sample. Review retrieval, source attribution, matching, duplication and budget status before increasing breadth. The existing owner-maintenance path handles later checks.

NextRole's counters cover this application only. Requests made by another application with the same provider key are not visible. Provider quota rejection remains possible even below the local cap.

## Checkpoint and failure semantics

The fixed network destination is `https://serpapi.com/search.json`, engine `google_jobs`, gl `in`, language `en`. Only owner-configured query/location and a provider page token are sent. No student profile, name, email, résumé, notes, session cookie or personal AI key is sent. Destination links returned in results are stored/displayed but never fetched by this importer. Redirects, oversized/invalid responses and missing usable HTTPS destinations fail closed or are counted as skipped.

A shared lease serializes settings and page processing. Daily/monthly reservations are persisted before every network request, including failed or interrupted requests. Page writes and their continuation commit atomically. Counters are not cleared by disabling, saving settings or changing searches. Changing settings cancels the old continuation under the same lease; it does not delete imported jobs or students' tracking.

429s and other provider failures retain existing records and defer retries. A crash after reservation is treated as uncertain provider acceptance: its request remains counted and the pass pauses rather than immediately replaying. Error reporting stores safe classifications, never raw provider responses, request URLs with keys or keys themselves. The provider necessarily receives its authentication key; do not enable full external-request URL logging.

An absent result never marks a vacancy closed. An existing employer record with the same supplied canonical URL and company takes priority; a search result cannot resurrect that employer record. Tracking keys are retained for re-observed leads, and cross-source duplicate handling never mutates `user_jobs`. There is no fuzzy title-only merge that could combine distinct requisitions.

## Matching and honest status

Every search hit has `job-search-api` provenance, provider label, original destination link, bounded alternate apply links and retrieval timestamp. It is **availability unknown** and **description completeness unconfirmed**. Relative posting dates are not converted into invented publication timestamps. Missing graduation batches or deadlines remain unknown.

The same experience, role, location, remote-region and academic checks run over these records. Mandatory title/body experience and explicit batch mismatches exclude a record from eligible matches. Search leads may appear in Needs review; they do not trigger verified-match alerts or nightly verified-match newsletters. The host can connect an employer's reviewed ATS board to obtain authoritative feed verification. This release does not claim live active-status verification for arbitrary external job boards.

## Boundaries of the pasted architecture proposal

- Google Jobs/search aggregators can expand discovery; they do not guarantee all LinkedIn/Unstop/Internshala listings or real-time indexing. Coverage must be sampled and measured.
- A third-party search/data subscription does not automatically grant all underlying content-republication rights. Review the provider agreement and applicable source conditions. Direct platform-feed partnerships remain separate.
- LinkedIn's documented Job Posting API publishes jobs for approved integrations. A LinkedIn account connection is not unrestricted read access to the job catalogue.
- The existing browser companion is user-operated. A browser session is not permission to scrape or bypass a platform's controls; do not describe the companion as a block-avoidance mechanism or universally permitted automation.
- Email-alert forwarding is not implemented. It would require an inbound-email provider/domain, verified per-user routing, sender/spoofing checks, payload sanitization, quotas, retention/deletion and explicit opt-in. It is not costless or automatically compliant.
- Gmail readonly is a restricted scope. Selecting a Gmail filter does not technically narrow that OAuth scope to only those messages. A hosted implementation needs Google's applicable verification/security requirements and least-privilege design; no inbox access was requested here.
- An LLM cannot recover a JD that has not been retrieved, guarantee missing eligibility or bypass login walls. Any later custom-site reader must use reviewed accessible sources, deterministic JobPosting JSON-LD first, bounded extraction, provenance and unknown fields. No Playwright/Jina/LLM scraper was added or activated.

## Verification and remaining work

`node --experimental-strip-types scripts/verify-indexed-discovery.mjs` runs isolated D1 and mocked provider tests for host authorization, counters, checkpoints, concurrency, freshers/batches, unsafe URLs, empty responses, duplicate precedence and student-choice preservation. No production key or paid provider request is used in these tests. See the outer ZIP's verification logs and release receipt for actual results.

Required before claiming operational cross-platform coverage: owner provider setup and permitted-use confirmation, a live data sample, production observation across refresh windows, real-device host/student QA and measured relevant-job yield. No such live provider connection was activated in this release.

## Primary references

- SerpApi Google Jobs contract: https://serpapi.com/google-jobs-api
- SerpApi current pricing: https://serpapi.com/pricing
- Google job-posting discovery/indexing: https://developers.google.com/search/docs/appearance/structured-data/job-posting
- LinkedIn Job Posting API: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2026-04
- LinkedIn software/extension restrictions: https://www.linkedin.com/help/linkedin/answer/a1341387/prohibition-of-scraping-software?intendedLocale=en&lang=en-us
- Greenhouse Job Board API: https://docs.greenhouse.io/job-board.html
- Lever Postings API: https://github.com/lever/postings-api
- Ashby Job Postings API: https://developers.ashbyhq.com/docs/public-job-posting-api
- Gmail authorization scopes: https://developers.google.com/workspace/gmail/api/auth/scopes

